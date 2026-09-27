import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LITERAL_SOURCE_POLICY,
  REVIEWED_POLICY,
  characterApplicability,
  createGenusDatasetFromScientificPackage,
  evaluateGenusIdentification,
  resolveObservations,
  sourceScore,
  type GenusEngineDataset,
  type GenusObservation,
  type ObservedCharacter,
  type SpecimenContext,
} from './genus-engine'

const scientificPackage = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8'))
const dataset = createGenusDatasetFromScientificPackage(scientificPackage)

const context = (
  sex: SpecimenContext['sex'] = 'male',
  lifeStage: SpecimenContext['lifeStage'] = 'adult',
  epigyneCleared: SpecimenContext['preparation']['epigyneCleared'] = 'unknown',
): SpecimenContext => ({ specimenId: 'specimen-1', sex, lifeStage, preparation: { epigyneCleared } })

const character = (packetId: string) => {
  const value = dataset.characters.find((item) => item.packetId === packetId)
  if (!value) throw new Error(`Missing test character ${packetId}`)
  return value
}

const state = (packetId: string) => {
  const value = dataset.states.find((item) => item.packetId === packetId)
  if (!value) throw new Error(`Missing test state ${packetId}`)
  return value
}

const observation = (
  id: string,
  characterId: string,
  stateIds: string[],
  overrides: Partial<ObservedCharacter> = {},
): ObservedCharacter => ({
  id,
  specimenId: 'specimen-1',
  characterId,
  disposition: 'observed',
  expression: stateIds.length === 1 ? 'single' : 'alternatives',
  stateIds,
  certainty: 'certain',
  ...overrides,
})

const candidate = (result: ReturnType<typeof evaluateGenusIdentification>, taxonId: string) => {
  const value = result.candidates.find((item) => item.taxon.id === taxonId)
  if (!value) throw new Error(`Missing candidate ${taxonId}`)
  return value
}

function findMixedProfile() {
  const male = context('male')
  for (const taxon of dataset.taxa.filter((item) => !item.isRoot)) {
    for (const item of dataset.characters) {
      if (characterApplicability(dataset, male, item.id).status !== 'applicable') continue
      const support = item.stateIds.find((stateId) => sourceScore(dataset, taxon.id, stateId) === 1)
      const absent = item.stateIds.find((stateId) => sourceScore(dataset, taxon.id, stateId) === 0)
      if (support && absent && !dataset.allZeroProfiles.has(`${taxon.id}|${item.id}`)) return { taxon, item, support, absent }
    }
  }
  throw new Error('No mixed profile found')
}

function findThreeSupports() {
  const male = context('male')
  for (const taxon of dataset.taxa.filter((item) => !item.isRoot)) {
    const supports = dataset.characters.flatMap((item) => {
      if (characterApplicability(dataset, male, item.id).status !== 'applicable') return []
      const stateId = item.stateIds.find((id) => sourceScore(dataset, taxon.id, id) === 1)
      return stateId ? [{ characterId: item.id, stateId }] : []
    }).slice(0, 3)
    if (supports.length === 3) return { taxon, supports }
  }
  throw new Error('No three-support profile found')
}

describe('Stage 2 genus engine contract', () => {
  it('builds over the exact Stage 1 Lucid dimensions and excludes the root from results', () => {
    expect(dataset.taxa).toHaveLength(86)
    expect(dataset.characters).toHaveLength(99)
    expect(dataset.states).toHaveLength(296)
    expect(dataset.matrixCells).toHaveLength(86 * 296)
    expect(dataset.allZeroProfiles.size).toBe(122)

    const result = evaluateGenusIdentification(dataset, context(), [])
    expect(result.candidates).toHaveLength(85)
    expect(result.candidates.every((item) => !item.taxon.isRoot && item.band === 'unassessed')).toBe(true)
    expect(result.trace.matrixId).toBe(dataset.matrixId)
  })

  it('treats unknown, unobservable, skipped and user-declared inapplicable answers as neutral abstentions', () => {
    const item = dataset.characters[0]
    const abstentions: GenusObservation[] = (['not_sure', 'cannot_see', 'skipped', 'inapplicable'] as const).map((disposition, index) => ({
      id: `abstain-${index}`,
      specimenId: 'specimen-1',
      characterId: item.id,
      disposition,
    }))
    const result = evaluateGenusIdentification(dataset, context(), abstentions)
    expect(result.activeObservationIds).toEqual([])
    expect(result.suspended.map((item) => item.reason)).toEqual(['abstained', 'abstained', 'abstained', 'abstained'])
    expect(result.candidates.every((item) => item.band === 'unassessed' && item.evidence.length === 0)).toBe(true)
  })

  it('retains Lucid source uncertainty without adding positive support', () => {
    const male = context('male')
    let found: { taxonId: string; characterId: string; stateId: string } | undefined
    for (const taxon of dataset.taxa.filter((item) => !item.isRoot)) {
      for (const item of dataset.characters) {
        if (characterApplicability(dataset, male, item.id).status !== 'applicable') continue
        const stateId = item.stateIds.find((id) => sourceScore(dataset, taxon.id, id) === 3)
        if (stateId) { found = { taxonId: taxon.id, characterId: item.id, stateId }; break }
      }
      if (found) break
    }
    expect(found).toBeDefined()
    const result = evaluateGenusIdentification(dataset, male, [observation('uncertain', found!.characterId, [found!.stateId])])
    const match = candidate(result, found!.taxonId)
    expect(match.evidence[0].outcome).toBe('source_uncertain')
    expect(match.supportGroups).toBe(0)
    expect(match.coverage.assessedObservations).toBe(0)
    expect(match.band).toBe('unassessed')
  })

  it('preserves all-zero source bytes while the reviewed policy treats AU01 as unreported', () => {
    const usableContexts = [context('male'), context('female', 'adult', 'yes')]
    const selected = [...dataset.allZeroProfiles].flatMap((profile) => {
      const [taxonId, characterId] = profile.split('|')
      const specimenContext = usableContexts.find((value) =>
        characterApplicability(dataset, value, characterId).status === 'applicable'
        && characterApplicability(dataset, value, characterId, LITERAL_SOURCE_POLICY).status === 'applicable')
      return specimenContext ? [{ taxonId, characterId, specimenContext }] : []
    })[0]
    expect(selected).toBeDefined()
    const { taxonId, characterId, specimenContext } = selected
    const item = dataset.characters.find((value) => value.id === characterId)!
    expect(item.stateIds.map((stateId) => sourceScore(dataset, taxonId, stateId)).every((code) => code === 0)).toBe(true)

    const answer = observation('all-zero', characterId, [item.stateIds[0]])
    const reviewed = candidate(evaluateGenusIdentification(dataset, specimenContext, [answer]), taxonId)
    const literal = candidate(evaluateGenusIdentification(dataset, specimenContext, [answer], LITERAL_SOURCE_POLICY), taxonId)
    expect(reviewed.evidence[0].sourceCodes).toEqual([0])
    expect(reviewed.evidence[0].outcome).toBe('source_unreported')
    expect(reviewed.evidence[0].citation.interpretationReferences).toContain('data/scientific/review-register.json#AU01')
    expect(literal.evidence[0].outcome).toBe('strong_contradiction')
    expect(reviewed.band).toBe('unassessed')
    expect(literal.band).toBe('contradicted')
  })

  it('keeps reviewed applicability distinct from literal source parity', () => {
    const item = character('F030')
    expect(characterApplicability(dataset, context('female'), item.id)).toMatchObject({ status: 'inapplicable', interpretationVersion: 'stage2-applicability@1' })
    expect(characterApplicability(dataset, context('unknown'), item.id).status).toBe('applicability_unknown')
    expect(characterApplicability(dataset, context('male', 'unknown'), item.id).status).toBe('applicability_unknown')
    expect(characterApplicability(dataset, context('male'), item.id).status).toBe('applicable')
    expect(characterApplicability(dataset, context('female'), item.id, LITERAL_SOURCE_POLICY).status).toBe('applicable')
  })

  it('applies sex, life-stage and preparation interpretations without equating unknown with inapplicable', () => {
    const maleGroupCharacter = character('F065')
    expect(characterApplicability(dataset, context('male', 'juvenile'), maleGroupCharacter.id).status).toBe('inapplicable')
    expect(characterApplicability(dataset, context('male', 'unknown'), maleGroupCharacter.id).status).toBe('applicability_unknown')

    const clearedCharacter = character('F058')
    expect(characterApplicability(dataset, context('female', 'adult', 'no'), clearedCharacter.id).status).toBe('inapplicable')
    expect(characterApplicability(dataset, context('female', 'adult', 'unknown'), clearedCharacter.id).status).toBe('applicability_unknown')
    expect(characterApplicability(dataset, context('female', 'adult', 'yes'), clearedCharacter.id).status).toBe('applicable')
  })

  it('suspends context-invalid answers reversibly without mutating them', () => {
    const item = character('F030')
    const answer = observation('reversible', item.id, [item.stateIds[0]])
    const original = structuredClone(answer)
    expect(resolveObservations(dataset, context('female'), [answer]).suspended[0].reason).toBe('inapplicable')
    expect(resolveObservations(dataset, context('male'), [answer]).active).toEqual([answer])
    expect(resolveObservations(dataset, context('female'), [answer]).suspended[0].observation).toEqual(answer)
    expect(answer).toEqual(original)
  })

  it('supports OR alternatives but rejects joint observations unless the exact set is declared valid', () => {
    const mixed = findMixedProfile()
    const alternatives = observation('or', mixed.item.id, [mixed.support, mixed.absent], { expression: 'alternatives' })
    expect(candidate(evaluateGenusIdentification(dataset, context(), [alternatives]), mixed.taxon.id).evidence[0].outcome).toBe('support')

    const joint = observation('joint', mixed.item.id, [mixed.support, mixed.absent], { expression: 'joint' })
    expect(() => evaluateGenusIdentification(dataset, context(), [joint])).toThrow(/not explicitly valid/)

    const withJoint: GenusEngineDataset = {
      ...dataset,
      characters: dataset.characters.map((item) => item.id === mixed.item.id ? { ...item, jointStateSets: [[mixed.support, mixed.absent]] } : item),
    }
    expect(candidate(evaluateGenusIdentification(withJoint, context(), [joint]), mixed.taxon.id).evidence[0].outcome).toBe('strong_contradiction')
  })

  it('rejects observations mixed across specimens or characters', () => {
    const item = dataset.characters[0]
    expect(() => evaluateGenusIdentification(dataset, context(), [observation('wrong-specimen', item.id, [item.stateIds[0]], { specimenId: 'other' })])).toThrow(/different specimen/)
    expect(() => evaluateGenusIdentification(dataset, context(), [observation('wrong-character', item.id, [dataset.characters[1].stateIds[0]])])).toThrow(/another character/)
  })

  it('is deterministic under answer reordering and lets removal or revision restore candidates', () => {
    const mixed = findMixedProfile()
    const support = observation('a-support', mixed.item.id, [mixed.support])
    const conflict = observation('b-conflict', mixed.item.id, [mixed.absent])
    const forward = evaluateGenusIdentification(dataset, context(), [support, conflict])
    const reverse = evaluateGenusIdentification(dataset, context(), [conflict, support])
    expect(reverse).toEqual(forward)
    expect(candidate(forward, mixed.taxon.id).band).toBe('contradicted')
    expect(candidate(evaluateGenusIdentification(dataset, context(), [support]), mixed.taxon.id).band).toBe('compatible')
    const revised = observation('b-conflict', mixed.item.id, [mixed.support])
    expect(candidate(evaluateGenusIdentification(dataset, context(), [support, revised]), mixed.taxon.id).band).not.toBe('contradicted')
    expect(forward.conflictRecovery.some((item) => item.observationId === 'b-conflict' && item.restoresCandidateIds.includes(mixed.taxon.id))).toBe(true)
  })

  it('uses graded contradictions and does not let sparse support look decisive', () => {
    const mixed = findMixedProfile()
    const tentativeConflict = observation('tentative', mixed.item.id, [mixed.absent], { certainty: 'tentative' })
    const match = candidate(evaluateGenusIdentification(dataset, context(), [tentativeConflict]), mixed.taxon.id)
    expect(match.evidence[0].outcome).toBe('tentative_contradiction')
    expect(match.band).toBe('possible')

    const sparse = candidate(evaluateGenusIdentification(dataset, context(), [observation('one', mixed.item.id, [mixed.support])]), mixed.taxon.id)
    expect(sparse.coverage.ratio).toBe(1)
    expect(sparse.band).toBe('compatible')
  })

  it('counts correlated answers once and requires independent support for the strong band', () => {
    const profile = findThreeSupports()
    const correlated = profile.supports.map((item, index) => observation(`s-${index}`, item.characterId, [item.stateId], { evidenceGroupId: 'same-evidence' }))
    const independent = profile.supports.map((item, index) => observation(`s-${index}`, item.characterId, [item.stateId], { evidenceGroupId: `evidence-${index}` }))
    expect(candidate(evaluateGenusIdentification(dataset, context(), correlated), profile.taxon.id)).toMatchObject({ supportGroups: 1, band: 'compatible' })
    expect(candidate(evaluateGenusIdentification(dataset, context(), independent), profile.taxon.id)).toMatchObject({ supportGroups: 3, band: 'strong' })
  })

  it('emits recoverable provenance for every active evidence item and explicit policy traces', () => {
    const mixed = findMixedProfile()
    const result = evaluateGenusIdentification(dataset, context(), [observation('trace-me', mixed.item.id, [mixed.support])])
    const citation = candidate(result, mixed.taxon.id).evidence[0].citation
    expect(citation.observationId).toBe('trace-me')
    expect(citation.matrixReference).toContain('02_lucid_matrix.json#')
    expect(citation.characterReference).toContain('01_lucid_schema.json#')
    expect(citation.stateReferences[0]).toContain('01_lucid_schema.json#')
    expect(citation.enginePolicyVersion).toBe(REVIEWED_POLICY.version)
    expect(result.trace.applicabilityInterpretationVersions).toContain('stage2-applicability@1')
  })

  it('fails explicitly for unknown source references instead of manufacturing zero evidence', () => {
    expect(() => sourceScore(dataset, 'missing-taxon', state('S001').id)).toThrow(/Unknown taxon/)
    expect(() => sourceScore(dataset, dataset.taxa[0].id, 'missing-state')).toThrow(/Unknown state/)
  })
})

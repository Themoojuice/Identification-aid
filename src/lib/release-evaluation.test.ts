import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  characterApplicability, createGenusDatasetFromScientificPackage, evaluateGenusIdentification,
  sourceScore,
} from './genus-engine'
import type { GenusObservation, ObservedCharacter, SpecimenContext } from './genus-engine'
import {
  createReconciliationDatasetFromScientificPackage, reconcileGenusEvaluation,
} from './concept-reconciliation'
import {
  createSchubertDatasetFromScientificPackage, evaluateSchubertEvidence, keyAvailability,
  observationWithStates, rankSchubertQuestions,
} from './schubert-engine'
import { rankLucidQuestions } from './question-ranking'
import { createSpeciesDatasetFromScientificPackage, evaluateSpeciesSuggestions } from './species-suggestions'
import { freshSession, restoreSessionExport, sessionExport } from './session'
import type { ScientificRuntimePackage } from './scientific-contract'

const scientific = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8')) as ScientificRuntimePackage
const examples = JSON.parse(readFileSync(resolve('09_examples.json'), 'utf8')) as { examples: Array<{ id: string }> }
const genus = createGenusDatasetFromScientificPackage(scientific)
const reconciliation = createReconciliationDatasetFromScientificPackage(scientific)
const schubert = createSchubertDatasetFromScientificPackage(scientific)
const species = createSpeciesDatasetFromScientificPackage(scientific)

const context = (sex: SpecimenContext['sex'] = 'male', lifeStage: SpecimenContext['lifeStage'] = 'adult', cleared: SpecimenContext['preparation']['epigyneCleared'] = 'unknown'): SpecimenContext => ({
  specimenId: 'release-specimen', sex, lifeStage, preparation: { epigyneCleared: cleared },
})
const lucidCharacter = (packetId: string) => genus.characters.find((item) => item.packetId === packetId)!
const schubertCharacter = (packetId: string) => schubert.characters.find((item) => item.packetId === packetId)!
const schubertState = (packetId: string) => schubert.states.find((item) => item.packetId === packetId)!
const observed = (id: string, characterId: string, stateIds: string[], certainty: ObservedCharacter['certainty'] = 'certain'): ObservedCharacter => ({
  id, specimenId: 'release-specimen', characterId, disposition: 'observed', expression: stateIds.length > 1 ? 'alternatives' : 'single', stateIds, certainty,
})

function supportingObservation(packetTaxonId: string, observationId: string) {
  const taxon = genus.taxa.find((item) => item.packetId === packetTaxonId)!
  for (const item of genus.characters) {
    if (characterApplicability(genus, context(), item.id).status !== 'applicable') continue
    const stateId = item.stateIds.find((id) => sourceScore(genus, taxon.id, id) === 1)
    if (stateId && !genus.allZeroProfiles.has(`${taxon.id}|${item.id}`)) return observed(observationId, item.id, [stateId])
  }
  throw new Error(`No usable support observation for ${packetTaxonId}`)
}

describe('Stage 8 packet example release regressions', () => {
  it('covers the complete eight-example packet explicitly', () => {
    expect(examples.examples.map((item) => item.id)).toEqual(['EX01', 'EX02', 'EX03', 'EX04', 'EX05', 'EX06', 'EX07', 'EX08'])
  })

  it('EX01 keeps unknown sex and poor-photo abstentions neutral', () => {
    const specimen = context('unknown', 'unknown')
    const abstentions: GenusObservation[] = [
      { id: 'poor-photo', specimenId: specimen.specimenId, characterId: lucidCharacter('F003').id, disposition: 'cannot_see' },
      { id: 'not-sure', specimenId: specimen.specimenId, characterId: lucidCharacter('F004').id, disposition: 'not_sure' },
    ]
    const result = evaluateGenusIdentification(genus, specimen, abstentions)
    expect(result.activeObservationIds).toEqual([])
    expect(result.candidates).toHaveLength(85)
    expect(result.candidates.every((item) => item.band === 'unassessed')).toBe(true)
    expect(characterApplicability(genus, specimen, lucidCharacter('F065').id).status).toBe('applicability_unknown')
  })

  it('EX02 adds adult-male Schubert evidence without replacing Lucid evidence', () => {
    const specimen = context('male', 'adult')
    const lucidObservation = supportingObservation('LTX043', 'lucid-maratus-region')
    const sourceEvaluation = evaluateGenusIdentification(genus, specimen, [lucidObservation])
    const schubertObservation = observationWithStates(schubertCharacter('SC003'), specimen.specimenId, [schubertState('SC003_A').id])
    const schubertEvaluation = evaluateSchubertEvidence(schubert, specimen, [schubertObservation])
    const result = reconcileGenusEvaluation(reconciliation, sourceEvaluation, schubertEvaluation.evidence)
    expect(keyAvailability(specimen).available).toBe(true)
    expect(sourceEvaluation.activeObservationIds).toEqual(['lucid-maratus-region'])
    expect(schubertEvaluation.activeObservationIds).toEqual([schubertObservation.id])
    expect(result.concepts.some((item) => item.independentEvidence.length > 0)).toBe(true)
    expect(result.concepts.some((item) => item.concept.nomenclaturalStatus.includes('thesis'))).toBe(true)
  })

  it('EX03 preserves a female Saitis-group outcome without running the male key', () => {
    const specimen = context('female', 'adult', 'no')
    const ranked = rankSchubertQuestions(schubert, specimen, [], 'field')
    expect(keyAvailability(specimen).available).toBe(false)
    expect(ranked.every((item) => { const character = schubert.characters.find((candidate) => candidate.id === item.characterId)!; return character.sex.length === 0 || character.sex.includes('female') })).toBe(true)
    expect(species.profiles.filter((item) => !item.sexesDescribed.includes('female')).length).toBeGreaterThan(0)
  })

  it('EX04 preserves legacy Maratus and all eight non-copied destinations', () => {
    const source = evaluateGenusIdentification(genus, context(), [])
    const reconciled = reconcileGenusEvaluation(reconciliation, source)
    const maratus = reconciled.historical.find((item) => item.sourcePacketId === 'LTX043')!
    expect(maratus.possibleConceptIds).toHaveLength(8)
    expect(maratus.unresolvedResidue).toBe(true)
    expect(reconciled.concepts.filter((item) => maratus.possibleConceptIds.includes(item.concept.id)).every((item) => item.independentSupportGroups === 0)).toBe(true)
    expect(source.candidates.some((item) => item.taxon.packetId === 'LTX043')).toBe(true)
  })

  it('EX05 withholds microscope-only questions in field mode and favours easier near-equals', () => {
    const specimen = context('male', 'adult')
    const fieldSchubert = rankSchubertQuestions(schubert, specimen, [], 'field')
    expect(fieldSchubert.every((item) => schubert.characters.find((character) => character.id === item.characterId)!.cost.usableIn.includes('field'))).toBe(true)
    const candidateIds = genus.taxa.filter((item) => !item.isRoot).slice(0, 18).map((item) => item.id)
    const lucid = rankLucidQuestions(genus, genus.characters, candidateIds, [], (item) => ({
      effort: item.packetId === 'F065' ? 5 : 2,
      errorRisk: item.packetId === 'F065' ? 'high' : 'moderate',
      usable: item.packetId !== 'F065',
      rationale: 'Release fixture using field-visible versus microscope-only costs.',
    }))
    expect(lucid.some((item) => item.characterId === lucidCharacter('F065').id)).toBe(false)
    for (let index = 1; index < lucid.length; index++) if (Math.abs(lucid[index - 1].resolutionGain - lucid[index].resolutionGain) <= 0.03) expect(lucid[index - 1].effort).toBeLessThanOrEqual(lucid[index].effort)
  })

  it('EX06 keeps SP0008 secondary, conditional and diagnostic-if-confirmed', () => {
    const profile = species.profiles.find((item) => item.packetId === 'SP0008')!
    const concept = reconciliation.concepts.find((item) => item.id === profile.genusConceptId)!
    const result = evaluateSpeciesSuggestions(species, {
      enabled: true, context: context('male', 'adult'), workMode: 'field', observations: [],
      conceptCandidates: [{ concept, assessment: 'independently_compatible' }],
      localityContext: ['Emerald'],
    })
    const bluey = result.results.find((item) => item.species.packetId === 'SP0008')!
    expect(bluey.outcome).toBe('diagnostic_if_confirmed')
    expect(bluey.constraints.join(' ')).toMatch(/angle- and lighting-sensitive/i)
    expect(result.localityUsedForScoring).toBe(false)
    expect(profile.nomenclaturalStatus).toContain('not_formally_published')
  })

  it('EX07 round-trips versioned evidence while taxonomy presentation can change independently', () => {
    const session = freshSession()
    session.contextStarted = true
    session.observations = [supportingObservation('LTX043', 'stored-historical-evidence')]
    const restored = restoreSessionExport(sessionExport(session, scientific.packageVersion))!
    expect(restored.observations).toEqual(session.observations)
    expect(restored.format).toBe(session.format)

    const renamed = structuredClone(scientific)
    const target = renamed.model.taxonConcepts.find((item) => item.aliases.some((alias) => alias.scheme === 'packet_id' && alias.value === 'TC0016'))!
    renamed.model.nameUsages.find((item) => item.id === target.preferredNameUsageId)!.exactSpelling = 'Changed display usage'
    const updated = createReconciliationDatasetFromScientificPackage(renamed)
    expect(updated.concepts.find((item) => item.id === target.id)?.label).toBe('Changed display usage')
    expect(updated.mappings.find((item) => item.packetId === 'CW001')?.targets[0].conceptId).toBe(target.id)
  })

  it('EX08 retains both conflicting Umbrattus type-species assertions with provenance', () => {
    const umbrattus = reconciliation.concepts.find((item) => item.packetId === 'TC0014')!
    expect(umbrattus.typeSpeciesAssertions.map((item) => [item.name, item.sourcePage])).toEqual([
      ['Umbrattus spectabilis', 239],
      ['Umbrattus bimaculatus', 240],
    ])
    expect(umbrattus.typeSpeciesAssertions.every((item) => item.provenance.startsWith('04_taxon_concepts.json#'))).toBe(true)
    expect(umbrattus.biologicalStatus).toContain('internal_type_species_conflict')
  })
})

describe('Stage 8 adverse and open-world cases', () => {
  it('retains juveniles, missing taxa and undescribed species as abstention or outside-coverage cases', () => {
    const juvenile = context('male', 'juvenile')
    expect(characterApplicability(genus, juvenile, lucidCharacter('F065').id).status).toBe('inapplicable')
    expect(keyAvailability(juvenile).available).toBe(false)
    const noEvidence = evaluateGenusIdentification(genus, juvenile, [])
    expect(noEvidence.candidates).toHaveLength(85)
    expect(species.otherPlacementCount).toBe(195)
    expect(species.comprehensive).toBe(false)
  })

  it('recovers from a contradictory answer and does not convert homoplasy into independent certainty', () => {
    const taxon = genus.taxa.find((item) => item.packetId === 'LTX043')!
    const item = genus.characters.find((candidate) => candidate.stateIds.some((id) => sourceScore(genus, taxon.id, id) === 1) && candidate.stateIds.some((id) => sourceScore(genus, taxon.id, id) === 0) && !genus.allZeroProfiles.has(`${taxon.id}|${candidate.id}`))!
    const supportState = item.stateIds.find((id) => sourceScore(genus, taxon.id, id) === 1)!
    const absent = item.stateIds.find((id) => sourceScore(genus, taxon.id, id) === 0)!
    const support = observed('support', item.id, [supportState])
    const conflict = observed('conflict', item.id, [absent])
    const withConflict = evaluateGenusIdentification(genus, context(), [support, conflict])
    expect(withConflict.conflictRecovery.some((entry) => entry.observationId === 'conflict' && entry.restoresCandidateIds.includes(taxon.id))).toBe(true)
    const recovered = evaluateGenusIdentification(genus, context(), [support])
    expect(recovered.candidates.find((candidate) => candidate.taxon.id === taxon.id)?.band).not.toBe('contradicted')

    const correlated = [0, 1, 2].map((index) => ({ ...support, id: `homoplasy-${index}`, evidenceGroupId: 'same-visible-pattern' }))
    expect(evaluateGenusIdentification(genus, context(), correlated).candidates.find((candidate) => candidate.taxon.id === taxon.id)?.supportGroups).toBe(1)
  })

  it('retains historical name usages and all open issue policies rather than silently resolving them', () => {
    expect(scientific.model.reviewIssues).toHaveLength(36)
    expect(scientific.model.reviewIssues.every((item) => item.status === 'open')).toBe(true)
    const exactUsages = scientific.model.nameUsages.map((item) => item.exactSpelling)
    expect(exactUsages).toContain('cf. Maileus sp.')
    expect(exactUsages).toContain('cf. Prostheclina sp.')
  })
})

describe('Stage 8 measured performance on the current test host', () => {
  it('records genus reevaluation and next-question ranking timings without claiming a device-class result', () => {
    const specimen = context('male', 'adult')
    const observations = genus.characters.slice(0, 8).flatMap((item, index) => {
      const stateId = item.stateIds[0]
      return stateId ? [observed(`perf-${index}`, item.id, [stateId], 'fairly_sure')] : []
    })
    const candidateIds = genus.taxa.filter((item) => !item.isRoot).map((item) => item.id)
    const measure = (run: () => void, iterations: number) => {
      run()
      const samples = Array.from({ length: iterations }, () => { const start = performance.now(); run(); return performance.now() - start }).sort((a, b) => a - b)
      return { medianMs: samples[Math.floor(samples.length * 0.5)], p95Ms: samples[Math.floor(samples.length * 0.95)], maxMs: samples.at(-1)! }
    }
    const reevaluation = measure(() => { evaluateGenusIdentification(genus, specimen, observations) }, 60)
    const ranking = measure(() => { rankLucidQuestions(genus, genus.characters, candidateIds, observations, () => ({ effort: 3, errorRisk: 'moderate', usable: true, rationale: 'Measured release fixture.' })) }, 20)
    console.info(`STAGE8_PERFORMANCE ${JSON.stringify({ host: 'current Codex Windows test host', reevaluation, ranking })}`)
    expect(Number.isFinite(reevaluation.p95Ms)).toBe(true)
    expect(Number.isFinite(ranking.p95Ms)).toBe(true)
  }, 20_000)
})

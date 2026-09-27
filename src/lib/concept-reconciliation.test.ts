import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createReconciliationDatasetFromScientificPackage,
  reconcileGenusEvaluation,
  type IndependentConceptEvidence,
} from './concept-reconciliation'
import {
  characterApplicability,
  createGenusDatasetFromScientificPackage,
  evaluateGenusIdentification,
  sourceScore,
  type ObservedCharacter,
  type SpecimenContext,
} from './genus-engine'

const scientificPackage = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8'))
const genusDataset = createGenusDatasetFromScientificPackage(scientificPackage)
const reconciliationDataset = createReconciliationDatasetFromScientificPackage(scientificPackage)
const specimen: SpecimenContext = { specimenId: 'stage3-specimen', sex: 'male', lifeStage: 'adult', preparation: { epigyneCleared: 'unknown' } }

const concept = (packetId: string) => {
  const value = reconciliationDataset.concepts.find((item) => item.packetId === packetId)
  if (!value) throw new Error(`Missing concept ${packetId}`)
  return value
}

const historical = (result: ReturnType<typeof reconcileGenusEvaluation>, packetId: string) => {
  const value = result.historical.find((item) => item.sourcePacketId === packetId)
  if (!value) throw new Error(`Missing historical entity ${packetId}`)
  return value
}

function oneStateObservationFor(packetId: string, code: number): ObservedCharacter {
  const taxon = genusDataset.taxa.find((item) => item.packetId === packetId)!
  for (const item of genusDataset.characters) {
    if (characterApplicability(genusDataset, specimen, item.id).status !== 'applicable') continue
    const stateId = item.stateIds.find((id) => sourceScore(genusDataset, taxon.id, id) === code)
    if (stateId && !genusDataset.allZeroProfiles.has(`${taxon.id}|${item.id}`)) {
      return { id: `${packetId}-${code}`, specimenId: specimen.specimenId, characterId: item.id, disposition: 'observed', expression: 'single', stateIds: [stateId], certainty: 'certain' }
    }
  }
  throw new Error(`No code ${code} observation found for ${packetId}`)
}

describe('Stage 3 typed concept reconciliation', () => {
  it('parses all reviewed mappings and retains every concept qualification', () => {
    expect(reconciliationDataset.mappings).toHaveLength(10)
    expect(reconciliationDataset.concepts).toHaveLength(23)
    expect(new Set(reconciliationDataset.mappings.flatMap((mapping) => mapping.components.map((item) => item.id))).size)
      .toBe(reconciliationDataset.mappings.reduce((sum, mapping) => sum + mapping.components.length, 0))
    expect(concept('TC0004').nomenclaturalStatus).toContain('thesis_not_formally_published')
  })

  it('exposes all eight LTX043 destinations and unresolved residue without cloning its evidence', () => {
    const sourceEvaluation = evaluateGenusIdentification(genusDataset, specimen, [])
    const before = structuredClone(sourceEvaluation)
    const result = reconcileGenusEvaluation(reconciliationDataset, sourceEvaluation)
    const maratus = historical(result, 'LTX043')
    expect(maratus.possibleConceptIds.map((id) => reconciliationDataset.concepts.find((item) => item.id === id)!.packetId).sort())
      .toEqual(['TC0004', 'TC0005', 'TC0006', 'TC0007', 'TC0008', 'TC0011', 'TC0012', 'TC0015'])
    expect(maratus.unresolvedResidue).toBe(true)
    for (const conceptId of maratus.possibleConceptIds) {
      const destination = result.concepts.find((item) => item.concept.id === conceptId)!
      expect(destination.historicalRoutes.some((route) => route.sourcePacketId === 'LTX043' && route.transferScope === 'possible_destination')).toBe(true)
      expect(destination.independentEvidence).toEqual([])
      expect(destination.independentSupportGroups).toBe(0)
    }
    expect(sourceEvaluation).toEqual(before)
  })

  it('never treats Saitis or Salpesia non-equivalence edges as positive routes', () => {
    const result = reconcileGenusEvaluation(reconciliationDataset, evaluateGenusIdentification(genusDataset, specimen, []))
    const saitis = historical(result, 'LTX072')
    const salpesia = historical(result, 'LTX073')
    expect(saitis.possibleConceptIds).toHaveLength(4)
    expect(saitis.nonEquivalentConceptIds).toEqual([concept('TC0010').id])
    expect(saitis.possibleConceptIds).not.toContain(concept('TC0010').id)
    expect(salpesia.possibleConceptIds).toEqual([concept('TC0014').id])
    expect(salpesia.nonEquivalentConceptIds).toEqual([concept('TC0021').id])
    expect(result.concepts.find((item) => item.concept.packetId === 'TC0010')).toBeUndefined()
    expect(result.concepts.find((item) => item.concept.packetId === 'TC0021')).toBeUndefined()
  })

  it('retains Servaea as a reviewed unresolved historical result and labels other unmapped genera unreviewed', () => {
    const result = reconcileGenusEvaluation(reconciliationDataset, evaluateGenusIdentification(genusDataset, specimen, []))
    expect(historical(result, 'LTX075')).toMatchObject({ status: 'reviewed_unresolved', possibleConceptIds: [], unresolvedResidue: true })
    expect(result.historical.filter((item) => item.status === 'unreviewed')).toHaveLength(75)
    expect(result.unresolved.hasOutsideCoverage).toBe(true)
  })

  it('does not transfer a partial-overlap absence as a universal concept contradiction', () => {
    const sourceEvaluation = evaluateGenusIdentification(genusDataset, specimen, [oneStateObservationFor('LTX039', 0)])
    expect(sourceEvaluation.candidates.find((item) => item.taxon.packetId === 'LTX039')!.band).toBe('contradicted')
    const result = reconcileGenusEvaluation(reconciliationDataset, sourceEvaluation)
    const jotus = result.concepts.find((item) => item.concept.packetId === 'TC0006')!
    expect(jotus.historicalRoutes.some((route) => route.sourcePacketId === 'LTX039' && route.transferScope === 'possible_destination')).toBe(true)
    expect(jotus.independentContradictionGroups).toBe(0)
    expect(jotus.assessment).not.toBe('contradicted')
  })

  it('allows scoped equivalence to carry historical compatibility with explicit provenance', () => {
    const sourceEvaluation = evaluateGenusIdentification(genusDataset, specimen, [oneStateObservationFor('LTX012', 1)])
    const result = reconcileGenusEvaluation(reconciliationDataset, sourceEvaluation)
    const barraina = result.concepts.find((item) => item.concept.packetId === 'TC0016')!
    expect(barraina.assessment).toBe('historically_compatible')
    expect(barraina.independentSupportGroups).toBe(0)
    expect(barraina.historicalRoutes[0]).toMatchObject({ sourcePacketId: 'LTX012', transferScope: 'scoped_equivalence' })
    expect(barraina.historicalRoutes[0].provenance[0]).toContain('06_taxon_crosswalk.json#')
  })

  it('does not count multiple historical routes to one concept as duplicate support', () => {
    const result = reconcileGenusEvaluation(reconciliationDataset, evaluateGenusIdentification(genusDataset, specimen, []))
    const variattus = result.concepts.find((item) => item.concept.packetId === 'TC0015')!
    expect(variattus.historicalRoutes.map((route) => route.sourcePacketId).sort()).toEqual(['LTX043', 'LTX072'])
    expect(variattus.independentSupportGroups).toBe(0)
    expect(variattus.assessment).toBe('possible_destination')
  })

  it('keeps independent concept evidence reachable even without a historical route', () => {
    const target = concept('TC0013')
    const evidence: IndependentConceptEvidence[] = [0, 1, 2].map((index) => ({
      id: `independent-${index}`,
      conceptId: target.id,
      outcome: 'support',
      evidenceGroupId: `group-${index}`,
      explanation: 'Synthetic engine-boundary evidence used to test independent reachability.',
      provenance: [`test-assertion-${index}`],
    }))
    const result = reconcileGenusEvaluation(reconciliationDataset, evaluateGenusIdentification(genusDataset, specimen, []), evidence)
    const conceptResult = result.concepts.find((item) => item.concept.id === target.id)!
    expect(conceptResult).toMatchObject({ assessment: 'independently_strong', independentSupportGroups: 3 })
    expect(conceptResult.historicalRoutes).toEqual([])
  })

  it('uses persistent identities, so changing a presentation name cannot change routing', () => {
    const changed = structuredClone(scientificPackage)
    const target = changed.model.taxonConcepts.find((item: { aliases: Array<{ scheme: string; value: string }> }) => item.aliases.some((alias) => alias.scheme === 'packet_id' && alias.value === 'TC0016'))
    const usage = changed.model.nameUsages.find((item: { id: string }) => item.id === target.preferredNameUsageId)
    usage.exactSpelling = 'A renamed presentation label'
    const changedDataset = createReconciliationDatasetFromScientificPackage(changed)
    const changedMapping = changedDataset.mappings.find((item) => item.packetId === 'CW001')!
    expect(changedMapping.targets[0].conceptId).toBe(changedDataset.concepts.find((item) => item.packetId === 'TC0016')!.id)
    expect(changedDataset.concepts.find((item) => item.packetId === 'TC0016')!.label).toBe('A renamed presentation label')
  })
})

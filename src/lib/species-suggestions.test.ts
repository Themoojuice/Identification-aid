import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createGenusDatasetFromScientificPackage, evaluateGenusIdentification, REVIEWED_POLICY } from './genus-engine'
import type { SpecimenContext } from './genus-engine'
import type { ScientificRuntimePackage } from './scientific-contract'
import {
  createSpeciesDatasetFromScientificPackage, evaluateSpeciesSuggestions,
} from './species-suggestions'
import type { SpeciesObservation, SpeciesProfile } from './species-suggestions'

const scientific = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8')) as ScientificRuntimePackage
const dataset = createSpeciesDatasetFromScientificPackage(scientific)
const context = (sex: SpecimenContext['sex'] = 'male', lifeStage: SpecimenContext['lifeStage'] = 'adult', cleared: SpecimenContext['preparation']['epigyneCleared'] = 'unknown'): SpecimenContext => ({ specimenId: 'stage7-specimen', sex, lifeStage, preparation: { epigyneCleared: cleared } })
const profile = (packetId: string) => dataset.profiles.find((item) => item.packetId === packetId)!
const candidate = (species: SpeciesProfile, assessment: 'independently_strong' | 'independently_compatible' | 'historically_compatible' | 'possible_destination' = 'independently_compatible') => ({
  concept: { id: species.genusConceptId, packetId: species.genusConceptPacketId, label: species.name.split(' ')[0], qualifier: null, rank: 'genus', biologicalStatus: 'reviewed', nomenclaturalStatus: 'qualified', typeSpeciesAssertions: [], sourceNotes: null },
  assessment,
})
const observation = (species: SpeciesProfile, hintIndex: number, response: SpeciesObservation['response'] = 'matches', certainty: SpeciesObservation['certainty'] = 'certain'): SpeciesObservation => ({
  id: `species-observation:${species.packetId}:${hintIndex}`,
  specimenId: 'stage7-specimen',
  speciesId: species.id,
  hintId: species.hints[hintIndex].id,
  response,
  certainty,
})

describe('selective species suggestion service', () => {
  it('pauses microscopic hints in field mode and restores them without losing answers', () => {
    const species = profile('SP0014')
    const input = { enabled: true, context: context(), conceptCandidates: [candidate(species)], observations: [observation(species, 0)] }
    const field = evaluateSpeciesSuggestions(dataset, { ...input, workMode: 'field' }).results.find((item) => item.species.id === species.id)!
    expect(field.supportedHintIds).toEqual([])
    const microscope = evaluateSpeciesSuggestions(dataset, { ...input, workMode: 'microscope' }).results.find((item) => item.species.id === species.id)!
    expect(microscope.supportedHintIds).toEqual([species.hints[0].id])
    expect(microscope.outcome).toBe('plausible')
  })
  it('pauses saved sex-specific evidence when sex or maturity is unknown', () => {
    const species = profile('SP0008')
    for (const specimen of [context('unknown'), context('male', 'unknown')]) {
      const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: specimen, workMode: 'field', conceptCandidates: [candidate(species)], observations: [observation(species, 0)] })
      expect(result.results.find((item) => item.species.id === species.id)?.supportedHintIds).toEqual([])
    }
  })

  it('does not turn a source limitation about female identifiability into positive evidence', () => {
    const species = profile('SP0011')
    const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context('female'), workMode: 'field', conceptCandidates: [candidate(species)], observations: [observation(species, 1)] })
    const suggestion = result.results.find((item) => item.species.id === species.id)!
    expect(suggestion.supportedHintIds).toEqual([])
    expect(suggestion.outcome).toBe('possible')
  })

  it('does not claim strong comparison coverage merely because two selective profiles exist', () => {
    const species = profile('SP0005')
    const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context('female'), workMode: 'field', conceptCandidates: [candidate(species)], observations: [observation(species, 2)] })
    expect(result.results.find((item) => item.species.id === species.id)?.outcome).not.toBe('strong_candidate')
  })
  it('parses all 32 selective profiles with stable hint provenance and explicit incomplete coverage', () => {
    expect(dataset.profiles).toHaveLength(32)
    expect(dataset.profiles.every((item) => item.hints.length > 0)).toBe(true)
    expect(new Set(dataset.profiles.flatMap((item) => item.hints.map((hint) => hint.id))).size).toBe(dataset.profiles.flatMap((item) => item.hints).length)
    expect(dataset.otherPlacementCount).toBe(195)
    expect(dataset.comprehensive).toBe(false)
  })

  it('supports conservative outcomes without locality scoring or unreviewed strong status', () => {
    const strongProfile = profile('SP0003')
    const diagnostic = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'microscope', conceptCandidates: [candidate(strongProfile)], observations: [] })
    expect(diagnostic.results.find((item) => item.species.packetId === 'SP0003')?.outcome).toBe('diagnostic_if_confirmed')
    const plausible = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'field', conceptCandidates: [candidate(strongProfile)], observations: [observation(strongProfile, 0)] })
    expect(plausible.results.find((item) => item.species.packetId === 'SP0003')?.outcome).toBe('plausible')
    const strong = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'microscope', conceptCandidates: [candidate(strongProfile)], observations: [observation(strongProfile, 0), observation(strongProfile, 1)] })
    // v2 deliberately withholds strong status: two selective profiles do not
    // compare this specimen with unprofiled H. scutulatum or H. griseum.
    expect(strong.results.find((item) => item.species.packetId === 'SP0003')?.outcome).toBe('plausible')
    const possible = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context('unknown'), workMode: 'field', conceptCandidates: [candidate(strongProfile)], observations: [] })
    expect(possible.results.find((item) => item.species.packetId === 'SP0003')?.outcome).toBe('possible')
    const none = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'field', conceptCandidates: [], observations: [], localityContext: ['Hithergreen'] })
    expect(none.visibleResults).toHaveLength(0)
    expect(none.localityUsedForScoring).toBe(false)
  })

  it('never activates a profile from a split/partial-overlap destination alone', () => {
    const species = profile('SP0008')
    const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'field', conceptCandidates: [candidate(species, 'possible_destination')], observations: [observation(species, 0)] })
    expect(result.visibleResults).toHaveLength(0)
  })

  it('keeps male-only profiles unavailable to females and juveniles', () => {
    const species = profile('SP0008')
    const female = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context('female', 'adult', 'yes'), workMode: 'microscope', conceptCandidates: [candidate(species)], observations: [] })
    const juvenile = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context('male', 'juvenile'), workMode: 'field', conceptCandidates: [candidate(species)], observations: [] })
    expect(female.results.find((item) => item.species.packetId === 'SP0008')?.outcome).toBe('none')
    expect(juvenile.results.find((item) => item.species.packetId === 'SP0008')?.outcome).toBe('none')
  })

  it('caps SP0008 at plausible and exposes its angle and lighting limitation', () => {
    const species = profile('SP0008')
    const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'field', conceptCandidates: [candidate(species, 'independently_strong')], observations: [observation(species, 0)] })
    const suggestion = result.results.find((item) => item.species.packetId === 'SP0008')!
    expect(suggestion.outcome).toBe('plausible')
    expect(suggestion.constraints.join(' ')).toMatch(/angle- and lighting-sensitive/i)
  })

  it('applies stricter female hint limitations over species-wide photo feasibility', () => {
    const species = profile('SP0025')
    const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context('female', 'adult', 'no'), workMode: 'field', conceptCandidates: [candidate(species, 'independently_strong')], observations: [observation(species, 2)] })
    const suggestion = result.results.find((item) => item.species.packetId === 'SP0025')!
    expect(suggestion.outcome).toBe('plausible')
    expect(suggestion.outcome).not.toBe('strong_candidate')
    expect(suggestion.species.limitations).toMatch(/associated male|molecular/i)
  })

  it('requires sufficient within-packet comparison coverage for strong status', () => {
    const species = profile('SP0001')
    const result = evaluateSpeciesSuggestions(dataset, { enabled: true, context: context(), workMode: 'microscope', conceptCandidates: [candidate(species, 'independently_strong')], observations: [observation(species, 0)] })
    expect(result.results.find((item) => item.species.packetId === 'SP0001')?.outcome).toBe('plausible')
  })

  it('switching off or invoking the removable module does not alter genus evaluation', () => {
    const genusDataset = createGenusDatasetFromScientificPackage(scientific)
    const specimen = context('unknown', 'unknown')
    const before = evaluateGenusIdentification(genusDataset, specimen, [], REVIEWED_POLICY)
    const disabled = evaluateSpeciesSuggestions(dataset, { enabled: false, context: specimen, workMode: 'field', conceptCandidates: [], observations: [] })
    const after = evaluateGenusIdentification(genusDataset, specimen, [], REVIEWED_POLICY)
    expect(disabled.results).toEqual([])
    expect(after).toEqual(before)
  })
})

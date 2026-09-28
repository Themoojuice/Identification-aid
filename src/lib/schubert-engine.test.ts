import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { SpecimenContext } from './genus-engine'
import {
  createSchubertDatasetFromScientificPackage, evaluateSchubertEvidence, followPublishedKeyBranch,
  keyAvailability, keyTerminalEvidence, observationWithStates, publishedKeyNode, rankSchubertQuestions,
  schubertApplicability,
} from './schubert-engine'

const scientific = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8'))
const dataset = createSchubertDatasetFromScientificPackage(scientific)
const context = (sex: SpecimenContext['sex'] = 'male', lifeStage: SpecimenContext['lifeStage'] = 'adult'): SpecimenContext => ({ specimenId: 's1', sex, lifeStage, preparation: { epigyneCleared: 'unknown' } })
const character = (packetId: string) => dataset.characters.find((item) => item.packetId === packetId)!
const state = (packetId: string) => dataset.states.find((item) => item.packetId === packetId)!
const concept = (packetId: string) => dataset.conceptIds.find((id) => id.endsWith(`:${packetId.toLowerCase()}`))!

describe('Schubert scientific integration', () => {
  it('parses the complete reviewed packet without changing identities', () => {
    expect(dataset.characters).toHaveLength(44)
    expect(dataset.states).toHaveLength(139)
    expect(dataset.assertions).toHaveLength(123)
    expect(dataset.quarantinedIssues).toEqual(['AU03', 'AU04', 'AU05'])
  })

  it('uses reviewed assertion pages while retaining original packet locators', () => {
    const corrected = dataset.assertions.filter((item) => item.provenanceCorrectionId)
    expect(corrected).toHaveLength(21)
    const maratus = corrected.filter((item) => item.originalSourcePage === 176)
    const prostheclina = corrected.filter((item) => item.originalSourcePage === 198 || item.originalSourcePage === 199)
    expect(maratus).toHaveLength(11)
    expect(prostheclina).toHaveLength(10)
    expect(maratus.every((item) => item.sourcePage === 178)).toBe(true)
    expect(prostheclina.every((item) => item.sourcePage === item.originalSourcePage + 2)).toBe(true)
    expect(corrected.every((item) => item.provenance.some((value) => value.startsWith('Original packet locator:')))).toBe(true)
    expect(corrected.every((item) => item.provenance.some((value) => value.includes('provenance-corrections.json#PLC')))).toBe(true)
  })

  it('keeps adult-male key scope separate from female-supported assertions', () => {
    expect(keyAvailability(context('female', 'adult')).available).toBe(false)
    expect(keyAvailability(context('male', 'juvenile')).available).toBe(false)
    expect(keyAvailability(context('male', 'adult')).available).toBe(true)
    const femaleCharacter = character('SC030')
    expect(schubertApplicability(femaleCharacter, context('female', 'adult'), 'microscope').status).toBe('applicable')
    expect(dataset.assertions.some((item) => item.characterId === femaleCharacter.id && item.sex.includes('female'))).toBe(true)
  })

  it('preserves K10 OR and K11 three-part AND branch semantics', () => {
    const k10 = publishedKeyNode(dataset.key, 'K10')
    const k11 = publishedKeyNode(dataset.key, 'K11')
    expect(k10.kind).toBe('question')
    expect(k10.kind === 'question' && k10.branches[0].match).toBe('any')
    expect(k10.kind === 'question' && k10.branches[0].stateIds).toHaveLength(2)
    expect(k11.kind).toBe('question')
    expect(k11.kind === 'question' && k11.branches.every((branch) => branch.match === 'all')).toBe(true)
    expect(k11.kind === 'question' && k11.branches.every((branch) => branch.conditions.length === 3)).toBe(true)
  })

  it('follows the exact key graph and treats a terminal as scoped support', () => {
    const terminal = followPublishedKeyBranch(dataset.key, 'K8', 0)
    expect(terminal.kind).toBe('terminal')
    if (terminal.kind !== 'terminal') return
    expect(terminal.verbatimResult).toBe('Jotus')
    const evidence = keyTerminalEvidence(terminal)
    expect(evidence.outcome).toBe('support')
    expect(evidence.explanation).toContain('not a universal exclusion')
  })

  it('uses matching assertions as support and missing assertions as unscored', () => {
    const observed = observationWithStates(character('SC003'), 's1', [state('SC003_A').id])
    const result = evaluateSchubertEvidence(dataset, context(), [observed])
    const anablemum = result.evidence.find((item) => item.conceptId === concept('TC0004'))!
    expect(anablemum.outcome).toMatch(/support/)
    expect(anablemum.provenance).toContain('AU03')
    expect(result.evidence.some((item) => item.outcome === 'unscored')).toBe(true)
    expect(result.evidence.find((item) => item.outcome === 'unscored')?.explanation).toContain('not absent')
  })

  it('never turns AU04 or AU05 into generic exclusion evidence', () => {
    const observations = [
      observationWithStates(character('SC002'), 's1', [state('SC002_A').id]),
      observationWithStates(character('SC029'), 's1', [state('SC029_G').id]),
    ]
    const result = evaluateSchubertEvidence(dataset, context(), observations)
    expect(result.evidence.every((item) => !item.outcome.includes('contradiction'))).toBe(true)
    expect(result.trace.quarantinedIssueIds).toEqual(['AU03', 'AU04', 'AU05'])
  })
})

describe('transparent question utility', () => {
  it('does not separate profiles whose reported states overlap', () => {
    const ranked = rankSchubertQuestions(dataset, context(), [], 'microscope', [concept('TC0009'), concept('TC0005')])
    const relativeLegLength = ranked.find((item) => item.characterId === character('SC002').id)
    if (relativeLegLength) expect(relativeLegLength.resolutionGain).toBeLessThanOrEqual(1)
    expect(ranked.every((item) => item.explanation.includes('explicitly reported, non-overlapping profiles'))).toBe(true)
  })

  it('removes microscope-only genital observations from field ranking', () => {
    const ranked = rankSchubertQuestions(dataset, context(), [], 'field')
    expect(ranked.some((item) => character('SC004').id === item.characterId)).toBe(false)
  })

  it('favours lower effort when raw separation is nearly equal and is deterministic', () => {
    const first = rankSchubertQuestions(dataset, context(), [], 'microscope')
    const second = rankSchubertQuestions(dataset, context(), [], 'microscope')
    expect(first).toEqual(second)
    for (let index = 1; index < first.length; index++) {
      const previous = first[index - 1]
      const current = first[index]
      if (Math.abs(previous.resolutionGain - current.resolutionGain) <= 0.03) expect(previous.effort).toBeLessThanOrEqual(current.effort)
    }
  })
})

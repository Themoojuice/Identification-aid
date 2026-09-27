import { sourceScore } from './genus-engine'
import type { GenusCharacter, GenusEngineDataset, GenusObservation } from './genus-engine'

export interface LucidQuestionCost {
  effort: number
  errorRisk: 'low' | 'moderate' | 'high'
  usable: boolean
  rationale: string
}

export interface RankedLucidQuestion {
  source: 'lucid'
  characterId: string
  resolutionGain: number
  coverage: number
  utility: number
  effort: number
  redundant: boolean
  explanation: string
}

/**
 * Conservative utility: state sets separate candidates only when both source
 * profiles are reported and disjoint. Scores marked source-uncertain (3) or
 * apparent/misinterpreted (4/5) do not become positive biological evidence or
 * pseudo-probabilities.
 */
export function rankLucidQuestions(
  dataset: GenusEngineDataset,
  characters: GenusCharacter[],
  candidateTaxonIds: string[],
  observations: GenusObservation[],
  costFor: (character: GenusCharacter) => LucidQuestionCost,
): RankedLucidQuestion[] {
  const answered = new Set(observations.map((item) => item.characterId))
  const observedGroups = new Set(observations.map((item) => dataset.characters.find((character) => character.id === item.characterId)?.groupPacketId).filter(Boolean))
  const pairs = Math.max(1, candidateTaxonIds.length * (candidateTaxonIds.length - 1) / 2)
  return characters.filter((character) => !answered.has(character.id)).map((character) => {
    const cost = costFor(character)
    const profiles = new Map(candidateTaxonIds.map((taxonId) => [taxonId, new Set(character.stateIds.filter((stateId) => [1, 2].includes(sourceScore(dataset, taxonId, stateId))))]))
    let separated = 0
    for (let left = 0; left < candidateTaxonIds.length; left++) for (let right = left + 1; right < candidateTaxonIds.length; right++) {
      const a = profiles.get(candidateTaxonIds[left])!
      const b = profiles.get(candidateTaxonIds[right])!
      if (a.size && b.size && [...a].every((state) => !b.has(state))) separated++
    }
    const resolutionGain = separated / pairs
    const coverage = candidateTaxonIds.length ? [...profiles.values()].filter((states) => states.size).length / candidateTaxonIds.length : 0
    const redundant = observedGroups.has(character.groupPacketId)
    const risk = cost.errorRisk === 'high' ? 0.62 : cost.errorRisk === 'moderate' ? 0.82 : 1
    const effort = 1 - Math.max(0, Math.min(4, cost.effort - 1)) * 0.1
    const utility = resolutionGain * (0.55 + 0.45 * coverage) * risk * effort * (redundant ? 0.72 : 1) * (cost.usable ? 1 : 0)
    return {
      source: 'lucid' as const, characterId: character.id, resolutionGain, coverage, utility,
      effort: cost.effort, redundant,
      explanation: `${Math.round(resolutionGain * 100)}% pair separation across explicitly positive, non-overlapping source profiles; ${Math.round(coverage * 100)}% source coverage. ${cost.rationale}${redundant ? ' A related character group is already represented.' : ''}`,
    }
  }).filter((item) => item.utility > 0).sort((a, b) => {
    if (Math.abs(a.resolutionGain - b.resolutionGain) <= 0.03 && a.effort !== b.effort) return a.effort - b.effort
    return b.utility - a.utility || a.effort - b.effort || a.characterId.localeCompare(b.characterId)
  })
}

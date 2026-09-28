import type { IndependentConceptEvidence } from './concept-reconciliation'
import type { GenusObservation, ObservationCertainty, SpecimenContext } from './genus-engine'
import type { ScientificRuntimePackage } from './scientific-contract'
import type { WorkMode } from './types'

export const SCHUBERT_POLICY_VERSION = 'stage5-schubert-reviewed@2'
export const QUESTION_UTILITY_VERSION = 'stage5-question-utility@1'

export interface SchubertState {
  id: string
  packetId: string
  characterId: string
  label: string
}

export interface ObservationCost {
  effort: 1 | 2 | 3 | 4 | 5
  errorRisk: 'low' | 'moderate' | 'high'
  usableIn: WorkMode[]
  basis: 'curator_product_judgment'
  rationale: string
}

export interface SchubertCharacter {
  id: string
  packetId: string
  label: string
  description: string
  anatomicalRegion: string
  stateIds: string[]
  sex: Array<'male' | 'female'>
  lifeStage: Array<'adult'>
  requiresGenitalia: boolean
  evidenceGroupId: string
  cost: ObservationCost
}

export interface SchubertAssertion {
  id: string
  conceptId: string
  characterId: string
  stateId: string
  assertionType: string
  strength: 'high' | 'moderate' | 'low' | 'not_applicable'
  variation: 'invariant' | 'typical' | 'rare' | 'variable' | 'unknown'
  sex: string[]
  lifeStage: string[]
  notes: string | null
  sourcePage: number
  originalSourcePage: number
  provenanceCorrectionId: string | null
  provenance: string[]
}

export interface PublishedKeyCondition { characterId: string; stateId: string }
export interface PublishedKeyBranch {
  nextNodeId: string
  match: 'single' | 'any' | 'all'
  stateIds: string[]
  conditions: PublishedKeyCondition[]
  verbatimLead: string
}
export interface PublishedKeyQuestionNode {
  kind: 'question'
  id: string
  couplet: number
  characterId: string
  branches: PublishedKeyBranch[]
  sourcePage: number
}
export interface PublishedKeyTerminalNode {
  kind: 'terminal'
  id: string
  conceptId: string
  verbatimResult: string
  sourcePage: number
}
export type PublishedKeyNode = PublishedKeyQuestionNode | PublishedKeyTerminalNode
export interface PublishedMaleKey {
  id: string
  rootNodeId: string
  nodes: PublishedKeyNode[]
  limitations: string
  provenance: string[]
}

export interface SchubertDataset {
  version: string
  characters: SchubertCharacter[]
  states: SchubertState[]
  assertions: SchubertAssertion[]
  conceptIds: string[]
  key: PublishedMaleKey
  quarantinedIssues: Array<'AU03' | 'AU04' | 'AU05'>
}

export type SchubertObservation = GenusObservation

export interface SchubertEvaluation {
  evidence: IndependentConceptEvidence[]
  activeObservationIds: string[]
  suspended: Array<{ observation: SchubertObservation; reason: string }>
  trace: { policyVersion: string; quarantinedIssueIds: string[] }
}

export interface QuestionUtility {
  characterId: string
  source: 'schubert'
  resolutionGain: number
  coverage: number
  utility: number
  effort: number
  errorRisk: ObservationCost['errorRisk']
  redundant: boolean
  explanation: string
}

type UnknownRecord = Record<string, unknown>
const object = (value: unknown, label: string): UnknownRecord => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`)
  return value as UnknownRecord
}
const list = (value: unknown, label: string): unknown[] => {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  return value
}
const string = (value: unknown, label: string): string => {
  if (typeof value !== 'string') throw new Error(`${label} is not a string`)
  return value
}
const strings = (value: unknown, label: string) => list(value, label).map((item) => string(item, label))

function packetId(scientific: ScientificRuntimePackage, persistentId: string) {
  const alias = scientific.identities.aliases[persistentId]?.find((item) => item.scheme === 'packet_id')
  if (!alias) throw new Error(`Persistent identity ${persistentId} has no packet alias`)
  return alias.value
}

function persistentLookup(scientific: ScientificRuntimePackage) {
  const result = new Map<string, string>()
  for (const [id, aliases] of Object.entries(scientific.identities.aliases)) {
    const alias = aliases.find((item) => item.scheme === 'packet_id')
    if (alias) result.set(alias.value, id)
  }
  return result
}

function evidenceGroup(region: string) {
  const normalized = region.toLowerCase()
  if (normalized.includes('pedipalp') || normalized.includes('embol') || normalized.includes('tegul')) return 'schubert:male-palp'
  if (normalized.includes('epig') || normalized.includes('spermat') || normalized.includes('copulatory')) return 'schubert:female-genitalia'
  if (normalized.includes('opisthosoma')) return 'schubert:opisthosoma'
  if (normalized.includes('leg')) return 'schubert:legs'
  if (normalized.includes('carapace') || normalized.includes('ocular')) return 'schubert:carapace'
  if (normalized.includes('behaviour')) return 'schubert:behaviour'
  if (normalized.includes('distribution')) return 'schubert:distribution'
  return `schubert:${normalized.replace(/[^a-z0-9]+/g, '-')}`
}

/** Source observation fields are null; these costs are deliberately versioned product judgments. */
function observationCost(region: string, requiresGenitalia: boolean): ObservationCost {
  const normalized = region.toLowerCase()
  if (requiresGenitalia) return { effort: 5, errorRisk: 'high', usableIn: ['microscope'], basis: 'curator_product_judgment', rationale: 'Genitalic interpretation generally needs an adult specimen, suitable orientation and microscopy.' }
  if (normalized.includes('spine') || normalized.includes('chelic') || normalized.includes('clype')) return { effort: 3, errorRisk: 'moderate', usableIn: ['field', 'microscope'], basis: 'curator_product_judgment', rationale: 'A clear close view and careful orientation are usually needed.' }
  if (normalized.includes('distribution')) return { effort: 1, errorRisk: 'moderate', usableIn: ['field', 'microscope'], basis: 'curator_product_judgment', rationale: 'Locality is easy to supply but is corroborating context and may be uncertain.' }
  if (normalized.includes('behaviour')) return { effort: 4, errorRisk: 'high', usableIn: ['field'], basis: 'curator_product_judgment', rationale: 'Behaviour requires an appropriate live observation and abstention is common.' }
  return { effort: 2, errorRisk: 'moderate', usableIn: ['field', 'microscope'], basis: 'curator_product_judgment', rationale: 'This external character usually needs a clear, correctly oriented view.' }
}

export function createSchubertDatasetFromScientificPackage(scientific: ScientificRuntimePackage): SchubertDataset {
  const raw = object(scientific.rawSnapshots['05_schubert_genus_characters.json'], 'Schubert packet')
  const lookup = persistentLookup(scientific)
  const correctionByPointer = new Map(scientific.model.interpretations.provenanceCorrections.map((correction) => [correction.target.jsonPointer, correction]))
  const rawCharacters = list(raw.characters, 'Schubert characters').map((value) => object(value, 'Schubert character'))
  const characters: SchubertCharacter[] = rawCharacters.map((item) => {
    const packet = string(item.character_id, 'character ID')
    const id = lookup.get(packet)
    if (!id) throw new Error(`No persistent ID for ${packet}`)
    const applicability = object(item.applicability, `${packet} applicability`)
    const region = string(item.anatomical_region, `${packet} anatomical region`)
    const requiresGenitalia = applicability.requires_genitalia === true
    return {
      id,
      packetId: packet,
      label: string(item.name, `${packet} name`),
      description: string(item.description, `${packet} description`),
      anatomicalRegion: region,
      stateIds: list(item.states, `${packet} states`).map((state) => {
        const statePacket = string(object(state, 'state').state_id, 'state ID')
        const stateId = lookup.get(statePacket)
        if (!stateId) throw new Error(`No persistent ID for ${statePacket}`)
        return stateId
      }),
      sex: strings(applicability.sex, `${packet} sex`) as Array<'male' | 'female'>,
      lifeStage: strings(applicability.life_stage, `${packet} life stage`) as Array<'adult'>,
      requiresGenitalia,
      evidenceGroupId: evidenceGroup(region),
      cost: observationCost(region, requiresGenitalia),
    }
  })
  const states: SchubertState[] = rawCharacters.flatMap((item) => {
    const characterPacket = string(item.character_id, 'character ID')
    const characterId = lookup.get(characterPacket)!
    return list(item.states, `${characterPacket} states`).map((value) => {
      const state = object(value, 'Schubert state')
      const statePacket = string(state.state_id, 'state ID')
      return { id: lookup.get(statePacket)!, packetId: statePacket, characterId, label: string(state.label, `${statePacket} label`) }
    })
  })
  const assertions: SchubertAssertion[] = list(raw.taxon_character_assertions, 'Schubert assertions').map((value, index) => {
    const item = object(value, 'Schubert assertion')
    const source = object(item.source, 'assertion source')
    const conceptPacket = string(item.taxon_concept_id, 'assertion concept ID')
    const characterPacket = string(item.character_id, 'assertion character ID')
    const statePacket = string(item.state_id, 'assertion state ID')
    const pointer = `/taxon_character_assertions/${index}`
    const correction = correctionByPointer.get(pointer)
    const originalSourcePage = Number(source.page)
    const sourcePage = correction?.reviewedLocator.page ?? originalSourcePage
    return {
      id: `schubert:assertion:${index + 1}`,
      conceptId: lookup.get(conceptPacket)!, characterId: lookup.get(characterPacket)!, stateId: lookup.get(statePacket)!,
      assertionType: string(item.assertion_type, 'assertion type'),
      strength: string(item.strength, 'assertion strength') as SchubertAssertion['strength'],
      variation: string(item.variation, 'assertion variation') as SchubertAssertion['variation'],
      sex: strings(item.sex, 'assertion sex'), lifeStage: strings(item.life_stage, 'assertion life stage'),
      notes: item.notes === null ? null : string(item.notes, 'assertion notes'),
      sourcePage,
      originalSourcePage,
      provenanceCorrectionId: correction?.id ?? null,
      provenance: [
        `05_schubert_genus_characters.json#${pointer}`,
        `Schubert thesis p. ${sourcePage}`,
        ...(correction ? [`Original packet locator: Schubert thesis p. ${originalSourcePage}`, correction.evidence.correctionRecord, `interpretation:${correction.interpretationVersion}`] : []),
      ],
    }
  })
  const rawKey = object(raw.published_key, 'published male key')
  const nodes: PublishedKeyNode[] = list(rawKey.nodes, 'published key nodes').map((value) => {
    const node = object(value, 'published key node')
    const id = string(node.node_id, 'key node ID')
    if ('result_taxon_concept_id' in node) return {
      kind: 'terminal', id, conceptId: lookup.get(string(node.result_taxon_concept_id, 'terminal concept'))!,
      verbatimResult: string(node.verbatim_result, 'verbatim result'), sourcePage: Number(node.source_page),
    }
    return {
      kind: 'question', id, couplet: Number(node.couplet_number), characterId: lookup.get(string(node.character_id, 'key character'))!,
      sourcePage: Number(node.source_page),
      branches: list(node.branches, `${id} branches`).map((branchValue) => {
        const branch = object(branchValue, 'key branch')
        const conditionValues = Array.isArray(branch.conditions) ? branch.conditions : []
        const statePackets = Array.isArray(branch.state_ids) ? strings(branch.state_ids, 'branch states') : [string(branch.state_id, 'branch state')]
        const conditions = conditionValues.map((conditionValue) => {
          const condition = object(conditionValue, 'key condition')
          return { characterId: lookup.get(string(condition.character_id, 'condition character'))!, stateId: lookup.get(string(condition.state_id, 'condition state'))! }
        })
        return {
          nextNodeId: string(branch.next_node, 'next key node'),
          match: (branch.conditions_match ?? 'single') as PublishedKeyBranch['match'],
          stateIds: statePackets.map((statePacket) => lookup.get(statePacket)!), conditions,
          verbatimLead: string(branch.verbatim_lead, 'verbatim lead'),
        }
      }),
    }
  })
  const key: PublishedMaleKey = {
    id: string(rawKey.key_id, 'key ID'), rootNodeId: string(rawKey.root_node_id, 'root node'), nodes,
    limitations: string(rawKey.limitations, 'key limitations'),
    provenance: ['05_schubert_genus_characters.json#/published_key', 'Schubert thesis pp. 155–156'],
  }
  const conceptIds = [...new Set(assertions.map((item) => item.conceptId))]
  if (characters.length !== 44 || states.length !== 139 || assertions.length !== 123) throw new Error('Unexpected Schubert packet cardinality')
  return { version: SCHUBERT_POLICY_VERSION, characters, states, assertions, conceptIds, key, quarantinedIssues: ['AU03', 'AU04', 'AU05'] }
}

export function schubertApplicability(character: SchubertCharacter, context: SpecimenContext, mode: WorkMode) {
  if (character.sex.length && context.sex === 'unknown') return { status: 'unknown' as const, reason: `This character requires known ${character.sex.join(' or ')} sex.` }
  if (character.sex.length && !character.sex.includes(context.sex as 'male' | 'female')) return { status: 'inapplicable' as const, reason: `This is a ${character.sex.join(' or ')} character.` }
  if (character.lifeStage.includes('adult') && context.lifeStage === 'unknown') return { status: 'unknown' as const, reason: 'This assertion is scoped to adults.' }
  if (character.lifeStage.includes('adult') && context.lifeStage === 'juvenile') return { status: 'inapplicable' as const, reason: 'This assertion is adult-only.' }
  if (!character.cost.usableIn.includes(mode)) return { status: 'unavailable' as const, reason: 'The selected equipment is not suitable for this observation.' }
  return { status: 'applicable' as const, reason: 'Applicable to the current specimen context and equipment.' }
}

function assertionApplies(assertion: SchubertAssertion, context: SpecimenContext) {
  if (assertion.sex.length && !assertion.sex.includes(context.sex)) return false
  if (assertion.lifeStage.length && !assertion.lifeStage.includes(context.lifeStage)) return false
  return true
}

export function evaluateSchubertEvidence(dataset: SchubertDataset, context: SpecimenContext, observations: SchubertObservation[]): SchubertEvaluation {
  const evidence: IndependentConceptEvidence[] = []
  const activeObservationIds: string[] = []
  const suspended: SchubertEvaluation['suspended'] = []
  for (const observation of observations) {
    const character = dataset.characters.find((item) => item.id === observation.characterId)
    if (!character) { suspended.push({ observation, reason: 'Unknown Schubert character.' }); continue }
    if (observation.disposition !== 'observed') { suspended.push({ observation, reason: 'Abstentions are retained but do not score.' }); continue }
    const applicability = schubertApplicability(character, context, character.cost.usableIn[0])
    if (applicability.status === 'inapplicable' || applicability.status === 'unknown') { suspended.push({ observation, reason: applicability.reason }); continue }
    activeObservationIds.push(observation.id)
    for (const conceptId of dataset.conceptIds) {
      const assertions = dataset.assertions.filter((item) => item.conceptId === conceptId && item.characterId === character.id && assertionApplies(item, context))
      const matches = assertions.filter((item) => observation.stateIds.includes(item.stateId))
      const best = matches.sort((a, b) => strengthOrder(b) - strengthOrder(a))[0]
      const outcome = best ? (observation.certainty === 'tentative' || best.strength === 'low' || ['rare', 'variable', 'unknown'].includes(best.variation) ? 'tentative_support' : 'support') : 'unscored'
      const issue = issueFor(conceptId, character.packetId, dataset)
      evidence.push({
        id: `schubert-evidence:${observation.id}:${conceptId}`,
        conceptId, outcome, evidenceGroupId: character.evidenceGroupId,
        explanation: best
          ? `${best.assertionType.replaceAll('_', ' ')} ${best.variation} assertion matches the observation${issue ? `; ${issue} remains quarantined` : ''}.`
          : 'No applicable Schubert assertion reports this state for the concept; it remains unscored, not absent.',
        provenance: best ? [...best.provenance, `policy:${SCHUBERT_POLICY_VERSION}`, ...(issue ? [issue] : [])] : [`05_schubert_genus_characters.json`, `policy:${SCHUBERT_POLICY_VERSION}`],
      })
    }
  }
  return { evidence, activeObservationIds, suspended, trace: { policyVersion: SCHUBERT_POLICY_VERSION, quarantinedIssueIds: dataset.quarantinedIssues } }
}

function strengthOrder(assertion: SchubertAssertion) {
  return ({ high: 3, moderate: 2, low: 1, not_applicable: 0 } as const)[assertion.strength]
}

function issueFor(conceptId: string, characterPacketId: string, dataset: SchubertDataset) {
  const conceptPacket = packetIdFromDatasetConcept(conceptId)
  if (conceptPacket === 'TC0004' && characterPacketId === 'SC003') return 'AU03'
  if (conceptPacket === 'TC0005' && characterPacketId === 'SC002') return 'AU04'
  if (conceptPacket === 'TC0013' && characterPacketId === 'SC029') return 'AU05'
  return null
}

function packetIdFromDatasetConcept(conceptId: string) {
  const match = conceptId.match(/:tc:(tc\d+)$/i)
  return match ? match[1].toUpperCase() : conceptId
}

export function rankSchubertQuestions(dataset: SchubertDataset, context: SpecimenContext, observations: SchubertObservation[], mode: WorkMode, candidateConceptIds: string[] = dataset.conceptIds): QuestionUtility[] {
  const answered = new Set(observations.map((item) => item.characterId))
  const observedGroups = new Set(observations.map((item) => dataset.characters.find((character) => character.id === item.characterId)?.evidenceGroupId).filter(Boolean))
  const candidates = candidateConceptIds.filter((id) => dataset.conceptIds.includes(id))
  const pairCount = Math.max(1, candidates.length * (candidates.length - 1) / 2)
  return dataset.characters.filter((character) => !answered.has(character.id)).map((character) => {
    const applicability = schubertApplicability(character, context, mode)
    const profiles = new Map(candidates.map((conceptId) => [conceptId, new Set(dataset.assertions.filter((item) => item.conceptId === conceptId && item.characterId === character.id && assertionApplies(item, context)).map((item) => item.stateId))]))
    let separated = 0
    for (let left = 0; left < candidates.length; left++) for (let right = left + 1; right < candidates.length; right++) {
      const a = profiles.get(candidates[left])!
      const b = profiles.get(candidates[right])!
      if (a.size && b.size && [...a].every((state) => !b.has(state))) separated++
    }
    const covered = [...profiles.values()].filter((states) => states.size).length
    const resolutionGain = separated / pairCount
    const coverage = candidates.length ? covered / candidates.length : 0
    const redundant = observedGroups.has(character.evidenceGroupId)
    const availability = applicability.status === 'applicable' ? 1 : applicability.status === 'unknown' ? 0.25 : 0
    const risk = character.cost.errorRisk === 'high' ? 0.62 : character.cost.errorRisk === 'moderate' ? 0.82 : 1
    const effort = 1 - ((character.cost.effort - 1) * 0.1)
    const redundancy = redundant ? 0.72 : 1
    const utility = resolutionGain * (0.55 + 0.45 * coverage) * availability * risk * effort * redundancy
    return {
      characterId: character.id, source: 'schubert' as const, resolutionGain, coverage, utility, effort: character.cost.effort,
      errorRisk: character.cost.errorRisk, redundant,
      explanation: `${Math.round(resolutionGain * 100)}% pair separation across explicitly reported, non-overlapping profiles; ${Math.round(coverage * 100)}% source coverage. ${character.cost.rationale}${redundant ? ' A related evidence group is already represented.' : ''}`,
    }
  }).filter((item) => item.coverage > 0 && schubertApplicability(dataset.characters.find((character) => character.id === item.characterId)!, context, mode).status === 'applicable').sort((a, b) => {
    if (Math.abs(a.resolutionGain - b.resolutionGain) <= 0.03 && a.effort !== b.effort) return a.effort - b.effort
    return b.utility - a.utility || a.effort - b.effort || a.characterId.localeCompare(b.characterId)
  })
}

export function keyAvailability(context: SpecimenContext) {
  if (context.sex !== 'male' || context.lifeStage !== 'adult') return { available: false, reason: 'The published resolver is explicitly for adult males; it is not a female or juvenile key.' }
  return { available: true, reason: 'Adult-male scope confirmed.' }
}

export function publishedKeyNode(key: PublishedMaleKey, nodeId: string) {
  const node = key.nodes.find((item) => item.id === nodeId)
  if (!node) throw new Error(`Unknown published-key node ${nodeId}`)
  return node
}

export function followPublishedKeyBranch(key: PublishedMaleKey, nodeId: string, branchIndex: number) {
  const node = publishedKeyNode(key, nodeId)
  if (node.kind !== 'question') throw new Error('Cannot follow a branch from a terminal key node')
  const branch = node.branches[branchIndex]
  if (!branch) throw new Error(`Unknown branch ${branchIndex} at ${nodeId}`)
  return publishedKeyNode(key, branch.nextNodeId)
}

export function keyTerminalEvidence(node: PublishedKeyTerminalNode): IndependentConceptEvidence {
  return {
    id: `schubert-key:${node.id}`, conceptId: node.conceptId, outcome: 'support', evidenceGroupId: 'schubert:published-male-key',
    explanation: 'The complete published adult-male key resolved to this terminal. This is scoped key support, not a universal exclusion of other concepts.',
    provenance: ['05_schubert_genus_characters.json#/published_key', `Schubert thesis p. ${node.sourcePage}`, `policy:${SCHUBERT_POLICY_VERSION}`],
  }
}

export function observationWithStates(character: SchubertCharacter, specimenId: string, stateIds: string[], certainty: ObservationCertainty = 'certain'): SchubertObservation {
  return { id: `schubert-obs:${character.id}`, specimenId, characterId: character.id, disposition: 'observed', expression: stateIds.length === 1 ? 'single' : 'alternatives', stateIds, certainty, evidenceGroupId: character.evidenceGroupId }
}

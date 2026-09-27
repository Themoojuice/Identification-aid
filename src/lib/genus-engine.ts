/**
 * Pure Stage 2 genus engine.
 *
 * This module has no React, DOM, storage or network dependencies. It evaluates
 * historical Lucid source entities only; concept reconciliation is Stage 3.
 */

export type Sex = 'male' | 'female' | 'unknown'
export type LifeStage = 'adult' | 'juvenile' | 'unknown'
export type PreparationState = 'yes' | 'no' | 'unknown'
export type ObservationCertainty = 'certain' | 'fairly_sure' | 'tentative'
export type ObservationDisposition = 'observed' | 'not_sure' | 'cannot_see' | 'skipped' | 'inapplicable'
export type ObservationExpression = 'single' | 'alternatives' | 'joint'
export type Applicability = 'applicable' | 'inapplicable' | 'applicability_unknown'
export type EvidenceOutcome =
  | 'support'
  | 'tentative_support'
  | 'strong_contradiction'
  | 'tentative_contradiction'
  | 'source_uncertain'
  | 'source_unreported'
  | 'apparent_only'
export type EvidenceBand = 'strong' | 'compatible' | 'possible' | 'unassessed' | 'contradicted'

export interface SpecimenContext {
  specimenId: string
  sex: Sex
  lifeStage: LifeStage
  preparation: {
    epigyneCleared: PreparationState
  }
}

interface ObservationBase {
  id: string
  specimenId: string
  characterId: string
  disposition: ObservationDisposition
  evidenceGroupId?: string
}

export interface ObservedCharacter extends ObservationBase {
  disposition: 'observed'
  expression: ObservationExpression
  stateIds: string[]
  certainty: ObservationCertainty
}

export interface AbstainedCharacter extends ObservationBase {
  disposition: 'not_sure' | 'cannot_see' | 'skipped' | 'inapplicable'
}

export type GenusObservation = ObservedCharacter | AbstainedCharacter

export interface GenusTaxon {
  id: string
  packetId: string
  label: string
  isRoot: boolean
}

export interface GenusState {
  id: string
  packetId: string
  characterId: string
  label: string
}

export interface GenusCharacter {
  id: string
  packetId: string
  groupPacketId: string
  label: string
  stateIds: string[]
  jointStateSets: string[][]
}

export interface DependencyRule {
  id: string
  triggerStatePacketId: string
  effect: 'disable_group' | 'disable_character' | 'enable_character'
  targetPacketId: string
  sourceReference: string
}

export interface ApplicabilityOverlay {
  id: string
  characterPacketIds?: string[]
  groupPacketIds?: string[]
  sex?: Exclude<Sex, 'unknown'>
  adultOnly?: boolean
  preparation?: 'epigyne_cleared'
  provenance: string[]
  interpretationVersion: string
}

export interface GenusEngineDataset {
  version: string
  matrixId: string
  matrixCells: Uint8Array
  taxa: GenusTaxon[]
  characters: GenusCharacter[]
  states: GenusState[]
  dependencyRules: DependencyRule[]
  applicabilityOverlays: ApplicabilityOverlay[]
  allZeroProfiles: Set<string>
  scoreMeanings: Record<number, string>
  sourceReferences: {
    matrix: string
    dependencies: string
  }
}

export interface EnginePolicy {
  id: 'reviewed_default' | 'literal_source'
  version: string
  useReviewedApplicability: boolean
  protectAllZeroProfiles: boolean
  uncertaintyAddsSupport: false
}

export const REVIEWED_POLICY: EnginePolicy = {
  id: 'reviewed_default',
  version: 'stage2-reviewed-policy@1',
  useReviewedApplicability: true,
  protectAllZeroProfiles: true,
  uncertaintyAddsSupport: false,
}

export const LITERAL_SOURCE_POLICY: EnginePolicy = {
  id: 'literal_source',
  version: 'stage2-literal-source@1',
  useReviewedApplicability: false,
  protectAllZeroProfiles: false,
  uncertaintyAddsSupport: false,
}

export interface ApplicabilityResult {
  characterId: string
  status: Applicability
  reason: string
  citations: string[]
  interpretationVersion?: string
}

export interface ObservationResolution {
  active: ObservedCharacter[]
  suspended: Array<{
    observation: GenusObservation
    reason: 'abstained' | 'inapplicable' | 'applicability_unknown'
    applicability?: ApplicabilityResult
  }>
}

export interface EvidenceCitation {
  observationId: string
  matrixReference: string
  characterReference: string
  stateReferences: string[]
  interpretationReferences: string[]
  enginePolicyVersion: string
}

export interface CandidateEvidence {
  observationId: string
  characterId: string
  evidenceGroupId: string
  stateIds: string[]
  sourceCodes: number[]
  outcome: EvidenceOutcome
  explanation: string
  citation: EvidenceCitation
}

export interface CandidateCoverage {
  constrainingObservations: number
  assessedObservations: number
  unscoredObservations: number
  ratio: number
}

export interface CandidateResult {
  taxon: GenusTaxon
  band: EvidenceBand
  evidence: CandidateEvidence[]
  supportGroups: number
  tentativeSupportGroups: number
  strongContradictions: number
  tentativeContradictions: number
  coverage: CandidateCoverage
  explanation: string
  recheckObservationIds: string[]
}

export interface ConflictRecoverySuggestion {
  observationId: string
  characterId: string
  restoresCandidateIds: string[]
  explanation: string
}

export interface GenusEvaluation {
  specimenId: string
  policy: EnginePolicy
  context: SpecimenContext
  activeObservationIds: string[]
  suspended: ObservationResolution['suspended']
  candidates: CandidateResult[]
  conflictRecovery: ConflictRecoverySuggestion[]
  trace: {
    datasetVersion: string
    matrixId: string
    policyVersion: string
    applicabilityInterpretationVersions: string[]
  }
}

type UnknownRecord = Record<string, unknown>

function record(value: unknown, label: string): UnknownRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} is not an object`)
  return value as UnknownRecord
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is not an array`)
  return value
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} is not a string`)
  return value
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} is not a boolean`)
  return value
}

function decodeBase64(value: string): Uint8Array {
  if (typeof globalThis.atob === 'function') {
    const decoded = globalThis.atob(value)
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0))
  }
  return Uint8Array.from(Buffer.from(value, 'base64'))
}

/** Build the pure domain dataset from the Stage 1 scientific contract package. */
export function createGenusDatasetFromScientificPackage(input: unknown): GenusEngineDataset {
  const scientific = record(input, 'scientific package')
  const model = record(scientific.model, 'scientific package model')
  const identities = record(scientific.identities, 'scientific package identities')
  const aliases = record(identities.aliases, 'scientific package aliases')
  const snapshots = record(scientific.rawSnapshots, 'scientific package raw snapshots')
  const schema = record(snapshots['01_lucid_schema.json'], 'Lucid schema snapshot')
  const dependencies = record(snapshots['03_lucid_dependencies.json'], 'Lucid dependency snapshot')
  const matrix = record(model.matrix, 'matrix model')
  const interpretations = record(model.interpretations, 'interpretations model')
  const genusEngineInterpretations = record(interpretations.genusEngine, 'genus engine interpretations')

  const packetToPersistent = new Map<string, string>()
  for (const [persistentId, aliasValue] of Object.entries(aliases)) {
    for (const alias of array(aliasValue, `aliases for ${persistentId}`)) {
      const aliasRecord = record(alias, `alias for ${persistentId}`)
      if (aliasRecord.scheme === 'packet_id') packetToPersistent.set(text(aliasRecord.value, 'packet alias'), persistentId)
    }
  }
  const persistent = (packetId: string) => {
    const value = packetToPersistent.get(packetId)
    if (!value) throw new Error(`Missing persistent identity for ${packetId}`)
    return value
  }

  const rawGroups = array(schema.feature_groups, 'Lucid feature groups').map((value) => record(value, 'feature group'))
  const groupById = new Map(rawGroups.map((group) => [text(group.id, 'feature group ID'), group]))
  const rawFeatures = array(schema.features, 'Lucid features').map((value) => record(value, 'feature'))
  const rawStates = array(schema.states, 'Lucid states').map((value) => record(value, 'state'))
  const rawTaxa = array(schema.taxa, 'Lucid taxa').map((value) => record(value, 'taxon'))

  const states: GenusState[] = rawStates.map((state) => ({
    id: persistent(text(state.id, 'state ID')),
    packetId: text(state.id, 'state ID'),
    characterId: persistent(text(state.feature_id, 'state feature ID')),
    label: text(state.name, 'state name'),
  }))
  const stateByPacketId = new Map(states.map((state) => [state.packetId, state]))

  const characters: GenusCharacter[] = rawFeatures.map((feature) => {
    const groupPacketId = text(feature.group_id, 'feature group ID')
    if (!groupById.has(groupPacketId)) throw new Error(`Feature references unknown group ${groupPacketId}`)
    return {
      id: persistent(text(feature.id, 'feature ID')),
      packetId: text(feature.id, 'feature ID'),
      groupPacketId,
      label: text(feature.name, 'feature name'),
      stateIds: array(feature.state_ids, 'feature states').map((stateId) => persistent(text(stateId, 'state ID'))),
      // No Lucid character is declared joint-compatible in the packet. Reviewed
      // joint sets may be added without altering these source definitions.
      jointStateSets: [],
    }
  })

  const taxa: GenusTaxon[] = rawTaxa.map((taxon) => ({
    id: persistent(text(taxon.id, 'taxon ID')),
    packetId: text(taxon.id, 'taxon ID'),
    label: text(taxon.name, 'taxon name'),
    isRoot: boolean(taxon.is_root, 'taxon root flag'),
  }))

  const dependencyRules: DependencyRule[] = array(dependencies.dependencies, 'dependencies').map((value) => {
    const dependency = record(value, 'dependency')
    const trigger = record(dependency.trigger, 'dependency trigger')
    const effect = record(dependency.effect, 'dependency effect')
    const raw = record(dependency.raw_dependency, 'raw dependency')
    const effectType = text(effect.type, 'dependency effect type')
    const targetPacketId = effect.feature_id ? text(effect.feature_id, 'dependency feature target') : text(effect.feature_group_id, 'dependency group target')
    return {
      id: text(dependency.id, 'dependency ID'),
      triggerStatePacketId: text(trigger.state_id, 'dependency trigger state'),
      effect: effectType === 'disable_feature_group' ? 'disable_group'
        : effectType === 'disable_feature' ? 'disable_character' : 'enable_character',
      targetPacketId,
      sourceReference: `03_lucid_dependencies.json#${text(dependency.id, 'dependency ID')} (${text(raw.fragment, 'dependency fragment')})`,
    }
  })

  const overlays: ApplicabilityOverlay[] = array(genusEngineInterpretations.applicabilityOverlays, 'applicability interpretations').map((value) => {
    const overlay = record(value, 'applicability interpretation')
    if (overlay.evidenceClass !== 'curator_interpretation') throw new Error('Applicability interpretation is not distinguished from source facts')
    const optionalTextArray = (field: unknown, label: string) => field === undefined ? undefined : array(field, label).map((item) => text(item, label))
    const sex = overlay.sex === undefined ? undefined : text(overlay.sex, 'applicability sex')
    const preparation = overlay.preparation === undefined ? undefined : text(overlay.preparation, 'applicability preparation')
    if (sex !== undefined && sex !== 'male' && sex !== 'female') throw new Error(`Unsupported applicability sex ${sex}`)
    if (preparation !== undefined && preparation !== 'epigyne_cleared') throw new Error(`Unsupported preparation rule ${preparation}`)
    return {
      id: text(overlay.id, 'applicability interpretation ID'),
      characterPacketIds: optionalTextArray(overlay.characterPacketIds, 'applicability character IDs'),
      groupPacketIds: optionalTextArray(overlay.groupPacketIds, 'applicability group IDs'),
      sex,
      adultOnly: overlay.adultOnly === undefined ? undefined : boolean(overlay.adultOnly, 'adult-only flag'),
      preparation,
      provenance: array(overlay.provenance, 'applicability provenance').map((item) => text(item, 'applicability provenance reference')),
      interpretationVersion: text(overlay.interpretationVersion, 'applicability interpretation version'),
    }
  })

  const allZeroProfiles = new Set(array(interpretations.allZeroProfiles, 'all-zero profiles').map((value) => {
    const profile = record(value, 'all-zero profile')
    return `${text(profile.taxonId, 'all-zero taxon')}|${text(profile.featureId, 'all-zero feature')}`
  }))

  const cells = decodeBase64(text(matrix.cellsBase64, 'matrix cells'))
  if (cells.length !== taxa.length * states.length) throw new Error('Matrix byte length does not match taxon/state dimensions')
  for (const state of states) if (!stateByPacketId.has(state.packetId)) throw new Error(`Missing state ${state.packetId}`)

  return {
    version: text(scientific.packageVersion, 'package version'),
    matrixId: text(matrix.id, 'matrix ID'),
    matrixCells: cells,
    taxa,
    characters,
    states,
    dependencyRules,
    applicabilityOverlays: overlays,
    allZeroProfiles,
    scoreMeanings: Object.fromEntries(Object.values(record(matrix.scoreLegend, 'score legend')).map((value) => {
      const legend = record(value, 'score legend item')
      return [Number(legend.originalCode), text(legend.meaning, 'score meaning')]
    })),
    sourceReferences: {
      matrix: '02_lucid_matrix.json',
      dependencies: '03_lucid_dependencies.json',
    },
  }
}

function indexes(dataset: GenusEngineDataset) {
  return {
    taxonOffset: new Map(dataset.taxa.map((taxon, index) => [taxon.id, index])),
    stateOffset: new Map(dataset.states.map((state, index) => [state.id, index])),
    stateById: new Map(dataset.states.map((state) => [state.id, state])),
    characterById: new Map(dataset.characters.map((character) => [character.id, character])),
  }
}

export function sourceScore(dataset: GenusEngineDataset, taxonId: string, stateId: string): number {
  const lookup = indexes(dataset)
  const taxonOffset = lookup.taxonOffset.get(taxonId)
  const stateOffset = lookup.stateOffset.get(stateId)
  if (taxonOffset == null) throw new Error(`Unknown taxon ${taxonId}`)
  if (stateOffset == null) throw new Error(`Unknown state ${stateId}`)
  return dataset.matrixCells[(stateOffset * dataset.taxa.length) + taxonOffset]
}

function contextTriggerPacketIds(context: SpecimenContext): Set<string> {
  const result = new Set<string>()
  if (context.sex === 'male') result.add('S001')
  else if (context.sex === 'female') result.add('S002')
  else result.add('S004')
  if (context.sex === 'female') {
    if (context.preparation.epigyneCleared === 'yes') result.add('S006')
    if (context.preparation.epigyneCleared === 'no') result.add('S005')
  }
  return result
}

function overlayFor(dataset: GenusEngineDataset, character: GenusCharacter) {
  return dataset.applicabilityOverlays.filter((overlay) =>
    overlay.characterPacketIds?.includes(character.packetId) || overlay.groupPacketIds?.includes(character.groupPacketId))
}

export function characterApplicability(
  dataset: GenusEngineDataset,
  context: SpecimenContext,
  characterId: string,
  policy: EnginePolicy = REVIEWED_POLICY,
): ApplicabilityResult {
  const character = dataset.characters.find((item) => item.id === characterId)
  if (!character) throw new Error(`Unknown character ${characterId}`)

  if (policy.useReviewedApplicability) {
    const matchingOverlays = overlayFor(dataset, character)
    for (const overlay of matchingOverlays) {
      if (overlay.sex && context.sex === 'unknown') {
        return { characterId, status: 'applicability_unknown', reason: `Sex is unknown; ${character.label} is scoped to ${overlay.sex} specimens.`, citations: overlay.provenance, interpretationVersion: overlay.interpretationVersion }
      }
      if (overlay.sex && context.sex !== overlay.sex) {
        return { characterId, status: 'inapplicable', reason: `${character.label} is scoped to ${overlay.sex} specimens.`, citations: overlay.provenance, interpretationVersion: overlay.interpretationVersion }
      }
      if (overlay.adultOnly && context.lifeStage === 'unknown') {
        return { characterId, status: 'applicability_unknown', reason: `Life stage is unknown; adult applicability cannot be assumed for ${character.label}.`, citations: overlay.provenance, interpretationVersion: overlay.interpretationVersion }
      }
      if (overlay.adultOnly && context.lifeStage !== 'adult') {
        return { characterId, status: 'inapplicable', reason: `${character.label} is interpreted as adult-only.`, citations: overlay.provenance, interpretationVersion: overlay.interpretationVersion }
      }
      if (overlay.preparation === 'epigyne_cleared' && context.preparation.epigyneCleared === 'unknown') {
        return { characterId, status: 'applicability_unknown', reason: `Preparation is unknown; cleared-epigyne anatomy cannot be assumed applicable.`, citations: overlay.provenance, interpretationVersion: overlay.interpretationVersion }
      }
      if (overlay.preparation === 'epigyne_cleared' && context.preparation.epigyneCleared !== 'yes') {
        return { characterId, status: 'inapplicable', reason: `${character.label} requires a cleared epigyne.`, citations: overlay.provenance, interpretationVersion: overlay.interpretationVersion }
      }
    }
  }

  const triggers = contextTriggerPacketIds(context)
  const relevant = dataset.dependencyRules.filter((rule) =>
    rule.targetPacketId === character.packetId || rule.targetPacketId === character.groupPacketId)
  const positive = relevant.filter((rule) => rule.effect === 'enable_character')
  const negative = relevant.filter((rule) => rule.effect !== 'enable_character' && triggers.has(rule.triggerStatePacketId))
  if (negative.length) {
    return { characterId, status: 'inapplicable', reason: 'Disabled by the historical Lucid dependency rules for this context.', citations: negative.map((rule) => rule.sourceReference) }
  }
  if (positive.length && !positive.some((rule) => triggers.has(rule.triggerStatePacketId))) {
    return { characterId, status: 'inapplicable', reason: 'Not enabled by the historical Lucid dependency rules for this context.', citations: positive.map((rule) => rule.sourceReference) }
  }
  return { characterId, status: 'applicable', reason: 'Applicable under the selected context and policy.', citations: [] }
}

function validateObservation(dataset: GenusEngineDataset, context: SpecimenContext, observation: GenusObservation) {
  if (observation.specimenId !== context.specimenId) throw new Error(`Observation ${observation.id} belongs to a different specimen`)
  const character = dataset.characters.find((item) => item.id === observation.characterId)
  if (!character) throw new Error(`Observation ${observation.id} references unknown character ${observation.characterId}`)
  if (observation.disposition !== 'observed') return
  if (observation.stateIds.length === 0) throw new Error(`Observation ${observation.id} has no selected state`)
  if (new Set(observation.stateIds).size !== observation.stateIds.length) throw new Error(`Observation ${observation.id} repeats a state`)
  if (observation.stateIds.some((stateId) => !character.stateIds.includes(stateId))) throw new Error(`Observation ${observation.id} includes a state from another character`)
  if (observation.expression === 'single' && observation.stateIds.length !== 1) throw new Error(`Single observation ${observation.id} must contain exactly one state`)
  if (observation.expression === 'joint') {
    const selected = [...observation.stateIds].sort().join('|')
    const allowed = character.jointStateSets.some((set) => [...set].sort().join('|') === selected)
    if (!allowed) throw new Error(`Joint observation ${observation.id} is not explicitly valid for ${character.label}`)
  }
}

export function resolveObservations(
  dataset: GenusEngineDataset,
  context: SpecimenContext,
  observations: GenusObservation[],
  policy: EnginePolicy = REVIEWED_POLICY,
): ObservationResolution {
  const seen = new Set<string>()
  const result: ObservationResolution = { active: [], suspended: [] }
  for (const observation of [...observations].sort((a, b) => a.id.localeCompare(b.id))) {
    if (seen.has(observation.id)) throw new Error(`Duplicate observation ID ${observation.id}`)
    seen.add(observation.id)
    validateObservation(dataset, context, observation)
    if (observation.disposition !== 'observed') {
      result.suspended.push({ observation, reason: 'abstained' })
      continue
    }
    const applicability = characterApplicability(dataset, context, observation.characterId, policy)
    if (applicability.status !== 'applicable') {
      result.suspended.push({ observation, reason: applicability.status === 'inapplicable' ? 'inapplicable' : 'applicability_unknown', applicability })
      continue
    }
    result.active.push(observation)
  }
  return result
}

function contradictionOutcome(certainty: ObservationCertainty): EvidenceOutcome {
  return certainty === 'certain' ? 'strong_contradiction' : 'tentative_contradiction'
}

function classifyCodes(codes: number[], observation: ObservedCharacter): { outcome: EvidenceOutcome; explanation: string } {
  const evaluateOne = (code: number): EvidenceOutcome => {
    if (code === 1) return 'support'
    if (code === 2) return 'tentative_support'
    if (code === 3) return 'source_uncertain'
    if (code === 4 || code === 5) return 'apparent_only'
    return contradictionOutcome(observation.certainty)
  }
  const outcomes = codes.map(evaluateOne)
  let outcome: EvidenceOutcome
  if (observation.expression === 'joint') {
    outcome = outcomes.includes('strong_contradiction') ? 'strong_contradiction'
      : outcomes.includes('tentative_contradiction') ? 'tentative_contradiction'
        : outcomes.includes('apparent_only') ? 'apparent_only'
          : outcomes.includes('source_uncertain') ? 'source_uncertain'
            : outcomes.includes('tentative_support') ? 'tentative_support' : 'support'
  } else {
    outcome = outcomes.includes('support') ? 'support'
      : outcomes.includes('tentative_support') ? 'tentative_support'
        : outcomes.includes('source_uncertain') ? 'source_uncertain'
          : outcomes.includes('apparent_only') ? 'apparent_only'
            : outcomes.includes('tentative_contradiction') ? 'tentative_contradiction' : 'strong_contradiction'
  }
  const explanation = outcome === 'support' ? 'The source records compatible common evidence.'
    : outcome === 'tentative_support' ? 'The source records this state as rare; it remains possible but is qualified.'
      : outcome === 'source_uncertain' ? 'The source is uncertain, so the candidate is retained without positive support.'
        : outcome === 'apparent_only' ? 'The source treats this as an apparent-observation pathway, not biological presence.'
          : outcome === 'strong_contradiction' ? 'The applicable observation disagrees with the source profile.'
            : 'The observation tentatively disagrees with the source profile.'
  return { outcome, explanation }
}

function evidenceFor(
  dataset: GenusEngineDataset,
  taxon: GenusTaxon,
  observation: ObservedCharacter,
  policy: EnginePolicy,
): CandidateEvidence {
  const character = dataset.characters.find((item) => item.id === observation.characterId)!
  const states = observation.stateIds.map((stateId) => dataset.states.find((item) => item.id === stateId)!)
  const codes = states.map((state) => sourceScore(dataset, taxon.id, state.id))
  const profileKey = `${taxon.id}|${character.id}`
  const interpretationReferences: string[] = []
  let classified: { outcome: EvidenceOutcome; explanation: string }
  if (policy.protectAllZeroProfiles && dataset.allZeroProfiles.has(profileKey)) {
    interpretationReferences.push('data/scientific/review-register.json#AU01', 'stage2-gap-protection@1')
    classified = {
      outcome: 'source_unreported',
      explanation: 'All source states are zero for this taxon/character profile. Original zeros are retained, but the reviewed AU01 interpretation prevents automatic exclusion.',
    }
  } else {
    classified = classifyCodes(codes, observation)
  }
  return {
    observationId: observation.id,
    characterId: observation.characterId,
    evidenceGroupId: observation.evidenceGroupId || observation.id,
    stateIds: observation.stateIds,
    sourceCodes: codes,
    outcome: classified.outcome,
    explanation: classified.explanation,
    citation: {
      observationId: observation.id,
      matrixReference: `${dataset.sourceReferences.matrix}#${taxon.packetId}`,
      characterReference: `01_lucid_schema.json#${character.packetId}`,
      stateReferences: states.map((state) => `01_lucid_schema.json#${state.packetId}`),
      interpretationReferences,
      enginePolicyVersion: policy.version,
    },
  }
}

function countGroups(evidence: CandidateEvidence[], outcomes: EvidenceOutcome[]) {
  return new Set(evidence.filter((item) => outcomes.includes(item.outcome)).map((item) => item.evidenceGroupId)).size
}

function evidenceBand(evidence: CandidateEvidence[], coverage: CandidateCoverage): EvidenceBand {
  const strongContradictions = countGroups(evidence, ['strong_contradiction'])
  if (strongContradictions > 0) return 'contradicted'
  const supports = countGroups(evidence, ['support'])
  const tentativeSupports = countGroups(evidence, ['tentative_support'])
  if (coverage.assessedObservations === 0) return 'unassessed'
  if (supports >= 3 && coverage.ratio >= 0.6) return 'strong'
  if (supports > 0 || tentativeSupports > 0) return 'compatible'
  return 'possible'
}

function candidateExplanation(result: Omit<CandidateResult, 'explanation' | 'recheckObservationIds'>) {
  if (result.band === 'unassessed') return `Unassessed: none of the ${result.coverage.constrainingObservations} active observations has reviewed source coverage for this candidate.`
  return `${result.band}: ${result.supportGroups} supporting evidence group(s), ${result.tentativeSupportGroups} tentative support group(s), ${result.strongContradictions} strong and ${result.tentativeContradictions} tentative contradiction(s); ${result.coverage.assessedObservations}/${result.coverage.constrainingObservations} active observations assessed.`
}

const BAND_ORDER: Record<EvidenceBand, number> = { strong: 0, compatible: 1, possible: 2, unassessed: 3, contradicted: 4 }

function rankCandidates(candidates: CandidateResult[]) {
  return [...candidates].sort((a, b) =>
    BAND_ORDER[a.band] - BAND_ORDER[b.band]
    || a.strongContradictions - b.strongContradictions
    || a.tentativeContradictions - b.tentativeContradictions
    || b.supportGroups - a.supportGroups
    || b.tentativeSupportGroups - a.tentativeSupportGroups
    || b.coverage.ratio - a.coverage.ratio
    || a.taxon.label.localeCompare(b.taxon.label))
}

function conflictRecovery(candidates: CandidateResult[], active: ObservedCharacter[]): ConflictRecoverySuggestion[] {
  return active.map((observation) => {
    const restoresCandidateIds = candidates
      .filter((candidate) => candidate.strongContradictions === 1 && candidate.evidence.some((item) => item.observationId === observation.id && item.outcome === 'strong_contradiction'))
      .map((candidate) => candidate.taxon.id)
      .sort()
    return {
      observationId: observation.id,
      characterId: observation.characterId,
      restoresCandidateIds,
      explanation: restoresCandidateIds.length
        ? `Rechecking or revising this observation would remove the sole strong contradiction for ${restoresCandidateIds.length} candidate(s).`
        : 'Rechecking this observation does not by itself remove every strong contradiction for a candidate.',
    }
  }).filter((item) => item.restoresCandidateIds.length > 0)
    .sort((a, b) => b.restoresCandidateIds.length - a.restoresCandidateIds.length || a.observationId.localeCompare(b.observationId))
}

export function evaluateGenusIdentification(
  dataset: GenusEngineDataset,
  context: SpecimenContext,
  observations: GenusObservation[],
  policy: EnginePolicy = REVIEWED_POLICY,
): GenusEvaluation {
  const resolved = resolveObservations(dataset, context, observations, policy)
  const candidates = dataset.taxa.filter((taxon) => !taxon.isRoot).map((taxon) => {
    const evidence = resolved.active.map((observation) => evidenceFor(dataset, taxon, observation, policy))
    const assessedOutcomes: EvidenceOutcome[] = ['support', 'tentative_support', 'strong_contradiction', 'tentative_contradiction', 'apparent_only']
    const assessed = evidence.filter((item) => assessedOutcomes.includes(item.outcome)).length
    const coverage: CandidateCoverage = {
      constrainingObservations: resolved.active.length,
      assessedObservations: assessed,
      unscoredObservations: resolved.active.length - assessed,
      ratio: resolved.active.length ? assessed / resolved.active.length : 0,
    }
    const partial = {
      taxon,
      band: evidenceBand(evidence, coverage),
      evidence,
      supportGroups: countGroups(evidence, ['support']),
      tentativeSupportGroups: countGroups(evidence, ['tentative_support']),
      strongContradictions: countGroups(evidence, ['strong_contradiction']),
      tentativeContradictions: countGroups(evidence, ['tentative_contradiction', 'apparent_only']),
      coverage,
    }
    return {
      ...partial,
      explanation: candidateExplanation(partial),
      recheckObservationIds: evidence.filter((item) => item.outcome === 'strong_contradiction' || item.outcome === 'tentative_contradiction').map((item) => item.observationId).sort(),
    }
  })
  const ranked = rankCandidates(candidates)
  return {
    specimenId: context.specimenId,
    policy,
    context,
    activeObservationIds: resolved.active.map((observation) => observation.id),
    suspended: resolved.suspended,
    candidates: ranked,
    conflictRecovery: conflictRecovery(ranked, resolved.active),
    trace: {
      datasetVersion: dataset.version,
      matrixId: dataset.matrixId,
      policyVersion: policy.version,
      applicabilityInterpretationVersions: [...new Set(dataset.applicabilityOverlays.map((overlay) => overlay.interpretationVersion))].sort(),
    },
  }
}

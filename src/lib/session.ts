import type { GenusObservation, LifeStage, PreparationState, Sex, SpecimenContext } from './genus-engine'
import type { ScientificRuntimePackage } from './scientific-contract'
import { SPECIES_POLICY_VERSION } from './species-suggestions'
import type { SpeciesObservation } from './species-suggestions'
import type { Confidence, KeyData, SpecimenSex, WorkMode } from './types'
import type { GenusEngineDataset } from './genus-engine'
import type { SchubertDataset } from './schubert-engine'
import type { SpeciesDataset } from './species-suggestions'

export const SESSION_STORAGE_KEY = 'salticidae-genus-session-v5'
export const PREVIOUS_SESSION_STORAGE_KEY = 'salticidae-genus-session-v4'
export const PREVIOUS_SESSION_STORAGE_KEYS = [PREVIOUS_SESSION_STORAGE_KEY, 'salticidae-genus-session-v3', 'salticidae-genus-session-v2'] as const
export const LEGACY_SESSION_STORAGE_KEY = 'salticidae-key-session-v1'
export const SESSION_FORMAT = 'australian-salticidae-session@5' as const
const PREVIOUS_SESSION_FORMATS = ['australian-salticidae-session@4', 'australian-salticidae-session@3', 'australian-salticidae-session@2']

export interface PackagePin {
  scientificPackageVersion: string
  sourceManifestVersion: string
  interpretationVersion: string
  genusEngineVersion: string
  schubertPolicyVersion: string
  questionUtilityVersion: string
  speciesPolicyVersion: string
  offlinePackageId: string | null
}

export interface LegacyHistoryItem {
  featureId: number | null
  stateIds: number[]
  confidence: string | null
  reason: string
  raw: unknown
}

export interface SessionMigration {
  source: 'new' | 'legacy-v1' | 'fresh'
  convertedObservations: number
  unconvertedObservations: number
  message: string
}

export interface IdentificationSession {
  format: typeof SESSION_FORMAT
  specimen: SpecimenContext
  contextStarted: boolean
  observations: GenusObservation[]
  schubertObservations: GenusObservation[]
  publishedKeyHistory: Array<{ nodeId: string; branchIndex: number }>
  speciesSuggestionsEnabled: boolean
  speciesObservations: SpeciesObservation[]
  workMode: WorkMode
  expertMode: boolean
  legacyHistory: LegacyHistoryItem[]
  migration: SessionMigration
  packagePin: PackagePin | null
  updatedAt: string
}

interface LegacySession {
  sex?: SpecimenSex
  epigyneCleared?: boolean
  mode?: WorkMode
  observations?: unknown[]
}

export function freshSession(): IdentificationSession {
  return {
    format: SESSION_FORMAT,
    specimen: {
      specimenId: 'local-specimen-1',
      sex: 'unknown',
      lifeStage: 'unknown',
      preparation: { epigyneCleared: 'unknown' },
    },
    contextStarted: false,
    observations: [],
    schubertObservations: [],
    publishedKeyHistory: [],
    speciesSuggestionsEnabled: true,
    speciesObservations: [],
    workMode: 'field',
    expertMode: false,
    legacyHistory: [],
    migration: { source: 'fresh', convertedObservations: 0, unconvertedObservations: 0, message: 'New local identification.' },
    packagePin: null,
    updatedAt: new Date().toISOString(),
  }
}

function validContext(value: unknown): value is SpecimenContext {
  if (!value || typeof value !== 'object') return false
  const item = value as SpecimenContext
  return typeof item.specimenId === 'string' && item.specimenId.length > 0
    && ['male', 'female', 'unknown'].includes(item.sex)
    && ['adult', 'juvenile', 'unknown'].includes(item.lifeStage)
    && Boolean(item.preparation)
    && ['yes', 'no', 'unknown'].includes(item.preparation.epigyneCleared)
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.length > 0
const oneOf = (value: unknown, options: string[]) => typeof value === 'string' && options.includes(value)
const unique = (values: unknown[]) => new Set(values).size === values.length

function validObservation(value: unknown): boolean {
  if (!record(value) || !['id', 'specimenId', 'characterId'].every((key) => nonempty(value[key]))) return false
  if (value.evidenceGroupId !== undefined && !nonempty(value.evidenceGroupId)) return false
  if (value.disposition !== 'observed') return oneOf(value.disposition, ['not_sure', 'cannot_see', 'skipped', 'inapplicable'])
  return oneOf(value.expression, ['single', 'alternatives', 'joint'])
    && oneOf(value.certainty, ['certain', 'fairly_sure', 'tentative'])
    && Array.isArray(value.stateIds) && value.stateIds.length > 0 && value.stateIds.every(nonempty)
    && unique(value.stateIds) && (value.expression !== 'single' || value.stateIds.length === 1)
}

function validSpeciesObservation(value: unknown): boolean {
  return record(value) && ['id', 'specimenId', 'speciesId', 'hintId'].every((key) => nonempty(value[key]))
    && oneOf(value.response, ['matches', 'does_not_match', 'not_sure', 'cannot_see'])
    && oneOf(value.certainty, ['certain', 'fairly_sure', 'tentative'])
}

/** Validate the wire format before letting untrusted saved/imported data reach rendering. */
function validSessionFields(value: Record<string, unknown>): boolean {
  for (const key of ['contextStarted', 'expertMode', 'speciesSuggestionsEnabled']) if (value[key] !== undefined && typeof value[key] !== 'boolean') return false
  if (value.workMode !== undefined && !oneOf(value.workMode, ['field', 'microscope'])) return false
  if (value.updatedAt !== undefined && (typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)))) return false
  for (const key of ['observations', 'schubertObservations', 'speciesObservations']) {
    const items = value[key]
    if (items === undefined && key !== 'observations') continue
    if (!Array.isArray(items) || !items.every(key === 'speciesObservations' ? validSpeciesObservation : validObservation)) return false
    if (!unique(items.map((item) => item.id))) return false
  }
  if (value.publishedKeyHistory !== undefined && (!Array.isArray(value.publishedKeyHistory) || !value.publishedKeyHistory.every((step) => record(step) && nonempty(step.nodeId) && Number.isInteger(step.branchIndex) && Number(step.branchIndex) >= 0))) return false
  if (value.legacyHistory !== undefined && (!Array.isArray(value.legacyHistory) || !value.legacyHistory.every((item) => record(item) && typeof item.reason === 'string' && Array.isArray(item.stateIds)))) return false
  if (value.migration !== undefined) {
    const item = value.migration
    if (!record(item) || !oneOf(item.source, ['new', 'legacy-v1', 'fresh']) || typeof item.message !== 'string'
      || !['convertedObservations', 'unconvertedObservations'].every((key) => Number.isInteger(item[key]) && Number(item[key]) >= 0)) return false
  }
  if (value.packagePin != null) {
    const pin = value.packagePin
    if (!record(pin) || !['scientificPackageVersion', 'sourceManifestVersion', 'interpretationVersion', 'genusEngineVersion', 'schubertPolicyVersion', 'questionUtilityVersion'].every((key) => nonempty(pin[key]))
      || (pin.speciesPolicyVersion !== undefined && !nonempty(pin.speciesPolicyVersion))
      || (pin.offlinePackageId !== null && !nonempty(pin.offlinePackageId))) return false
  }
  return true
}

export type SessionDomain = { genus: GenusEngineDataset; schubert: SchubertDataset; species: SpeciesDataset }

/** IDs, ownership and key paths must also agree with the package actually in use. */
export function sessionReferenceError(session: IdentificationSession, domain: SessionDomain): string | null {
  for (const [observations, characters] of [[session.observations, domain.genus.characters], [session.schubertObservations, domain.schubert.characters]] as const) {
    const seen = new Set<string>()
    for (const observation of observations) {
      const character = characters.find((item) => item.id === observation.characterId)
      if (observation.specimenId !== session.specimen.specimenId || !character || seen.has(observation.characterId)) return 'The session contains an unknown, duplicate or different-specimen character.'
      seen.add(observation.characterId)
      if (observation.disposition === 'observed') {
        if (observation.stateIds.some((id) => !character.stateIds.includes(id))) return 'A selected state does not belong to its character in this scientific package.'
        if (observation.expression === 'joint' && (!('jointStateSets' in character) || !character.jointStateSets.some((states) => [...states].sort().join('|') === [...observation.stateIds].sort().join('|')))) return 'Joint states are not declared compatible for this character.'
      }
    }
  }
  const hints = new Set<string>()
  for (const observation of session.speciesObservations) {
    const profile = domain.species.profiles.find((item) => item.id === observation.speciesId)
    if (observation.specimenId !== session.specimen.specimenId || !profile?.hints.some((hint) => hint.id === observation.hintId) || hints.has(observation.hintId)) return 'The species evidence contains an unknown, duplicate or different-specimen hint.'
    hints.add(observation.hintId)
  }
  let nodeId = domain.schubert.key.rootNodeId
  for (const step of session.publishedKeyHistory) {
    const node = domain.schubert.key.nodes.find((item) => item.id === nodeId)
    if (!node || node.kind !== 'question' || step.nodeId !== node.id || !node.branches[step.branchIndex]) return 'The saved published-key path is invalid for this scientific package.'
    nodeId = node.branches[step.branchIndex].nextNodeId
  }
  return null
}

export function newestSession(sessions: Array<IdentificationSession | null>): IdentificationSession | null {
  return sessions.filter((item): item is IdentificationSession => item !== null)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null
}

export function recoverSavedSessions(raws: Array<string | null>, domain: SessionDomain, legacy: IdentificationSession | null = null): IdentificationSession {
  const rejected: string[] = []
  const candidates = raws.map((raw) => {
    if (!raw) return null
    const session = restoreCurrentSession(raw)
    if (session && !sessionReferenceError(session, domain)) return session
    rejected.push(raw)
    return null
  })
  const selected = newestSession(candidates) ?? legacy ?? freshSession()
  for (const raw of new Set(rejected)) if (!selected.legacyHistory.some((item) => item.raw === raw)) {
    selected.legacyHistory.push({ featureId: null, stateIds: [], confidence: null,
      reason: 'A saved copy could not be evaluated safely. Its original content is retained here for recovery, not used as evidence.', raw })
  }
  if (rejected.length) selected.migration = { ...selected.migration, source: 'new', unconvertedObservations: selected.legacyHistory.length,
    message: 'An invalid saved copy was kept in the session export for recovery. It has not been used as identification evidence.' }
  return selected
}

export function restoreCurrentSession(raw: string | null): IdentificationSession | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!record(value) || !validSessionFields(value)) return null
    const parsed = value as Partial<IdentificationSession> & { format?: string }
    if (![SESSION_FORMAT, ...PREVIOUS_SESSION_FORMATS].includes(parsed.format ?? '') || !validContext(parsed.specimen) || !Array.isArray(parsed.observations)) return null
    return {
      ...freshSession(),
      ...parsed,
      contextStarted: parsed.contextStarted !== false,
      format: SESSION_FORMAT,
      // Old records without a timestamp must not outrank a dated backup.
      updatedAt: parsed.updatedAt ?? new Date(0).toISOString(),
      schubertObservations: Array.isArray(parsed.schubertObservations) ? parsed.schubertObservations : [],
      publishedKeyHistory: Array.isArray(parsed.publishedKeyHistory) ? parsed.publishedKeyHistory : [],
      speciesSuggestionsEnabled: parsed.speciesSuggestionsEnabled !== false,
      speciesObservations: Array.isArray(parsed.speciesObservations) ? parsed.speciesObservations : [],
      legacyHistory: Array.isArray(parsed.legacyHistory) ? parsed.legacyHistory : [],
      migration: parsed.migration ?? { source: 'new', convertedObservations: 0, unconvertedObservations: 0, message: 'Restored local identification.' },
      packagePin: parsed.packagePin ? { ...parsed.packagePin, speciesPolicyVersion: parsed.packagePin.speciesPolicyVersion ?? SPECIES_POLICY_VERSION } : null,
    }
  } catch {
    return null
  }
}

function aliasLookup(scientific: ScientificRuntimePackage, scheme: 'original_numeric_id' | 'packet_id', identityKind: string) {
  const result = new Map<string, string>()
  for (const [persistentId, aliases] of Object.entries(scientific.identities.aliases)) {
    if (!persistentId.includes(`:${identityKind}:`)) continue
    for (const alias of aliases) if (alias.scheme === scheme) result.set(alias.value, persistentId)
  }
  return result
}

function certainty(confidence: Confidence): 'certain' | 'fairly_sure' | 'tentative' {
  return confidence === 'unsure' ? 'tentative' : confidence
}

export function migrateLegacySession(raw: string | null, scientific: ScientificRuntimePackage, key: KeyData): IdentificationSession | null {
  if (!raw) return null
  let legacy: LegacySession
  try { legacy = JSON.parse(raw) as LegacySession } catch { return null }
  if (!legacy || !Array.isArray(legacy.observations)) return null

  const featureNumeric = aliasLookup(scientific, 'original_numeric_id', 'feature')
  const stateNumeric = aliasLookup(scientific, 'original_numeric_id', 'state')
  const observations: GenusObservation[] = []
  const legacyHistory: LegacyHistoryItem[] = []
  for (const rawItem of legacy.observations) {
    const item = record(rawItem) ? rawItem : {}
    const feature = key.features.find((value) => value.id === item.featureId)
    const characterId = feature ? featureNumeric.get(String(feature.id)) : undefined
    const oldStates = Array.isArray(item.stateIds) ? item.stateIds : []
    const stateIds = oldStates.map((stateId) => stateNumeric.get(String(stateId))).filter((id): id is string => Boolean(id))
    if (!characterId || !oneOf(item.confidence, ['certain', 'fairly_sure', 'unsure']) || stateIds.length !== oldStates.length || stateIds.length === 0
      || !unique(oldStates) || oldStates.some((id) => !key.states.some((state) => state.id === id && state.feature === feature?.id))
      || observations.some((observation) => observation.characterId === characterId)) {
      legacyHistory.push({
        featureId: typeof item.featureId === 'number' ? item.featureId : null,
        stateIds: Array.isArray(item.stateIds) ? item.stateIds : [],
        confidence: typeof item.confidence === 'string' ? item.confidence : null,
        reason: 'The old record is malformed, duplicates a character, or its feature/state identities cannot be matched safely.',
        raw: rawItem,
      })
      continue
    }
    observations.push({
      id: `migrated:${characterId}`,
      specimenId: 'local-specimen-1',
      characterId,
      disposition: 'observed',
      expression: stateIds.length === 1 ? 'single' : 'alternatives',
      stateIds,
      certainty: certainty(item.confidence as Confidence),
      evidenceGroupId: characterId,
    })
  }

  const sex: Sex = legacy.sex === 'male' || legacy.sex === 'female' ? legacy.sex : 'unknown'
  const epigyneCleared: PreparationState = sex === 'female' ? (legacy.epigyneCleared ? 'yes' : 'no') : 'unknown'
  const migration: SessionMigration = {
    source: 'legacy-v1',
    convertedObservations: observations.length,
    unconvertedObservations: legacyHistory.length,
    message: `${observations.length} old observation${observations.length === 1 ? '' : 's'} converted to persistent identities${legacyHistory.length ? `; ${legacyHistory.length} retained as unconverted history` : ''}.`,
  }
  return {
    ...freshSession(),
    specimen: { specimenId: 'local-specimen-1', sex, lifeStage: 'unknown' as LifeStage, preparation: { epigyneCleared } },
    contextStarted: legacy.sex != null,
    observations,
    workMode: legacy.mode === 'microscope' ? 'microscope' : 'field',
    legacyHistory,
    migration,
    updatedAt: new Date().toISOString(),
  }
}

export function sessionExport(session: IdentificationSession, packageVersion: string) {
  return JSON.stringify({ ...session, scientificPackageVersion: session.packagePin?.scientificPackageVersion ?? packageVersion,
    loadedScientificPackageVersionAtExport: packageVersion,
    evaluationNotice: 'Results use the currently loaded rules. The stored packagePin is historical metadata, not proof that those original rules were replayed.',
    exportedAt: new Date().toISOString() }, null, 2)
}

export function restoreSessionExport(raw: string): IdentificationSession | null {
  return restoreCurrentSession(raw)
}

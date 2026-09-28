import type { GenusObservation, LifeStage, PreparationState, Sex, SpecimenContext } from './genus-engine'
import type { ScientificRuntimePackage } from './scientific-contract'
import { SPECIES_POLICY_VERSION } from './species-suggestions'
import type { SpeciesObservation } from './species-suggestions'
import type { Confidence, KeyData, Observation as LegacyObservation, SpecimenSex, WorkMode } from './types'

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
  observations?: LegacyObservation[]
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
  return typeof item.specimenId === 'string'
    && ['male', 'female', 'unknown'].includes(item.sex)
    && ['adult', 'juvenile', 'unknown'].includes(item.lifeStage)
    && Boolean(item.preparation)
    && ['yes', 'no', 'unknown'].includes(item.preparation.epigyneCleared)
}

export function restoreCurrentSession(raw: string | null): IdentificationSession | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<IdentificationSession> & { format?: string }
    if (![SESSION_FORMAT, ...PREVIOUS_SESSION_FORMATS].includes(parsed.format ?? '') || !validContext(parsed.specimen) || !Array.isArray(parsed.observations)) return null
    return {
      ...freshSession(),
      ...parsed,
      contextStarted: parsed.contextStarted !== false,
      format: SESSION_FORMAT,
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
  if (!Array.isArray(legacy.observations)) return null

  const featureNumeric = aliasLookup(scientific, 'original_numeric_id', 'feature')
  const stateNumeric = aliasLookup(scientific, 'original_numeric_id', 'state')
  const observations: GenusObservation[] = []
  const legacyHistory: LegacyHistoryItem[] = []
  for (const item of legacy.observations) {
    const feature = key.features.find((value) => value.id === item.featureId)
    const characterId = feature ? featureNumeric.get(String(feature.id)) : undefined
    const stateIds = item.stateIds.map((stateId) => stateNumeric.get(String(stateId))).filter((id): id is string => Boolean(id))
    if (!characterId || stateIds.length !== item.stateIds.length || stateIds.length === 0) {
      legacyHistory.push({
        featureId: typeof item.featureId === 'number' ? item.featureId : null,
        stateIds: Array.isArray(item.stateIds) ? item.stateIds : [],
        confidence: typeof item.confidence === 'string' ? item.confidence : null,
        reason: 'The old numeric feature or state identity could not be matched to a persistent scientific ID.',
        raw: item,
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
      certainty: certainty(item.confidence),
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
  return JSON.stringify({ ...session, scientificPackageVersion: session.packagePin?.scientificPackageVersion ?? packageVersion, exportedAt: new Date().toISOString() }, null, 2)
}

export function restoreSessionExport(raw: string): IdentificationSession | null {
  return restoreCurrentSession(raw)
}

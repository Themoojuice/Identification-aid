import { describe, expect, it } from 'vitest'
import scientific from '../../data/compiled/scientific-package.json'
import key from '../../public/data/key.json'
import {
  freshSession, migrateLegacySession, restoreCurrentSession, restoreSessionExport, sessionExport, SESSION_FORMAT,
  recoverSavedSessions, sessionReferenceError,
} from './session'
import type { ScientificRuntimePackage } from './scientific-contract'
import type { KeyData } from './types'
import { createGenusDatasetFromScientificPackage } from './genus-engine'
import { createSchubertDatasetFromScientificPackage } from './schubert-engine'
import { createSpeciesDatasetFromScientificPackage } from './species-suggestions'

const packageData = scientific as unknown as ScientificRuntimePackage
const keyData = key as unknown as KeyData
const domain = { genus: createGenusDatasetFromScientificPackage(packageData), schubert: createSchubertDatasetFromScientificPackage(packageData), species: createSpeciesDatasetFromScientificPackage(packageData) }

describe('versioned session persistence', () => {
  it('starts with explicitly unknown context rather than inferred male or adult context', () => {
    const session = freshSession()
    expect(session.specimen.sex).toBe('unknown')
    expect(session.specimen.lifeStage).toBe('unknown')
    expect(session.specimen.preparation.epigyneCleared).toBe('unknown')
    expect(session.contextStarted).toBe(false)
  })

  it('round-trips the versioned session without losing persistent evidence identities', () => {
    const session = freshSession()
    session.contextStarted = true
    session.observations = [{
      id: 'obs:test', specimenId: session.specimen.specimenId,
      characterId: packageData.model.matrix.stateIds.length ? packageData.model.characterDefinitions[0].id : '',
      disposition: 'not_sure',
    }]
    const restored = restoreCurrentSession(JSON.stringify(session))
    expect(restored?.format).toBe(SESSION_FORMAT)
    expect(restored?.observations).toEqual(session.observations)
    expect(restored?.schubertObservations).toEqual([])
  })

  it('upgrades a Stage 4 session without losing Lucid evidence', () => {
    const previous = { ...freshSession(), format: 'australian-salticidae-session@2', observations: [{ id: 'old', specimenId: 'local-specimen-1', characterId: 'persistent-character', disposition: 'not_sure' }] }
    delete (previous as Partial<typeof previous>).schubertObservations
    delete (previous as Partial<typeof previous>).publishedKeyHistory
    const restored = restoreCurrentSession(JSON.stringify(previous))
    expect(restored?.format).toBe(SESSION_FORMAT)
    expect(restored?.observations).toHaveLength(1)
    expect(restored?.schubertObservations).toEqual([])
    expect(restored?.publishedKeyHistory).toEqual([])
  })

  it('upgrades a Stage 5 session and preserves Schubert evidence', () => {
    const previous = { ...freshSession(), format: 'australian-salticidae-session@3', schubertObservations: [{ id: 'stage5', specimenId: 'local-specimen-1', characterId: 'schubert-character', disposition: 'not_sure' }] }
    const restored = restoreCurrentSession(JSON.stringify(previous))
    expect(restored?.format).toBe(SESSION_FORMAT)
    expect(restored?.schubertObservations).toHaveLength(1)
  })

  it('upgrades a Stage 6 session with removable species guidance defaults', () => {
    const previous = { ...freshSession(), format: 'australian-salticidae-session@4' }
    delete (previous as Partial<typeof previous>).speciesSuggestionsEnabled
    delete (previous as Partial<typeof previous>).speciesObservations
    const restored = restoreCurrentSession(JSON.stringify(previous))
    expect(restored?.format).toBe(SESSION_FORMAT)
    expect(restored?.speciesSuggestionsEnabled).toBe(true)
    expect(restored?.speciesObservations).toEqual([])
  })

  it('round-trips portable exports with the complete package pin', () => {
    const session = freshSession()
    session.packagePin = {
      scientificPackageVersion: packageData.packageVersion, sourceManifestVersion: packageData.packageVersion,
      interpretationVersion: 'reviewed@1', genusEngineVersion: 'engine@1', schubertPolicyVersion: 'schubert@1',
      questionUtilityVersion: 'questions@1', speciesPolicyVersion: 'species@1', offlinePackageId: 'core-test',
    }
    const restored = restoreSessionExport(sessionExport(session, packageData.packageVersion))
    expect(restored?.packagePin).toEqual(session.packagePin)
    expect(restored?.format).toBe(SESSION_FORMAT)
  })

  it('rejects unsupported portable session content', () => {
    expect(restoreSessionExport('{"format":"not-a-session"}')).toBeNull()
  })

  it('restores the newer backup when the durable copy is older', () => {
    const old = { ...freshSession(), updatedAt: '2026-01-01T00:00:00Z' }
    const recent = { ...freshSession(), updatedAt: '2026-01-02T00:00:00Z', workMode: 'microscope' as const }
    expect(recoverSavedSessions([JSON.stringify(old), JSON.stringify(recent)], domain).workMode).toBe('microscope')
  })

  it('preserves invalid saved content for recovery without evaluating it', () => {
    const raw = JSON.stringify({ ...freshSession(), observations: [null] })
    const result = recoverSavedSessions([raw], domain)
    expect(result.observations).toEqual([])
    expect(result.legacyHistory[0].raw).toBe(raw)
    expect(restoreSessionExport(sessionExport(result, packageData.packageVersion))?.legacyHistory).toEqual(result.legacyHistory)
    expect(recoverSavedSessions([raw, JSON.stringify(result)], domain).legacyHistory).toHaveLength(1)
  })

  it('checks state ownership, specimen isolation and key branches against the loaded package', () => {
    const session = freshSession()
    const character = domain.genus.characters[2]
    session.observations = [{ id: 'x', specimenId: session.specimen.specimenId, characterId: character.id, disposition: 'observed', expression: 'single', stateIds: [character.stateIds[0]], certainty: 'certain' }]
    expect(sessionReferenceError(session, domain)).toBeNull()
    session.observations[0].specimenId = 'another-spider'
    expect(sessionReferenceError(session, domain)).not.toBeNull()
    session.observations = []
    session.publishedKeyHistory = [{ nodeId: domain.schubert.key.rootNodeId, branchIndex: 999 }]
    expect(sessionReferenceError(session, domain)).not.toBeNull()
  })

  it('rejects malformed evidence and unsafe UI values before they reach the engines', () => {
    for (const patch of [
      { observations: [null] },
      { observations: [{ id: 'x', specimenId: 'local-specimen-1', characterId: 'x', disposition: 'observed' }] },
      { publishedKeyHistory: [{ nodeId: 'x', branchIndex: -1 }] },
      { speciesObservations: [{ response: 'matches' }] },
      { workMode: 'invented' }, { migration: 'broken' }, { packagePin: {} },
    ]) expect(restoreSessionExport(JSON.stringify({ ...freshSession(), ...patch }))).toBeNull()
  })

  it('does not crash on malformed legacy records and retains them for export', () => {
    expect(migrateLegacySession('null', packageData, keyData)).toBeNull()
    const result = migrateLegacySession(JSON.stringify({ observations: [null, { featureId: 18 }, { featureId: 18, stateIds: [7], confidence: 'invented' }] }), packageData, keyData)
    expect(result?.observations).toEqual([])
    expect(result?.legacyHistory).toHaveLength(3)
  })

  it('does not migrate a state belonging to a different feature or duplicate a feature', () => {
    const other = keyData.states.find((state) => state.feature !== 18)!
    const result = migrateLegacySession(JSON.stringify({ observations: [
      { featureId: 18, stateIds: [other.id], confidence: 'certain' },
      { featureId: 18, stateIds: [7], confidence: 'certain' },
      { featureId: 18, stateIds: [8], confidence: 'certain' },
    ] }), packageData, keyData)
    expect(result?.observations).toHaveLength(1)
    expect(result?.legacyHistory).toHaveLength(2)
  })

  it('migrates legacy numeric feature/state observations to persistent IDs', () => {
    const raw = JSON.stringify({
      sex: 'female', epigyneCleared: true, mode: 'microscope', skippedFeatureIds: [],
      observations: [{ featureId: 18, stateIds: [7, 8], confidence: 'fairly_sure' }],
    })
    const migrated = migrateLegacySession(raw, packageData, keyData)
    expect(migrated?.migration.source).toBe('legacy-v1')
    expect(migrated?.observations).toHaveLength(1)
    expect(migrated?.observations[0]).toMatchObject({ disposition: 'observed', expression: 'alternatives', certainty: 'fairly_sure' })
    expect(migrated?.specimen).toMatchObject({ sex: 'female', preparation: { epigyneCleared: 'yes' } })
    expect(migrated?.legacyHistory).toHaveLength(0)
  })

  it('retains unconvertible legacy records explicitly without using them as evidence', () => {
    const raw = JSON.stringify({ sex: 'unknown', observations: [{ featureId: 999999, stateIds: [999999], confidence: 'certain' }] })
    const migrated = migrateLegacySession(raw, packageData, keyData)
    expect(migrated?.observations).toHaveLength(0)
    expect(migrated?.legacyHistory).toHaveLength(1)
    expect(migrated?.migration.unconvertedObservations).toBe(1)
  })
})

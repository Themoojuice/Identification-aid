import { describe, expect, it } from 'vitest'
import scientific from '../../data/compiled/scientific-package.json'
import key from '../../public/data/key.json'
import {
  freshSession, migrateLegacySession, restoreCurrentSession, restoreSessionExport, sessionExport, SESSION_FORMAT,
} from './session'
import type { ScientificRuntimePackage } from './scientific-contract'
import type { KeyData } from './types'

const packageData = scientific as unknown as ScientificRuntimePackage
const keyData = key as unknown as KeyData

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

  it('round-trips portable exports with the complete package pin', () => {
    const session = freshSession()
    session.packagePin = {
      scientificPackageVersion: packageData.packageVersion, sourceManifestVersion: packageData.packageVersion,
      interpretationVersion: 'reviewed@1', genusEngineVersion: 'engine@1', schubertPolicyVersion: 'schubert@1',
      questionUtilityVersion: 'questions@1', offlinePackageId: 'core-test',
    }
    const restored = restoreSessionExport(sessionExport(session, packageData.packageVersion))
    expect(restored?.packagePin).toEqual(session.packagePin)
    expect(restored?.format).toBe(SESSION_FORMAT)
  })

  it('rejects unsupported portable session content', () => {
    expect(restoreSessionExport('{"format":"not-a-session"}')).toBeNull()
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

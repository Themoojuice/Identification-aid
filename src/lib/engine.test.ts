import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import keyFixture from '../../public/data/key.json'
import curatedFixture from '../../public/data/character_metadata.json'
import factsFixture from '../../public/data/fact_sheets.json'
import { mediaUrl } from './data'
import {
  availableFeatureIds, comparisonIsUseful, controlStateIds, differentialRows, rankCandidates, scoreCode,
  suggestCharacters,
} from './engine'
import type { CuratedMetadata, KeyData, Observation } from './types'

const key = keyFixture as unknown as KeyData
const curated = curatedFixture as CuratedMetadata

describe('app data bundle', () => {
  it('retains every source taxon, feature, state, UUID and score-vector cell', () => {
    expect(key.taxa).toHaveLength(86)
    expect(key.features).toHaveLength(114)
    expect(key.states).toHaveLength(296)
    expect(new Set([...key.taxa, ...key.features, ...key.states].map((item) => item.uid)).size).toBe(496)
    expect(Object.keys(key.score_vectors)).toHaveLength(296)
    for (const vector of Object.values(key.score_vectors)) expect(vector).toHaveLength(86)
  })

  it('resolves every genus fact sheet and archived image path', () => {
    expect(factsFixture.sheets).toHaveLength(86)
    const sheetIds = new Set(factsFixture.sheets.map((sheet) => sheet.entity_id))
    for (const taxon of key.taxa) {
      expect(sheetIds.has(taxon.id)).toBe(true)
      for (const image of taxon.images ?? []) {
        expect(fs.existsSync(path.resolve('source', 'lucid-original', 'media', ...image.path.split('/'))), image.path).toBe(true)
      }
    }
  })

  it('resolves every source image and does not double-encode Lucid paths', () => {
    const records = [...key.taxa, ...key.features, ...key.states]
    for (const record of records) {
      for (const image of record.images ?? []) {
        for (const sourcePath of [image.path, image.thumb_path].filter(Boolean) as string[]) {
          const decodedPath = decodeURIComponent(sourcePath)
          expect(fs.existsSync(path.resolve('source', 'lucid-original', 'media', ...decodedPath.split('/'))), sourcePath).toBe(true)
          expect(mediaUrl(sourcePath)).not.toContain('%2520')
        }
      }
    }
    expect(mediaUrl('Thumbs/features/Aspects%20of%20general%20morphology/example image.jpg'))
      .toBe('/source/lucid-original/media/Thumbs/features/Aspects%20of%20general%20morphology/example%20image.jpg')
  })

  it('resolves every curated representative state image', () => {
    expect(Object.keys(key.curated_state_media!.records)).toHaveLength(18)
    for (const images of Object.values(key.curated_state_media!.records)) {
      for (const image of images) {
        for (const sourcePath of [image.path, image.thumb_path].filter(Boolean) as string[]) {
          expect(fs.existsSync(path.resolve('source', 'lucid-original', 'media', ...decodeURIComponent(sourcePath).split('/'))), sourcePath).toBe(true)
        }
      }
    }
  })
})

function taxonNamed(name: string) {
  const taxon = key.taxa.find((item) => item.name.startsWith(`${name} `))
  if (!taxon) throw new Error(`Missing test taxon ${name}`)
  return taxon
}

function diagnosticObservations(name: string, limit = 9): Observation[] {
  const target = taxonNamed(name)
  const candidates = key.taxa.filter((item) => item.parent !== 0)
  return key.features
    .filter((feature) => feature.kind === 'multistate' && feature.id > 17)
    .flatMap((feature) => {
      const choices = (feature.states ?? [])
        .filter((stateId) => scoreCode(key, stateId, target.id) === 1)
        .map((stateId) => ({
          stateId,
          frequency: candidates.filter((taxon) => scoreCode(key, stateId, taxon.id) === 1).length,
        }))
        .sort((a, b) => a.frequency - b.frequency)
      return choices[0] ? [{ featureId: feature.id, stateIds: [choices[0].stateId], confidence: 'certain' as const, frequency: choices[0].frequency }] : []
    })
    .sort((a, b) => a.frequency - b.frequency)
    .slice(0, limit)
    .map(({ frequency: _frequency, ...observation }) => observation)
}

describe('forgiving candidate engine', () => {
  it('changes ranking when a character is selected and restores the neutral list when removed', () => {
    const neutral = rankCandidates(key, [])
    expect(new Set(neutral.map((item) => item.compatibility))).toEqual(new Set([100]))
    const observation = diagnosticObservations('Jotus', 1)
    const ranked = rankCandidates(key, observation)
    expect(ranked.some((item) => item.compatibility < ranked[0].compatibility)).toBe(true)
    expect(rankCandidates(key, [])).toEqual(neutral)
  })

  it('keeps candidates visible even when observations conflict', () => {
    const observations = diagnosticObservations('Maratus', 4)
    observations.push(...diagnosticObservations('Holoplatys', 1).map((item) => ({ ...item, confidence: 'unsure' as const })))
    const ranked = rankCandidates(key, observations)
    expect(ranked).toHaveLength(85)
    expect(ranked.every((item) => Number.isFinite(item.compatibility))).toBe(true)
  })

  it('reduces the influence of an unsure conflicting observation', () => {
    const jotus = taxonNamed('Jotus')
    const support = diagnosticObservations('Jotus', 1)[0]
    const conflictingFeature = key.features.find((feature) => feature.kind === 'multistate' && feature.id > 17 && feature.id !== support.featureId &&
      (feature.states ?? []).some((stateId) => scoreCode(key, stateId, jotus.id) !== 0) &&
      (feature.states ?? []).some((stateId) => scoreCode(key, stateId, jotus.id) === 0))!
    const conflictingState = conflictingFeature.states!.find((stateId) => scoreCode(key, stateId, jotus.id) === 0)!
    const certainConflict: Observation = { featureId: conflictingFeature.id, stateIds: [conflictingState], confidence: 'certain' }
    const unsureConflict: Observation = { ...certainConflict, confidence: 'unsure' }
    const certain = rankCandidates(key, [support, certainConflict]).find((item) => item.taxon.id === jotus.id)!
    const unsure = rankCandidates(key, [support, unsureConflict]).find((item) => item.taxon.id === jotus.id)!
    expect(unsure.compatibility).toBeGreaterThan(certain.compatibility)
  })

  it('skipping a suggested character changes the sequence but not the ranking', () => {
    const available = availableFeatureIds(key, controlStateIds('unknown', false))
    const candidates = rankCandidates(key, [])
    const first = suggestCharacters(key, candidates, [], available, curated, 'field', 3)
    const skipped = suggestCharacters(key, candidates, [], available, curated, 'field', 3, new Set([first[0].feature.id]))
    expect(skipped.some((item) => item.feature.id === first[0].feature.id)).toBe(false)
    expect(rankCandidates(key, [])).toEqual(candidates)
  })

  it('treats a completely unscored comparator as neutral, not as a conflict', () => {
    const sourceGap = taxonNamed('Australoneon')
    for (const stateId of [289, 290, 291, 294]) {
      const featureId = key.states.find((state) => state.id === stateId)!.feature
      const candidate = rankCandidates(key, [{ featureId, stateIds: [stateId], confidence: 'certain' }])
        .find((item) => item.taxon.id === sourceGap.id)!
      expect(candidate.conflicts).toHaveLength(0)
      expect(candidate.uncertain).toHaveLength(1)
      expect(candidate.uncertain[0].assessed).toBe(false)
      expect(candidate.compatibility).toBe(100)
    }
  })

  it('treats all-zero source gaps as neutral across every multistate character', () => {
    const characters = key.features.filter((feature) => feature.kind === 'multistate' && feature.id > 17)
    const taxa = key.taxa.filter((taxon) => taxon.parent !== 0)
    let checked = 0
    for (const feature of characters) {
      for (const taxon of taxa) {
        if (!(feature.states ?? []).every((stateId) => scoreCode(key, stateId, taxon.id) === 0)) continue
        const result = rankCandidates(key, [{ featureId: feature.id, stateIds: [feature.states![0]], confidence: 'certain' }])
          .find((candidate) => candidate.taxon.id === taxon.id)!
        expect(result.conflicts, `${taxon.name}: ${feature.name}`).toHaveLength(0)
        expect(result.uncertain[0]?.assessed, `${taxon.name}: ${feature.name}`).toBe(false)
        checked += 1
      }
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('keeps genuine opposite-state conflicts and treats multiple choices as any-of', () => {
    const jotus = taxonNamed('Jotus')
    const longOnly = rankCandidates(key, [{ featureId: 113, stateIds: [290], confidence: 'certain' }])
      .find((item) => item.taxon.id === jotus.id)!
    expect(longOnly.conflicts).toHaveLength(1)
    expect(longOnly.conflicts[0].assessed).toBe(true)

    const eitherLength = rankCandidates(key, [{ featureId: 113, stateIds: [289, 290], confidence: 'certain' }])
      .find((item) => item.taxon.id === jotus.id)!
    expect(eitherLength.supports).toHaveLength(1)
    expect(eitherLength.conflicts).toHaveLength(0)
  })

  for (const genus of ['Jotus', 'Holoplatys', 'Maratus', 'Adoxotoma', 'Opisthoncus', 'Ananeon']) {
    it(`places ${genus} among the strongest candidates for its diagnostic source states`, () => {
      const observations = diagnosticObservations(genus)
      const ranked = rankCandidates(key, observations)
      const rank = ranked.findIndex((item) => item.taxon.id === taxonNamed(genus).id)
      expect(rank).toBeGreaterThanOrEqual(0)
      expect(rank).toBeLessThan(5)
      expect(ranked[rank].conflicts).toHaveLength(0)
    })
  }
})

describe('Lucid dependencies', () => {
  it('shows male characters and hides female characters for males', () => {
    const available = availableFeatureIds(key, controlStateIds('male', false))
    expect(available.has(80)).toBe(true)
    expect(available.has(64)).toBe(false)
    expect(available.has(103)).toBe(false)
  })

  it('shows external epigyne characters and only shows internal anatomy when cleared', () => {
    const uncleared = availableFeatureIds(key, controlStateIds('female', false))
    const cleared = availableFeatureIds(key, controlStateIds('female', true))
    expect(uncleared.has(64)).toBe(true)
    expect(uncleared.has(73)).toBe(false)
    expect(cleared.has(73)).toBe(true)
    expect(cleared.has(80)).toBe(false)
  })

  it('unknown sex hides sex-specific groups', () => {
    const available = availableFeatureIds(key, controlStateIds('unknown', false))
    for (const featureId of [48, 56, 64, 73, 79, 80, 91, 103]) expect(available.has(featureId)).toBe(false)
    expect(available.has(18)).toBe(true)
  })
})

describe('differential comparison', () => {
  it('returns only characters that distinguish two to five candidates', () => {
    const observations = diagnosticObservations('Jotus', 5)
    const ranked = rankCandidates(key, observations)
    const comparison = ranked.slice(0, 4)
    const rows = differentialRows(key, comparison.map((item) => item.taxon), observations, availableFeatureIds(key, [1]), curated)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) expect(new Set(Object.values(row.values)).size).toBeGreaterThan(1)
  })

  it('only offers the end-stage comparison for two to five plausible candidates', () => {
    const ranked = rankCandidates(key, diagnosticObservations('Jotus', 4))
    expect(comparisonIsUseful(ranked.slice(0, 1), 4)).toBe(false)
    expect(comparisonIsUseful(ranked.slice(0, 2), 4)).toBe(true)
    expect(comparisonIsUseful(ranked.slice(0, 5), 4)).toBe(true)
    expect(comparisonIsUseful(ranked.slice(0, 6), 4)).toBe(false)
    expect(comparisonIsUseful(ranked.slice(0, 3), 0)).toBe(false)
  })

  it('keeps source gaps labelled as not scored in comparison rows', () => {
    const australoneon = taxonNamed('Australoneon')
    const jotus = taxonNamed('Jotus')
    const rows = differentialRows(key, [australoneon, jotus], [], availableFeatureIds(key, controlStateIds('unknown', false)), curated, 99)
    expect(rows.some((row) => row.values[australoneon.id] === 'Not scored')).toBe(true)
    for (const row of rows) expect(new Set(Object.values(row.values)).size).toBeGreaterThan(1)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { StateIllustration } from './StateIllustration'

const key = JSON.parse(readFileSync(resolve('public/data/key.json'), 'utf8'))
const scientific = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8'))
const render = (characterLabel: string, stateLabel: string, anatomicalRegion?: string, imageUrl?: string, imageCaption?: string, characterId?: string, stateId?: string) => renderToStaticMarkup(createElement(StateIllustration, { characterLabel, stateLabel, anatomicalRegion, imageUrl, imageCaption, characterId, stateId }))

describe('graphical discriminator coverage', () => {
  it('renders an accessible pictogram for every Lucid state when no source image is supplied', () => {
    const features = new Map(key.features.map((item: { id: number; name: string }) => [item.id, item.name]))
    for (const state of key.states as Array<{ name: string; feature: number }>) {
      const markup = render(String(features.get(state.feature)), state.name)
      expect(markup).toContain('<svg')
      expect(markup).toContain('role="img"')
    }
  })

  it('renders an accessible pictogram for all 139 Schubert states', () => {
    const packet = scientific.rawSnapshots['05_schubert_genus_characters.json']
    const states = packet.characters.flatMap((character: { character_id: string; name: string; anatomical_region: string; states: Array<{ state_id: string; label: string }> }) => character.states.map((state) => ({ character, state })))
    expect(states).toHaveLength(139)
    for (const { character, state } of states) {
      const markup = render(character.name, state.label, character.anatomical_region, undefined, undefined, character.character_id, state.state_id)
      expect(markup).toContain('<svg')
      expect(markup).toContain('role="img"')
      expect(markup).toContain('schubert-pictogram')
      expect(markup).toContain('Character-specific guide')
    }
  })

  it('gives every Schubert character an explicit visual focus and distinct state markup', () => {
    const packet = scientific.rawSnapshots['05_schubert_genus_characters.json']
    expect(packet.characters).toHaveLength(44)
    for (const character of packet.characters as Array<{ character_id: string; name: string; anatomical_region: string; states: Array<{ state_id: string; label: string }> }>) {
      const markups = character.states.map((state) => render(character.name, state.label, character.anatomical_region, undefined, undefined, character.character_id, state.state_id))
      expect(markups.every((markup) => markup.includes('diagram-focus-label'))).toBe(true)
      if (markups.length > 1) expect(new Set(markups).size).toBe(markups.length)
    }
  })

  it('marks unreported, undiagnosed, and other Schubert states as neutral rather than present or absent', () => {
    const neutralCases = [
      ['SC030', 'SC030_K', 'Spermathecal configuration', 'not adequately diagnosed in source'],
      ['SC040', 'SC040_B', 'Overall body colour', 'other'],
      ['SC036', 'SC036_B', 'Courtship', 'absent or not reported diagnostically'],
    ]
    for (const [characterId, stateId, characterLabel, stateLabel] of neutralCases) {
      expect(render(characterLabel, stateLabel, undefined, undefined, undefined, characterId, stateId)).toContain('diagram-neutral')
    }
  })

  it('uses the supplied source image when one is available', () => {
    const markup = render('Shape', 'round', undefined, '/example.jpg', 'Reviewed source example')
    expect(markup).toContain('<img')
    expect(markup).toContain('Source example')
    expect(markup).toContain('Reviewed source example')
  })

  it('visually distinguishes the four total-size options', () => {
    const labels = ['small (<4mm)', 'medium (4-8mm)', 'large (8-11mm)', 'very large (>11mm)']
    const markups = labels.map((stateLabel) => render('Size - total length', stateLabel))
    expect(new Set(markups).size).toBe(4)
    expect(markups.join('')).toContain('relative body size')
  })

  it('the local packet exposes 241 direct Lucid state illustrations before fallbacks', () => {
    expect(key.states.filter((state: { images?: unknown[] }) => state.images?.length).length).toBe(241)
  })
})

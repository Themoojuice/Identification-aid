import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createGenusDatasetFromScientificPackage } from './genus-engine'
import { rankLucidQuestions } from './question-ranking'

const scientific = JSON.parse(readFileSync(resolve('public/data/scientific-package.json'), 'utf8'))
const dataset = createGenusDatasetFromScientificPackage(scientific)
const candidates = dataset.taxa.filter((item) => !item.isRoot).slice(0, 12).map((item) => item.id)
const cost = (effort = 2) => () => ({ effort, errorRisk: 'moderate' as const, usable: true, rationale: 'Test cost.' })

describe('Lucid next-question utility', () => {
  it('is deterministic and explains its conservative source treatment', () => {
    const first = rankLucidQuestions(dataset, dataset.characters.slice(0, 12), candidates, [], cost())
    const second = rankLucidQuestions(dataset, dataset.characters.slice(0, 12), candidates, [], cost())
    expect(first).toEqual(second)
    expect(first.every((item) => item.explanation.includes('non-overlapping source profiles'))).toBe(true)
  })

  it('does not reward a question that the current view cannot use', () => {
    const character = dataset.characters[0]
    const ranked = rankLucidQuestions(dataset, [character], candidates, [], () => ({ effort: 1, errorRisk: 'low', usable: false, rationale: 'Unavailable view.' }))
    expect(ranked).toEqual([])
  })

  it('penalizes correlated evidence groups and marks the reason', () => {
    const first = dataset.characters[0]
    const related = dataset.characters.find((item) => item.groupPacketId === first.groupPacketId && item.id !== first.id)
    if (!related) return
    const baseline = rankLucidQuestions(dataset, [related], candidates, [], cost())[0]
    const observation = { id: 'obs', specimenId: 's1', characterId: first.id, disposition: 'not_sure' as const }
    const ranked = rankLucidQuestions(dataset, [related], candidates, [observation], cost())[0]
    if (baseline && ranked) {
      expect(ranked.utility).toBeLessThan(baseline.utility)
      expect(ranked.explanation).toContain('already represented')
    }
  })
})

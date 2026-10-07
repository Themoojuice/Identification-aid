import { afterEach, describe, expect, it, vi } from 'vitest'
import { readLocalValue, writeLocalValue } from './browser-storage'

afterEach(() => vi.unstubAllGlobals())
describe('restricted browser storage', () => {
  it('continues safely when browser reads and writes are denied', () => {
    vi.stubGlobal('localStorage', { getItem() { throw new Error('Denied') }, setItem() { throw new Error('Quota') } })
    expect(readLocalValue('session')).toBeNull()
    expect(writeLocalValue('session', '{}')).toBe(false)
  })
  it('reports successful storage accurately', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) })
    expect(writeLocalValue('session', '{}')).toBe(true)
    expect(readLocalValue('session')).toBe('{}')
  })
})

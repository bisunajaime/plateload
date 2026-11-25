import { describe, expect, it } from 'vitest'
import { solve } from '../lib/combinations'
import { applyBrand, buildSolveInput, defaultSettings } from '../lib/settings'
import { PRESETS, getPlateSet } from './plates'

const forGym = (brand: 'eleiko' | 'metcon', unit: 'kg' | 'lb') => PRESETS.filter((p) => p.brand === brand && p.unit === unit)

describe('plate presets', () => {
  it('every preset only names plates that exist in its set', () => {
    for (const p of PRESETS) {
      const ids = new Set(getPlateSet({ brand: p.brand, unit: p.unit }).map((d) => d.id))
      for (const id of Object.keys(p.counts)) expect(ids.has(id), `${p.id}: ${id}`).toBe(true)
    }
  })

  it('ids are unique and every preset says what it holds', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    for (const p of PRESETS) expect(p.hint.length).toBeGreaterThan(10)
  })

  it('a kilo gym has a sparse home preset and a bumpers-only one', () => {
    const ids = forGym('eleiko', 'kg').map((p) => p.id)
    expect(ids).toContain('eleiko-home-kg')
    expect(ids).toContain('eleiko-bumpers-kg')
  })

  it('a home gym in kilos can still load 100 kg (20 bar + 20 + 20 a side)', () => {
    const home = forGym('eleiko', 'kg').find((p) => p.id === 'eleiko-home-kg')!
    const s = { ...applyBrand(defaultSettings(), 'eleiko'), inventory: { ...defaultSettings().inventory, ...home.counts } }
    const r = solve(buildSolveInput(s, 100))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.combos[0].plates.map((p) => [p.weight, p.count])).toEqual([[20, 2]])
  })
})

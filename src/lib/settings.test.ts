import { describe, expect, it } from 'vitest'
import { COLLARS, getPlateSet, plateId } from '../data/plates'
import { denomsFromPlates, solve } from './combinations'
import { applyBrand, buildSolveInput, defaultSettings, hydrate, resolveLoadout, unitForBrand } from './settings'

describe('a brand carries its unit', () => {
  it('Eleiko is a kilo brand', () => {
    const s = applyBrand(defaultSettings(), 'eleiko')
    expect(unitForBrand('eleiko')).toBe('kg')
    expect(s.unit).toBe('kg')
    expect(s.barId).toBe('oly-men-20')
    expect(resolveLoadout(s).collarWeight).toBe(COLLARS['eleiko-competition'].kg)
    expect(resolveLoadout(s).base).toBe(25)
  })

  it('Metcon is a pound brand', () => {
    const s = applyBrand(defaultSettings(), 'metcon')
    expect(unitForBrand('metcon')).toBe('lb')
    expect(s.unit).toBe('lb')
    expect(s.barId).toBe('us-45')
    expect(s.collarKind).toBe('metcon-fastclip')
    expect(resolveLoadout(s).collarWeight).toBe(0)
    expect(resolveLoadout(s).base).toBe(45)
  })

  it('switching brand resets the bar, including a custom one', () => {
    const custom = { ...defaultSettings(), barId: 'custom', customBarWeight: 17.5 }
    const s = applyBrand(custom, 'metcon')
    expect(s.barId).toBe('us-45')
    expect(s.customBarWeight).toBeNull()
    expect(applyBrand(s, 'eleiko').barId).toBe('oly-men-20')
  })

  it('the target crosses over as the same real load, not the same number', () => {
    const kg = { ...applyBrand(defaultSettings(), 'eleiko'), target: 100 }
    const lb = applyBrand(kg, 'metcon')
    // 100 kg is 220.5 lb, which no 2.5 lb-stepped gym can load — snapped to 220
    expect(lb.target).toBe(220)
    expect(applyBrand(lb, 'eleiko').target).toBe(100)
  })

  it('units are never mixed on one bar', () => {
    const eleiko = resolveLoadout(applyBrand(defaultSettings(), 'eleiko'))
    const metcon = resolveLoadout(applyBrand(defaultSettings(), 'metcon'))
    expect(eleiko.plates.every((p) => p.unit === 'kg')).toBe(true)
    expect(metcon.plates.every((p) => p.unit === 'lb')).toBe(true)
    expect(eleiko.denoms.some((d) => d.id === plateId('eleiko', 'kg', 25))).toBe(true)
    expect(metcon.denoms.some((d) => d.id === plateId('metcon', 'lb', 45))).toBe(true)
  })
})

describe('inventory', () => {
  it('a pair of plates gives one a side; an odd plate is dead weight', () => {
    const plates = getPlateSet({ brand: 'metcon', unit: 'kg' })
    const denoms = denomsFromPlates(plates, { [plateId('metcon', 'kg', 25)]: 5 })
    expect(denoms).toHaveLength(1)
    expect(denoms[0].maxPerSide).toBe(2)
  })

  it('the bumpers-only toggle drops change plates', () => {
    const plates = getPlateSet({ brand: 'metcon', unit: 'lb' })
    const inv = Object.fromEntries(plates.map((p) => [p.id, 4]))
    expect(denomsFromPlates(plates, inv, true).some((d) => d.kind !== 'bumper')).toBe(true)
    expect(denomsFromPlates(plates, inv, false).every((d) => d.kind === 'bumper')).toBe(true)
  })
})

describe('stored settings', () => {
  it('hydrate repairs junk without throwing away the good parts', () => {
    const s = hydrate({ brand: 'eleiko', unit: 'lb', barId: 'nope', target: -5, favorites: [{ bad: true }], lastWeights: ['x', 100] })
    // the stored brand wins over a stored unit that contradicts it
    expect(s.unit).toBe('kg')
    expect(s.barId).toBe('oly-men-20')
    // the stored 100 was pounds, so it comes back as the same load in kilos
    expect(s.target).toBe(45.5)
    expect(s.favorites).toEqual([])
    // a bare number from an older store is tagged with the unit it was saved under
    expect(s.lastWeights).toEqual([{ weight: 100, unit: 'lb' }])
  })

  it('recents keep the unit they were entered in', () => {
    const s = hydrate({
      brand: 'eleiko',
      unit: 'kg',
      lastWeights: [{ weight: 100, unit: 'kg' }, { weight: 225, unit: 'lb' }, { weight: 'junk' }, 60],
    })
    expect(s.lastWeights).toEqual([
      { weight: 100, unit: 'kg' },
      { weight: 225, unit: 'lb' },
      { weight: 60, unit: 'kg' },
    ])
  })

  it('a stored unit that contradicts the brand is repaired', () => {
    const s = hydrate({ brand: 'metcon', unit: 'kg', barId: 'metcon-men-20', target: 100 })
    expect(s.unit).toBe('lb')
    expect(s.barId).toBe('us-45')
    expect(s.target).toBe(220)
  })

  it('inventory defaults fill in denominations the store never saw', () => {
    const s = hydrate({ inventory: { [plateId('metcon', 'kg', 25)]: 12 } })
    expect(s.inventory[plateId('metcon', 'kg', 25)]).toBe(12)
    expect(s.inventory[plateId('eleiko', 'kg', 20)]).toBeGreaterThan(0)
  })
})

describe('end to end through the app’s own settings', () => {
  it('an Eleiko session loads 100 kg as 25 + 10 + 2.5 a side', () => {
    const s = applyBrand(defaultSettings(), 'eleiko')
    const res = solve(buildSolveInput(s, 100), 'recommended')
    expect(res.ok).toBe(true)
    expect(res.combos[0].plates.map((p) => p.weight)).toEqual([25, 10, 2.5])
  })

  it('a first run is Metcon pounds, and its opening target is loadable', () => {
    const s = defaultSettings()
    expect(s.brand).toBe('metcon')
    expect(s.unit).toBe('lb')
    expect(s.barId).toBe('us-45')
    // The sleeve view is the one that shows the plates, so it opens there.
    expect(s.closeUp).toBe(true)
    expect(solve(buildSolveInput(s), 'recommended').ok).toBe(true)
  })

})

describe('stored settings are untrusted', () => {
  it('an unknown collar kind falls back instead of crashing the app', () => {
    const s = hydrate({ collarKind: 'nope' })
    expect(s.collarKind in COLLARS).toBe(true)
  })

  it('bad enums and impossible numbers fall back to defaults', () => {
    const d = defaultSettings()
    const s = hydrate({ brand: 'garbage', mode: 'x', theme: 5, customBarWeight: -100, lastWeights: [{ weight: -5, unit: 'kg' }] })
    expect(s.brand).toBe(d.brand)
    expect(s.mode).toBe(d.mode)
    expect(s.theme).toBe(d.theme)
    expect(s.customBarWeight).toBeNull()
    expect(s.lastWeights).toEqual([])
  })

  it('valid collar choices survive', () => {
    const s = hydrate({ ...defaultSettings(), collarKind: 'generic', collarWeight: 1.5 })
    expect(s.collarKind).toBe('generic')
    expect(s.collarWeight).toBe(1.5)
  })
})

describe('switching brand', () => {
  it('keeps collars off when they were off', () => {
    const s = applyBrand({ ...defaultSettings(), collars: false }, 'eleiko')
    expect(s.collars).toBe(false)
  })
})

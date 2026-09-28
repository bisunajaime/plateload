import { describe, expect, it } from 'vitest'
import {
  COLLARS,
  getPlateSet,
  plateId,
  type Brand,
  type MetconStyle,
  type Unit,
} from '../data/plates'
import {
  denomsFromPlates,
  nearestTotals,
  reachablePerSide,
  smallestIncrement,
  snapToLoadable,
  solve,
  type Combo,
  type SolveInput,
} from './combinations'

/* ------------------------------------------------------------------ setup */

interface Opts {
  brand: Brand
  unit: Unit
  target: number
  bar: number
  collarWeight?: number
  collarsOn?: boolean
  collarWidthMm?: number
  /** Whole-gym counts by weight; omitted → "unlimited" (40 of each). */
  counts?: Record<number, number>
  includeChange?: boolean
  metconStyle?: MetconStyle
  sleeveMm?: number
  limit?: number
}

function input(o: Opts): SolveInput {
  const plates = getPlateSet({ brand: o.brand, unit: o.unit, metconStyle: o.metconStyle ?? 'colored' })
  const inventory: Record<string, number> = {}
  for (const p of plates) inventory[p.id] = o.counts ? (o.counts[p.weight] ?? 0) : 40
  return {
    target: o.target,
    unit: o.unit,
    bar: o.bar,
    collarsOn: o.collarsOn ?? (o.collarWeight ?? 0) > 0,
    collarWeight: o.collarWeight ?? 0,
    collarWidthMm: o.collarWidthMm ?? 0,
    denoms: denomsFromPlates(plates, inventory, o.includeChange ?? true),
    sleeveMm: o.sleeveMm ?? 415,
    limit: o.limit ?? 200,
  }
}

/** "25+10+2.5" per side, heaviest first. */
const sig = (c: Combo) =>
  c.plates.flatMap((p) => Array.from({ length: p.count }, () => String(p.weight))).join('+')
const sigs = (combos: Combo[]) => combos.map(sig)

/* ------------------------------------------------------------------ tests */

describe('Eleiko kg — competition platform', () => {
  const res = solve(input({ brand: 'eleiko', unit: 'kg', target: 100, bar: 20, collarWeight: 2.5 }), 'fewest')

  it('subtracts bar and both collars', () => {
    expect(res.platesTotal).toBe(75)
    expect(res.perSide).toBe(37.5)
  })

  it('includes 25+10+2.5 and 20+15+2.5', () => {
    expect(res.ok).toBe(true)
    expect(sigs(res.combos)).toContain('25+10+2.5')
    expect(sigs(res.combos)).toContain('20+15+2.5')
  })

  it('marks 25+10+2.5 as the competition stack', () => {
    const comp = res.combos.filter((c) => c.competitionLegal)
    expect(comp).toHaveLength(1)
    expect(sig(comp[0])).toBe('25+10+2.5')
  })

  it('every combo weighs exactly the per-side load', () => {
    for (const c of res.combos) {
      const sum = c.plates.reduce((s, p) => s + p.weight * p.count, 0)
      expect(Math.round(sum * 1000)).toBe(Math.round(37.5 * 1000))
    }
  })
})

describe('Metcon kg bumpers — 100 kg on a 20 kg bar with Fast Clips', () => {
  const res = solve(
    input({ brand: 'metcon', unit: 'kg', target: 100, bar: 20, collarsOn: true, collarWeight: 0, includeChange: false }),
    'fewest',
  )

  it('Fast Clips add nothing', () => {
    expect(res.platesTotal).toBe(80)
    expect(res.perSide).toBe(40)
  })

  it('includes 25+15, 20+20 and 20+15+5', () => {
    const s = sigs(res.combos)
    expect(s).toContain('25+15')
    expect(s).toContain('20+20')
    expect(s).toContain('20+15+5')
  })
})

describe('Metcon coloured lb', () => {
  it('225 lb on a 45 lb bar is two 45s a side', () => {
    const res = solve(input({ brand: 'metcon', unit: 'lb', target: 225, bar: 45, includeChange: false }), 'fewest')
    expect(res.ok).toBe(true)
    expect(res.perSide).toBe(90)
    expect(sigs(res.combos)).toContain('45+45')
  })

  it('185 lb offers 55+35 as well as 45+25', () => {
    const res = solve(input({ brand: 'metcon', unit: 'lb', target: 185, bar: 45, includeChange: false }), 'fewest')
    expect(res.perSide).toBe(70)
    const s = sigs(res.combos)
    expect(s).toContain('45+25')
    expect(s).toContain('55+15')
    expect(s).toContain('35+35')
  })
})

describe('inventory limits', () => {
  it('one pair of 25s cannot produce two 25s per side', () => {
    const res = solve(
      input({
        brand: 'metcon',
        unit: 'kg',
        target: 120,
        bar: 20,
        counts: { 25: 2, 20: 8, 15: 4, 10: 4, 5: 4 },
        includeChange: false,
      }),
      'fewest',
    )
    for (const c of res.combos) {
      const twentyFives = c.plates.find((p) => p.weight === 25)?.count ?? 0
      expect(twentyFives).toBeLessThanOrEqual(1)
    }
    expect(sigs(res.combos)).toContain('25+20+5')
  })

  it('an odd plate count still only yields pairs', () => {
    const res = solve(
      input({ brand: 'metcon', unit: 'kg', target: 70, bar: 20, counts: { 25: 3, 20: 0, 15: 0, 10: 0, 5: 0 }, includeChange: false }),
      'fewest',
    )
    // 25 kg per side needs one pair; a third plate is unusable.
    expect(res.ok).toBe(true)
    expect(sigs(res.combos)).toEqual(['25'])
  })
})

describe('unreachable weights', () => {
  it('below the bar is rejected with an explanation', () => {
    const res = solve(input({ brand: 'eleiko', unit: 'kg', target: 15, bar: 20, collarWeight: 2.5 }))
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('below-bar')
  })

  it('returns nearest reachable totals either side', () => {
    const res = solve(input({ brand: 'metcon', unit: 'kg', target: 101, bar: 20, includeChange: false }), 'fewest')
    expect(res.ok).toBe(false)
    expect(res.nearestBelow).toBe(100)
    expect(res.nearestAbove).toBe(110)
  })

  it('Metcon bumpers only cannot make 2.5 lb steps, and says what is near', () => {
    const res = solve(input({ brand: 'metcon', unit: 'lb', target: 227.5, bar: 45, includeChange: false }), 'fewest')
    expect(res.ok).toBe(false)
    expect(res.nearestBelow).toBe(225)
    expect(res.nearestAbove).toBe(235) // 45 + 35 + 15 a side
  })

  it('change plates unlock the weights between the bumper steps', () => {
    // Metcon's smallest plate is 2.5 lb, so 227.5 stays out of reach either way,
    // but 230 opens up the moment the change plates are available.
    const off = solve(input({ brand: 'metcon', unit: 'lb', target: 230, bar: 45, includeChange: false }), 'fewest')
    expect(off.ok).toBe(false)
    const on = solve(input({ brand: 'metcon', unit: 'lb', target: 230, bar: 45, includeChange: true }), 'fewest')
    expect(on.ok).toBe(true)
    expect(sigs(on.combos)).toContain('45+45+2.5')
  })

  it('smallest increment reflects the available denominations', () => {
    const bumpersOnly = input({ brand: 'metcon', unit: 'lb', target: 225, bar: 45, includeChange: false })
    const withChange = input({ brand: 'metcon', unit: 'lb', target: 225, bar: 45, includeChange: true })
    // 10s and 15s make 65 and 75 lb — 10 lb apart, though the lightest pair is 20
    expect(smallestIncrement(bumpersOnly.denoms, 'lb')).toBe(10)
    // 2.5 lb is Metcon's smallest plate, and plates go on in pairs
    expect(smallestIncrement(withChange.denoms, 'lb')).toBe(5)
  })
})

describe('combination shape', () => {
  const res = solve(input({ brand: 'eleiko', unit: 'kg', target: 140, bar: 20, collarWeight: 2.5 }), 'fewest')

  it('combinations are unique', () => {
    const seen = new Set(res.combos.map((c) => c.id))
    expect(seen.size).toBe(res.combos.length)
  })

  it('plates are stored inside-out, heaviest first', () => {
    for (const c of res.combos) {
      const weights = c.plates.map((p) => p.weight)
      expect(weights).toEqual([...weights].sort((a, b) => b - a))
    }
  })

  it('a bare bar is a valid solution', () => {
    const res2 = solve(input({ brand: 'eleiko', unit: 'kg', target: 20, bar: 20, collarsOn: false }), 'fewest')
    expect(res2.ok).toBe(true)
    expect(res2.combos[0].plates).toHaveLength(0)
  })
})

describe('sleeve capacity', () => {
  it('Metcon 25 + 20 kg is 73 + 63 = 136 mm per side', () => {
    const res = solve(
      input({ brand: 'metcon', unit: 'kg', target: 110, bar: 20, includeChange: false, counts: { 25: 2, 20: 2 } }),
      'fewest',
    )
    const combo = res.combos.find((c) => sig(c) === '25+20')!
    expect(combo).toBeDefined()
    expect(combo.sleeveMm).toBe(136)
    expect(combo.overCapacity).toBe(false)
  })

  it('adds the collar width and flags an overfull sleeve', () => {
    const res = solve(
      input({
        brand: 'metcon',
        unit: 'kg',
        target: 260,
        bar: 20,
        collarsOn: true,
        collarWeight: 0,
        collarWidthMm: COLLARS['metcon-fastclip'].widthMm,
        includeChange: false,
        sleeveMm: 415,
      }),
      'compact',
    )
    const stack = res.combos[0]
    // 6 × 20 kg = 6 × 63 = 378 mm + 22 mm clip = 400 mm; 4 × 25 + 20 = 355 mm + clip.
    expect(stack.sleeveMm).toBeLessThanOrEqual(415)
    const worst = res.combos[res.combos.length - 1]
    expect(worst.sleeveMm).toBeGreaterThan(stack.sleeveMm)
    const over = res.combos.filter((c) => c.sleeveMm > 415)
    for (const c of over) expect(c.overCapacity).toBe(true)
  })
})

describe('reachability helpers', () => {
  it('reachable set respects pair counts', () => {
    const i = input({ brand: 'metcon', unit: 'kg', target: 100, bar: 20, counts: { 25: 2 }, includeChange: false })
    const r = reachablePerSide(i.denoms)
    expect(r.maxMilli).toBe(25_000)
  })

  it('nearest totals bracket an impossible target', () => {
    const i = input({ brand: 'metcon', unit: 'lb', target: 200, bar: 45, includeChange: false })
    const n = nearestTotals(i, reachablePerSide(i.denoms))
    expect(n.below).toBe(195) // 45 + 15 + 15 a side
    expect(n.above).toBe(205)
  })

  it('snapToLoadable picks the closest achievable total', () => {
    const i = input({ brand: 'metcon', unit: 'lb', target: 200, bar: 45, includeChange: false })
    expect(snapToLoadable(i, 200)).toBe(205)
    expect(snapToLoadable(i, 187)).toBe(185)
    expect(snapToLoadable(i, 44)).toBe(45)
  })
})

describe('ranking modes', () => {
  const base = { brand: 'eleiko' as const, unit: 'kg' as const, target: 100, bar: 20, collarWeight: 2.5 }

  it('fewest puts the shortest stack first', () => {
    const res = solve(input(base), 'fewest')
    expect(res.combos[0].plateCount).toBeLessThanOrEqual(res.combos[1].plateCount)
  })

  it('competition puts the biggest plates first', () => {
    const res = solve(input(base), 'competition')
    expect(sig(res.combos[0])).toBe('25+10+2.5')
  })

  it('compact sorts by sleeve length', () => {
    const res = solve(input(base), 'compact')
    for (let i = 1; i < res.combos.length; i++) {
      expect(res.combos[i].sleeveMm).toBeGreaterThanOrEqual(res.combos[i - 1].sleeveMm)
    }
  })

  it('recommended leads with a competition-clean, short stack', () => {
    const res = solve(input(base), 'recommended')
    expect(sig(res.combos[0])).toBe('25+10+2.5')
  })
})

describe('plate ids', () => {
  it('are stable across skins so inventory survives a style switch', () => {
    const colored = getPlateSet({ brand: 'metcon', unit: 'kg', metconStyle: 'colored' })
    const black = getPlateSet({ brand: 'metcon', unit: 'kg', metconStyle: 'black' })
    expect(colored.map((p) => p.id)).toEqual(black.map((p) => p.id))
    expect(colored.find((p) => p.weight === 20)!.color).not.toBe(black.find((p) => p.weight === 20)!.color)
    expect(plateId('metcon', 'kg', 2.5)).toBe('metcon-kg-2.5')
  })

  it('Metcon bumpers are all 450 mm with a 50.4 mm insert', () => {
    for (const p of getPlateSet({ brand: 'metcon', unit: 'lb' }).filter((p) => p.kind === 'bumper')) {
      expect(p.diameterMm).toBe(450)
      expect(p.insertMm).toBe(50.4)
    }
  })
})

describe('performance', () => {
  it('solves a dense set well under 50 ms', () => {
    const i = input({ brand: 'eleiko', unit: 'kg', target: 182.5, bar: 20, collarWeight: 2.5, limit: 80 })
    const t0 = performance.now()
    const res = solve(i, 'recommended')
    const ms = performance.now() - t0
    expect(res.ok).toBe(true)
    expect(res.combos.length).toBeGreaterThan(0)
    expect(ms).toBeLessThan(50)
  })
})

describe('the sleeve has to hold it', () => {
  it('a weight the plates make but the sleeve cannot hold is not loadable', () => {
    // 900 lb needs ~640 mm of plates a side; the sleeve is 415 mm.
    const res = solve(input({ brand: 'metcon', unit: 'lb', target: 900, bar: 45, collarWidthMm: 30 }))
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('too-wide')
    // …and what it suggests instead does fit.
    expect(res.nearestBelow).not.toBeNull()
    const below = solve(input({ brand: 'metcon', unit: 'lb', target: res.nearestBelow!, bar: 45, collarWidthMm: 30 }))
    expect(below.ok).toBe(true)
    expect(below.combos.some((c) => !c.overCapacity)).toBe(true)
  })

  it('snapping never lands on a load that cannot fit', () => {
    const i = input({ brand: 'metcon', unit: 'lb', target: 1000, bar: 45, collarWidthMm: 30 })
    const snapped = snapToLoadable(i, 1000)
    const res = solve({ ...i, target: snapped })
    expect(res.ok).toBe(true)
    expect(res.combos.some((c) => !c.overCapacity)).toBe(true)
  })
})

describe('compact finds the thinnest stack even when the search is capped', () => {
  it('matches a brute-force minimum in a well-stocked gym', () => {
    // 99 of every Eleiko plate: far more combinations than the search keeps.
    const counts = Object.fromEntries([25, 20, 15, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25].map((w) => [w, 99]))
    const i = input({ brand: 'eleiko', unit: 'kg', target: 150, bar: 20, collarWeight: 2.5, collarWidthMm: 30, counts })
    const res = solve(i, 'compact')
    expect(res.truncated).toBe(true)
    // Brute force: every way to make 62.5 kg a side, thinnest wins.
    let thinnest = Infinity
    const walk = (d: number, left: number, mm: number) => {
      if (left === 0) thinnest = Math.min(thinnest, mm)
      if (left <= 0 || d >= i.denoms.length || mm >= thinnest) return
      const { milli, maxPerSide, thicknessMm } = i.denoms[d]
      for (let c = Math.min(maxPerSide, Math.floor(left / milli)); c >= 0; c--) walk(d + 1, left - c * milli, mm + c * thicknessMm)
    }
    walk(0, 62500, 30)
    expect(res.combos[0].sleeveMm).toBe(thinnest)
  })
})

import { describe, expect, it } from 'vitest'
import { getPlateSet } from '../data/plates'
import { denomsFromPlates, type SolveInput } from './combinations'
import { nextJump, percentTable, warmupPlan } from './warmup'

function metconKg(includeChange = true): SolveInput {
  const plates = getPlateSet({ brand: 'metcon', unit: 'kg' })
  const inventory = Object.fromEntries(plates.map((p) => [p.id, 8]))
  return {
    target: 100,
    unit: 'kg',
    bar: 20,
    collarsOn: true,
    collarWeight: 0,
    collarWidthMm: 22,
    denoms: denomsFromPlates(plates, inventory, includeChange),
    sleeveMm: 415,
  }
}

describe('warm-up generator', () => {
  it('starts at the bar and ends at the work weight', () => {
    const plan = warmupPlan(100, metconKg())
    expect(plan[0].bareBar).toBe(true)
    expect(plan[0].weight).toBe(20)
    expect(plan[plan.length - 1].weight).toBe(100)
    expect(plan.map((s) => s.weight)).toEqual([...plan.map((s) => s.weight)].sort((a, b) => a - b))
  })

  it('snaps each step to something the gym can load', () => {
    const bumpersOnly = metconKg(false)
    const plan = warmupPlan(100, bumpersOnly)
    for (const s of plan) expect(s.weight % 10).toBe(0)
  })

  it('drops duplicate steps', () => {
    const plan = warmupPlan(30, metconKg(false))
    expect(new Set(plan.map((s) => s.weight)).size).toBe(plan.length)
  })
})

describe('percent table', () => {
  it('covers the requested range', () => {
    const rows = percentTable(200, metconKg(), 50, 100, 10)
    expect(rows.map((r) => r.pct)).toEqual([50, 60, 70, 80, 90, 100])
    expect(rows[rows.length - 1].weight).toBe(200)
  })
})

describe('next jump', () => {
  it('finds the smallest loadable step up and down', () => {
    // 0.5 kg change plates make a half-kilo-a-side, one-kilo-total step... and
    // 1.25 + 0.5 kg together reach a quarter of a kilo a side, so 100.5 loads.
    const j = nextJump(metconKg(), 100)
    expect(j.up).toBe(100.5)
    expect(j.down).toBe(99.5)
  })

  it('bumpers-only jumps are coarse', () => {
    const j = nextJump(metconKg(false), 100)
    expect(j.up).toBe(110)
    expect(j.down).toBe(90)
  })

  it('competition increment lands on a whole kilo', () => {
    const j = nextJump(metconKg(), 100.5)
    expect(j.competitionUp).toBe(102)
  })
})

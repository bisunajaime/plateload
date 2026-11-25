import { describe, expect, it } from 'vitest'
import type { Combo } from '../../lib/combinations'
import { recommendedWhy, wayReason } from './reasons'

const combo = (id: string, o: Partial<Combo> & { weights?: number[] }): Combo => ({
  id,
  plates: (o.weights ?? [25]).map((w) => ({ id: `p${w}`, weight: w, count: 1, thicknessMm: 30, kind: 'bumper' })),
  perSide: 0,
  plateCount: o.plateCount ?? (o.weights ?? [25]).length,
  changeCount: 0,
  sleeveMm: o.sleeveMm ?? 100,
  overCapacity: o.overCapacity ?? false,
  competitionLegal: o.competitionLegal ?? false,
})

describe('why a way is worth a look', () => {
  const a = combo('a', { weights: [25, 20], competitionLegal: true, sleeveMm: 140 })
  const b = combo('b', { weights: [20, 15, 10], sleeveMm: 120 })
  const c = combo('c', { weights: [15, 15, 15], sleeveMm: 150 })
  const wide = combo('w', { weights: [10, 10, 10, 10, 5], overCapacity: true, sleeveMm: 420 })
  const all = [a, b, c, wide]

  it('warns before anything else', () => {
    expect(wayReason(wide, all, 415)).toEqual({ text: 'Too wide for the sleeve', warn: true })
  })

  it('names what each way is best at, in plain words', () => {
    expect(wayReason(a, all, 415).text).toBe('Fewest plates, biggest inside')
    expect(wayReason(b, all, 415).text).toBe('Shortest on the sleeve')
    expect(wayReason(c, all, 415).text).toBe('Uses 36% of the sleeve')
  })

  it('never uses jargon', () => {
    for (const x of all) expect(wayReason(x, all, 415).text).not.toMatch(/change|mm|competition/i)
  })

  it('says why the recommendation is the recommendation', () => {
    expect(recommendedWhy(a, all)).toBe('Recommended: the fewest plates, heaviest innermost, and it fits the sleeve.')
    expect(recommendedWhy(combo('e', { weights: [] }), all)).toMatch(/bar on its own/)
  })
})

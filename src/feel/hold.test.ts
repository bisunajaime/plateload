import { describe, expect, it } from 'vitest'
import { HOLD_DELAY, repeatInterval } from './hold'

describe('press and hold', () => {
  it('waits long enough that a tap is never a hold', () => {
    expect(HOLD_DELAY).toBeGreaterThanOrEqual(300)
  })

  it('speeds up the longer you hold', () => {
    for (let n = 1; n < 12; n++) expect(repeatInterval(n)).toBeLessThanOrEqual(repeatInterval(n - 1))
    expect(repeatInterval(0)).toBe(150)
  })

  it('never gets so fast you overshoot the weight you wanted', () => {
    expect(repeatInterval(100)).toBe(60)
    // From 60 kg to 100 kg in 2.5 kg steps (16 steps) takes over a second.
    const total = Array.from({ length: 16 }, (_, n) => repeatInterval(n)).reduce((a, b) => a + b, 0)
    expect(total).toBeGreaterThan(1000)
  })
})

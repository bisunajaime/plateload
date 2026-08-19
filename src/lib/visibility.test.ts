import { describe, expect, it } from 'vitest'
import { visibilityOf } from './visibility'

const VIEWPORT = 760
const HEADER = 72
const hero = (top: number, height = 200) => ({ top, bottom: top + height, height })

/** What the floating preview keys off. */
const shows = (top: number) => {
  const v = visibilityOf(hero(top), VIEWPORT, HEADER)
  return v.passed && !v.onScreen
}

describe('element visibility', () => {
  it('fully in view', () => {
    expect(visibilityOf(hero(200), VIEWPORT, HEADER)).toEqual({ onScreen: true, passed: false })
  })

  it('below the fold — not on screen, but not passed either', () => {
    expect(visibilityOf(hero(1200), VIEWPORT, HEADER)).toEqual({ onScreen: false, passed: false })
  })

  it('a sliver showing at the bottom does not count as on screen', () => {
    // 20 px of 200 visible
    expect(visibilityOf(hero(VIEWPORT - 20), VIEWPORT, HEADER).onScreen).toBe(false)
  })

  it('tucked under the sticky header counts as hidden by that much', () => {
    // top 0, bottom 200, header eats the first 72 → 128/200 = 64 %
    expect(visibilityOf(hero(0), VIEWPORT, HEADER).onScreen).toBe(true)
    // top −120, bottom 80 → only 8 px below the header
    expect(visibilityOf(hero(-120), VIEWPORT, HEADER).onScreen).toBe(false)
  })

  it('scrolled off the top is passed', () => {
    expect(visibilityOf(hero(-260), VIEWPORT, HEADER)).toEqual({ onScreen: false, passed: true })
    // exactly touching the header edge still counts as gone
    expect(visibilityOf(hero(-128), VIEWPORT, HEADER).passed).toBe(true)
  })

  it('a zero-height element is never on screen', () => {
    expect(visibilityOf({ top: 100, bottom: 100, height: 0 }, VIEWPORT, HEADER).onScreen).toBe(false)
  })
})

describe('the floating preview', () => {
  it('stays hidden until the bar is genuinely behind you', () => {
    expect(shows(1200)).toBe(false) // not reached yet
    expect(shows(200)).toBe(false) // looking right at it
    expect(shows(-100)).toBe(false) // still half showing under the header
    expect(shows(-260)).toBe(true) // gone — show the stand-in
  })
})

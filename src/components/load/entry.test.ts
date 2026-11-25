import { describe, expect, it } from 'vitest'
import { checkEntry } from './entry'

describe('checking a typed weight', () => {
  it('accepts a loadable-looking number, rounded to the gram', () => {
    expect(checkEntry('102.5', 45, 'lb')).toEqual({ ok: true, value: 102.5 })
    expect(checkEntry(' 60,25 ', 20, 'kg')).toEqual({ ok: true, value: 60.25 })
    expect(checkEntry('45', 45, 'lb')).toEqual({ ok: true, value: 45 })
  })

  it('explains an empty, zero or non-number entry', () => {
    for (const raw of ['', '0', '-5', 'abc', '.']) expect(checkEntry(raw, 45, 'lb')).toEqual({ ok: false, message: 'Enter a weight.' })
  })

  it('names the cap instead of clamping to it', () => {
    expect(checkEntry('99999', 45, 'lb')).toEqual({ ok: false, message: 'PlateLoad goes up to 2000 lb.' })
  })

  it('names the bar when the weight is lighter than it', () => {
    expect(checkEntry('30', 45, 'lb')).toEqual({ ok: false, message: 'The empty bar already weighs 45 lb — enter at least that.' })
  })
})

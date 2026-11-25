import { describe, expect, it } from 'vitest'
import { diffStack, enterDelays, stackKey } from './stack'

const keys = (...ids: string[]) => ids.map((id, i) => stackKey(i, id))

describe('diffStack', () => {
  it('adding on the outside leaves everything else alone', () => {
    const d = diffStack(keys('25', '20'), keys('25', '20', '5'))
    expect(d.entering).toEqual(['2:5'])
    expect(d.staying).toEqual(['0:25', '1:20'])
    expect(d.exiting).toEqual([])
  })

  it('changing an inner plate takes the outer ones off and puts them back', () => {
    // 25, 20 → 25, 25, 20: the 20 has to come off for the second 25 to go on.
    const d = diffStack(keys('25', '20'), keys('25', '25', '20'))
    expect(d.staying).toEqual(['0:25'])
    expect(d.exiting).toEqual(['1:20'])
    expect(d.entering).toEqual(['1:25', '2:20'])
  })

  it('plates come off outermost first', () => {
    const d = diffStack(keys('25', '20', '10', '5'), keys('25'))
    expect(d.exiting).toEqual(['3:5', '2:10', '1:20'])
  })

  it('emptying the bar takes everything off; loading from empty puts everything on', () => {
    expect(diffStack(keys('25', '5'), []).exiting).toEqual(['1:5', '0:25'])
    expect(diffStack([], keys('25', '5')).entering).toEqual(['0:25', '1:5'])
  })

  it('no change is no change', () => {
    const d = diffStack(keys('25', '20'), keys('25', '20'))
    expect(d.entering).toEqual([])
    expect(d.exiting).toEqual([])
  })
})

describe('enterDelays', () => {
  it('only new plates queue: a single plate added outside starts immediately', () => {
    const d = enterDelays(diffStack(keys('25', '20', '15', '10', '5'), keys('25', '20', '15', '10', '5', '2.5')), 45, 120)
    expect([...d.values()]).toEqual([0])
  })

  it('several new plates go on in order, one stagger apart', () => {
    const d = enterDelays(diffStack([], keys('25', '20', '5')), 45, 120)
    expect([...d.entries()]).toEqual([
      ['0:25', 0],
      ['1:20', 45],
      ['2:5', 90],
    ])
  })

  it('new plates wait for the old ones to clear the sleeve', () => {
    const d = enterDelays(diffStack(keys('25', '20'), keys('25', '25', '20')), 45, 120)
    expect([...d.values()]).toEqual([120, 165])
  })
})

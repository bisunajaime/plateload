import { describe, expect, it } from 'vitest'
import { plateMilestone } from './milestones'

describe('plate milestones', () => {
  it('counts pounds in 45s on a 45 lb bar, whatever plates make it', () => {
    expect(plateMilestone(225, 45, 'lb')).toBe('Two plates.')
    expect(plateMilestone(315, 45, 'lb')).toBe('Three plates.')
    expect(plateMilestone(405, 45, 'lb')).toBe('Four plates.')
  })

  it('counts kilos in 25s or 20s, on top of bar and collars', () => {
    expect(plateMilestone(125, 25, 'kg')).toBe('Two plates.')
    expect(plateMilestone(140, 20, 'kg')).toBe('Three plates.')
  })

  it('leaves everything else alone', () => {
    expect(plateMilestone(135, 45, 'lb')).toBeNull() // one plate is every warm-up
    expect(plateMilestone(230, 45, 'lb')).toBeNull()
    expect(plateMilestone(675, 45, 'lb')).toBeNull() // seven plates — nobody's counting
    expect(plateMilestone(225, 45, 'kg')).toBeNull()
  })
})

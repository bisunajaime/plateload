import type { Unit } from '../data/plates'

const WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six']

/** The plate lifters count in: a 45 in pounds; a 20 or a 25 in kilos. */
const FULL_PLATES: Record<Unit, number[]> = { lb: [45], kg: [25, 20] }

/**
 * Lifters count in plates: 225 lb is "two plates", 315 is "three", whatever
 * actually goes on the bar to make it. A total that is the bar and collars
 * plus a whole number of full plates a side gets named that way. One plate
 * is too ordinary to mark; past six, nobody is counting.
 */
export function plateMilestone(target: number, base: number, unit: Unit): string | null {
  for (const plate of FULL_PLATES[unit]) {
    const n = (target - base) / (plate * 2)
    if (Number.isInteger(n) && n >= 2 && n <= 6) return `${WORDS[n]} plates.`
  }
  return null
}

/** The clean & jerk world record (Lasha Talakhadze, 267 kg) — loaded by a long press on the logo. */
export const WORLD_RECORD = { kg: 267, lb: 589 } as const

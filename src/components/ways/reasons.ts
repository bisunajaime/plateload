import type { Combo, RankMode } from '../../lib/combinations'

/** The ranking choices, named the way a lifter would, each with its meaning in a sentence. */
export const RANKINGS: { value: RankMode; short: string; name: string; meaning: string }[] = [
  { value: 'recommended', short: 'Best', name: 'Recommended', meaning: 'Fewest plates that fit the sleeve, heaviest innermost.' },
  { value: 'fewest', short: 'Fewest', name: 'Fewest plates', meaning: 'Least to carry to the bar, in any order.' },
  { value: 'compact', short: 'Shortest', name: 'Shortest stack', meaning: 'Leaves the most sleeve free for the collar.' },
  { value: 'competition', short: 'Meet', name: 'Meet order', meaning: 'Biggest plates innermost, the way a platform loader stacks them.' },
]

export interface WayReason {
  text: string
  /** A problem with this way, not a selling point. */
  warn?: boolean
}

const sleeveShare = (c: Combo, sleeveMm: number) => Math.min(100, Math.round((c.sleeveMm / sleeveMm) * 100))

/**
 * One plain reason this way is worth a look, judged against all the others:
 * a warning first, then what it's best at, then how much sleeve it uses.
 */
export function wayReason(c: Combo, all: Combo[], sleeveMm: number): WayReason {
  if (c.overCapacity) return { text: 'Too wide for the sleeve', warn: true }
  if (c.plates.length === 0) return { text: 'Just the bar' }
  const fewest = Math.min(...all.map((x) => x.plateCount))
  const shortest = Math.min(...all.map((x) => x.sleeveMm))
  if (c.plateCount === fewest && c.competitionLegal) return { text: 'Fewest plates, biggest inside' }
  if (c.plateCount === fewest) return { text: 'Fewest plates' }
  if (c.competitionLegal) return { text: 'Biggest plates inside — how a meet loads it' }
  if (c.sleeveMm === shortest) return { text: 'Shortest on the sleeve' }
  return { text: `Uses ${sleeveShare(c, sleeveMm)}% of the sleeve` }
}

/** Why the top recommendation is the top one, in a sentence. The row already shows the count. */
export function recommendedWhy(c: Combo, all: Combo[]): string {
  if (c.plates.length === 0) return 'Recommended: the bar on its own makes this weight.'
  const fewest = Math.min(...all.map((x) => x.plateCount))
  const parts = [c.plateCount === fewest ? 'the fewest plates' : null, c.competitionLegal ? 'heaviest innermost' : null].filter(Boolean)
  if (c.overCapacity) return `Recommended${parts.length ? `: ${parts.join(', ')}` : ''}, but it’s too wide for the sleeve.`
  return parts.length ? `Recommended: ${parts.join(', ')}, and it fits the sleeve.` : 'Recommended: it fits the sleeve with the least fuss.'
}

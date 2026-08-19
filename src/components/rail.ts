import type { Tone } from './ui'

/**
 * A card's identity lives on the edge you scan down, not inside it. Written out
 * in full because Tailwind reads class names literally.
 */
export const RAIL: Record<Tone, string> = {
  good: 'border-l-[3px] border-l-good',
  bad: 'border-l-[3px] border-l-bad',
  gold: 'border-l-[3px] border-l-gold',
  sky: 'border-l-[3px] border-l-sky',
  flame: 'border-l-[3px] border-l-flame',
  steel: 'border-l-[3px] border-l-steel',
}

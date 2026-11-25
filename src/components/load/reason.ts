import type { Unit } from '../../data/plates'
import type { SolveReason } from '../../lib/combinations'
import { fmt } from '../../lib/format'

/** Why a weight can't go on the bar, in plain words — shared by the card and its screen-reader sentence. */
export function cantLoadReason({
  reason,
  target,
  unit,
  base,
  step,
  smallPlatesOff,
}: {
  reason: SolveReason
  target: number
  unit: Unit
  base: number
  /** The finest total step the current plates allow. */
  step: number
  smallPlatesOff: boolean
}): { title: string; why: string } {
  const title = `Can’t load ${fmt(target)} ${unit}`
  switch (reason) {
    case 'below-bar':
      return { title, why: `The empty bar already weighs ${fmt(base)} ${unit}.` }
    case 'no-plates':
      return { title, why: 'Your gym has no plates yet. Add the ones you have in Gym.' }
    case 'too-wide':
      return { title, why: 'Your plates add up to it, but no stack of them fits on the sleeve.' }
    default:
      return {
        title,
        why: smallPlatesOff
          ? `With bumpers only, your plates go up in ${fmt(step)} ${unit} steps.`
          : `Your plates go up in ${fmt(step)} ${unit} steps.`,
      }
  }
}

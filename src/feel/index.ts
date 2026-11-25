import { haptic, type Haptic } from './haptics'
import { play, type PlayOptions, type Sound } from './sound'

export { duration, ease, stagger, prefersReducedMotion, useReducedMotion } from './motion'
export { haptic, hapticsSupported, setHapticsEnabled } from './haptics'
export { play, primeSound, setSoundEnabled, soundEnabled } from './sound'

/**
 * The moments the app responds to, and what each one sounds and feels like.
 * Components name the moment; this table decides the response, so the same
 * moment always feels the same wherever it happens.
 */
export type Moment =
  | 'step' // −/+, a quick jump, a keypad key
  | 'select' // choosing one of several: a combination, a chip, a tab
  | 'toggle' // a switch flipped
  | 'seat' // a plate landing on the sleeve
  | 'unseat' // a plate coming off
  | 'confirm' // saved, copied, applied
  | 'cantLoad' // the plates can't make it
  | 'snap' // something dragged settles into place
  | 'milestone' // a round, famous number on the bar

const RESPONSES: Record<Moment, [Sound | null, Haptic | null]> = {
  step: ['click', 'tick'],
  select: ['click', 'tick'],
  toggle: ['click', 'tick'],
  seat: ['seat', 'seat'],
  unseat: ['unseat', null],
  confirm: ['chime', 'confirm'],
  cantLoad: ['thud', 'warn'],
  snap: ['click', 'tick'],
  milestone: ['fanfare', 'heavy'],
}

export function feedback(moment: Moment, options: PlayOptions = {}) {
  const [sound, buzz] = RESPONSES[moment]
  if (sound) play(sound, options)
  if (!buzz) return
  if (options.delay) window.setTimeout(() => haptic(buzz), options.delay)
  else haptic(buzz)
}

/**
 * Haptics, by meaning rather than milliseconds. Call `haptic('tick')`, never
 * `navigator.vibrate(8)`: the pattern for each moment lives here, once.
 *
 * Android (and anything with the Vibration API) gets real patterns. iOS Safari
 * has no Vibration API, but since iOS 18 toggling a native `<input switch>`
 * gives a system tick — so on iOS every pattern becomes that single tick.
 * Everywhere else this is a silent no-op. Haptics never carry information on
 * their own: every buzz accompanies something you can see.
 */

export type Haptic =
  /** A step, a key, a chip — the smallest acknowledgement. */
  | 'tick'
  /** A plate seating on the sleeve. */
  | 'seat'
  /** Something done: saved, copied, applied. */
  | 'confirm'
  /** It didn't work: the plates can't make that weight. */
  | 'warn'
  /** A milestone. */
  | 'heavy'

export const PATTERNS: Record<Haptic, number | number[]> = {
  tick: 6,
  seat: 10,
  confirm: [8, 50, 14],
  warn: [16, 70, 16],
  heavy: [14, 40, 24, 40, 30],
}

let enabled = true
export const setHapticsEnabled = (on: boolean) => {
  enabled = on
}

const canVibrate = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

/** iPhone and iPad (which reports itself as a Mac with a touch screen). */
const isIOS = () =>
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))

let iosSwitch: HTMLLabelElement | null = null
function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.display = 'none'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.head.appendChild(label)
    iosSwitch = label
  }
  iosSwitch.click()
}

export function haptic(kind: Haptic) {
  if (!enabled || typeof document === 'undefined') return
  try {
    if (canVibrate()) navigator.vibrate(PATTERNS[kind])
    else if (isIOS()) iosTick()
  } catch {
    /* a blocked vibration is not worth an error */
  }
}

/**
 * Whether this device can give any haptic at all — to decide whether to offer
 * the setting. Desktop Chrome has `navigator.vibrate` but nothing to vibrate,
 * so it also needs a touch screen.
 */
export const hapticsSupported = () =>
  (canVibrate() && typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) || isIOS()

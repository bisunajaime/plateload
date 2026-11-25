import { useSyncExternalStore } from 'react'

/**
 * The motion vocabulary. Every duration, curve and stagger in the app comes
 * from here (TypeScript) or from the matching custom properties in index.css
 * (CSS) — a test keeps the two in step.
 *
 * The feel is "heavy and precise": things arrive fast and settle with a little
 * weight, nothing wobbles, and the biggest motion is saved for plates.
 */
export const duration = {
  /** A control acknowledging a press. */
  press: 90,
  /** Small state changes: a colour, a check, a chip. */
  quick: 160,
  /** Things entering or leaving: sheets, toasts, panels. */
  base: 240,
  /** A plate travelling onto the sleeve and seating. */
  settle: 420,
  /** A scoreboard digit rolling over. */
  roll: 460,
} as const

export const ease = {
  /** The house curve: quick out of the blocks, long gentle landing. */
  out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
  /** Leaving: picks up speed on the way out. */
  in: 'cubic-bezier(0.5, 0, 0.75, 0)',
  inOut: 'cubic-bezier(0.6, 0, 0.2, 1)',
  /**
   * A heavy spring — damping 0.72, about 4% overshoot — sampled into CSS
   * `linear()`. Browsers without `linear()` fall back to `out` in CSS.
   */
  seat: 'linear(0, 0.039, 0.134, 0.258, 0.393, 0.524, 0.644, 0.748, 0.833, 0.901, 0.952, 0.989, 1.013, 1.028, 1.036, 1.038, 1.037, 1.034, 1.029, 1.024, 1.019, 1.014, 1.01, 1.007, 1)',
} as const

export const stagger = {
  /** Between plates going onto the bar, in loading order. */
  plate: 45,
  /** Between digits of a rolling number, ones first. */
  digit: 45,
} as const

/* ------------------------------------------------------------ reduced motion */

const QUERY = '(prefers-reduced-motion: reduce)'

/** True when the person has asked the system for less motion. Read it fresh. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

/** Reduced motion as React state: flips live when the system setting changes. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false)
}

/**
 * What happens on the sleeve when the load changes, the way a loader does it.
 *
 * A plate is identified by its position and its denomination together. Swap an
 * inner plate and everything outside it has to come off first — so those count
 * as leaving and re-entering, not as plates that magically slid through each
 * other. Plates that keep both their position and their denomination stay put
 * (they may still glide, if a plate inside them changed thickness).
 */

export const stackKey = (index: number, plateId: string) => `${index}:${plateId}`

export interface StackChange {
  /** New on the bar, innermost first — the order they go on. */
  entering: string[]
  /** On the bar before and after. */
  staying: string[]
  /** Coming off, outermost first — the order they come off. */
  exiting: string[]
}

export function diffStack(prev: readonly string[], next: readonly string[]): StackChange {
  const before = new Set(prev)
  const after = new Set(next)
  return {
    entering: next.filter((k) => !before.has(k)),
    staying: next.filter((k) => before.has(k)),
    exiting: prev.filter((k) => !after.has(k)).reverse(),
  }
}

/**
 * When each entering plate starts moving, in ms. Only new plates queue — a
 * plate going on the outside starts at once, instead of waiting behind every
 * plate already on the bar. If plates are coming off first, the new ones wait
 * for them to clear.
 */
export function enterDelays(change: StackChange, step: number, clearMs: number): Map<string, number> {
  const wait = change.exiting.length ? clearMs : 0
  return new Map(change.entering.map((k, i) => [k, wait + i * step]))
}

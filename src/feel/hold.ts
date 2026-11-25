import { useEffect, useRef, type MouseEvent, type PointerEvent } from 'react'

/** Hold this long before a press starts repeating. */
export const HOLD_DELAY = 380

/**
 * The gap before repeat number `n` (0-based): starts deliberate, speeds up
 * the longer you hold, and bottoms out where you can still let go on the
 * weight you wanted.
 */
export function repeatInterval(n: number): number {
  return Math.max(60, Math.round(150 * Math.pow(0.86, n)))
}

/**
 * Press-and-hold to repeat. A tap still acts on click — so a scroll that
 * happens to start on the button never changes anything — and holding
 * repeats until you let go or the action says there's nothing more to do
 * (returns false). Keyboard activation is an ordinary click.
 */
export function useHoldRepeat(action: () => boolean | void) {
  const act = useRef(action)
  useEffect(() => {
    act.current = action
  })
  const timer = useRef<number | undefined>(undefined)
  const held = useRef(false)

  const stop = () => window.clearTimeout(timer.current)
  useEffect(() => stop, [])

  const tick = (n: number) => {
    if (act.current() === false) return
    timer.current = window.setTimeout(() => tick(n + 1), repeatInterval(n))
  }

  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return
      held.current = false
      stop()
      timer.current = window.setTimeout(() => {
        held.current = true
        tick(0)
      }, HOLD_DELAY)
    },
    onPointerUp: stop,
    // Slid off or interrupted: no click is coming to end the hold, so end it here,
    // or the next keyboard press would be swallowed as the hold's closing click.
    onPointerLeave: () => {
      stop()
      held.current = false
    },
    onPointerCancel: () => {
      stop()
      held.current = false
    },
    onClick: (e: MouseEvent<HTMLElement>) => {
      // The hold already did the work; the click that ends it is not one more step.
      // A keyboard click (detail 0) is never the end of a hold.
      if (held.current && e.detail !== 0) {
        held.current = false
        e.preventDefault()
        return
      }
      act.current()
    },
    // A long press on a phone must not open a context menu over the button.
    onContextMenu: (e: MouseEvent<HTMLElement>) => e.preventDefault(),
  }
}

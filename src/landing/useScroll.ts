import { useEffect, useRef, useState, type RefObject } from 'react'
import { prefersReducedMotion } from '../hooks/useSettings'

export const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))

/* ------------------------------------------------------------------ engine */

/**
 * Runs `frame` at most once per animation frame while the page scrolls or
 * resizes, and once on mount. Effects write straight to the DOM from here, so
 * a scroll never re-renders React unless a value it shows actually changes.
 */
export function useScrollFrame(frame: () => void) {
  const latest = useRef(frame)
  useEffect(() => {
    latest.current = frame
  })
  useEffect(() => {
    let raf = 0
    const run = () => {
      raf = 0
      latest.current()
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])
}

/** 0 → 1 as a tall element scrolls through a pinned viewport. */
export function pinnedProgress(el: Element): number {
  const r = el.getBoundingClientRect()
  const travel = r.height - window.innerHeight
  return travel > 0 ? clamp(-r.top / travel) : r.top < 0 ? 1 : 0
}

/** 0 → 1 from the element's top entering the bottom of the screen to its bottom leaving the top. */
export function passProgress(el: Element): number {
  const r = el.getBoundingClientRect()
  return clamp((window.innerHeight - r.top) / (window.innerHeight + r.height))
}

/** Eases a displayed number toward `value`, so the scoreboard counts rather than jumps. */
export function useCountUp(value: number, ms = 360): number {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  const reduced = prefersReducedMotion()
  useEffect(() => {
    if (reduced) {
      from.current = value
      return
    }
    const start = performance.now()
    const a = from.current
    let raf = requestAnimationFrame(function step(now) {
      const t = clamp((now - start) / ms)
      const v = a + (value - a) * (1 - (1 - t) ** 3)
      from.current = v
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(raf)
  }, [value, ms, reduced])
  return reduced ? value : shown
}

/** Writes the page's scroll position to `--scroll` on the landing root, for effects that turn with it. */
export function useScrollVar(root: RefObject<HTMLElement | null>) {
  useScrollFrame(() => {
    if (prefersReducedMotion()) return
    root.current?.style.setProperty('--scroll', String(window.scrollY))
  })
}

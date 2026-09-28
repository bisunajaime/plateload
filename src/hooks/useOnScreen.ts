import { useEffect, useState, type RefObject } from 'react'
import { visibilityOf, type Visibility } from '../lib/visibility'

/**
 * Tracks whether `ref` is on screen and which way it left.
 *
 * Measured on scroll rather than with IntersectionObserver: an observer stops
 * reporting once the element is fully gone, which is exactly the state this
 * needs to know about.
 */
export function useVisibility(
  ref: RefObject<Element | null>,
  headerOffset = 72,
  minVisible = 0.35,
  minVisiblePx = Infinity,
): Visibility {
  const [state, setState] = useState<Visibility>({ onScreen: true, passed: false })

  useEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const next = visibilityOf(el.getBoundingClientRect(), window.innerHeight, headerOffset, minVisible, minVisiblePx)
      setState((prev) => (prev.onScreen === next.onScreen && prev.passed === next.passed ? prev : next))
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [ref, headerOffset, minVisible, minVisiblePx])

  return state
}

/** Whether the page has been scrolled at all since it loaded. */
export function useHasScrolled(): boolean {
  const [scrolled, setScrolled] = useState(() => typeof window !== 'undefined' && window.scrollY > 0)

  useEffect(() => {
    if (scrolled) return
    const onScroll = () => {
      if (window.scrollY > 0) setScrolled(true)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [scrolled])

  return scrolled
}

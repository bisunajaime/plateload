import { useEffect, useState, type RefObject } from 'react'
import { visibilityOf, type Visibility } from '../lib/visibility'

/**
 * Tracks whether `ref` is on screen and which way it left.
 *
 * Measured on scroll rather than with IntersectionObserver: an observer stops
 * reporting once the element is fully gone, which is exactly the state this
 * needs to know about.
 */
export function useVisibility(ref: RefObject<Element | null>, headerOffset = 72, minVisible = 0.35): Visibility {
  const [state, setState] = useState<Visibility>({ onScreen: true, passed: false })

  useEffect(() => {
    const measure = () => {
      const el = ref.current
      if (!el) return
      const next = visibilityOf(el.getBoundingClientRect(), window.innerHeight, headerOffset, minVisible)
      setState((prev) => (prev.onScreen === next.onScreen && prev.passed === next.passed ? prev : next))
    }

    measure()
    window.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      window.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [ref, headerOffset, minVisible])

  return state
}

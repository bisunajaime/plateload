import { useEffect, useState, type RefObject } from 'react'

export interface Visibility {
  /** A meaningful part of the element is on screen. */
  onScreen: boolean
  /** The element has scrolled off the top — you have already passed it. */
  passed: boolean
}

/**
 * Tracks whether `ref` is on screen, and on which side it left. The top offset
 * clears the sticky header; the threshold means a sliver does not count.
 */
export function useVisibility(
  ref: RefObject<Element | null>,
  rootMargin = '-72px 0px 0px 0px',
  threshold = 0.35,
): Visibility {
  const [state, setState] = useState<Visibility>({ onScreen: true, passed: false })

  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds?.top ?? 0
        setState({
          onScreen: entry.isIntersecting,
          passed: entry.boundingClientRect.bottom < rootTop,
        })
      },
      { rootMargin, threshold },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [ref, rootMargin, threshold])

  return state
}

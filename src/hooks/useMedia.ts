import { useSyncExternalStore } from 'react'

/** A media query as live React state. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** Two columns from here up: the load stays pinned and the tools sit beside it. */
export const DESKTOP = '(min-width: 1024px)'

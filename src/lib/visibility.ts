export interface Visibility {
  /** Enough of the element is on screen to be worth looking at. */
  onScreen: boolean
  /** The element has scrolled off the top — you have already gone past it. */
  passed: boolean
}

export interface Rect {
  top: number
  bottom: number
  height: number
}

/**
 * Where an element sits relative to the viewport.
 *
 * `headerOffset` discounts the sticky header, `minVisible` is the fraction that
 * has to be showing before it counts as on screen — a sliver scrolling past
 * should not make a floating stand-in disappear.
 */
export function visibilityOf(rect: Rect, viewportHeight: number, headerOffset = 72, minVisible = 0.35): Visibility {
  const shown = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, headerOffset))
  const ratio = rect.height > 0 ? shown / rect.height : 0
  return { onScreen: ratio >= minVisible, passed: rect.bottom <= headerOffset }
}

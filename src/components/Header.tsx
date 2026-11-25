import { useRef } from 'react'
import type { Brand } from '../data/plates'
import { ChevronDownIcon } from './kit/icons'

/**
 * The name, and which plates you're loading. Everything else lives in the
 * tabs. The brand carries its unit, so the button says both.
 */
export function Header({
  brand,
  onBrand,
  onLogoHold,
}: {
  brand: Brand
  /** Open the plates-and-units picker. */
  onBrand: () => void
  /** A long press on the logo. Nothing says it's there. */
  onLogoHold?: () => void
}) {
  // The logo is a link home; held for most of a second it does something else
  // instead, and the click that ends the hold must not navigate.
  const hold = useRef<number | undefined>(undefined)
  const fired = useRef(false)
  const release = () => window.clearTimeout(hold.current)
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
        <a href="#main" className="sr-only focus:not-sr-only focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2">
          Skip to content
        </a>
        <a
          href="/"
          className="mr-auto flex min-h-[44px] select-none items-center gap-2.5 rounded-lg pr-2 font-display text-lg font-semibold tracking-tight [-webkit-touch-callout:none]"
          aria-label="PlateLoad home"
          onPointerDown={(e) => {
            if (e.button !== 0 || !onLogoHold) return
            fired.current = false
            hold.current = window.setTimeout(() => {
              fired.current = true
              onLogoHold()
            }, 700)
          }}
          onPointerUp={release}
          onPointerLeave={() => {
            release()
            fired.current = false
          }}
          onPointerCancel={() => {
            release()
            fired.current = false
          }}
          onContextMenu={(e) => onLogoHold && e.preventDefault()}
          onClick={(e) => {
            // Enter on the link (detail 0) always navigates.
            if (fired.current && e.detail !== 0) {
              fired.current = false
              e.preventDefault()
            }
          }}
          draggable={false}
        >
          <span className="brand-mark" aria-hidden="true" />
          <span>PlateLoad</span>
        </a>

        <button
          type="button"
          onClick={onBrand}
          className="inline-flex min-h-[44px] select-none items-center gap-2 rounded-full border border-edge bg-surface pl-4 pr-3 text-sm font-semibold transition hover:bg-surface2 active:scale-press"
          aria-label={`Plates: ${brand === 'metcon' ? 'Metcon, pounds' : 'Eleiko, kilos'}. Change`}
        >
          {brand === 'metcon' ? 'Metcon' : 'Eleiko'}
          <span className="font-cond text-base font-bold uppercase tracking-wide text-accent-ink">{brand === 'metcon' ? 'lb' : 'kg'}</span>
          <ChevronDownIcon />
        </button>
      </div>
    </header>
  )
}

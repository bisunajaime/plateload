import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../app/context'
import { BarbellSVG } from '../components/BarbellSVG'
import { PlatePill } from '../components/kit/PlatePill'
import { WarmupPanel } from '../components/WarmupPanel'
import { feedback } from '../feel'
import { DESKTOP, useMedia } from '../hooks/useMedia'
import { fmt } from '../lib/format'

/** Climbing to the working set: a ramp, or percentages of a max. */
export function WarmupScreen() {
  const desktop = useMedia(DESKTOP)
  return (
    <div className="flex flex-col gap-4">
      {/* On a desktop the load is pinned beside this pane; a phone needs it here. */}
      {!desktop && <OnTheBar />}
      {/* The tab bar already says where you are; the heading is for screen-reader navigation. */}
      <h2 className="sr-only">Warm-up</h2>
      <WarmupPanel />
    </div>
  )
}

/**
 * What's on the bar right now, pinned under the header while you scroll the
 * sets — so you can load a row and check it without leaving the tab.
 */
function OnTheBar() {
  const { settings, update, selected, result, loadout, collarKind, collarWidth, animate } = useApp()
  const { closeUp } = settings
  // Spoken only when the load changes after the tab opens — opening the tab isn't news.
  const sentence = !result.ok
    ? `${fmt(settings.target)} ${settings.unit} can’t be loaded`
    : selected && selected.plates.length
      ? `${fmt(settings.target)} ${settings.unit}: ${selected.plates.map((p) => `${p.count > 1 ? `${p.count} × ` : ''}${fmt(p.weight)}`).join(', ')} each side`
      : `${fmt(settings.target)} ${settings.unit}: empty bar`
  const [announcement, setAnnouncement] = useState('')
  const opened = useRef(true)
  useEffect(() => {
    if (opened.current) {
      opened.current = false
      return
    }
    const t = window.setTimeout(() => setAnnouncement(sentence), 450)
    return () => window.clearTimeout(t)
  }, [sentence])
  const byId = useMemo(() => new Map(loadout.plates.map((p) => [p.id, p])), [loadout.plates])
  // Tucked right under the sticky header, whatever its height — gym mode makes it taller.
  const [top, setTop] = useState(0)
  useEffect(() => {
    const header = document.querySelector('header')
    if (!header) return
    const ro = new ResizeObserver(() => setTop(header.getBoundingClientRect().height))
    ro.observe(header)
    return () => ro.disconnect()
  }, [])
  return (
    <div
      data-on-the-bar
      style={{ top }}
      className="sticky z-20 -mx-4 -mt-4 border-b border-line bg-bg px-4 py-2.5 sm:-mx-6 sm:-mt-6 sm:px-6"
    >
      {/* Whole bar: the drawing runs full width under the numbers. Close-up: it
          sits beside them, cropped tight to the sleeve, so it can stand tall —
          the plates big enough to read — without the summary growing much. */}
      <div className={closeUp ? 'flex items-center gap-3' : ''}>
        <div
          className={`flex min-h-[44px] gap-x-3 gap-y-1 ${closeUp ? 'min-w-0 flex-1 flex-col items-start' : 'flex-wrap items-center'}`}
        >
          {/* One sentence for screen readers when a set is loaded, not the pills read out bare. */}
          <span className="sr-only" aria-live="polite" aria-atomic="true">
            {announcement}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">On the bar</span>
          <span className="flex items-baseline gap-1">
            <span className={`font-cond font-bold tabular-nums ${closeUp ? 'text-2xl' : 'text-xl'}`}>{fmt(settings.target)}</span>
            <span className="text-sm text-muted">{settings.unit}</span>
          </span>
          <span className="flex flex-wrap items-center gap-1">
            {!result.ok ? (
              <span className="text-sm text-bad">can’t be loaded</span>
            ) : selected && selected.plates.length ? (
              selected.plates.map((p) => {
                const def = byId.get(p.id)
                return def ? <PlatePill key={p.id} plate={def} count={p.count} size="sm" /> : null
              })
            ) : (
              <span className="text-sm text-muted">empty bar</span>
            )}
          </span>
        </div>
        {/* Tap a set below and watch it load, with the same thunks as the Load tab
            (which isn't on screen to make them). Tap the drawing for the close-up or
            the whole bar — the same choice as on Load. */}
        <button
          type="button"
          onClick={() => {
            feedback('select')
            update({ closeUp: !closeUp })
          }}
          aria-pressed={!closeUp}
          aria-label="Show the whole bar"
          className={`group relative flex flex-col items-center rounded-xl focus-visible:ring-inset ${closeUp ? 'w-[46%] max-w-[220px] shrink-0' : 'mt-1 w-full'}`}
        >
          <BarbellSVG
            bar={loadout.bar}
            plates={loadout.plates}
            combo={selected}
            collarKind={collarKind}
            collarWidthMm={collarWidth}
            unit={settings.unit}
            showLabels={settings.showLabels}
            closeUp={closeUp}
            tight
            animate={animate}
            feedback
            unloadable={!result.ok}
            loadId={settings.target}
            maxHeightPx={closeUp ? 170 : 96}
            className="block h-auto"
          />
          {/* Under the drawing, not over it: at this size an overlay would sit on the plates. */}
          <span aria-hidden="true" className="text-xs font-semibold text-muted transition group-hover:text-ink">
            {closeUp ? 'Tap for whole bar' : 'Tap for close-up'}
          </span>
        </button>
      </div>
    </div>
  )
}

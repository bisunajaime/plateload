import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../app/context'
import { PlatePill } from '../components/kit/PlatePill'
import { WarmupPanel } from '../components/WarmupPanel'
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
  const { settings, selected, result, loadout } = useApp()
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
      className="sticky z-20 -mx-4 -mt-4 border-b border-line bg-bg/95 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:-mt-6 sm:px-6"
    >
      <div className="flex min-h-[44px] flex-wrap items-center gap-x-3 gap-y-1" role="status" aria-live="polite">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">On the bar</span>
        <span className="flex items-baseline gap-1">
          <span className="font-cond text-xl font-bold tabular-nums">{fmt(settings.target)}</span>
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
    </div>
  )
}

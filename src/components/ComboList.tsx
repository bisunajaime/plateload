import { useState } from 'react'
import type { CollarKind, PlateDef } from '../data/plates'
import type { Combo, RankMode } from '../lib/combinations'
import { ComboCard } from './ComboCard'

const MODES: { value: RankMode; label: string; title: string }[] = [
  { value: 'recommended', label: 'Recommended', title: 'Fewest plates, loaded competition style' },
  { value: 'competition', label: 'Competition', title: 'Largest plates innermost, IWF order' },
  { value: 'fewest', label: 'Fewest', title: 'Fewest plates per side' },
  { value: 'compact', label: 'Compact', title: 'Shortest stack on the sleeve' },
  { value: 'inventory', label: 'Use what I have', title: 'Spends the big plates first' },
  { value: 'all', label: 'All', title: 'Every combination' },
]

// Four at a time: enough to choose from, short enough to scan on a phone.
const PAGE = 4

export function ComboList({
  combos,
  mode,
  onMode,
  plates,
  collarKind,
  collarWidthMm,
  sleeveMm,
  selectedId,
  onSelect,
  truncated,
  totalFound,
}: {
  combos: Combo[]
  mode: RankMode
  onMode: (m: RankMode) => void
  plates: PlateDef[]
  collarKind: CollarKind | null
  collarWidthMm: number
  sleeveMm: number
  selectedId: string | null
  onSelect: (c: Combo) => void
  truncated: boolean
  totalFound: number
}) {
  const [shown, setShown] = useState(PAGE)
  // Reset paging when the result set changes — derived during render, no effect.
  const listKey = `${mode}:${combos.length}:${combos[0]?.id ?? ''}`
  const [prevKey, setPrevKey] = useState(listKey)
  if (listKey !== prevKey) {
    setPrevKey(listKey)
    setShown(PAGE)
  }

  const active = MODES.find((m) => m.value === mode)
  // One way to load it is already the bar above — a list of one is noise.
  if (totalFound <= 1) return null

  return (
    <section aria-labelledby="ways-heading">
      <div className="mb-2 flex items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h2 id="ways-heading" className="section-title">
            {totalFound} ways to load it
          </h2>
          {active && <p className="truncate text-xs text-muted">{active.title}</p>}
        </div>
        <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
          <span>Sort</span>
          <select
            className="sort-select"
            value={mode}
            onChange={(e) => onMode(e.target.value as RankMode)}
            aria-label="Sort combinations"
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="card divide-y divide-line overflow-hidden">
        {combos.slice(0, shown).map((c) => (
          <li key={c.id}>
            <ComboCard
              combo={c}
              plates={plates}
              collarKind={collarKind}
              collarWidthMm={collarWidthMm}
              sleeveMm={sleeveMm}
              selected={c.id === selectedId}
              onSelect={() => onSelect(c)}
            />
          </li>
        ))}
        {combos.length > shown && (
          <li>
            <button
              type="button"
              className="flex min-h-[44px] w-full items-center justify-center text-sm font-medium text-muted transition hover:bg-surface2/40 hover:text-ink"
              onClick={() => setShown((s) => s + PAGE)}
            >
              Show {Math.min(PAGE, combos.length - shown)} more
            </button>
          </li>
        )}
      </ul>
      {truncated && combos.length <= shown && (
        <p className="mt-2 px-1 text-xs text-muted">
          Showing the best {combos.length}. Another sort brings up different ones.
        </p>
      )}
    </section>
  )
}

export { MODES }

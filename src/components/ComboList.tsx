import { useState } from 'react'
import type { CollarKind, PlateDef } from '../data/plates'
import type { Combo, RankMode } from '../lib/combinations'
import { ComboCard } from './ComboCard'
import { ChevronIcon, Segmented } from './ui'

const MODES: { value: RankMode; label: string; title: string }[] = [
  { value: 'recommended', label: 'Recommended', title: 'Fewest plates, loaded competition style' },
  { value: 'competition', label: 'Competition', title: 'Largest plates innermost, IWF order' },
  { value: 'fewest', label: 'Fewest', title: 'Fewest plates per side' },
  { value: 'compact', label: 'Compact', title: 'Shortest stack on the sleeve' },
  { value: 'inventory', label: 'Use what I have', title: 'Spends the big plates first' },
  { value: 'all', label: 'All', title: 'Every combination' },
]

// The two a first-timer can tell apart. The other four are a power-user choice
// and stay behind the options disclosure until asked for.
const PRIMARY: RankMode[] = ['recommended', 'fewest']

// Five at a time: enough to choose from, short enough to scan on a phone.
const PAGE = 5

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
  const [open, setOpen] = useState(false)
  // Reset paging when the result set changes — derived during render, no effect.
  const listKey = `${mode}:${combos.length}:${combos[0]?.id ?? ''}`
  const [prevKey, setPrevKey] = useState(listKey)
  if (listKey !== prevKey) {
    setPrevKey(listKey)
    setShown(PAGE)
  }

  // A non-primary mode always rides along in the collapsed set, so the active
  // ranking is never hidden and closing the disclosure never changes the order.
  const visible = open ? MODES : MODES.filter((m) => PRIMARY.includes(m.value) || m.value === mode)
  const active = MODES.find((m) => m.value === mode)
  const choosable = totalFound > 1

  return (
    <section aria-label="Combinations" className="flex flex-col gap-3">
      {/* The answer leads. The count is the way in to the rest, not the headline. */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          How to load it <span className="font-medium normal-case tracking-normal">· each side</span>
        </h2>
        {choosable && (
          <button
            type="button"
            className="-mr-1 inline-flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted transition hover:bg-surface2"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="tabular-nums">{totalFound} options</span>
            <ChevronIcon open={open} />
          </button>
        )}
      </div>

      {choosable && (
        <div>
          <div className="hide-scroll -mx-1 overflow-x-auto px-1">
            <Segmented
              value={mode}
              onChange={onMode}
              label="Ranking"
              className="w-max"
              options={visible.map((m) => ({ value: m.value, label: m.label, title: m.title }))}
            />
          </div>
          {/* Titles are hover-only, and this is a phone app — say it out loud instead. */}
          {open && active && <p className="mt-2 px-1 text-xs text-muted">{active.title}.</p>}
        </div>
      )}

      <ul className="flex flex-col gap-2">
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
      </ul>

      {combos.length > shown && (
        <button type="button" className="btn" onClick={() => setShown((s) => s + PAGE)}>
          Show {Math.min(PAGE, combos.length - shown)} more
        </button>
      )}
      {truncated && open && (
        <p className="text-xs text-muted">
          Showing the best {combos.length}. More combinations exist — a ranking mode narrows them down.
        </p>
      )}
    </section>
  )
}

export { MODES }

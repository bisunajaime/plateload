import { useState } from 'react'
import type { CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo, RankMode } from '../lib/combinations'
import { ComboCard } from './ComboCard'
import { Segmented } from './ui'

const MODES: { value: RankMode; label: string; title: string }[] = [
  { value: 'recommended', label: 'Recommended', title: 'Fewest plates, loaded competition style' },
  { value: 'competition', label: 'Competition', title: 'Largest plates innermost, IWF order' },
  { value: 'fewest', label: 'Fewest', title: 'Fewest plates per side' },
  { value: 'compact', label: 'Compact', title: 'Shortest stack on the sleeve' },
  { value: 'inventory', label: 'Use what I have', title: 'Spends the big plates first' },
  { value: 'all', label: 'All', title: 'Every combination' },
]

// Five at a time: enough to choose from, short enough to scan on a phone.
const PAGE = 5

export function ComboList({
  combos,
  mode,
  onMode,
  plates,
  unit,
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
  unit: Unit
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

  return (
    <section aria-label="Combinations" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">
          {totalFound} way{totalFound === 1 ? '' : 's'} to load it
        </h2>
      </div>

      <div className="hide-scroll -mx-1 overflow-x-auto px-1">
        <Segmented
          value={mode}
          onChange={onMode}
          label="Ranking"
          className="w-max"
          options={MODES.map((m) => ({ value: m.value, label: m.label, title: m.title }))}
        />
      </div>

      <ul className="flex flex-col gap-2">
        {combos.slice(0, shown).map((c) => (
          <li key={c.id}>
            <ComboCard
              combo={c}
              plates={plates}
              unit={unit}
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
      {truncated && (
        <p className="text-xs text-muted">
          Showing the best {combos.length}. More combinations exist — narrow it down with a ranking mode.
        </p>
      )}
    </section>
  )
}

export { MODES }

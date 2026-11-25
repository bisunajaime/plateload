import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import type { PlateDef, Unit } from '../data/plates'
import type { Combo, RankMode } from '../lib/combinations'
import { ComboCard } from './ComboCard'
import { Choice } from './kit/Choice'
import { Section } from './kit/Section'
import { ChevronDownIcon } from './kit/icons'
import { RANKINGS, recommendedWhy, wayReason } from './ways/reasons'

/** Enough to see there's a choice; the rest on request. */
const FIRST = 3

/**
 * Every way to make the weight, best first. Three to start with and the rest
 * behind "Show all", where you can also change how they're ranked. Picking
 * one puts it on the bar. A radio group: arrows move, one Tab stop.
 */
export function ComboList({
  combos,
  mode,
  onMode,
  plates,
  unit,
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
  sleeveMm: number
  selectedId: string | null
  onSelect: (c: Combo) => void
  truncated: boolean
  totalFound: number
}) {
  const [open, setOpen] = useState(false)
  const byId = useMemo(() => new Map(plates.map((p) => [p.id, p])), [plates])
  const refs = useRef(new Map<string, HTMLButtonElement | null>())

  // Collapsed, the list still shows whichever way is on the bar, even if it
  // was picked from further down.
  const top = combos.slice(0, FIRST)
  const selected = combos.find((c) => c.id === selectedId)
  const shown = open ? combos : selected && !top.includes(selected) ? [...top, selected] : top
  const current = selected ?? combos[0]
  const ranking = RANKINGS.find((r) => r.value === mode) ?? RANKINGS[0]

  const onKey = (e: KeyboardEvent) => {
    const move = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (!move) return
    e.preventDefault()
    const i = shown.findIndex((c) => c.id === current?.id)
    const next = shown[(i + move + shown.length) % shown.length]
    onSelect(next)
    refs.current.get(next.id)?.focus()
  }

  return (
    <Section
      title="Other ways to load it"
      action={
        <span className="font-cond text-base font-semibold tabular-nums text-muted">
          {totalFound} way{totalFound === 1 ? '' : 's'}
        </span>
      }
    >
      {open && (
        <div className="mb-3 flex flex-col gap-2">
          <Choice
            label="Rank by"
            value={mode}
            onChange={onMode}
            options={RANKINGS.map((r) => ({
              value: r.value,
              // Short on a phone, full where there's room; the meaning is always spelled out below.
              label: (
                <>
                  <span className="sm:hidden">{r.short}</span>
                  <span className="hidden sm:inline">{r.name}</span>
                </>
              ),
            }))}
          />
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">{ranking.name}:</span> {ranking.meaning}
          </p>
        </div>
      )}

      <div role="radiogroup" aria-label="Ways to load it" onKeyDown={onKey} className="card divide-y divide-line overflow-hidden">
        {shown.map((c, i) => (
          <ComboCard
            key={c.id}
            ref={(el) => {
              refs.current.set(c.id, el)
            }}
            combo={c}
            byId={byId}
            unit={unit}
            reason={wayReason(c, combos, sleeveMm)}
            why={i === 0 && mode === 'recommended' ? recommendedWhy(c, combos) : undefined}
            selected={c.id === current?.id}
            focusable={c.id === current?.id}
            onSelect={() => onSelect(c)}
          />
        ))}
      </div>

      {combos.length > FIRST && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-ink transition hover:bg-surface2"
        >
          {open ? 'Show fewer' : `Show all ${combos.length}`}
          <span className={`transition-transform duration-base ${open ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
      )}
      {open && truncated && (
        <p className="mt-1 text-sm text-muted">
          Showing the best {combos.length} of {totalFound}. Ranking another way brings up different ones.
        </p>
      )}
    </Section>
  )
}

import { memo } from 'react'
import type { CollarKind, PlateDef } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { platesCompact } from '../lib/format'
import { SleeveThumb } from './BarbellSVG'

export interface ComboCardProps {
  combo: Combo
  plates: PlateDef[]
  collarKind: CollarKind | null
  collarWidthMm: number
  sleeveMm: number
  selected: boolean
  onSelect: () => void
}

/** One way to load the bar, as a row you can pick. */
export const ComboCard = memo(function ComboCard({
  combo,
  plates,
  collarKind,
  collarWidthMm,
  sleeveMm,
  selected,
  onSelect,
}: ComboCardProps) {
  const list = combo.plates.length ? platesCompact(combo.plates) : 'Empty bar'
  const details = [
    `${combo.plateCount} plate${combo.plateCount === 1 ? '' : 's'}`,
    combo.changeCount > 0 ? `${combo.changeCount} change` : null,
    `${Math.round(combo.sleeveMm)} of ${sleeveMm} mm`,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition sm:px-4 ${
        selected ? 'bg-surface2/70' : 'hover:bg-surface2/40'
      }`}
    >
      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-surface2/70 p-1">
        <SleeveThumb plates={plates} combo={combo} collarKind={collarKind} collarWidthMm={collarWidthMm} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold tabular-nums">{list}</span>
        <span className={`block truncate text-xs tabular-nums ${combo.overCapacity ? 'font-semibold text-bad' : 'text-muted'}`}>
          {combo.overCapacity ? 'Too wide for the sleeve · ' : ''}
          {details.join(' · ')}
          {combo.competitionLegal && !combo.overCapacity ? ' · competition' : ''}
        </span>
      </span>
      {/* A radio-style mark: the row you picked is the bar above. */}
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
          selected ? 'border-ink bg-ink text-bg' : 'border-line'
        }`}
        aria-hidden="true"
      >
        {selected && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5 10 17l9-10" />
          </svg>
        )}
      </span>
    </button>
  )
})

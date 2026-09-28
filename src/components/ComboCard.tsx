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

export const ComboCard = memo(function ComboCard({
  combo,
  plates,
  collarKind,
  collarWidthMm,
  sleeveMm,
  selected,
  onSelect,
}: ComboCardProps) {
  const fill = Math.min(1, combo.sleeveMm / sleeveMm)
  const list = combo.plates.length ? platesCompact(combo.plates) : 'Bare bar'

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`card w-full overflow-hidden p-3 text-left transition active:scale-[0.995] ${
        selected ? 'ring-2 ring-ink' : 'hover:bg-surface2'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="h-24 w-28 shrink-0 rounded-xl bg-surface2/70 p-1.5 sm:h-28 sm:w-44">
          <SleeveThumb
            plates={plates}
            combo={combo}
            collarKind={collarKind}
            collarWidthMm={collarWidthMm}
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* "Each side" lives in the list heading — it is the same on every card. */}
          <div className="truncate text-lg font-semibold tabular-nums">{list}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted tabular-nums">
            <span className="whitespace-nowrap">
              {combo.plateCount} plate{combo.plateCount === 1 ? '' : 's'}
              {combo.changeCount > 0 && ` · ${combo.changeCount} change`}
            </span>
            {combo.competitionLegal && (
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink">
                Competition
              </span>
            )}
            {combo.overCapacity && (
              <span className="rounded-full bg-bad/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bad">
                Overfull
              </span>
            )}
          </div>
          {/* The fill bar and its figure sit together, so the bar reads as the sleeve. */}
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2" aria-hidden="true">
              <div
                className={`h-full rounded-full ${combo.overCapacity ? 'bg-bad' : fill > 0.85 ? 'bg-ink' : 'bg-steel'}`}
                style={{ width: `${fill * 100}%` }}
              />
            </div>
            <span
              className={`shrink-0 whitespace-nowrap text-xs tabular-nums ${combo.overCapacity ? 'font-semibold text-bad' : 'text-muted'}`}
              aria-label={`${Math.round(combo.sleeveMm)} of ${sleeveMm} millimetres of sleeve used`}
            >
              {Math.round(combo.sleeveMm)}/{sleeveMm} mm
            </span>
          </div>
        </div>
      </div>
    </button>
  )
})

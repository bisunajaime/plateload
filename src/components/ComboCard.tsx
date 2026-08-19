import { memo } from 'react'
import type { CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt, platesCompact } from '../lib/format'
import { SleeveThumb } from './BarbellSVG'

export interface ComboCardProps {
  combo: Combo
  plates: PlateDef[]
  unit: Unit
  collarKind: CollarKind | null
  collarWidthMm: number
  sleeveMm: number
  selected: boolean
  onSelect: () => void
}

export const ComboCard = memo(function ComboCard({
  combo,
  plates,
  unit,
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
        <div className="h-20 w-32 shrink-0 rounded-xl bg-surface2/70 p-1 sm:h-24 sm:w-44">
          <SleeveThumb
            plates={plates}
            combo={combo}
            collarKind={collarKind}
            collarWidthMm={collarWidthMm}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="truncate text-lg font-semibold tabular-nums">{list}</span>
            <span className="text-sm text-muted">each side</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
            <span>
              {combo.plateCount} plate{combo.plateCount === 1 ? '' : 's'} a side
            </span>
            <span aria-hidden="true">·</span>
            <span className={combo.overCapacity ? 'font-semibold text-bad' : ''}>
              {Math.round(combo.sleeveMm)} / {sleeveMm} mm sleeve
            </span>
            {combo.changeCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>
                  {combo.changeCount} change plate{combo.changeCount === 1 ? '' : 's'}
                </span>
              </>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`Sleeve ${Math.round(fill * 100)} percent full`}>
              <div
                className={`h-full rounded-full ${combo.overCapacity ? 'bg-bad' : fill > 0.85 ? 'bg-ink' : 'bg-steel'}`}
                style={{ width: `${fill * 100}%` }}
              />
            </div>
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
        </div>

        <div className="hidden shrink-0 pr-1 text-right sm:block gym-hide">
          <div className="font-display text-2xl font-semibold tabular-nums">{fmt(combo.perSide)}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted">{unit}/side</div>
        </div>
      </div>
    </button>
  )
})

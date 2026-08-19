import type { BarDef, CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { BarbellSVG, SleeveThumb } from './BarbellSVG'

/**
 * A thumbnail of the loaded sleeve that appears once the hero bar scrolls out
 * of view, so the current load is never more than a glance away. Tapping it
 * takes you back to the bar.
 */
export function MiniBar({
  show,
  bar,
  plates,
  combo,
  collarKind,
  collarWidthMm,
  unit,
  total,
  onClick,
}: {
  show: boolean
  bar: BarDef
  plates: PlateDef[]
  combo: Combo | null
  collarKind: CollarKind | null
  collarWidthMm: number
  unit: Unit
  total: number
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Currently loaded: ${fmt(total)} ${unit}. Scroll back to the barbell.`}
      className={`fixed right-3 top-[4.25rem] z-40 w-[150px] overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-xl backdrop-blur transition duration-200 sm:right-5 sm:top-[4.75rem] sm:w-[200px] ${
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
    >
      {/* Cropped to the stack itself — at this size the bare sleeve is wasted space. */}
      <div className="pointer-events-none h-[72px] px-1.5 pt-1.5 sm:h-[86px]">
        {combo ? (
          <SleeveThumb plates={plates} combo={combo} collarKind={collarKind} collarWidthMm={collarWidthMm} />
        ) : (
          <BarbellSVG
            bar={bar}
            plates={plates}
            combo={null}
            collarKind={collarKind}
            collarWidthMm={collarWidthMm}
            unit={unit}
            closeUp
            animate={false}
            className="block h-auto"
          />
        )}
      </div>
      <div className="flex items-baseline justify-between gap-2 border-t border-line px-2.5 py-1.5">
        <span className="text-sm font-semibold tabular-nums">
          {fmt(total)} {unit}
        </span>
        <span className="text-[11px] text-muted tabular-nums">
          {combo ? `${fmt(combo.perSide)}/side` : 'bar only'}
        </span>
      </div>
    </button>
  )
}

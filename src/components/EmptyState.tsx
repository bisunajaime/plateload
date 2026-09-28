import type { Unit } from '../data/plates'
import type { SolveReason } from '../lib/combinations'
import { fmt } from '../lib/format'

/** Stands in for the plates when the target can't be built — and offers the nearest that can. */
export function EmptyState({
  reason,
  target,
  unit,
  base,
  nearestBelow,
  nearestAbove,
  onPick,
  changeOff,
  onEnableChange,
  onOpenSetup,
}: {
  reason: SolveReason
  target: number
  unit: Unit
  base: number
  nearestBelow: number | null
  nearestAbove: number | null
  onPick: (w: number) => void
  changeOff: boolean
  onEnableChange: () => void
  onOpenSetup: () => void
}) {
  const message =
    reason === 'below-bar'
      ? `Lighter than the bar — bar and collars weigh ${fmt(base)} ${unit}.`
      : reason === 'no-plates'
        ? 'No plates in your inventory yet.'
        : reason === 'too-wide'
          ? `Your plates make ${fmt(target)} ${unit}, but not in a stack that fits on the sleeve.`
          : changeOff
          ? `Can’t make ${fmt(target)} ${unit} with bumpers alone.`
          : `Your plates can’t make ${fmt(target)} ${unit} evenly.`

  return (
    <div className="flex flex-col items-center gap-3 text-center fade-up">
      <p className="text-sm font-medium text-bad">{message}</p>
      {(nearestBelow != null || nearestAbove != null) && (
        <div className="flex flex-wrap justify-center gap-2">
          {nearestBelow != null && (
            <button type="button" className="chip" onClick={() => onPick(nearestBelow)}>
              Load {fmt(nearestBelow)} {unit}
            </button>
          )}
          {nearestAbove != null && (
            <button type="button" className="chip" onClick={() => onPick(nearestAbove)}>
              Load {fmt(nearestAbove)} {unit}
            </button>
          )}
        </div>
      )}
      {/* Change plates fill gaps between bumpers; they can't lighten a bar or widen a sleeve. */}
      {changeOff && (reason === 'unreachable' || reason === 'not-divisible') ? (
        <button type="button" className="text-sm font-medium text-ink underline underline-offset-4" onClick={onEnableChange}>
          Use change plates
        </button>
      ) : reason === 'no-plates' || reason === 'unreachable' || reason === 'not-divisible' ? (
        <button type="button" className="text-sm font-medium text-muted underline underline-offset-4" onClick={onOpenSetup}>
          Edit your plates
        </button>
      ) : null}
    </div>
  )
}

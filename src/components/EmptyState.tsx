import type { Unit } from '../data/plates'
import type { SolveReason } from '../lib/combinations'
import { cantLoadReason } from './load/reason'
import { fmt } from '../lib/format'
import { Button } from './kit/Button'

/**
 * Stands in for the plates when the target can't be built: says why, offers
 * the nearest weights that can be, and the fix that would make it possible.
 */
export function EmptyState({
  reason,
  target,
  unit,
  base,
  step,
  nearestBelow,
  nearestAbove,
  onPick,
  smallPlatesOff,
  onUseSmallPlates,
  onEditPlates,
}: {
  reason: SolveReason
  target: number
  unit: Unit
  base: number
  step: number
  nearestBelow: number | null
  nearestAbove: number | null
  onPick: (w: number) => void
  smallPlatesOff: boolean
  onUseSmallPlates: () => void
  onEditPlates: () => void
}) {
  const { title, why } = cantLoadReason({ reason, target, unit, base, step, smallPlatesOff })
  // Small plates fill gaps between bumpers; they can't lighten a bar or widen a sleeve.
  const gap = reason === 'unreachable' || reason === 'not-divisible'
  return (
    <div className="fade-up rounded-2xl border border-bad/50 bg-bad/[0.06] p-4 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mt-1 text-base text-muted">{why}</p>
      {(nearestBelow != null || nearestAbove != null) && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {nearestBelow != null && (
            <Button size="sm" onClick={() => onPick(nearestBelow)}>
              Load {fmt(nearestBelow)} {unit}
            </Button>
          )}
          {nearestAbove != null && (
            <Button size="sm" onClick={() => onPick(nearestAbove)}>
              Load {fmt(nearestAbove)} {unit}
            </Button>
          )}
        </div>
      )}
      {(gap || reason === 'no-plates') && (
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          {gap && smallPlatesOff && (
            <Button size="sm" variant="ghost" onClick={onUseSmallPlates}>
              Use small plates
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEditPlates}>
            Edit your plates
          </Button>
        </div>
      )}
    </div>
  )
}

import type { Unit } from '../data/plates'
import type { SolveReason } from '../lib/combinations'
import { fmt } from '../lib/format'

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
  smallestStep,
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
  smallestStep: number | null
}) {
  const headline =
    reason === 'below-bar'
      ? `${fmt(target)} ${unit} is lighter than the bar`
      : reason === 'no-plates'
        ? 'No plates in the inventory'
        : `${fmt(target)} ${unit} isn’t reachable`

  const body =
    reason === 'below-bar'
      ? `Bar and collars already weigh ${fmt(base)} ${unit}.`
      : reason === 'no-plates'
        ? 'Add some plates in Setup and the combinations appear here.'
        : changeOff
          ? 'Bumpers only means big jumps. Change plates would fill the gaps.'
          : 'Your inventory can’t make that number in equal halves.'

  return (
    <section className="card flex flex-col gap-4 p-5 text-center fade-up" aria-live="polite">
      <div>
        <h2 className="font-display text-xl font-semibold">{headline}</h2>
        <p className="mt-1 text-sm text-muted">{body}</p>
      </div>

      {(nearestBelow != null || nearestAbove != null) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {nearestBelow != null && (
            <button type="button" className="btn px-5" onClick={() => onPick(nearestBelow)}>
              ↓ {fmt(nearestBelow)} {unit}
            </button>
          )}
          {nearestAbove != null && (
            <button type="button" className="btn px-5" onClick={() => onPick(nearestAbove)}>
              ↑ {fmt(nearestAbove)} {unit}
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        {changeOff ? (
          <button type="button" className="btn btn-primary px-5" onClick={onEnableChange}>
            Turn on change plates
          </button>
        ) : (
          <button type="button" className="btn px-5" onClick={onOpenSetup}>
            Edit inventory
          </button>
        )}
      </div>

      {smallestStep != null && (
        <p className="text-xs text-muted">
          Next loadable weight above this one: {fmt(smallestStep)} {unit}.
        </p>
      )}
    </section>
  )
}

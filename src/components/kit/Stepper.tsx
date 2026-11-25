import { feedback } from '../../feel'
import { NumberField } from '../NumberField'
import { MinusIcon, PlusIcon } from './icons'

/** − count + for small whole numbers, like plates in the gym. Every part is a full-size target. */
export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99,
  label,
  decreaseLabel,
  increaseLabel,
  onAdjust,
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  /** Names the number field. */
  label: string
  decreaseLabel: string
  increaseLabel: string
  onAdjust?: (message: string) => void
}) {
  const set = (v: number) => {
    const next = Math.max(min, Math.min(max, v))
    if (next === value) return
    feedback('step')
    onChange(next)
  }
  const btn =
    'inline-flex h-11 w-11 select-none items-center justify-center rounded-lg border border-edge bg-surface text-ink transition hover:bg-surface2 active:scale-press disabled:border-line disabled:text-muted'
  return (
    <div className="flex items-center gap-1">
      <button type="button" className={btn} onClick={() => set(value - step)} disabled={value <= min} aria-label={decreaseLabel}>
        <MinusIcon />
      </button>
      <NumberField
        integer
        min={min}
        max={max}
        value={value}
        onCommit={(v) => onChange(v ?? min)}
        onAdjust={onAdjust}
        aria-label={label}
        className="h-11 w-12 rounded-lg border border-edge bg-surface text-center text-base font-semibold tabular-nums"
      />
      <button type="button" className={btn} onClick={() => set(value + step)} disabled={value >= max} aria-label={increaseLabel}>
        <PlusIcon />
      </button>
    </div>
  )
}

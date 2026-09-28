import { useState } from 'react'
import type { Unit } from '../data/plates'
import { fmt } from '../lib/format'
import type { Favorite } from '../lib/settings'
import { Sheet } from './ui'

/** The lifts a barbell gym actually saves, most common first. */
const LIFTS = [
  'Snatch',
  'Clean & Jerk',
  'Clean',
  'Jerk',
  'Back Squat',
  'Front Squat',
  'Deadlift',
  'Power Snatch',
  'Power Clean',
  'Hang Clean & Jerk',
  // Behind "More lifts" — useful, but a first look shouldn't be a wall of chips.
  'Hang Snatch',
  'Hang Clean',
  'Push Jerk',
  'Split Jerk',
  'Overhead Squat',
  'Snatch Pull',
  'Clean Pull',
  'Push Press',
  'Strict Press',
  'Bench Press',
  'Thruster',
]
const SHOWN = 10

const REP_MAXES = ['1RM', '2RM', '3RM', '5RM', '10RM']

const compose = (rm: string | null, lift: string | null) => [rm, lift].filter(Boolean).join(' ')

/**
 * Name a saved weight by tapping a lift (and, if you like, a rep max) —
 * "2RM Clean" in two taps, no typing between sets. The field stays editable
 * for anything the list doesn't cover.
 */
export function SaveFavoriteSheet({
  open,
  onClose,
  target,
  unit,
  favorites,
  onSave,
}: {
  open: boolean
  onClose: () => void
  target: number
  unit: Unit
  favorites: Favorite[]
  onSave: (label: string) => void
}) {
  const [label, setLabel] = useState('')
  const [lift, setLift] = useState<string | null>(null)
  const [rm, setRm] = useState<string | null>(null)
  const [more, setMore] = useState(false)

  // Fresh each time it opens — derived during render, no effect.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setLabel('')
      setLift(null)
      setRm(null)
      setMore(false)
    }
  }

  const choose = (nextRm: string | null, nextLift: string | null) => {
    setRm(nextRm)
    setLift(nextLift)
    setLabel(compose(nextRm, nextLift))
  }

  // A chip only reads as picked while the name still says what the chips built.
  const fromChips = label === compose(rm, lift)
  const pickedLift = fromChips ? lift : null
  const pickedRm = fromChips ? rm : null

  // Two lifts can share a weight (clean 100, squat 100), but the same name at
  // the same weight is the same favourite twice.
  const name = label.trim()
  const duplicate = favorites.some(
    (f) => f.weight === target && f.unit === unit && f.label.trim().toLowerCase() === name.toLowerCase(),
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (duplicate) return
    onSave(name)
  }

  // The picked lift always stays visible, even if it lives behind "More lifts".
  const visible = more ? LIFTS : LIFTS.filter((l, i) => i < SHOWN || l === pickedLift)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Save ${fmt(target)} ${unit}`}
      focusField={false}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          {/* Submits the form below, so the button, Enter and a phone keyboard's
              Go key all take the same path and the sheet closes on the first tap. */}
          <button type="submit" form="save-favourite" className="btn btn-primary px-5" disabled={duplicate}>
            Save
          </button>
        </div>
      }
    >
      <form id="save-favourite" onSubmit={submit} className="flex flex-col gap-5">
        {/* The name first: it is what gets saved, and the chips below fill it in.
            Rep max is the short row, so it sits above the long list of lifts. */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-ink" htmlFor="favourite-name">
            Name
          </label>
          <input
            id="favourite-name"
            className="btn w-full justify-start px-4"
            placeholder="Pick a lift below, or type one"
            enterKeyHint="done"
            autoComplete="off"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {duplicate ? (
            <span className="text-xs font-medium text-bad" role="status">
              Already saved{name ? ` as “${name}”` : ' without a name'} at {fmt(target)} {unit}.
            </span>
          ) : (
            <span className="text-xs text-muted">Two lifts can share a weight — the name tells them apart.</span>
          )}
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Rep max <span className="font-normal text-muted">· optional</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {REP_MAXES.map((r) => (
              <button
                key={r}
                type="button"
                className="chip tabular-nums"
                aria-pressed={pickedRm === r}
                onClick={() => choose(pickedRm === r ? null : r, pickedLift)}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Lift</legend>
          <div className="flex flex-wrap gap-2">
            {visible.map((l) => (
              <button
                key={l}
                type="button"
                className="chip"
                aria-pressed={pickedLift === l}
                onClick={() => choose(pickedRm, pickedLift === l ? null : l)}
              >
                {l}
              </button>
            ))}
            {!more && LIFTS.length > SHOWN && (
              <button type="button" className="chip border-dashed text-muted" onClick={() => setMore(true)}>
                More lifts
              </button>
            )}
          </div>
        </fieldset>

      </form>
    </Sheet>
  )
}

import { useState } from 'react'
import type { Unit } from '../data/plates'
import { fmt } from '../lib/format'
import type { Favorite } from '../lib/settings'
import { Button } from './kit/Button'
import { Chip } from './kit/Chip'
import { inputClass } from './kit/styles'
import { Sheet } from './ui'

/** The lifts a gym actually saves, most common first — general gym and CrossFit, then the Olympic lifts. */
const LIFTS = [
  'Squat',
  'Deadlift',
  'Bench Press',
  'Strict Press',
  'Clean',
  'Snatch',
  'Clean & Jerk',
  'Front Squat',
  'Back Squat',
  'Thruster',
  // Behind "More lifts" — useful, but a first look shouldn't be a wall of chips.
  'Push Press',
  'Jerk',
  'Push Jerk',
  'Split Jerk',
  'Power Clean',
  'Power Snatch',
  'Hang Clean',
  'Hang Snatch',
  'Hang Clean & Jerk',
  'Overhead Squat',
  'Clean Pull',
  'Snatch Pull',
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
      // A keyboard user starts in the name field. On a phone that would raise the
      // on-screen keyboard over the lift chips, which are the quicker way to name it.
      focusField={typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches}
      title={`Save ${fmt(target)} ${unit}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {/* Submits the form below, so the button, Enter and a phone keyboard's
              Go key all take the same path and the sheet closes on the first tap. */}
          <Button type="submit" form="save-favourite" variant="primary" disabled={duplicate} aria-describedby="favourite-status">
            Save
          </Button>
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
            className={inputClass}
            placeholder="Type a name, or pick a lift below"
            enterKeyHint="done"
            autoComplete="off"
            value={label}
            aria-invalid={duplicate || undefined}
            aria-describedby="favourite-status"
            onChange={(e) => setLabel(e.target.value)}
          />
          {/* Mounted from the start, so the duplicate message is announced when it appears. */}
          <span id="favourite-status" role="status" className={`text-sm ${duplicate ? 'font-medium text-bad' : 'text-muted'}`}>
            {duplicate
              ? `Already saved${name ? ` as “${name}”` : ' without a name'} at ${fmt(target)} ${unit} — change the name to save it again.`
              : 'Two lifts can share a weight — the name tells them apart.'}
          </span>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">
            Rep max <span className="font-normal text-muted">· optional</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {REP_MAXES.map((r) => (
              <Chip key={r} selected={pickedRm === r} onClick={() => choose(pickedRm === r ? null : r, pickedLift)}>
                {r}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-ink">Lift</legend>
          <div className="flex flex-wrap gap-2">
            {visible.map((l) => (
              <Chip key={l} selected={pickedLift === l} onClick={() => choose(pickedRm, pickedLift === l ? null : l)}>
                {l}
              </Chip>
            ))}
            {!more && LIFTS.length > SHOWN && (
              <Chip
                quiet
                onClick={(e) => {
                  // The button is about to disappear; land on the first newly shown lift instead of <body>.
                  const list = e.currentTarget.parentElement
                  setMore(true)
                  requestAnimationFrame(() => list?.querySelectorAll<HTMLButtonElement>('button')[SHOWN]?.focus())
                }}
              >
                More lifts
              </Chip>
            )}
          </div>
        </fieldset>

      </form>
    </Sheet>
  )
}

import { useId, useState } from 'react'
import type { Unit } from '../../data/plates'
import { fmt } from '../../lib/format'
import { Button } from '../kit/Button'
import { Field } from '../kit/Field'
import { ChevronDownIcon, PencilIcon, TrashIcon } from '../kit/icons'
import { inputClass } from '../kit/styles'

const brandOf = (u: Unit) => (u === 'lb' ? 'Metcon' : 'Eleiko')

/**
 * One saved weight: tap it to load it. Its own actions — update, rename,
 * delete — open beneath it, one row at a time, so the everyday list carries
 * no delete buttons and there's no separate edit mode to get lost in.
 */
export function SavedItem({
  label,
  weight,
  unit,
  currentUnit,
  /** Today's weight, offered as an update when it differs. */
  today,
  open,
  onToggle,
  onLoad,
  onUpdate,
  onRename,
  onDelete,
  nameTaken,
}: {
  label: string
  weight: number
  unit: Unit
  currentUnit: Unit
  today: { weight: number; unit: Unit }
  open: boolean
  onToggle: () => void
  onLoad: () => void
  onUpdate: () => void
  onRename: (name: string) => void
  onDelete: () => void
  /** Would this name, at this weight, duplicate another saved weight? */
  nameTaken: (name: string) => boolean
}) {
  const id = useId()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(label)
  const name = label || 'Unnamed'
  const other = unit !== currentUnit
  const sameAsToday = today.weight === weight && today.unit === unit
  const taken = draft.trim().toLowerCase() !== label.trim().toLowerCase() && nameTaken(draft.trim())

  return (
    <li className="border-b border-line last:border-b-0">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={onLoad}
          className="flex min-h-[56px] flex-1 items-center justify-between gap-3 px-4 text-left transition hover:bg-surface2 active:bg-surface2"
          aria-label={`Load ${name}, ${fmt(weight)} ${unit}${other ? `, switches to ${brandOf(unit)}` : ''}`}
        >
          <span className="flex items-baseline gap-1.5">
            <span className="font-cond text-xl font-bold tabular-nums text-ink">{fmt(weight)}</span>
            <span className="text-sm font-medium text-muted">{unit}</span>
          </span>
          {other && (
            <span className="rounded-full border border-dashed border-edge px-2.5 py-0.5 text-xs font-semibold text-ink">
              {brandOf(unit)} · {unit}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setRenaming(false)
            onToggle()
          }}
          aria-expanded={open}
          aria-controls={`${id}-actions`}
          aria-label={`Options for ${name}, ${fmt(weight)} ${unit}`}
          className="inline-flex w-14 shrink-0 items-center justify-center border-l border-line text-muted transition hover:bg-surface2 hover:text-ink"
        >
          <span className={`transition-transform duration-quick ${open ? 'rotate-180' : ''}`}>
            <ChevronDownIcon />
          </span>
        </button>
      </div>

      {open && (
        <div id={`${id}-actions`} className="fade-up flex flex-col gap-3 bg-surface2/60 px-4 py-3">
          {renaming ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (taken) return
                onRename(draft.trim())
                setRenaming(false)
              }}
            >
              <Field
                label="Name"
                error={taken ? `Already saved as “${draft.trim()}” at ${fmt(weight)} ${unit}.` : null}
              >
                {(control) => (
                  <input
                    id={control.id}
                    aria-describedby={control['aria-describedby']}
                    aria-invalid={control['aria-invalid']}
                    autoFocus
                    className={inputClass}
                    value={draft}
                    autoComplete="off"
                    enterKeyHint="done"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      // Escape cancels the rename, not the whole page's state.
                      if (e.key !== 'Escape') return
                      e.stopPropagation()
                      setRenaming(false)
                    }}
                  />
                )}
              </Field>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setRenaming(false)}>
                  Cancel
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={taken}>
                  Save name
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2">
              {!sameAsToday && (
                <Button size="sm" onClick={onUpdate}>
                  Update to {fmt(today.weight)} {today.unit}
                </Button>
              )}
              <Button
                size="sm"
                icon={<PencilIcon size={18} />}
                onClick={() => {
                  setDraft(label)
                  setRenaming(true)
                }}
              >
                Rename
              </Button>
              <Button size="sm" variant="danger-ghost" icon={<TrashIcon />} onClick={onDelete}>
                Delete
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

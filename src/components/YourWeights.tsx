import { useState } from 'react'
import type { Unit } from '../data/plates'
import { fmt } from '../lib/format'
import type { Favorite, RecentWeight } from '../lib/settings'
import { XIcon } from './ui'

const brandOf = (u: Unit) => (u === 'lb' ? 'Metcon' : 'Eleiko')

/**
 * Saved and recent weights: one tap back to a load you have used. Removing a
 * favourite is an edit mode, so the everyday view carries no delete buttons.
 */
export function YourWeights({
  favorites,
  recents,
  unit,
  onPick,
  onRemove,
}: {
  favorites: (Favorite & { index: number })[]
  recents: RecentWeight[]
  unit: Unit
  onPick: (weight: number, unit: Unit) => void
  onRemove: (index: number) => void
}) {
  const [editing, setEditing] = useState(false)
  // Removing the last favourite ends the edit — otherwise Recent stayed hidden
  // with no Done button left, and the next favourite saved arrived in delete mode.
  if (editing && favorites.length === 0) setEditing(false)
  if (favorites.length === 0 && recents.length === 0) return null

  // A weight in the other unit switches brand with it — say so on the chip.
  const unitTag = (u: Unit) =>
    u === unit ? <span className="text-muted">{u}</span> : <span className="text-ink">{u} · {brandOf(u)}</span>

  return (
    <section aria-labelledby="weights-heading">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 id="weights-heading" className="section-title">
          Your weights
        </h2>
        {favorites.length > 0 && (
          <button
            type="button"
            className="-mr-2 min-h-[36px] rounded-lg px-2 text-xs font-medium text-muted transition hover:text-ink"
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
      </div>

      <div className="card flex flex-col gap-3 p-3 sm:p-4">
        {favorites.length > 0 && (
          <ul className="flex flex-wrap gap-2" aria-label="Saved">
            {favorites.map((f) => (
              <li key={f.index}>
                {editing ? (
                  <button
                    type="button"
                    className="chip border-bad/40"
                    onClick={() => onRemove(f.index)}
                    aria-label={`Remove ${f.label || 'unnamed'} — ${fmt(f.weight)} ${f.unit}`}
                  >
                    <span className="font-semibold">{f.label || 'Unnamed'}</span>
                    <span className="tabular-nums text-muted">{fmt(f.weight)}</span>
                    <span className="text-bad">
                      <XIcon />
                    </span>
                  </button>
                ) : (
                  <button type="button" className="chip" onClick={() => onPick(f.weight, f.unit)}>
                    <span className="font-semibold">{f.label || 'Unnamed'}</span>
                    <span className="tabular-nums">
                      {fmt(f.weight)} {unitTag(f.unit)}
                    </span>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {recents.length > 0 && !editing && (
          <div className={favorites.length > 0 ? 'border-t border-line pt-3' : ''}>
            <h3 className="mb-2 text-xs text-muted">Recent</h3>
            <div className="hide-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
              {recents.map((r) => (
                <button
                  key={`${r.weight}-${r.unit}`}
                  type="button"
                  className="chip tabular-nums"
                  onClick={() => onPick(r.weight, r.unit)}
                >
                  <span className="font-semibold">{fmt(r.weight)}</span>
                  {unitTag(r.unit)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

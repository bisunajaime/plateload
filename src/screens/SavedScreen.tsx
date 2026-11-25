import { useRef, useState } from 'react'
import { useApp } from '../app/context'
import { Button } from '../components/kit/Button'
import { Chip } from '../components/kit/Chip'
import { BookmarkIcon } from '../components/kit/icons'
import { Section } from '../components/kit/Section'
import { SavedItem } from '../components/saved/SavedItem'
import type { Unit } from '../data/plates'
import { DESKTOP, useMedia } from '../hooks/useMedia'
import { fmt } from '../lib/format'
import type { Favorite } from '../lib/settings'

const brandOf = (u: Unit) => (u === 'lb' ? 'Metcon' : 'Eleiko')
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

/**
 * Saved weights, grouped by lift, and the weights you've used lately. Tap one
 * to load it; each saved weight's own actions open beneath it. Every change
 * here can be undone from the toast.
 */
export function SavedScreen() {
  const app = useApp()
  const { settings } = app
  const desktop = useMedia(DESKTOP)
  const [open, setOpen] = useState<number | null>(null)
  const today = { weight: settings.target, unit: settings.unit }

  // On a phone the load is another tab: take you there. On a desktop it's pinned beside this.
  const load = (weight: number, unit: Unit) => {
    app.loadSaved(weight, unit)
    if (!desktop) app.go('load')
  }

  // Grouped by name, in the order each lift was first saved; lightest first within a lift.
  const groups = new Map<string, (Favorite & { index: number })[]>()
  settings.favorites.forEach((f, index) => {
    const key = f.label.trim() || 'Unnamed'
    groups.set(key, [...(groups.get(key) ?? []), { ...f, index }])
  })
  for (const list of groups.values()) list.sort((a, b) => a.weight - b.weight)

  const taken = (except: number, name: string, weight: number, unit: Unit) =>
    settings.favorites.some((f, i) => i !== except && f.weight === weight && f.unit === unit && sameName(f.label, name))

  const edit = (index: number, patch: Partial<Favorite>, message: string) =>
    app.applyUndoable(message, { favorites: settings.favorites.map((f, i) => (i === index ? { ...f, ...patch } : f)) })

  const recents = settings.lastWeights

  // An action that rewrites or removes the row you're on must not drop focus
  // to the page: land on that row's options again, or on the list.
  const listRef = useRef<HTMLDivElement>(null)
  const refocus = (options?: string) =>
    requestAnimationFrame(() => {
      const row = options && listRef.current?.querySelector<HTMLElement>(`[aria-label="${CSS.escape(options)}"]`)
      ;(row || listRef.current?.querySelector<HTMLElement>('button') || listRef.current)?.focus()
    })
  const optionsLabel = (name: string, weight: number, unit: Unit) => `Options for ${name || 'Unnamed'}, ${fmt(weight)} ${unit}`

  return (
    <div className="flex flex-col gap-8">
      <Section title="Saved">
        <div ref={listRef} tabIndex={-1} className="outline-none">
          {settings.favorites.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 px-6 py-8 text-center">
              <span className="text-muted">
                <BookmarkIcon />
              </span>
              <p className="text-base font-semibold text-ink">Nothing saved yet</p>
              <p className="max-w-xs text-sm text-muted">Tap ☆ Save on the Load tab to keep a weight for next time — name it after the lift.</p>
              {!desktop && (
                <Button variant="primary" size="sm" onClick={() => app.go('load')}>
                  Go to Load
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {[...groups].map(([lift, list]) => (
                <section key={lift} aria-label={lift}>
                  <h3 className="mb-2 text-base font-semibold text-ink">{lift}</h3>
                  <ul className="card overflow-hidden">
                    {list.map((f) => (
                      <SavedItem
                        key={f.index}
                        label={f.label}
                        weight={f.weight}
                        unit={f.unit}
                        currentUnit={settings.unit}
                        today={today}
                        open={open === f.index}
                        onToggle={() => setOpen(open === f.index ? null : f.index)}
                        onLoad={() => load(f.weight, f.unit)}
                        onUpdate={() => {
                          if (taken(f.index, f.label, today.weight, today.unit)) {
                            app.showToast({ message: `${lift} is already saved at ${fmt(today.weight)} ${today.unit}.`, tone: 'bad' })
                            return
                          }
                          edit(f.index, today, `${lift} updated to ${fmt(today.weight)} ${today.unit}.`)
                          setOpen(null)
                          refocus(optionsLabel(f.label, today.weight, today.unit))
                        }}
                        onRename={(name) => {
                          edit(f.index, { label: name }, `Renamed to ${name || 'Unnamed'}.`)
                          setOpen(null)
                          refocus(optionsLabel(name, f.weight, f.unit))
                        }}
                        onDelete={() => {
                          app.removeFavorite(f.index)
                          setOpen(null)
                          refocus()
                        }}
                        nameTaken={(name) => taken(f.index, name, f.weight, f.unit)}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      </Section>

      {recents.length > 0 && (
        <Section
          title="Recent"
          action={
            <Button size="sm" variant="ghost" onClick={() => app.applyUndoable('Cleared recent weights.', { lastWeights: [] })}>
              Clear
            </Button>
          }
        >
          <ul className="flex flex-wrap gap-2" aria-label="Recent weights, newest first">
            {recents.map((r) => {
              const other = r.unit !== settings.unit
              return (
                <li key={`${r.weight}-${r.unit}`}>
                  <Chip
                    quiet={other}
                    onClick={() => load(r.weight, r.unit)}
                    aria-label={`Load ${fmt(r.weight)} ${r.unit}${other ? `, switches to ${brandOf(r.unit)}` : ''}`}
                  >
                    <span className="font-cond text-base font-bold">{fmt(r.weight)}</span>
                    <span className="font-medium text-muted">{other ? `${r.unit} · ${brandOf(r.unit)}` : r.unit}</span>
                  </Chip>
                </li>
              )
            })}
          </ul>
        </Section>
      )}
    </div>
  )
}

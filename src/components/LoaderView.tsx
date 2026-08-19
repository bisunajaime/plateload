import { useEffect, useMemo, useState } from 'react'
import type { CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { loaderSteps } from '../lib/loader'
import { speak, speechAvailable } from '../lib/speech'
import { SpeakerIcon, XIcon } from './ui'

export function LoaderView({
  open,
  onClose,
  combo,
  plates,
  unit,
  total,
  collarKind,
  announce,
}: {
  open: boolean
  onClose: () => void
  combo: Combo | null
  plates: PlateDef[]
  unit: Unit
  total: number
  collarKind: CollarKind | null
  announce: boolean
}) {
  const steps = useMemo(
    () => (combo ? loaderSteps(combo, plates, unit, collarKind) : []),
    [combo, plates, unit, collarKind],
  )
  const [i, setI] = useState(0)
  // Restart the walk-through whenever a different combination is loaded.
  const [prevCombo, setPrevCombo] = useState(combo?.id ?? null)
  if ((combo?.id ?? null) !== prevCombo) {
    setPrevCombo(combo?.id ?? null)
    setI(0)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' || e.key === ' ') setI((v) => Math.min(steps.length - 1, v + 1))
      if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, steps.length])

  useEffect(() => {
    if (open && announce && steps[i]) speak(steps[i].text)
  }, [open, announce, i, steps])

  if (!open || !combo) return null

  const stack = combo.plates.flatMap((p) =>
    Array.from({ length: p.count }, (_, k) => ({ ...p, key: `${p.id}-${k}` })),
  )
  const byId = new Map(plates.map((p) => [p.id, p]))

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label="Loader view">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="label">Load sheet</div>
          <div className="font-display text-2xl font-semibold tabular-nums">
            {fmt(total)} {unit}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {speechAvailable() && (
            <button
              className="btn min-h-[44px] px-3"
              onClick={() => speak(`${fmt(total)} ${unit}. ${steps.map((s) => s.text).join(', then ')}`)}
              aria-label="Speak the whole load"
            >
              <SpeakerIcon />
            </button>
          )}
          <button className="btn min-h-[44px] px-3" onClick={onClose} aria-label="Close loader view">
            <XIcon />
          </button>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-2 gap-3 overflow-hidden p-3">
        {(['Left sleeve', 'Right sleeve'] as const).map((side, si) => (
          <section key={side} className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface p-3">
            <h2 className="label mb-2">{side}</h2>
            <ul className={`flex flex-1 flex-col gap-2 overflow-y-auto ${si === 0 ? 'items-start' : 'items-end'}`}>
              {stack.map((p, idx) => {
                const def = byId.get(p.id)
                const active = combo.plates.findIndex((x) => x.id === p.id) === i
                return (
                  <li
                    key={p.key}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-2xl font-bold tabular-nums transition ${
                      active ? 'ring-2 ring-ink' : ''
                    }`}
                    style={{
                      background: def?.color ?? 'rgb(var(--surface-2))',
                      color: def?.textColor ?? 'rgb(var(--ink))',
                      opacity: idx <= (i === steps.length - 1 ? stack.length : cumulative(combo, i)) - 1 ? 1 : 0.35,
                    }}
                  >
                    <span className="flex-1">{fmt(p.weight)}</span>
                    <span className="text-sm font-semibold uppercase opacity-70">{unit}</span>
                  </li>
                )
              })}
              {stack.length === 0 && <li className="text-lg text-muted">Bare bar</li>}
            </ul>
          </section>
        ))}
      </div>

      <footer className="border-t border-line px-4 py-4">
        <p className="mb-3 text-center font-display text-3xl font-semibold" aria-live="polite">
          {steps[i]?.text}
        </p>
        <div className="flex items-center gap-3">
          <button className="btn h-14 flex-1 text-lg" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0}>
            Back
          </button>
          <span className="text-sm text-muted tabular-nums">
            {i + 1} / {steps.length}
          </span>
          <button
            className="btn btn-primary h-14 flex-1 text-lg"
            onClick={() => (i === steps.length - 1 ? onClose() : setI((v) => v + 1))}
          >
            {i === steps.length - 1 ? 'Done' : 'Next'}
          </button>
        </div>
      </footer>
    </div>
  )
}

/** Plates that should already be on the sleeve at step `i`. */
function cumulative(combo: Combo, i: number): number {
  let n = 0
  for (let k = 0; k <= i && k < combo.plates.length; k++) n += combo.plates[k].count
  return n
}

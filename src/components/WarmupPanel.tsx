import { useEffect, useMemo, useState } from 'react'
import type { Unit } from '../data/plates'
import type { SolveInput } from '../lib/combinations'
import { convert, fmt } from '../lib/format'
import { DEFAULT_RAMP, percentTable, warmupPlan } from '../lib/warmup'
import { NumberField } from './NumberField'
import { ChevronIcon, Segmented } from './ui'

type Tab = 'warmup' | 'percent' | 'convert'

const DESKTOP = '(min-width: 1024px)'

export function WarmupPanel({
  input,
  unit,
  target,
  onPick,
  onPickStep,
}: {
  input: SolveInput
  unit: Unit
  target: number
  /** Choosing a working weight: moves the bar and is worth remembering. */
  onPick: (w: number) => void
  /** Climbing the ramp: moves the bar only. */
  onPickStep: (w: number) => void
}) {
  // Three tabs, a 1RM field and a percentage grid are a second app beside the
  // bar. On a phone that was outranking the loaded barbell, so it starts shut
  // and only stands open where it has a column of its own.
  const [open, setOpen] = useState(() => window.matchMedia(DESKTOP).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const sync = () => setOpen(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const [tab, setTab] = useState<Tab>('warmup')
  const [ramp, setRamp] = useState<number[]>(DEFAULT_RAMP)
  const [step, setStep] = useState(5)

  // The weight the ramp is built towards, held apart from the weight on the bar.
  // Tying the plan to the target made the list rewrite itself the moment you
  // used it: tap 60 % and the panel became a ramp to 60, work weight gone.
  const [work, setWork] = useState(target)
  const [oneRm, setOneRm] = useState(target)
  const [rmEdited, setRmEdited] = useState(false)

  const plan = useMemo(() => warmupPlan(work, input, ramp), [work, input, ramp])
  const rows = useMemo(() => percentTable(oneRm, input, 50, 100, step), [oneRm, input, step])
  const other: Unit = unit === 'kg' ? 'lb' : 'kg'
  /** Marks whichever rows already match what is on the bar. */
  const isLoaded = (w: number) => Math.abs(w - target) < 0.001

  // Derived during render, no effect — the same trick the combination list uses.
  const [prevTarget, setPrevTarget] = useState(target)
  if (target !== prevTarget) {
    setPrevTarget(target)
    // Every step of a ramp sits at or below its top, so anything heavier is a
    // new working weight. Lighter is someone climbing, or nudging a warm-up
    // set by a plate — the plan holds, and the chip below re-anchors it.
    if (target > work + 1e-9) setWork(target)
    if (!rmEdited) setOneRm(target)
  }

  // A brand switch converts the target into the other unit; carrying the old
  // number across would silently mean a different load.
  const [prevUnit, setPrevUnit] = useState(unit)
  if (unit !== prevUnit) {
    setPrevUnit(unit)
    setWork(target)
    setOneRm(target)
    setRmEdited(false)
  }

  return (
    <details className="card group p-4" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary className="-m-4 flex min-h-[56px] cursor-pointer list-none items-center gap-3 rounded-2xl p-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <h2 className="section-title">Warm-up &amp; percentages</h2>
          {!open && <p className="text-xs text-muted">Ramp sets, % of your max, kg ⇄ lb</p>}
        </span>
        <span className="shrink-0 text-muted">
          <ChevronIcon open={open} />
        </span>
      </summary>
      <div className="hide-scroll -mx-1 mt-4 overflow-x-auto px-1 pb-2">
        <Segmented
          value={tab}
          onChange={setTab}
          label="Tool"
          className="w-max"
          options={[
            { value: 'warmup', label: 'Warm-up' },
            { value: 'percent', label: '% of 1RM' },
            { value: 'convert', label: 'Convert' },
          ]}
        />
      </div>

      {tab === 'warmup' && (
        <div className="mt-3">
          <p className="mb-3 text-xs text-muted">
            Ramp to {fmt(work)} {unit}
            {Math.abs(work - target) > 0.001 && (
              <>
                {' '}
                — <span className="font-semibold text-good">{fmt(target)} {unit}</span> on the bar
              </>
            )}
            . Every step is snapped to what your gym can actually load.
          </p>
          <ul className="flex flex-col gap-2">
            {plan.map((s) => {
              const loaded = isLoaded(s.weight)
              return (
              <li key={s.key}>
                <button
                  type="button"
                  aria-current={loaded ? 'true' : undefined}
                  className={`btn w-full justify-between px-4 ${loaded ? 'border-transparent bg-good/10 ring-2 ring-good' : ''}`}
                  onClick={() => onPickStep(s.weight)}
                >
                  <span className="flex items-center gap-3">
                    <span className={`flex w-12 items-center gap-1.5 text-left text-xs uppercase tracking-wider ${loaded ? 'font-semibold text-good' : 'text-muted'}`}>
                      {loaded && <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden="true" />}
                      {s.label}
                    </span>
                    <span className="text-lg font-semibold tabular-nums">
                      {fmt(s.weight)} {unit}
                    </span>
                  </span>
                  {Math.abs(s.weight - s.ideal) > 0.001 && !s.bareBar && (
                    <span className="text-xs text-muted tabular-nums">target {fmt(s.ideal)}</span>
                  )}
                </button>
              </li>
              )
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              { label: 'Standard', v: [0.4, 0.6, 0.8] },
              { label: 'Long', v: [0.3, 0.5, 0.65, 0.8, 0.9] },
              { label: 'Short', v: [0.5, 0.8] },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                className="chip"
                aria-pressed={ramp.join() === p.v.join()}
                onClick={() => setRamp(p.v)}
              >
                {p.label}
              </button>
            ))}
            {work - target > 0.001 && (
              <button type="button" className="chip" onClick={() => setWork(target)}>
                Ramp to {fmt(target)} {unit} instead
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'percent' && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">1RM</span>
              <NumberField
                className="btn w-28 justify-center"
                value={oneRm}
                onCommit={(v) => {
                  if (v == null || v <= 0) return
                  setOneRm(v)
                  setRmEdited(true)
                }}
                aria-label={`One rep max in ${unit}`}
              />
              <span className="text-muted">{unit}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">Step</span>
              <select
                className="btn w-20 justify-center"
                value={step}
                onChange={(e) => setStep(Number(e.target.value))}
                aria-label="Percentage step"
              >
                {[2.5, 5, 10].map((s) => (
                  <option key={s} value={s}>
                    {s}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map((r) => {
              const loaded = isLoaded(r.weight)
              return (
                <li key={r.pct}>
                  <button
                    type="button"
                    aria-current={loaded ? 'true' : undefined}
                    className={`btn w-full flex-col items-start gap-0 py-2 ${
                      loaded ? 'border-transparent bg-good/10 ring-2 ring-good' : ''
                    }`}
                    onClick={() => {
                      // Loading a row moves the bar, and the 1RM follows the bar
                      // until the table is used — so pin it first, or the row you
                      // tapped becomes the new 100 % and the table rebuilds under you.
                      setRmEdited(true)
                      onPick(r.weight)
                    }}
                  >
                    <span className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${loaded ? 'font-semibold text-good' : 'text-muted'}`}>
                      {loaded && <span className="h-1.5 w-1.5 rounded-full bg-good" aria-hidden="true" />}
                      {r.pct}%
                      {loaded && <span className="sr-only">— currently on the bar</span>}
                    </span>
                    <span className="text-base font-semibold tabular-nums">
                      {fmt(r.weight)} {unit}
                    </span>
                    <span className={`text-[11px] tabular-nums ${loaded ? 'text-good' : 'text-muted'}`}>
                      {fmt(convert(r.weight, unit, other), 1)} {other}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {tab === 'convert' && (
        <div className="mt-3">
          <div className="rounded-2xl border border-line p-4 text-center">
            <div className="font-display text-4xl font-semibold tabular-nums">
              {fmt(target)} <span className="text-xl text-muted">{unit}</span>
            </div>
            <div className="mt-1 text-lg text-muted tabular-nums">
              = {fmt(convert(target, unit, other), 2)} {other}
            </div>
          </div>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {input.denoms.map((d) => (
              <li key={d.id} className="rounded-xl border border-line px-3 py-2 text-sm tabular-nums">
                <span className="font-semibold">
                  {fmt(d.weight)} {unit}
                </span>
                <span className="text-muted"> = {fmt(convert(d.weight, unit, other), 2)} {other}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  )
}

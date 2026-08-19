import { useMemo, useState } from 'react'
import type { Unit } from '../data/plates'
import type { SolveInput } from '../lib/combinations'
import { convert, fmt } from '../lib/format'
import { DEFAULT_RAMP, percentTable, warmupPlan } from '../lib/warmup'
import { FlameIcon, SectionHeader, Segmented } from './ui'

type Tab = 'warmup' | 'percent' | 'convert'

export function WarmupPanel({
  input,
  unit,
  target,
  onPick,
}: {
  input: SolveInput
  unit: Unit
  target: number
  onPick: (w: number) => void
}) {
  const [tab, setTab] = useState<Tab>('warmup')
  const [ramp, setRamp] = useState<number[]>(DEFAULT_RAMP)
  const [oneRm, setOneRm] = useState(target)
  const [step, setStep] = useState(5)

  const plan = useMemo(() => warmupPlan(target, input, ramp), [target, input, ramp])
  const rows = useMemo(() => percentTable(oneRm, input, 50, 100, step), [oneRm, input, step])
  const other: Unit = unit === 'kg' ? 'lb' : 'kg'

  return (
    <section className="card p-4" aria-label="Training tools">
      <SectionHeader icon={<FlameIcon size={16} />} tone="flame" className="mb-3">
        Training tools
      </SectionHeader>
      <div className="hide-scroll -mx-1 overflow-x-auto px-1 pb-2">
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
            Ramp to {fmt(target)} {unit}. Every step is snapped to what your gym can actually load.
          </p>
          <ul className="flex flex-col gap-2">
            {plan.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  className="btn w-full justify-between px-4"
                  onClick={() => onPick(s.weight)}
                >
                  <span className="flex items-center gap-3">
                    <span className="w-12 text-left text-xs uppercase tracking-wider text-muted">{s.label}</span>
                    <span className="text-lg font-semibold tabular-nums">
                      {fmt(s.weight)} {unit}
                    </span>
                  </span>
                  {Math.abs(s.weight - s.ideal) > 0.001 && !s.bareBar && (
                    <span className="text-xs text-muted tabular-nums">target {fmt(s.ideal)}</span>
                  )}
                </button>
              </li>
            ))}
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
          </div>
        </div>
      )}

      {tab === 'percent' && (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <span className="text-muted">1RM</span>
              <input
                type="number"
                step="any"
                min={0}
                className="btn w-28 justify-center"
                value={oneRm}
                onChange={(e) => setOneRm(Number(e.target.value))}
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
            {rows.map((r) => (
              <li key={r.pct}>
                <button type="button" className="btn w-full flex-col items-start gap-0 py-2" onClick={() => onPick(r.weight)}>
                  <span className="text-[11px] uppercase tracking-wider text-muted">{r.pct}%</span>
                  <span className="text-base font-semibold tabular-nums">
                    {fmt(r.weight)} {unit}
                  </span>
                  <span className="text-[11px] text-muted tabular-nums">
                    {fmt(convert(r.weight, unit, other), 1)} {other}
                  </span>
                </button>
              </li>
            ))}
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
    </section>
  )
}

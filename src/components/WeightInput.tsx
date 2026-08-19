import { useState } from 'react'
import type { Unit } from '../data/plates'
import { converted, fmt } from '../lib/format'
import { MinusIcon, PlusIcon, SectionHeader, Sheet, TargetIcon } from './ui'

export interface WeightInputProps {
  value: number
  unit: Unit
  step: number
  loadable: boolean
  onChange: (v: number) => void
  onCommit?: (v: number) => void
  quickSteps: number[]
}

export function WeightInput({ value, unit, step, loadable, onChange, onCommit, quickSteps }: WeightInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(() => fmt(value))
  const [keypad, setKeypad] = useState(false)

  const commit = (raw: string) => {
    const n = Number(raw)
    if (Number.isFinite(n) && n >= 0) {
      onChange(Math.round(n * 1000) / 1000)
      onCommit?.(Math.round(n * 1000) / 1000)
    }
    setEditing(false)
  }

  const bump = (delta: number) => {
    const next = Math.max(0, Math.round((value + delta) * 1000) / 1000)
    onChange(next)
    onCommit?.(next)
    if ('vibrate' in navigator) navigator.vibrate?.(8)
  }

  return (
    <section className="card p-4 sm:p-5" aria-label="Target weight">
      <div className="flex items-center justify-between gap-3">
        <SectionHeader icon={<TargetIcon />} tone={loadable ? 'good' : 'bad'}>
          Target
        </SectionHeader>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
            loadable ? 'bg-good/10 text-good' : 'bg-bad/10 text-bad'
          }`}
          role="status"
        >
          <span className={`h-2 w-2 rounded-full ${loadable ? 'bg-good' : 'bg-bad'}`} aria-hidden="true" />
          {loadable ? 'Loadable' : 'Not loadable'}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          className="btn h-14 w-14 shrink-0 rounded-2xl text-2xl"
          onClick={() => bump(-step)}
          aria-label={`Decrease by ${fmt(step)} ${unit}`}
        >
          <MinusIcon />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center">
          {editing ? (
            <input
              autoFocus
              inputMode="decimal"
              type="number"
              step="any"
              className="w-full bg-transparent text-center font-display text-6xl font-semibold tabular-nums outline-none sm:text-7xl"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commit(draft)
                if (e.key === 'Escape') setEditing(false)
              }}
              aria-label={`Target weight in ${unit}`}
            />
          ) : (
            <button
              type="button"
              className="flex w-full items-baseline justify-center gap-2 rounded-xl px-2 py-1"
              onClick={() => {
                setDraft(fmt(value))
                setEditing(true)
              }}
              aria-label={`Target weight ${fmt(value)} ${unit}. Tap to type a new one.`}
            >
              <span
                className={`font-display font-semibold leading-none tabular-nums ${
                  fmt(value).length > 5
                    ? 'text-4xl sm:text-5xl'
                    : fmt(value).length > 4
                      ? 'text-5xl sm:text-6xl'
                      : 'text-6xl sm:text-7xl'
                } ${loadable ? '' : 'text-bad'}`}
              >
                {fmt(value)}
              </span>
              <span className="text-2xl font-medium text-muted">{unit}</span>
            </button>
          )}
          <span className="mt-1 text-sm text-muted tabular-nums">≈ {converted(value, unit)}</span>
        </div>

        <button
          type="button"
          className="btn h-14 w-14 shrink-0 rounded-2xl text-2xl"
          onClick={() => bump(step)}
          aria-label={`Increase by ${fmt(step)} ${unit}`}
        >
          <PlusIcon />
        </button>
      </div>

      <div className="hide-scroll -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {quickSteps.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => bump(q)}>
            +{fmt(q)}
          </button>
        ))}
        {quickSteps.map((q) => (
          <button key={`m${q}`} type="button" className="chip gym-hide" onClick={() => bump(-q)}>
            −{fmt(q)}
          </button>
        ))}
        <button type="button" className="chip" onClick={() => setKeypad(true)}>
          Keypad
        </button>
      </div>

      <Sheet open={keypad} onClose={() => setKeypad(false)} title="Enter target">
        <Keypad
          initial={fmt(value)}
          unit={unit}
          onDone={(v) => {
            commit(v)
            setKeypad(false)
          }}
        />
      </Sheet>
    </section>
  )
}

function Keypad({ initial, unit, onDone }: { initial: string; unit: Unit; onDone: (v: string) => void }) {
  const [buf, setBuf] = useState(initial)
  const press = (k: string) => {
    if ('vibrate' in navigator) navigator.vibrate?.(6)
    setBuf((b) => {
      if (k === 'del') return b.length <= 1 ? '0' : b.slice(0, -1)
      if (k === 'clr') return '0'
      if (k === '.' && b.includes('.')) return b
      if (b === '0' && k !== '.') return k
      return (b + k).slice(0, 7)
    })
  }
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del']
  return (
    <div>
      <div className="mb-4 rounded-2xl border border-line bg-surface px-4 py-5 text-center">
        <span className="font-display text-5xl font-semibold tabular-nums">{buf}</span>
        <span className="ml-2 text-xl text-muted">{unit}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="btn h-16 text-2xl font-semibold"
            onClick={() => press(k)}
            aria-label={k === 'del' ? 'Delete' : k}
          >
            {k === 'del' ? '⌫' : k}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className="btn h-14" onClick={() => press('clr')}>
          Clear
        </button>
        <button type="button" className="btn btn-primary h-14" onClick={() => onDone(buf)}>
          Load it
        </button>
      </div>
    </div>
  )
}

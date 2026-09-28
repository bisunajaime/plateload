import { useState } from 'react'
import type { Unit } from '../data/plates'

/** Big keys for a phone in a chalky hand. */
export function Keypad({ initial, unit, onDone }: { initial: string; unit: Unit; onDone: (v: string) => void }) {
  const [buf, setBuf] = useState(initial)
  // The current weight is shown until you type: the first digit replaces it,
  // as a calculator does. Appending turned 100 → "125" into 100125.
  const [fresh, setFresh] = useState(true)
  const press = (k: string) => {
    if ('vibrate' in navigator) navigator.vibrate?.(6)
    const wasFresh = fresh
    setFresh(false)
    setBuf((prev) => {
      const b = wasFresh && k !== 'del' ? '0' : prev
      if (k === 'del') return b.length <= 1 ? '0' : b.slice(0, -1)
      if (k === 'clr') return '0'
      if (k === '.') return b.includes('.') ? b : b + '.'
      // Two decimals is already finer than any plate.
      if (/\.\d{2}$/.test(b)) return b
      if (b === '0') return k
      return b.length >= 6 ? b : b + k
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

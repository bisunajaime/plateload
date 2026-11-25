import { useEffect, useRef, useState } from 'react'
import type { Unit } from '../data/plates'
import { feedback } from '../feel'
import { Button } from './kit/Button'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'] as const

/**
 * Big keys for a phone in a chalky hand — and the keyboard of a tablet or a
 * laptop works too. The weight on the bar is shown until you type; the first
 * digit replaces it, as a calculator does, and until then it's shown as
 * "about to be replaced". A refusal says why and keeps the sheet open.
 */
export function Keypad({
  initial,
  unit,
  check,
  onDone,
}: {
  initial: string
  unit: Unit
  /** Why this entry can't be loaded, or null if it can. */
  check: (raw: string) => string | null
  onDone: (raw: string) => void
}) {
  const [buf, setBuf] = useState(initial)
  const [fresh, setFresh] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const press = (k: (typeof KEYS)[number] | 'clr') => {
    feedback('step')
    setError(null)
    const wasFresh = fresh
    setFresh(false)
    setBuf((prev) => {
      const b = wasFresh && k !== 'del' ? '0' : prev
      if (k === 'del') return wasFresh || b.length <= 1 ? '0' : b.slice(0, -1)
      if (k === 'clr') return '0'
      if (k === '.') return b.includes('.') ? b : b + '.'
      // Two decimals is already finer than any plate.
      if (/\.\d{2}$/.test(b)) return b
      if (b === '0') return k
      return b.length >= 6 ? b : b + k
    })
  }

  const done = () => {
    const why = check(buf)
    if (why) {
      feedback('error')
      setError(why)
      return
    }
    onDone(buf)
  }

  // The physical keyboard, while the keypad is open. Escape belongs to the sheet.
  const latest = useRef({ press, done })
  useEffect(() => {
    latest.current = { press, done }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      const { press, done } = latest.current
      if (/^[0-9]$/.test(k)) press(k as (typeof KEYS)[number])
      else if (k === '.' || k === ',') press('.')
      else if (k === 'Backspace') press('del')
      else if (k === 'Delete') press('clr')
      // Enter on a focused key is that key's click; anywhere else it loads.
      else if (k === 'Enter' && !(e.target as HTMLElement).closest?.('button')) done()
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div>
      <div className="mb-2 rounded-2xl border border-edge bg-surface px-4 py-4 text-center">
        <output aria-live="polite" aria-label={`Weight, ${unit}`} className="block">
          <span
            className={`rounded-lg px-1 font-cond font-bold leading-none tabular-nums ${fresh ? 'bg-accent/25 text-muted' : 'text-ink'}`}
            style={{ fontSize: '3.5rem' }}
          >
            {buf}
          </span>
          <span className="ml-2 font-cond text-xl font-bold uppercase text-muted">{unit}</span>
        </output>
        <p className="mt-2 min-h-[1.25rem] text-sm text-muted">{fresh ? 'Type to replace the current weight' : ' '}</p>
      </div>
      <p role="status" className={`mb-3 min-h-[1.5rem] text-center text-sm font-medium ${error ? 'text-bad' : 'sr-only'}`}>
        {error ?? ''}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            type="button"
            className="h-16 select-none rounded-xl border border-edge bg-surface font-cond text-2xl font-bold text-ink transition hover:bg-surface2 active:scale-press-wide"
            onClick={() => press(k)}
            aria-label={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}
          >
            {k === 'del' ? <BackspaceIcon /> : k}
          </button>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={() => press('clr')} className="h-14">
          Clear
        </Button>
        <Button variant="accent" onClick={done} className="h-14">
          Load it
        </Button>
      </div>
    </div>
  )
}

const BackspaceIcon = () => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mx-auto">
    <path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7 6-7Z" />
    <path d="m12 9 6 6m0-6-6 6" />
  </svg>
)

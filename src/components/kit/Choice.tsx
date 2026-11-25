import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { feedback } from '../../feel'

export interface ChoiceOption<T extends string> {
  value: T
  label: ReactNode
  /** Spoken and shown on hover — never the only place a meaning lives. */
  title?: string
}

/**
 * One of a few, side by side: a radio group drawn as a segmented control.
 * The highlight slides to the choice. Arrow keys move the choice, as radios
 * do, and only the chosen one is a tab stop.
 */
export function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: ChoiceOption<T>[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, options.findIndex((o) => o.value === value))
  const n = options.length

  const choose = (i: number, focus = false) => {
    const next = options[(i + n) % n]
    if (next.value !== value) {
      feedback('select')
      onChange(next.value)
    }
    if (focus) refs.current[(i + n) % n]?.focus()
  }
  const onKey = (e: KeyboardEvent) => {
    const move = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]
    if (move) {
      e.preventDefault()
      choose(index + move, true)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      choose(e.key === 'Home' ? 0 : n - 1, true)
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKey}
      className={`relative grid rounded-xl border border-edge bg-surface p-1 ${className}`}
      style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 rounded-lg bg-ink transition-transform duration-base"
        style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o, i) => {
        const on = i === index
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            title={o.title}
            onClick={() => choose(i)}
            className={`relative z-10 min-h-[44px] select-none truncate rounded-lg px-3 text-sm font-semibold transition-colors ${
              on ? 'text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

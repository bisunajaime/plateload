import { useState, type InputHTMLAttributes } from 'react'
import { fmt } from '../lib/format'

/**
 * A number input you can clear and retype. Binding straight to a number made
 * an empty field snap back — backspace "2.5" and it returned, then typing 1
 * gave "2.51". Holds the text while focused and commits on blur or Enter; an
 * empty field commits `null` for the caller to read as "use the default".
 */
export function NumberField({
  value,
  onCommit,
  min = 0,
  max,
  integer = false,
  ...rest
}: {
  value: number | null
  onCommit: (v: number | null) => void
  min?: number
  max?: number
  integer?: boolean
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'max' | 'type'>) {
  const [draft, setDraft] = useState<string | null>(null)

  const commit = () => {
    if (draft == null) return
    const raw = draft.trim()
    setDraft(null)
    if (raw === '') return onCommit(null)
    let n = Number(raw)
    if (!Number.isFinite(n)) return
    if (integer) n = Math.round(n)
    n = Math.max(min, max != null ? Math.min(max, n) : n)
    onCommit(n)
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      value={draft ?? (value == null ? '' : fmt(value))}
      onFocus={(e) => {
        setDraft(value == null ? '' : fmt(value))
        rest.onFocus?.(e)
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={(e) => {
        commit()
        rest.onBlur?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        rest.onKeyDown?.(e)
      }}
    />
  )
}

import { useEffect, useId, useState, type ReactNode } from 'react'

export interface FieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  /** Report that the input was changed or refused, with a sentence saying how.
   *  Not a DOM attribute: take it out before spreading the rest onto an <input>. */
  onAdjust: (message: string) => void
}

/**
 * A labelled input with room for a hint and for a message when what you
 * typed was refused or corrected — "Capped at 99", "That isn't a number" —
 * so nothing is ever silently ignored. The message clears itself.
 */
export function Field({
  label,
  hint,
  error,
  inline = false,
  children,
}: {
  label: ReactNode
  hint?: ReactNode
  /** A standing error, from the caller. */
  error?: string | null
  /** Label beside the input instead of above it. */
  inline?: boolean
  children: (control: FieldControlProps) => ReactNode
}) {
  const id = useId()
  const [note, setNote] = useState<string | null>(null)
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 4000)
    return () => window.clearTimeout(t)
  }, [note])
  const message = error ?? note
  const describedBy = [hint ? `${id}-hint` : '', `${id}-msg`].filter(Boolean).join(' ')
  return (
    <div className={inline ? 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1' : 'flex flex-col gap-1.5'}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': !!error || undefined, onAdjust: setNote })}
      {hint && (
        <span id={`${id}-hint`} className="w-full text-sm text-muted">
          {hint}
        </span>
      )}
      <span id={`${id}-msg`} role="status" className={`w-full text-sm ${error ? 'text-bad' : 'text-accent-ink'} ${message ? '' : 'sr-only'}`}>
        {message ?? ''}
      </span>
    </div>
  )
}

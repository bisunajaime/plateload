import { useId, type ReactNode } from 'react'
import { feedback } from '../../feel'

/**
 * On/off for a setting. On is unmistakable: a yellow track with the knob to
 * the right. Off is an empty track with the knob at rest on the left. The
 * hint describes the switch; it isn't part of its name.
 */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  return (
    <label className={`flex min-h-[48px] items-center justify-between gap-4 py-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
      <span className="flex flex-col">
        <span className={`text-base font-medium ${disabled ? 'text-muted' : 'text-ink'}`}>{label}</span>
        {hint && (
          <span id={`${id}-hint`} className="text-sm text-muted">
            {hint}
          </span>
        )}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            feedback('toggle')
            onChange(e.target.checked)
          }}
        />
        <span className="h-8 w-[52px] rounded-full border border-edge bg-surface2 transition peer-checked:border-transparent peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-[rgb(var(--focus))] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg peer-disabled:opacity-50" />
        <span className="pointer-events-none absolute left-1 top-1 h-6 w-6 rounded-full bg-muted shadow transition peer-checked:translate-x-5 peer-checked:bg-on-accent" />
      </span>
    </label>
  )
}

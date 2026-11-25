import type { ButtonHTMLAttributes } from 'react'

/**
 * The one pill for "pick this": a weight, a lift, a preset. `selected` makes
 * it a toggle (aria-pressed); `quiet` is for options that belong elsewhere —
 * a weight in the other unit — dashed, but still full-contrast text.
 */
export function Chip({
  selected,
  quiet = false,
  className = '',
  ...rest
}: { selected?: boolean; quiet?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const look = selected
    ? 'border-transparent bg-ink text-bg'
    : quiet
      ? 'border-dashed border-edge bg-transparent text-ink hover:bg-surface2'
      : 'border-edge bg-surface text-ink hover:bg-surface2'
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...rest}
      className={`inline-flex min-h-[44px] shrink-0 select-none items-center gap-1.5 rounded-full border px-4 text-sm font-semibold tabular-nums transition active:scale-press ${look} ${className}`}
    />
  )
}

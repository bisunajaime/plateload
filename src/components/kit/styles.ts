/* Class recipes for kit looks that some controls need without the component. */

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-bg hover:bg-ink/90',
  // The one loud button on a screen: yellow, like a competition platform's markings.
  accent: 'bg-accent text-on-accent hover:brightness-95',
  secondary: 'border border-edge bg-surface text-ink hover:bg-surface2',
  ghost: 'text-ink hover:bg-surface2',
  danger: 'bg-bad text-white hover:bg-bad/90',
}

/** Button classes, for the rare control that has to be something other than a <button>. */
export function buttonClass(variant: ButtonVariant = 'secondary', size: 'md' | 'sm' = 'md') {
  return [
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-press-wide',
    // Disabled reads as quiet, not as faded-out text you can barely see.
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface2 disabled:text-muted disabled:active:scale-100',
    size === 'md' ? 'min-h-[48px] px-5 text-base' : 'min-h-[44px] px-4 text-sm',
    VARIANTS[variant],
  ].join(' ')
}

/** The look of a text or number input. */
export const inputClass =
  'min-h-[48px] w-full rounded-xl border border-edge bg-surface px-3.5 text-base text-ink tabular-nums placeholder:text-muted aria-[invalid=true]:border-bad'

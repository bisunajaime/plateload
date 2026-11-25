import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { buttonClass, type ButtonVariant } from './styles'

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className = '',
  children,
  ...rest
}: { variant?: ButtonVariant; size?: 'md' | 'sm'; icon?: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" {...rest} className={`${buttonClass(variant, size)} ${className}`}>
      {icon}
      {children}
    </button>
  )
}

/** A square button with only an icon. It must say what it does. */
export function IconButton({
  label,
  className = '',
  children,
  ...rest
}: { label: string; children: ReactNode } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={`inline-flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-xl text-ink transition hover:bg-surface2 active:scale-press disabled:text-muted ${className}`}
    >
      {children}
    </button>
  )
}

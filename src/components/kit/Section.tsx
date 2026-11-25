import { useId, type ReactNode } from 'react'

/** A titled block of a screen. Same heading, spacing and action slot everywhere. */
export function Section({
  title,
  action,
  level = 2,
  children,
  className = '',
}: {
  title: ReactNode
  action?: ReactNode
  level?: 2 | 3
  children: ReactNode
  className?: string
}) {
  const id = useId()
  const H = level === 2 ? 'h2' : 'h3'
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-3 flex min-h-[44px] items-center justify-between gap-3">
        <H id={id} className={level === 2 ? 'text-lg font-semibold text-ink' : 'text-xs font-semibold uppercase tracking-[0.14em] text-muted'}>
          {title}
        </H>
        {action}
      </div>
      {children}
    </section>
  )
}

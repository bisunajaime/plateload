import type { PlateDef } from '../../data/plates'
import { fmt } from '../../lib/format'

/**
 * A plate as a pill in its own colour, with an edge drawn from the page's ink
 * so a black plate on a dark card and a white plate on paper never vanish.
 */
export function PlatePill({ plate, count = 1, size = 'md' }: { plate: PlateDef; count?: number; size?: 'sm' | 'md' | 'lg' }) {
  const box = {
    sm: 'min-w-[36px] px-2 py-0.5 text-sm',
    md: 'min-w-[48px] px-2.5 py-1 text-lg',
    lg: 'min-w-[60px] px-3 py-1.5 text-xl',
  }[size]
  return (
    <span
      className={`inline-flex items-baseline justify-center gap-1 rounded-lg font-cond font-bold tabular-nums ${box}`}
      style={{
        background: plate.color,
        color: plate.textColor,
        boxShadow: 'inset 0 0 0 1px rgb(var(--ink) / 0.28), inset 0 -2px 0 rgb(0 0 0 / 0.18)',
      }}
    >
      {count > 1 && <span className="font-semibold">{count}×</span>}
      {fmt(plate.weight)}
    </span>
  )
}

import { useEffect, useState } from 'react'
import { useReducedMotion } from '../feel'

export interface Moment {
  id: number
  kind: 'milestone' | 'record'
  title: string
  detail?: string
}

/** Where each speck of chalk ends up, px from the caption's centre. */
const SPECKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + (i % 2 ? 0.2 : -0.1)
  const r = 46 + (i % 3) * 18
  return { dx: Math.round(Math.cos(a) * r * 1.6), dy: Math.round(Math.sin(a) * r - 10), size: 3 + (i % 3) * 2, delay: (i % 4) * 30 }
})

/**
 * A moment over the bar: a caption, some chalk in the air for a milestone,
 * three white lights for a record. Decoration only — it never carries
 * anything the page doesn't already say, so it is hidden from screen readers.
 */
export function Celebration({ moment }: { moment: Moment | null }) {
  const reduced = useReducedMotion()
  const [gone, setGone] = useState<number | null>(null)
  useEffect(() => {
    if (!moment) return
    const t = window.setTimeout(() => setGone(moment.id), 2400)
    return () => window.clearTimeout(t)
  }, [moment])
  if (!moment || gone === moment.id) return null

  return (
    <div key={moment.id} className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="moment relative flex flex-col items-center gap-2">
        {moment.kind === 'record' && (
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="judge-light h-5 w-5 rounded-full border border-black/20 bg-white"
                style={{ animationDelay: reduced ? undefined : `${150 + i * 160}ms` }}
              />
            ))}
          </div>
        )}
        <div className="rounded-2xl bg-ink/90 px-4 py-2 text-center text-bg shadow-xl backdrop-blur">
          <div className="font-display text-xl font-semibold tracking-tight">{moment.title}</div>
          {moment.detail && <div className="text-xs opacity-80">{moment.detail}</div>}
        </div>
        {!reduced &&
          moment.kind === 'milestone' &&
          SPECKS.map((s, i) => (
            <span
              key={i}
              className="chalk absolute left-1/2 top-1/2 rounded-full bg-ink/40"
              style={{
                width: s.size,
                height: s.size,
                animationDelay: `${s.delay}ms`,
                ['--dx' as string]: `${s.dx}px`,
                ['--dy' as string]: `${s.dy}px`,
              }}
            />
          ))}
      </div>
    </div>
  )
}

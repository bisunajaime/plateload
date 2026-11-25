import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { duration, ease, feedback, useReducedMotion } from '../feel'

/* -------------------------------------------------------------- segmented */

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
  title?: string
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = '',
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (v: T) => void
  label: string
  className?: string
}) {
  return (
    <div className={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          title={o.title}
          onClick={() => {
            if (o.value !== value) feedback('select')
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ toggle */

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  hint?: ReactNode
}) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 py-1">
      <span className="flex flex-col">
        <span className="text-sm font-medium text-ink">{label}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => {
            feedback('toggle')
            onChange(e.target.checked)
          }}
        />
        <span className="h-7 w-12 rounded-full bg-surface2 ring-1 ring-line transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink" />
        <span className="pointer-events-none absolute left-1 top-1 h-5 w-5 rounded-full bg-ink transition peer-checked:translate-x-5 peer-checked:bg-bg" />
      </span>
    </label>
  )
}

/* ------------------------------------------------------------------- sheet */

export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
  focusField = true,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  /** Focus the first text field on open. Off where choices come first — on a
   *  phone a focused field raises the keyboard over them. */
  focusField?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const restore = useRef<HTMLElement | null>(null)
  const reduced = useReducedMotion()

  // Mounted through its exit: open → closing → closed. Derived during render so
  // the closing frame and the last open frame are the same frame.
  const [phase, setPhase] = useState<'open' | 'closing' | 'closed'>(open ? 'open' : 'closed')
  if (open && phase !== 'open') setPhase('open')
  if (!open && phase === 'open') setPhase('closing')

  // What a caller renders can depend on state that is cleared to close the
  // sheet (the favourite being removed). Leave with what was on screen.
  // A ref read during render on purpose: the closing render needs the
  // previous render's content, and nothing should re-render because of it.
  const snapshot = useRef({ title, children, footer })
  // eslint-disable-next-line react/refs
  if (open) snapshot.current = { title, children, footer }
  // eslint-disable-next-line react/refs
  const shown = open ? { title, children, footer } : snapshot.current

  // Held in a ref so the effect below never re-runs just because the caller
  // passed a fresh arrow function: tearing it down mid-typing would restore
  // focus to whatever opened the sheet after every keystroke.
  const closeRef = useRef(onClose)
  const focusRef = useRef(focusField)
  useEffect(() => {
    closeRef.current = onClose
    focusRef.current = focusField
  })

  useEffect(() => {
    if (!open) return
    restore.current = document.activeElement as HTMLElement
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'Tab' && panel.current) {
        const nodes = panel.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (nodes.length === 0) return
        const first = nodes[0]
        const last = nodes[nodes.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    // Land on the first field if the sheet has one, otherwise the first control.
    const t = window.setTimeout(() => {
      const el =
        (focusRef.current && panel.current?.querySelector<HTMLElement>('input:not([type="checkbox"]), select, textarea')) ||
        panel.current?.querySelector<HTMLElement>('[data-sheet-body] button') ||
        panel.current?.querySelector<HTMLElement>('button')
      el?.focus()
    }, 30)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
      document.body.style.overflow = ''
      // The control that opened the sheet may be gone — a favourite just
      // removed. Land on the main content rather than dropping to <body>.
      const back = restore.current?.isConnected ? restore.current : document.getElementById('main')
      if (back?.id === 'main' && !back.hasAttribute('tabindex')) back.setAttribute('tabindex', '-1')
      back?.focus?.({ preventScroll: true })
    }
  }, [open])

  /* ---------------------------------------------------------- motion */

  const running = useRef<Animation[]>([])
  /** Set when a drag lets go past the line, so the exit carries on at the finger's speed. */
  const flung = useRef(false)
  const stop = () => {
    running.current.forEach((a) => a.cancel())
    running.current = []
  }

  /** Where the panel rests when it's away: below the screen on a phone, small and clear on a desktop. */
  const away = (): Keyframe =>
    reduced ? { opacity: 0 } : isPhone() ? { transform: 'translateY(100%)' } : { transform: 'scale(0.96)', opacity: 0 }

  /** The panel and scrim as they look right now — mid-animation or mid-drag — so motion picks up from there. */
  const here = () => {
    const p = panel.current && getComputedStyle(panel.current)
    const b = scrim.current && getComputedStyle(scrim.current)
    return {
      panel: { transform: p?.transform === 'none' ? 'none' : (p?.transform ?? 'none'), opacity: Number(p?.opacity ?? 1) },
      scrim: { opacity: Number(b?.opacity ?? 1) },
    }
  }

  useLayoutEffect(() => {
    const el = panel.current
    const bg = scrim.current
    if (!el || !bg || phase === 'closed') return
    // Closing always leaves from where the panel is. Opening starts from away on
    // a fresh mount, but from here on a reopen mid-exit or a release mid-drag.
    const moving = running.current.some((a) => a.playState === 'running') || el.style.transform !== ''
    const from = phase === 'closing' || moving ? here() : { panel: away(), scrim: { opacity: 0 } }
    stop()
    el.style.transform = ''
    el.style.opacity = ''
    bg.style.opacity = ''
    if (phase === 'open') {
      // Arrives with weight: quick out of the blocks, long landing.
      const timing = { duration: reduced ? duration.quick : duration.base, easing: ease.out }
      running.current = [
        el.animate([from.panel, { transform: 'none', opacity: 1 }], timing),
        bg.animate([from.scrim, { opacity: 1 }], timing),
      ]
      return
    }
    // Leaves faster than it came. Let go mid-drag, it keeps the finger's
    // momentum; closed from a button, it gathers speed but starts at once.
    const easing = flung.current ? ease.out : ease.inOut
    flung.current = false
    const timing: KeyframeAnimationOptions = { duration: duration.quick, easing, fill: 'forwards' }
    const out = el.animate([from.panel, away()], timing)
    running.current = [out, bg.animate([from.scrim, { opacity: 0 }], timing)]
    out.onfinish = () => setPhase('closed')
    // `away` and `here` read refs and the media query; the phase change is what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => stop, [])

  /* ------------------------------------------------ drag to dismiss */

  // Phone only: the header is a handle. The panel follows the finger, written
  // straight to the DOM, and on release either leaves or settles back.
  const drag = useRef<{ start: number; from: number; last: { y: number; t: number }; prev: { y: number; t: number } } | null>(null)
  const offset = useRef(0)

  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = panel.current
    if (!el || phase !== 'open' || !isPhone() || (e.target as HTMLElement).closest('button')) return
    // Grabbed mid-animation: start from where the panel is, not where it's headed.
    const now = new DOMMatrixReadOnly(getComputedStyle(el).transform).m42
    stop()
    el.style.transform = `translateY(${now}px)`
    offset.current = now
    const sample = { y: e.clientY, t: e.timeStamp }
    drag.current = { start: e.clientY, from: now, last: sample, prev: sample }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = panel.current
    if (!d || !el) return
    const raw = d.from + e.clientY - d.start
    // Down follows the finger; up resists, like pulling against the floor.
    offset.current = raw < 0 ? raw * 0.2 : raw
    el.style.transform = `translateY(${offset.current}px)`
    if (scrim.current) scrim.current.style.opacity = String(1 - Math.min(1, Math.max(0, offset.current) / el.offsetHeight))
    d.prev = d.last
    d.last = { y: e.clientY, t: e.timeStamp }
  }

  const onDragEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    const el = panel.current
    if (!d || !el) return
    drag.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
    const dt = d.last.t - d.prev.t
    const velocity = dt > 0 ? (d.last.y - d.prev.y) / dt : 0
    // Far enough, or flicked: let it go. The exit picks up from here.
    if (offset.current > el.offsetHeight * 0.3 || velocity > 0.5) {
      feedback('snap')
      flung.current = true
      onClose()
      return
    }
    const from = here()
    el.style.transform = ''
    if (scrim.current) scrim.current.style.opacity = ''
    if (reduced || offset.current === 0) return
    const timing = { duration: duration.base, easing: ease.seat }
    running.current = [
      el.animate([from.panel, { transform: 'none' }], timing),
      ...(scrim.current ? [scrim.current.animate([from.scrim, { opacity: 1 }], timing)] : []),
    ]
  }

  if (phase === 'closed') return null
  const closing = phase === 'closing'
  return (
    <div className={`fixed inset-0 z-50 flex items-end justify-center sm:items-center ${closing ? 'pointer-events-none' : ''}`}>
      <div ref={scrim} className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={shown.title}
        className={`relative flex max-h-[92vh] w-full flex-col rounded-t-3xl border border-line bg-bg shadow-2xl sm:rounded-3xl ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div
          className="touch-none select-none sm:touch-auto sm:select-auto"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          {/* A handle says the sheet can be pulled down; it's the header that does the work. */}
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
            <span className="h-1 w-9 rounded-full bg-muted/40" />
          </div>
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 pb-4 pt-2 sm:pt-4">
            <h2 className="text-lg font-semibold">{shown.title}</h2>
            <button className="btn btn-ghost min-h-[40px] px-3" onClick={onClose} aria-label="Close">
              <XIcon />
            </button>
          </header>
        </div>
        <div data-sheet-body className="hide-scroll flex-1 overflow-y-auto px-5 py-4">
          {shown.children}
        </div>
        {shown.footer && <footer className="border-t border-line px-5 py-3">{shown.footer}</footer>}
      </div>
    </div>
  )
}

/** The bottom-sheet layout — below Tailwind's `sm`. */
const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

/* ------------------------------------------------------------------- icons */

const ico = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

export const XIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
)
export const GearIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.63.7 1.09 1.35 1.09H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
)
export const SunIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
)
export const MoonIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
)
export const SystemIcon = () => (
  <svg {...ico} aria-hidden="true"><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 20h8" /></svg>
)
export const PlusIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
)
export const MinusIcon = () => (
  <svg {...ico} aria-hidden="true"><path d="M5 12h14" /></svg>
)
export const StarIcon = ({ filled = false, size = 20 }: { filled?: boolean; size?: number }) => (
  <svg {...ico} width={size} height={size} fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.4l6.1-.9Z" /></svg>
)
export const CopyIcon = () => (
  <svg {...ico} aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
)
export const ZoomIcon = () => (
  <svg {...ico} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6M11 8v6" /></svg>
)
export const ChevronIcon = ({ open = false }: { open?: boolean }) => (
  <svg {...ico} width={16} height={16} aria-hidden="true" className={open ? 'rotate-90 transition' : 'transition'}><path d="m9 5 7 7-7 7" /></svg>
)

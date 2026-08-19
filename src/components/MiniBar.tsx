import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import type { BarDef, CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import type { PreviewPos } from '../lib/settings'
import { BarbellSVG, SleeveThumb } from './BarbellSVG'

const MARGIN = 12
/** Clear of the sticky header. */
const TOP_LIMIT = 68
const BOTTOM_LIMIT = 12
/** Movement under this is a tap, not a drag. */
const DRAG_SLOP = 5

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

/**
 * A thumbnail of the loaded sleeve that stands in for the hero bar whenever it
 * is off screen. Drag it anywhere; it snaps back to whichever edge it was
 * nearest, AssistiveTouch style, and remembers where you left it.
 */
export function MiniBar({
  show,
  bar,
  plates,
  combo,
  collarKind,
  collarWidthMm,
  unit,
  total,
  pos,
  onMove,
  onClick,
  animate = true,
}: {
  show: boolean
  bar: BarDef
  plates: PlateDef[]
  combo: Combo | null
  collarKind: CollarKind | null
  collarWidthMm: number
  unit: Unit
  total: number
  pos: PreviewPos
  onMove: (pos: PreviewPos) => void
  onClick: () => void
  animate?: boolean
}) {
  const ref = useRef<HTMLButtonElement>(null)
  /**
   * Drag origin lives in refs, not state: a quick tap fires pointerdown and
   * pointerup in one tick, and a handler reading not-yet-flushed state would
   * leave the card stuck mid-drag.
   */
  const grab = useRef({ dx: 0, dy: 0 })
  const at = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const moved = useRef(false)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState(() => (typeof window === 'undefined' ? 800 : window.innerHeight))
  const [cardHeight, setCardHeight] = useState(120)

  useEffect(() => {
    const measure = () => {
      setViewport(window.innerHeight)
      if (ref.current) setCardHeight(ref.current.offsetHeight)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const parkedTop = clamp(pos.y * viewport, TOP_LIMIT, Math.max(TOP_LIMIT, viewport - cardHeight - BOTTOM_LIMIT))

  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el || !show) return
    const r = el.getBoundingClientRect()
    grab.current = { dx: e.clientX - r.left, dy: e.clientY - r.top }
    at.current = { x: r.left, y: r.top }
    dragging.current = true
    moved.current = false
    el.setPointerCapture?.(e.pointerId)
    setDrag({ x: r.left, y: r.top })
  }

  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!dragging.current || !el) return
    const x = clamp(e.clientX - grab.current.dx, MARGIN, window.innerWidth - el.offsetWidth - MARGIN)
    const y = clamp(e.clientY - grab.current.dy, TOP_LIMIT, window.innerHeight - el.offsetHeight - BOTTOM_LIMIT)
    if (Math.abs(x - at.current.x) + Math.abs(y - at.current.y) > DRAG_SLOP) moved.current = true
    at.current = { x, y }
    setDrag({ x, y })
  }

  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return
    dragging.current = false
    ref.current?.releasePointerCapture?.(e.pointerId)
    const width = ref.current?.offsetWidth ?? 0
    setDrag(null)
    if (!moved.current) return
    // Snap to whichever edge the card's middle ended up nearest.
    const side: PreviewPos['side'] = at.current.x + width / 2 < window.innerWidth / 2 ? 'left' : 'right'
    onMove({ side, y: at.current.y / window.innerHeight })
  }

  const style: CSSProperties = drag
    ? { left: drag.x, top: drag.y, right: 'auto' }
    : pos.side === 'left'
      ? { left: MARGIN, top: parkedTop, right: 'auto' }
      : { right: MARGIN, top: parkedTop, left: 'auto' }

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={() => {
        if (moved.current) return // that was a drag
        onClick()
      }}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      aria-label={`Currently loaded: ${fmt(total)} ${unit}. Drag to move, or activate to jump to the barbell.`}
      style={style}
      className={`fixed z-40 w-[150px] cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-xl backdrop-blur sm:w-[200px] ${
        drag ? 'cursor-grabbing scale-[1.03]' : animate ? 'transition-[opacity,transform,top,left,right] duration-200' : ''
      } ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'}`}
    >
      {/* Cropped to the stack itself — at this size the bare sleeve is wasted space. */}
      <div className="pointer-events-none h-[72px] px-1.5 pt-1.5 sm:h-[86px]">
        {combo ? (
          <SleeveThumb plates={plates} combo={combo} collarKind={collarKind} collarWidthMm={collarWidthMm} />
        ) : (
          <BarbellSVG
            bar={bar}
            plates={plates}
            combo={null}
            collarKind={collarKind}
            collarWidthMm={collarWidthMm}
            unit={unit}
            closeUp
            animate={false}
            className="block h-auto"
          />
        )}
      </div>
      <div className="pointer-events-none flex items-baseline justify-between gap-2 border-t border-line px-2.5 py-1.5">
        <span className="text-sm font-semibold tabular-nums">
          {fmt(total)} {unit}
        </span>
        <span className="text-[11px] text-muted tabular-nums">
          {combo ? `${fmt(combo.perSide)}/side` : 'bar only'}
        </span>
      </div>
    </button>
  )
}

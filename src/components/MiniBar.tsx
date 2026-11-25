import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { BarDef, CollarKind, PlateDef, Unit } from '../data/plates'
import { duration, ease, feedback, useReducedMotion } from '../feel'
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
/** Picked up, the card rises a little off the page. */
const LIFT = 1.03
/** Hidden, it waits just above where it parks. */
const HIDDEN_OFFSET = -8
/** How long a peek keeps the card up after a change made off screen. */
const PEEK_MS = 1600

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi)

/** The card's current on-screen offset — mid-transition included — from its computed `translate`. */
function currentOffset(el: HTMLElement): { x: number; y: number } {
  const [x = 0, y = 0] = getComputedStyle(el)
    .translate.split(' ')
    .map((v) => parseFloat(v) || 0)
  return { x, y }
}

/**
 * A thumbnail of the loaded sleeve that stands in for the hero bar whenever it
 * is off screen. Drag it anywhere; it springs back to whichever edge it was
 * nearest, AssistiveTouch style, and remembers where you left it.
 *
 * It is positioned entirely with `translate` (and lifted with `scale`), so the
 * snap to either edge animates on the compositor. While a finger is on it the
 * position is written straight to the element: a drag never re-renders React.
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
  loadable,
  pos,
  onMove,
  onClick,
  animate = true,
  peek,
}: {
  show: boolean
  bar: BarDef
  plates: PlateDef[]
  combo: Combo | null
  collarKind: CollarKind | null
  collarWidthMm: number
  unit: Unit
  total: number
  /** False when the target can't be built — the preview must not pretend it is on the bar. */
  loadable: boolean
  pos: PreviewPos
  onMove: (pos: PreviewPos) => void
  onClick: () => void
  animate?: boolean
  /** Bump this to show the card briefly even when `show` is false — a change made while the bar is off screen. */
  peek?: number
}) {
  const ref = useRef<HTMLButtonElement>(null)
  const reduced = useReducedMotion()
  const still = !animate || reduced
  /**
   * Drag origin lives in refs, not state: a quick tap fires pointerdown and
   * pointerup in one tick, and a handler reading not-yet-flushed state would
   * leave the card stuck mid-drag.
   */
  const grab = useRef({ dx: 0, dy: 0 })
  const at = useRef({ x: 0, y: 0 })
  const dragging = useRef(false)
  const moved = useRef(false)
  /** Until this time the spring to an edge is in flight; a re-render must not swap its curve. */
  const snapUntil = useRef(0)
  const placed = useRef(false)
  const [viewport, setViewport] = useState(() =>
    typeof window === 'undefined' ? { w: 400, h: 800 } : { w: window.innerWidth, h: window.innerHeight },
  )
  const [card, setCard] = useState({ w: 150, h: 120 })

  // A peek: shown for a moment, then back to whatever `show` says.
  const [peeking, setPeeking] = useState(false)
  const [lastPeek, setLastPeek] = useState(peek)
  if (peek !== lastPeek) {
    setLastPeek(peek)
    setPeeking(true)
  }
  useEffect(() => {
    if (!peeking) return
    const t = window.setTimeout(() => setPeeking(false), PEEK_MS)
    return () => window.clearTimeout(t)
  }, [peeking, peek])
  const visible = show || peeking

  useEffect(() => {
    const measure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight })
      if (ref.current) setCard({ w: ref.current.offsetWidth, h: ref.current.offsetHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const parkedX = pos.side === 'left' ? MARGIN : Math.max(MARGIN, viewport.w - card.w - MARGIN)
  const parkedY = clamp(pos.y * viewport.h, TOP_LIMIT, Math.max(TOP_LIMIT, viewport.h - card.h - BOTTOM_LIMIT))

  const restingTransition = (opacityOnly: boolean) =>
    opacityOnly
      ? `opacity ${duration.base}ms ${ease.out}`
      : `translate ${duration.base}ms ${ease.out}, transform ${duration.base}ms ${ease.out}, opacity ${duration.base}ms ${ease.out}, scale ${duration.quick}ms ${ease.out}`

  // Park it — on mount without motion, afterwards with the house curve (or
  // still, under reduced motion). A spring already on its way is left alone.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || dragging.current) return
    const first = !placed.current
    placed.current = true
    if (performance.now() >= snapUntil.current) el.style.transition = first ? 'none' : restingTransition(still)
    el.style.translate = `${parkedX}px ${parkedY}px`
    el.style.scale = '1'
    el.style.transform = visible ? 'none' : `translateY(${HIDDEN_OFFSET}px)`
    el.style.opacity = visible ? '1' : '0'
  }, [parkedX, parkedY, visible, still])

  const down = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el || !visible) return
    // Start from where it is on screen right now, mid-spring if need be — and
    // stop the spring there, so the card never jumps under the finger.
    const { x, y } = currentOffset(el)
    snapUntil.current = 0
    el.style.transition = `scale ${duration.quick}ms ${ease.out}, opacity ${duration.base}ms ${ease.out}`
    el.style.translate = `${x}px ${y}px`
    grab.current = { dx: e.clientX - x, dy: e.clientY - y }
    at.current = { x, y }
    dragging.current = true
    moved.current = false
    el.setPointerCapture?.(e.pointerId)
  }

  const move = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!dragging.current || !el) return
    const x = clamp(e.clientX - grab.current.dx, MARGIN, window.innerWidth - el.offsetWidth - MARGIN)
    const y = clamp(e.clientY - grab.current.dy, TOP_LIMIT, window.innerHeight - el.offsetHeight - BOTTOM_LIMIT)
    if (!moved.current && Math.abs(x - at.current.x) + Math.abs(y - at.current.y) <= DRAG_SLOP) return
    if (!moved.current) {
      // A real drag, not a tap: only now does it lift, so a tap never flickers.
      moved.current = true
      if (!still) el.style.scale = String(LIFT)
      el.style.cursor = 'grabbing'
    }
    at.current = { x, y }
    el.style.translate = `${x}px ${y}px`
  }

  const up = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!dragging.current || !el) return
    dragging.current = false
    el.releasePointerCapture?.(e.pointerId)
    el.style.cursor = ''
    if (!moved.current) {
      // A tap: put it back exactly as it was parked.
      el.style.transition = restingTransition(still)
      el.style.translate = `${parkedX}px ${parkedY}px`
      return
    }
    // Snap to whichever edge the card's middle ended up nearest — springing
    // there on its own, then telling the app where it now lives.
    const side: PreviewPos['side'] = at.current.x + el.offsetWidth / 2 < window.innerWidth / 2 ? 'left' : 'right'
    const x = side === 'left' ? MARGIN : Math.max(MARGIN, window.innerWidth - el.offsetWidth - MARGIN)
    const y = at.current.y
    if (still) {
      el.style.transition = 'none'
    } else {
      snapUntil.current = performance.now() + duration.settle
      el.style.transition = `translate ${duration.settle}ms ${ease.seat}, scale ${duration.quick}ms ${ease.out}, opacity ${duration.base}ms ${ease.out}`
    }
    el.style.translate = `${x}px ${y}px`
    el.style.scale = '1'
    feedback('snap')
    onMove({ side, y: y / window.innerHeight })
  }

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onClick={() => {
        // A drag ends in a click too. Swallow it — once, so Enter and Space
        // still work from the keyboard afterwards.
        if (moved.current) {
          moved.current = false
          return
        }
        onClick()
      }}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      aria-label={`${loadable ? 'Currently loaded' : 'Can’t load'}: ${fmt(total)} ${unit}. Drag to move, or activate to jump to the barbell.`}
      style={{ left: 0, top: 0 }}
      className={`fixed z-40 w-[150px] cursor-grab touch-none select-none overflow-hidden rounded-2xl border border-line bg-surface/95 opacity-0 shadow-xl backdrop-blur will-change-transform sm:w-[200px] ${
        visible ? '' : 'pointer-events-none'
      }`}
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
          {!loadable ? <span className="text-bad">can’t load</span> : combo?.plates.length ? `${fmt(combo.perSide)}/side` : 'bar only'}
        </span>
      </div>
    </button>
  )
}

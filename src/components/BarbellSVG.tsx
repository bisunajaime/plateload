/**
 * The hero: a full barbell drawn in millimetres, plates mirrored on both sleeves.
 *
 * Coordinate system is the bar itself — x runs 0 … bar.lengthMm, y is centred on
 * the shaft axis, everything is a real dimension. Nothing here invents a size.
 */
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { BarDef, CollarKind, PlateDef, Unit } from '../data/plates'
import { duration, ease, feedback, stagger } from '../feel'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { diffStack, enterDelays, stackKey } from '../lib/stack'
import { CollarProfile, PlateDefs, PlateProfile } from './PlateSVG'

/** How long plates coming off get before new ones start going on. */
const CLEAR_MS = stagger.plate * 2
/** The moment in a plate's travel when it hits the stack — where the spring first reaches home. */
const SEAT_AT = Math.round(duration.settle * 0.45)

export interface BarbellSVGProps {
  bar: BarDef
  /** Definitions for the active brand/unit, for id → geometry lookup. */
  plates: PlateDef[]
  combo: Combo | null
  collarKind: CollarKind | null
  collarWidthMm: number
  unit: Unit
  showLabels?: boolean
  /** Zoom in on a single sleeve. */
  closeUp?: boolean
  /** Ceiling on the drawn height, applied as a width cap at the drawing's own
   *  aspect. The close-up is nearly square, so on a wide card it would
   *  otherwise swallow the fold. Scales with zoom so the magnifier still
   *  does something. */
  maxHeightPx?: number
  animate?: boolean
  className?: string
  /** Extra horizontal magnification; the container scrolls. */
  zoom?: number
  /** With closeUp: frame only the sleeve and its plates — no floor, no air
   *  above — so a small drawing still shows the plates big. */
  tight?: boolean
  /** The target can't be built: the drawing says so, not just the text under it. */
  unloadable?: boolean
  /** Changes whenever the target does — so a second unloadable weight still answers. */
  loadId?: string | number
  /** Sound and haptics as plates go on and off. Only the hero bar does this. */
  feedback?: boolean
}

interface Instance {
  plate: PlateDef
  /** Inner edge, mm from the bar's left end. */
  x: number
  index: number
  runningTotal: number
}

export function BarbellSVG({
  bar,
  plates,
  combo,
  collarKind,
  collarWidthMm,
  unit,
  showLabels = false,
  closeUp = false,
  maxHeightPx,
  animate = true,
  className,
  zoom = 1,
  tight = false,
  unloadable = false,
  loadId,
  feedback: respond = false,
}: BarbellSVGProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const L = bar.lengthMm
  const sleeve = bar.sleeveMm
  const shaftStart = sleeve + 14
  const shaftEnd = L - sleeve - 14

  const byId = useMemo(() => new Map(plates.map((p) => [p.id, p])), [plates])

  const { instances, used } = useMemo(() => {
    const list: Instance[] = []
    let x = shaftEnd
    let total = 0
    let i = 0
    for (const p of combo?.plates ?? []) {
      const def = byId.get(p.id)
      if (!def) continue
      for (let c = 0; c < p.count; c++) {
        total += def.weight
        list.push({ plate: def, x, index: i++, runningTotal: total })
        x += def.thicknessMm
      }
    }
    return { instances: list, used: x - shaftEnd }
  }, [combo, byId, shaftEnd])

  const sleeveState = useSleeve(instances, animate)
  const rig = useRef<SVGGElement>(null)

  // Plates going on and coming off: a thunk as each one seats, and the bar
  // takes the weight with a small dip once the last one lands.
  const change = sleeveState.change
  useEffect(() => {
    if (!change) return
    const { entering, exiting, delays } = change
    if (respond && exiting.length) feedback('unseat')
    if (!entering.length) return
    let last = 0
    // The next change cancels whatever of this one hasn't landed yet: a plate
    // replaced mid-flight never thunks.
    const pending = entering.map((inst, i) => {
      const at = (delays[i] ?? 0) + SEAT_AT
      last = Math.max(last, at)
      return respond ? feedback('seat', { delay: at, size: Math.min(1, inst.plate.thicknessMm / 70) }) : () => {}
    })
    const dip = animate
      ? rig.current?.animate(
          [{ transform: 'translateY(0)' }, { transform: 'translateY(7px)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }],
          { duration: duration.base, delay: last, easing: ease.out },
        )
      : undefined
    return () => {
      pending.forEach((cancel) => cancel())
      dip?.cancel()
    }
  }, [change, respond, animate])

  // A weight the plates can't make: the empty sleeve shakes its head. Only
  // when the weight actually changes to it — not on first paint (a page that
  // opens on an impossible weight just shows it), and not on a remount.
  const shownLoad = useRef(loadId)
  useEffect(() => {
    if (loadId === shownLoad.current) return
    shownLoad.current = loadId
    if (!unloadable || loadId === undefined) return
    if (respond) feedback('cantLoad')
    if (!animate) return
    const a = rig.current?.animate(
      [0, -10, 9, -6, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: duration.settle, easing: ease.out },
    )
    return () => a?.cancel()
  }, [unloadable, loadId, respond, animate])

  const collarX = shaftEnd + used
  const collarFits = collarKind ? collarX + collarWidthMm <= L - 6 : true

  // A fixed frame per view, so the drawing never re-zooms as plates come and go.
  const crop = closeUp && tight
  const top = crop ? -245 : -300
  const height = crop ? 490 : 640
  const vbWidth = crop ? L - shaftEnd + 40 : closeUp ? L - shaftEnd + 230 : L + 40
  const viewBox = `${crop ? shaftEnd - 30 : closeUp ? shaftEnd - 190 : -20} ${top} ${vbWidth} ${height}`
  // Cap the width, not the height: a shorter box than the drawing's own aspect
  // would letterbox it, and the platform floor clips to the viewport rather
  // than to the drawing, so the dead space lands all on one side.
  const capPx = maxHeightPx ? maxHeightPx * (vbWidth / height) * Math.max(1, zoom) : undefined

  const sleeveY = 26
  const shaftY = bar.shaftMm / 2

  const knurlBands: [number, number][] = [
    [shaftStart + 40, shaftStart + 240],
    [shaftEnd - 240, shaftEnd - 40],
  ]
  if (bar.centerKnurl) knurlBands.push([L / 2 - 60, L / 2 + 60])

  const ringOffsets = bar.ringColor ? [shaftStart + 415, shaftEnd - 415] : []

  return (
    <svg
      className={className}
      viewBox={viewBox}
      style={{
        width: `${Math.max(100, zoom * 100)}%`,
        maxWidth: capPx ? `${capPx}px` : undefined,
      }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        unloadable
          ? 'Empty barbell — your plates can’t make this weight'
          : combo && combo.plates.length
            ? `Barbell loaded with ${combo.plates.map((p) => `${p.count} times ${fmt(p.weight)} ${unit}`).join(', ')} each side`
            : 'Empty barbell'
      }
    >
      <PlateDefs uid={uid} />
      <defs>
        <linearGradient id={`${uid}-floor`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--ink))" stopOpacity="0.16" />
          <stop offset="1" stopColor="rgb(var(--ink))" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${uid}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="0.42" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* platform line + contact shadow */}
      <ellipse cx={L / 2} cy={268} rx={L * 0.44} ry={26} fill={`url(#${uid}-shadow)`} />
      {!closeUp && <rect x={-40} y={272} width={L + 80} height={110} fill={`url(#${uid}-floor)`} />}
      <line x1={-40} y1={272} x2={L + 80} y2={272} stroke="rgb(var(--ink))" strokeOpacity="0.18" strokeWidth="2" />

      <g ref={rig}>
      {/* ------------------------------------------------------------- the bar */}
      <g>
        {/* sleeves */}
        {[0, L - sleeve - 14].map((sx, i) => (
          <g key={i}>
            <rect x={sx} y={-sleeveY} width={sleeve + 14} height={sleeveY * 2} rx={5} fill={`url(#${uid}-bar)`} />
            {[0.2, 0.4, 0.6, 0.8].map((f) => (
              <rect key={f} x={sx + (sleeve + 14) * f} y={-sleeveY} width={2} height={sleeveY * 2} fill="#000" opacity="0.14" />
            ))}
          </g>
        ))}
        {/* shaft */}
        <rect x={shaftStart - 2} y={-shaftY} width={shaftEnd - shaftStart + 4} height={shaftY * 2} rx={shaftY} fill={`url(#${uid}-bar)`} />
        {/* collar stops */}
        {[shaftStart - 14, shaftEnd + 2].map((fx) => (
          <rect key={fx} x={fx} y={-34} width={12} height={68} rx={3} fill={`url(#${uid}-bar)`} stroke="#000" strokeOpacity="0.25" strokeWidth="0.8" />
        ))}
        {/* knurling */}
        {knurlBands.map(([a, b], bi) => (
          <g key={bi} opacity="0.55">
            {Array.from({ length: Math.floor((b - a) / 7) }, (_, k) => (
              <line key={k} x1={a + k * 7} y1={-shaftY + 1} x2={a + k * 7 + 4} y2={shaftY - 1} stroke="#101215" strokeWidth="1.1" />
            ))}
          </g>
        ))}
        {/* IWF / IPF marking rings */}
        {ringOffsets.map((rx, i) => (
          <rect key={i} x={rx - 2} y={-shaftY} width={4} height={shaftY * 2} fill={bar.ringColor} opacity="0.9" />
        ))}
      </g>

      {/* ------------------------------------------------------------- plates */}
      {[1, -1].map((side) => (
        <g key={side} transform={side === -1 ? `translate(${L} 0) scale(-1 1)` : undefined}>
          {sleeveState.leaving.map(({ inst, gen, order }) => (
            <Slot key={`off-${gen}-${inst.index}-${inst.plate.id}`} x={inst.x} animate={animate}>
              <g className="plate-out" style={{ animationDelay: `${order * stagger.plate}ms` }}>
                <PlateProfile plate={inst.plate} x={0} uid={uid} detail="full" />
              </g>
            </Slot>
          ))}
          {instances.map((inst) => (
            <Slot key={stackKey(inst.index, inst.plate.id)} x={inst.x} animate={animate} enterDelay={sleeveState.delayOf(inst)}>
              <PlateProfile plate={inst.plate} x={0} uid={uid} detail="full" />
            </Slot>
          ))}
          {collarKind && collarFits && (
            <Slot
              key={`collar-${collarKind}`}
              x={collarX}
              animate={animate}
              enterDelay={instances.length * stagger.plate}
              glideDelay={sleeveState.change?.exiting.length ? CLEAR_MS : 0}
            >
              <CollarProfile kind={collarKind} x={0} widthMm={collarWidthMm} uid={uid} />
            </Slot>
          )}
          {/* Nothing fits: a dashed outline where the first plate would go. */}
          {unloadable && (
            <rect
              className={animate ? 'fade-up' : undefined}
              x={collarX + (collarKind && collarFits ? collarWidthMm : 0) + 8}
              y={-200}
              width={56}
              height={400}
              rx={10}
              fill="none"
              stroke="rgb(var(--bad))"
              strokeOpacity="0.55"
              strokeWidth="3"
              strokeDasharray="14 12"
            />
          )}
        </g>
      ))}
      </g>

      {/* ------------------------------------------------------------- labels */}
      {showLabels &&
        instances.map((inst) => (
          <g key={`lab-${inst.index}`}>
            <text
              x={inst.x + inst.plate.thicknessMm / 2}
              y={-inst.plate.diameterMm / 2 - 16}
              textAnchor="middle"
              fontSize="30"
              fontWeight="700"
              fill="rgb(var(--ink))"
            >
              {fmt(inst.plate.weight)}
            </text>
            <text
              x={L - inst.x - inst.plate.thicknessMm / 2}
              y={-inst.plate.diameterMm / 2 - 16}
              textAnchor="middle"
              fontSize="30"
              fontWeight="700"
              fill="rgb(var(--ink))"
            >
              {fmt(inst.plate.weight)}
            </text>
          </g>
        ))}
      {showLabels && instances.length > 0 && (
        <text x={L} y={252} textAnchor="end" fontSize="36" fontWeight="700" fill="rgb(var(--muted))">
          {fmt(instances[instances.length - 1].runningTotal)} {unit} a side
        </text>
      )}

    </svg>
  )
}

/**
 * A plate's place on the sleeve. The outer group carries the position and
 * glides when it changes; the inner one plays the slide-on once, with the
 * delay it was born with — changing an animation's delay later would rewind
 * a plate that had already landed.
 */
function Slot({
  x,
  animate,
  enterDelay,
  glideDelay = 0,
  children,
}: {
  x: number
  animate: boolean
  enterDelay?: number
  /** Hold the glide back — the collar waits for leaving plates to clear before it slides in. */
  glideDelay?: number
  children: ReactNode
}) {
  const [delay] = useState(enterDelay)
  return (
    <g
      className={animate ? 'plate-glide' : undefined}
      style={{ transform: `translateX(${x}px)`, transitionDelay: glideDelay ? `${glideDelay}ms` : undefined }}
    >
      {delay === undefined ? (
        children
      ) : (
        <g
          className={animate ? 'plate-anim' : undefined}
          style={animate ? ({ animationDelay: `${delay}ms`, ['--slide' as string]: '150px' } as CSSProperties) : undefined}
        >
          {children}
        </g>
      )}
    </g>
  )
}

interface Leaving {
  inst: Instance
  gen: number
  /** 0 = outermost: the first to come off. */
  order: number
}

interface SleeveChange {
  entering: Instance[]
  /** When each entering plate starts, ms — same order as `entering`. */
  delays: number[]
  exiting: Instance[]
}

/**
 * Follows the stack from load to load: which plates are new (and when each
 * starts moving), which stay, and which are on their way off — kept drawn
 * just long enough to leave.
 */
function useSleeve(instances: Instance[], animate: boolean) {
  const keys = instances.map((i) => stackKey(i.index, i.plate.id))
  const sig = keys.join('|')
  const [state, setState] = useState(() => ({
    sig,
    instances,
    gen: 0,
    delays: enterDelays(diffStack([], keys), stagger.plate, 0),
    leaving: [] as Leaving[],
    /** Plates still waiting out their delay — not yet visibly on the bar. */
    waiting: new Set<string>(),
    change: null as SleeveChange | null,
  }))

  // Derived during render, so the new plates and the leaving ones arrive in the same frame.
  if (sig !== state.sig) {
    const prevKeys = state.instances.map((i) => stackKey(i.index, i.plate.id))
    const diff = diffStack(prevKeys, keys)
    const delays = enterDelays(diff, stagger.plate, CLEAR_MS)
    const gen = state.gen + 1
    const byKey = new Map(state.instances.map((i) => [stackKey(i.index, i.plate.id), i]))
    // A plate that never got moving has nothing to take off: no ghost for it.
    const exiting = diff.exiting.filter((k) => !state.waiting.has(k)).map((k) => byKey.get(k)!).filter(Boolean)
    const entering = instances.filter((i) => delays.has(stackKey(i.index, i.plate.id)))
    const waiting = new Set([...diff.staying.filter((k) => state.waiting.has(k)), ...[...delays].filter(([, d]) => d > 0).map(([k]) => k)])
    setState({
      sig,
      instances,
      gen,
      delays,
      // Only the last couple of changes' leavers are still on screen; a held
      // stepper must not pile up hundreds of departing plates.
      leaving: animate ? [...state.leaving.filter((l) => l.gen >= gen - 1), ...exiting.map((inst, order) => ({ inst, gen, order }))] : [],
      waiting,
      change: {
        entering,
        delays: entering.map((i) => delays.get(stackKey(i.index, i.plate.id)) ?? 0),
        exiting,
      },
    })
  }

  // Each change clears its own leavers once they're off, on its own clock —
  // a newer change never postpones an older one's cleanup.
  const timers = useRef(new Set<number>())
  useEffect(() => {
    const live = timers.current
    return () => live.forEach((t) => window.clearTimeout(t))
  }, [])
  const { gen } = state
  const lastStart = Math.max(0, ...state.delays.values())
  const anyWaiting = state.waiting.size > 0
  useEffect(() => {
    const live = timers.current
    const gone = window.setTimeout(() => {
      live.delete(gone)
      setState((s) => (s.leaving.some((l) => l.gen === gen) ? { ...s, leaving: s.leaving.filter((l) => l.gen !== gen) } : s))
    }, duration.settle)
    live.add(gone)
    if (!anyWaiting) return
    const started = window.setTimeout(() => {
      live.delete(started)
      setState((s) => (s.gen === gen ? { ...s, waiting: new Set<string>() } : s))
    }, lastStart)
    live.add(started)
  }, [gen, lastStart, anyWaiting])

  const delayOf = (inst: Instance) => state.delays.get(stackKey(inst.index, inst.plate.id)) ?? 0
  return { leaving: state.leaving, change: state.change, delayOf }
}

/** One sleeve, no bar furniture — for combination cards. */
export function SleeveThumb({
  plates,
  combo,
  collarKind,
  collarWidthMm,
}: {
  plates: PlateDef[]
  combo: Combo
  collarKind: CollarKind | null
  collarWidthMm: number
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const byId = useMemo(() => new Map(plates.map((p) => [p.id, p])), [plates])
  const list: { def: PlateDef; x: number }[] = []
  let x = 30
  for (const p of combo.plates) {
    const def = byId.get(p.id)
    if (!def) continue
    for (let c = 0; c < p.count; c++) {
      list.push({ def, x })
      x += def.thicknessMm
    }
  }
  // Crop tight to the loaded stack — a card thumbnail is about the plates.
  const width = Math.max(210, x + collarWidthMm + 26)
  return (
    <svg viewBox={`0 -250 ${width} 500`} className="h-full w-full" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <PlateDefs uid={uid} />
      <rect x={0} y={-26} width={width} height={52} rx={5} fill={`url(#${uid}-bar)`} />
      <rect x={16} y={-38} width={12} height={76} rx={3} fill={`url(#${uid}-bar)`} />
      {list.map((p, i) => (
        <PlateProfile key={i} plate={p.def} x={p.x} uid={uid} detail="lite" />
      ))}
      {collarKind && <CollarProfile kind={collarKind} x={x} widthMm={collarWidthMm} uid={uid} />}
    </svg>
  )
}

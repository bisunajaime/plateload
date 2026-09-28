import { useEffect, useMemo, useRef, useState } from 'react'
import { BarbellSVG } from '../components/BarbellSVG'
import { COLLARS, IWF, type PlateDef } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { applyBrand, defaultSettings, resolveLoadout } from '../lib/settings'
import { prefersReducedMotion } from '../hooks/useSettings'
import { clamp, passProgress, pinnedProgress, useCountUp, useScrollFrame } from './useScroll'

/* ------------------------------------------------------------ loading bay */

/** Heaviest in, as a lifter would load it: every IWF colour on its way to 230. */
const SEQUENCE = [25, 25, 20, 15, 10, 5, 2.5]

/** The first `n` plates of the sequence, as the combination the bar renderer draws. */
function comboOf(n: number, byWeight: Map<number, PlateDef>): Combo {
  const groups: Combo['plates'] = []
  for (const w of SEQUENCE.slice(0, n)) {
    const def = byWeight.get(w)!
    const last = groups[groups.length - 1]
    if (last && last.id === def.id) last.count++
    else groups.push({ id: def.id, weight: w, count: 1, thicknessMm: def.thicknessMm, kind: def.kind })
  }
  const perSide = SEQUENCE.slice(0, n).reduce((a, b) => a + b, 0)
  return {
    id: `stage-${n}`,
    plates: groups,
    perSide,
    plateCount: n,
    changeCount: groups.filter((g) => g.kind !== 'bumper').reduce((a, g) => a + g.count, 0),
    sleeveMm: groups.reduce((a, g) => a + g.thicknessMm * g.count, 0),
    overCapacity: false,
    competitionLegal: true,
  }
}

/**
 * A pinned barbell that loads as you scroll: one plate a side per step, the
 * scoreboard counting up with it. Scrolling back up strips the bar again.
 */
export function LoadingBay() {
  const settings = useMemo(() => ({ ...applyBrand(defaultSettings(), 'eleiko'), closeUp: false }), [])
  const loadout = useMemo(() => resolveLoadout(settings), [settings])
  const byWeight = useMemo(() => new Map(loadout.plates.map((p) => [p.weight, p])), [loadout.plates])
  const stages = useMemo(() => SEQUENCE.map((_, i) => comboOf(i + 1, byWeight)), [byWeight])

  const trackRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [stage, setStage] = useState(0)
  const [animate] = useState(() => !prefersReducedMotion())

  useScrollFrame(() => {
    const el = trackRef.current
    if (!el) return
    const p = pinnedProgress(el)
    railRef.current?.style.setProperty('--p', String(p))
    // The first and last slivers of the pin hold the bare and the full bar.
    const next = Math.round(clamp((p - 0.06) / 0.84) * SEQUENCE.length)
    setStage((s) => (s === next ? s : next))
  })

  const combo = stage > 0 ? stages[stage - 1] : null
  const total = loadout.base + (combo ? combo.perSide * 2 : 0)
  const shown = useCountUp(total)
  const added = stage > 0 ? byWeight.get(SEQUENCE[stage - 1]) : null

  return (
    <section ref={trackRef} className="bay" aria-label="A bar loading as you scroll">
      <div className="bay-pin">
        <div className="mx-auto flex h-full max-w-6xl flex-col justify-center px-4 sm:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="eyebrow">{stage === SEQUENCE.length ? 'Bar loaded' : 'Keep scrolling'}</p>
              <h2 className="mt-4 max-w-xl font-display text-[34px] font-bold leading-[1.02] tracking-tight text-white sm:text-5xl">
                Heaviest in. <span className="text-white/40">Lightest out.</span>
              </h2>
            </div>
            <div className="flex items-baseline gap-2 lg:justify-end" aria-live="polite" aria-atomic="true">
              <span className="font-cond text-[72px] font-extrabold leading-[0.85] tabular-nums text-white sm:text-[104px]">
                {fmt(Math.round(shown * 2) / 2)}
              </span>
              <span className="font-cond text-2xl font-semibold uppercase text-white/50">kg</span>
            </div>
          </div>

          <div className="bay-stage mt-6">
            <BarbellSVG
              bar={loadout.bar}
              plates={loadout.plates}
              combo={combo}
              collarKind={settings.collarKind}
              collarWidthMm={COLLARS[settings.collarKind].widthMm}
              unit="kg"
              animate={animate}
              className="block h-auto w-full"
            />
          </div>

          <div className="mt-4 flex min-h-[28px] items-center justify-center gap-2 font-cond text-lg font-semibold uppercase tracking-[0.16em] text-white/70">
            {added ? (
              <span key={stage} className="bay-added">
                <span className="bay-swatch" style={{ background: added.color }} />+ {fmt(added.weight)} kg a side
              </span>
            ) : (
              <span className="text-white/45">Bar and collars · {fmt(loadout.base)} kg</span>
            )}
          </div>

          {/* One marker per plate — they fill as the bar loads. */}
          <div ref={railRef} className="bay-rail mx-auto mt-5 w-full max-w-xl" aria-hidden="true">
            <div className="bay-rail-fill" />
            {SEQUENCE.map((w, i) => {
              const def = byWeight.get(w)
              return (
                <span
                  key={i}
                  className={`bay-mark ${i < stage ? 'is-on' : ''}`}
                  style={{ ['--plate' as string]: def?.color ?? '#888' }}
                >
                  {fmt(w)}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------- rolling plate */

/**
 * A bumper seen face-on, rolling across its section as you scroll: it turns
 * exactly as far as it travels, like a plate rolling across the platform.
 */
export function RollingPlate({
  weight,
  color,
  textColor = '#fff',
  size = 300,
  direction = 1,
  className = '',
}: {
  weight: string
  color: string
  textColor?: string
  size?: number
  direction?: 1 | -1
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useScrollFrame(() => {
    const el = ref.current
    const host = el?.parentElement
    if (!el || !host || prefersReducedMotion()) return
    const p = passProgress(host)
    const travel = Math.min(window.innerWidth, 1200) * 0.9
    const x = (p - 0.5) * travel * direction
    const turns = x / (size / 2) // radians rolled = distance / radius
    el.style.transform = `translate3d(${x}px, 0, 0) rotate(${turns}rad)`
  })

  return (
    <div ref={ref} className={`rolling-plate ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="-100 -100 200 200" width="100%" height="100%">
        <defs>
          <radialGradient id={`face-${weight}`} cx="0.38" cy="0.32" r="0.8">
            <stop offset="0" stopColor="#fff" stopOpacity="0.18" />
            <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="99" fill={color} />
        <circle r="99" fill={`url(#face-${weight})`} />
        <circle r="93" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="2.5" />
        <circle r="62" fill="none" stroke="#000" strokeOpacity="0.16" strokeWidth="1.5" />
        {/* Moulded lettering, top and bottom, so the roll reads. */}
        <text y="-66" textAnchor="middle" dominantBaseline="middle" fill={textColor} fontFamily="Unbounded, sans-serif" fontWeight="800" fontSize="24">
          {weight}
        </text>
        <text y="70" textAnchor="middle" dominantBaseline="middle" fill={textColor} fillOpacity="0.8" fontFamily="'Barlow Condensed', sans-serif" fontWeight="700" fontSize="15" letterSpacing="4">
          KG
        </text>
        <rect x="-78" y="-4" width="16" height="8" rx="2" fill="#000" fillOpacity="0.2" />
        <rect x="62" y="-4" width="16" height="8" rx="2" fill="#000" fillOpacity="0.2" />
        {/* Steel hub and bolts */}
        <circle r="34" fill="#b9bfc6" />
        <circle r="34" fill="none" stroke="#000" strokeOpacity="0.3" strokeWidth="1.5" />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2
          return <circle key={i} cx={Math.cos(a) * 26} cy={Math.sin(a) * 26} r="2.6" fill="#6b7078" />
        })}
        <circle r="15" fill="#0b0b0c" />
      </svg>
    </div>
  )
}

/* ---------------------------------------------------------------- marquee */

const MARQUEE: [string, string][] = [
  ['25', IWF.red],
  ['20', IWF.blue],
  ['15', IWF.yellow],
  ['10', IWF.green],
  ['5', IWF.white],
  ['2.5', IWF.red],
  ['1.25', '#B9BFC6'],
  ['45', IWF.blue],
  ['35', IWF.yellow],
]

/**
 * Plate weights drifting past. Scrolling throws them faster, and scrolling
 * back up runs them the other way, then they settle to a drift.
 */
export function ScrollMarquee() {
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track || prefersReducedMotion()) return
    let x = 0
    let lastY = window.scrollY
    let boost = 0
    let dir = 1
    let raf = 0
    let prev = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(64, now - prev)
      prev = now
      const dy = window.scrollY - lastY
      lastY = window.scrollY
      if (dy !== 0) dir = dy > 0 ? 1 : -1
      boost = boost * 0.92 + Math.min(40, Math.abs(dy)) * 0.9
      const half = track.scrollWidth / 2
      x -= dir * (0.03 * dt + boost * 0.12)
      if (half > 0) x = ((x % half) - half) % half // wrap into (−half, 0]
      track.style.transform = `translate3d(${x}px, 0, 0) skewX(${-dir * Math.min(12, boost * 0.25)}deg)`
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="marquee" aria-hidden="true">
      <div ref={trackRef} className="marquee-track">
        {Array.from({ length: 2 }, (_, k) => (
          <div key={k} className="flex shrink-0 items-center">
            {MARQUEE.map(([w, c], i) => (
              <span key={i} className="marquee-item">
                <span className="marquee-dot" style={{ background: c }} />
                {w}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

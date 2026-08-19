/**
 * The hero: a full barbell drawn in millimetres, plates mirrored on both sleeves.
 *
 * Coordinate system is the bar itself — x runs 0 … bar.lengthMm, y is centred on
 * the shaft axis, everything is a real dimension. Nothing here invents a size.
 */
import { useId, useMemo } from 'react'
import type { BarDef, CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { CollarProfile, PlateDefs, PlateProfile } from './PlateSVG'

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
  animate?: boolean
  className?: string
  /** Extra horizontal magnification; the container scrolls. */
  zoom?: number
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
  animate = true,
  className,
  zoom = 1,
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

  const collarX = shaftEnd + used
  const collarFits = collarKind ? collarX + collarWidthMm <= L - 6 : true

  const top = -300
  const height = 640
  const viewBox = closeUp
    ? `${shaftEnd - 190} ${top} ${L - shaftEnd + 230} ${height}`
    : `-20 ${top} ${L + 40} ${height}`

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
      style={{ width: `${Math.max(100, zoom * 100)}%` }}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={
        combo && combo.plates.length
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
      <rect x={-40} y={272} width={L + 80} height={110} fill={`url(#${uid}-floor)`} />
      <line x1={-40} y1={272} x2={L + 80} y2={272} stroke="rgb(var(--ink))" strokeOpacity="0.18" strokeWidth="2" />

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
          {instances.map((inst) => (
            <g
              key={`${side}-${inst.index}-${inst.plate.id}`}
              className={animate ? 'plate-anim' : undefined}
              style={
                animate
                  ? ({ animationDelay: `${inst.index * 55}ms`, ['--slide' as string]: '150px' } as React.CSSProperties)
                  : undefined
              }
            >
              <PlateProfile plate={inst.plate} x={inst.x} uid={uid} detail={closeUp ? 'full' : 'full'} />
            </g>
          ))}
          {collarKind && collarFits && (
            <g
              className={animate ? 'plate-anim' : undefined}
              style={animate ? ({ animationDelay: `${instances.length * 55}ms` } as React.CSSProperties) : undefined}
            >
              <CollarProfile kind={collarKind} x={collarX} widthMm={collarWidthMm} uid={uid} />
            </g>
          )}
        </g>
      ))}

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

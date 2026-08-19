/**
 * Plate profiles, drawn in millimetres.
 *
 * Everything renders as a side elevation — the way you see a loaded bar on a
 * rack — so a plate is a rim: thickness on x, diameter on y, centred on y = 0.
 * Consumers put these inside an SVG whose viewBox is also in millimetres.
 *
 * Eleiko and Metcon get genuinely different component sets:
 *   Eleiko  — competition disc: rounded shoulder, chrome hub, IWF lip, engraved numeral
 *   Metcon  — training bumper: square rubber shoulder, gloss–matte–gloss banding,
 *             roomy 50.4 mm insert, raised METCON wordmark
 */
import { memo } from 'react'
import type { PlateDef } from '../data/plates'

export interface PlateProfileProps {
  plate: PlateDef
  /** Inner edge of the plate on the sleeve, mm. */
  x: number
  /** Unique per-SVG prefix so gradient ids never collide. */
  uid: string
  /** Suppress lettering on tiny renders. */
  detail?: 'full' | 'lite'
  onClick?: () => void
}

const shade = (hex: string, amt: number) => {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt)))),
  )
  return `#${ch.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/* ---------------------------------------------------------------- shared defs */

export function PlateDefs({ uid }: { uid: string }) {
  return (
    <defs>
      {/* Cylindrical shading: light along the top of the disc, dark at the bottom. */}
      <linearGradient id={`${uid}-round`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.24" />
        <stop offset="0.16" stopColor="#fff" stopOpacity="0.08" />
        <stop offset="0.52" stopColor="#000" stopOpacity="0.04" />
        <stop offset="0.86" stopColor="#000" stopOpacity="0.24" />
        <stop offset="1" stopColor="#000" stopOpacity="0.42" />
      </linearGradient>
      {/* Gloss–matte–gloss across the rim width. */}
      <linearGradient id={`${uid}-gmg`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
        <stop offset="0.13" stopColor="#fff" stopOpacity="0.06" />
        <stop offset="0.28" stopColor="#000" stopOpacity="0.16" />
        <stop offset="0.72" stopColor="#000" stopOpacity="0.16" />
        <stop offset="0.87" stopColor="#fff" stopOpacity="0.06" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.22" />
      </linearGradient>
      <linearGradient id={`${uid}-chrome`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f6f8" />
        <stop offset="0.18" stopColor="#cfd5db" />
        <stop offset="0.42" stopColor="#8e969f" />
        <stop offset="0.58" stopColor="#b6bdc5" />
        <stop offset="0.8" stopColor="#6f767e" />
        <stop offset="1" stopColor="#9aa2ab" />
      </linearGradient>
      <linearGradient id={`${uid}-steel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e6eaee" />
        <stop offset="0.3" stopColor="#aeb6bf" />
        <stop offset="0.55" stopColor="#79818a" />
        <stop offset="0.75" stopColor="#a7aeb6" />
        <stop offset="1" stopColor="#5f666e" />
      </linearGradient>
      <linearGradient id={`${uid}-bar`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#eef1f4" />
        <stop offset="0.22" stopColor="#c2c9d0" />
        <stop offset="0.5" stopColor="#8d949c" />
        <stop offset="0.78" stopColor="#5c636b" />
        <stop offset="1" stopColor="#3d434a" />
      </linearGradient>
      <filter id={`${uid}-drop`} x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.35" />
      </filter>
    </defs>
  )
}

/* -------------------------------------------------------------------- Metcon */

const MetconBumper = ({ plate, x, uid, detail = 'full' }: PlateProfileProps) => {
  const t = plate.thicknessMm
  const r = plate.diameterMm / 2
  const insert = plate.insertMm
  const cx = x + t / 2
  const darkFace = plate.textColor === '#FFFFFF'
  const face = plate.color
  const lettering = plate.textColor
  const wide = t >= 34 && detail === 'full'
  const numeral = String(plate.weight)

  return (
    <g>
      {/* rubber body — square shoulders, small radius */}
      <rect x={x} y={-r} width={t} height={r * 2} rx={Math.min(7, t / 3)} fill={face} />
      <rect x={x} y={-r} width={t} height={r * 2} rx={Math.min(7, t / 3)} fill={`url(#${uid}-round)`} />
      <rect x={x} y={-r} width={t} height={r * 2} rx={Math.min(7, t / 3)} fill={`url(#${uid}-gmg)`} />
      {darkFace && (
        <rect x={x + 0.4} y={-r + 0.4} width={t - 0.8} height={r * 2 - 0.8} rx={Math.min(7, t / 3)} fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
      )}
      {/* matte centre band, textured */}
      <rect x={x + t * 0.26} y={-r + 2} width={t * 0.48} height={r * 2 - 4} fill="#000" opacity={darkFace ? 0.1 : 0.07} />
      {/* shoulder edge lines */}
      <rect x={x + 0.8} y={-r} width={0.9} height={r * 2} fill="#fff" opacity="0.2" />
      <rect x={x + t - 1.7} y={-r} width={0.9} height={r * 2} fill="#fff" opacity="0.14" />
      {/* Seen edge-on, the 50.4 mm steel insert only shows in the gap between
          plates — a roomy sliver of hardware at each face, not a band. */}
      <rect x={x - 1.4} y={-insert / 2 - 8} width={2.6} height={insert + 16} rx={1.2} fill={`url(#${uid}-steel)`} />
      <rect x={x + t - 1.2} y={-insert / 2 - 8} width={2.6} height={insert + 16} rx={1.2} fill={`url(#${uid}-steel)`} />
      <rect x={x} y={-insert / 2 - 10} width={t} height={insert + 20} fill="#000" opacity="0.08" />
      {/* raised lettering */}
      {wide && (
        <g transform={`rotate(-90 ${cx} ${-r * 0.52})`} pointerEvents="none">
          <text
            x={cx}
            y={-r * 0.52}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(t * 0.42, 22)}
            letterSpacing={Math.min(t * 0.06, 3)}
            fontWeight={800}
            fill={lettering}
            opacity="0.92"
          >
            METCON
          </text>
        </g>
      )}
      {detail === 'full' && (
        <g transform={`rotate(-90 ${cx} ${r * 0.5})`} pointerEvents="none">
          <text
            x={cx}
            y={r * 0.5 + 1.6}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(t * 0.72, 40)}
            fontWeight={800}
            fill="#000"
            opacity="0.28"
          >
            {numeral}
          </text>
          <text
            x={cx}
            y={r * 0.5}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(t * 0.72, 40)}
            fontWeight={800}
            fill={lettering}
          >
            {numeral}
          </text>
        </g>
      )}
    </g>
  )
}

/* -------------------------------------------------------------------- Eleiko */

const EleikoBumper = ({ plate, x, uid, detail = 'full' }: PlateProfileProps) => {
  const t = plate.thicknessMm
  const r = plate.diameterMm / 2
  const insert = plate.insertMm
  const cx = x + t / 2
  const face = plate.color
  const rim = shade(face, -0.28)
  const hubR = Math.min(r * 0.28, 62)

  return (
    <g>
      {/* disc with a generously rounded competition shoulder */}
      <rect x={x} y={-r} width={t} height={r * 2} rx={Math.min(t / 2, 16)} fill={face} />
      <rect x={x} y={-r} width={t} height={r * 2} rx={Math.min(t / 2, 16)} fill={`url(#${uid}-round)`} />
      {/* raised lip near the outer diameter */}
      <rect x={x + t * 0.16} y={-r + 1.2} width={t * 0.68} height={r * 2 - 2.4} rx={Math.min(t / 3, 10)} fill="none" stroke={rim} strokeWidth="1.6" opacity="0.65" />
      {/* thin colour rim edges */}
      <rect x={x} y={-r} width={1.4} height={r * 2} fill="#fff" opacity="0.26" />
      <rect x={x + t - 1.4} y={-r} width={1.4} height={r * 2} fill="#000" opacity="0.18" />
      {/* chrome hub, seen edge-on: proud of the rubber by a couple of millimetres */}
      <rect x={x} y={-hubR} width={t} height={hubR * 2} fill="#000" opacity="0.14" />
      <rect x={x - 2.2} y={-hubR} width={3.4} height={hubR * 2} rx={1.4} fill={`url(#${uid}-chrome)`} />
      <rect x={x + t - 1.2} y={-hubR} width={3.4} height={hubR * 2} rx={1.4} fill={`url(#${uid}-chrome)`} />
      <rect x={x - 2.4} y={-insert / 2} width={3.8} height={insert} rx={1} fill="#0b0c0e" opacity="0.8" />
      <rect x={x + t - 1.4} y={-insert / 2} width={3.8} height={insert} rx={1} fill="#0b0c0e" opacity="0.8" />
      {detail === 'full' && t >= 24 && (
        <g transform={`rotate(-90 ${cx} ${r * 0.56})`} pointerEvents="none">
          <text
            x={cx}
            y={r * 0.56}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(t * 0.6, 30)}
            fontWeight={700}
            letterSpacing="0.5"
            fill={plate.textColor}
            opacity="0.95"
          >
            {plate.weight}
          </text>
        </g>
      )}
    </g>
  )
}

const SteelDisc = ({ plate, x, uid, detail = 'full' }: PlateProfileProps) => {
  const t = plate.thicknessMm
  const r = plate.diameterMm / 2
  const insert = plate.insertMm
  const cx = x + t / 2
  const tinted = plate.color !== '#B9BFC6'

  return (
    <g>
      <rect x={x} y={-r} width={t} height={r * 2} rx={2.5} fill={`url(#${uid}-chrome)`} />
      {tinted && <rect x={x} y={-r} width={t} height={r * 2} rx={2.5} fill={plate.color} opacity="0.86" />}
      <rect x={x} y={-r} width={t} height={r * 2} rx={2.5} fill={`url(#${uid}-round)`} />
      {/* machined rings */}
      <rect x={x} y={-r * 0.72} width={t} height={1.1} fill="#000" opacity="0.2" />
      <rect x={x} y={r * 0.72} width={t} height={1.1} fill="#000" opacity="0.2" />
      <rect x={x - 1.2} y={-insert / 2 - 9} width={2.6} height={insert + 18} rx={1.2} fill={`url(#${uid}-steel)`} />
      <rect x={x + t - 1.2} y={-insert / 2 - 9} width={2.6} height={insert + 18} rx={1.2} fill={`url(#${uid}-steel)`} />
      {detail === 'full' && t >= 15 && (
        <g transform={`rotate(-90 ${cx} ${r * 0.44})`} pointerEvents="none">
          <text
            x={cx}
            y={r * 0.44}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(t * 0.62, 22)}
            fontWeight={700}
            fill={tinted ? plate.textColor : '#1a1c1f'}
            opacity="0.9"
          >
            {plate.weight}
          </text>
        </g>
      )}
    </g>
  )
}

export const PlateProfile = memo(function PlateProfile(props: PlateProfileProps) {
  const { plate } = props
  const body =
    plate.family === 'metcon-bumper' ? (
      <MetconBumper {...props} />
    ) : plate.family === 'eleiko-bumper' ? (
      <EleikoBumper {...props} />
    ) : (
      <SteelDisc {...props} />
    )
  return (
    <g role="img" aria-label={`${plate.weight} ${plate.unit} plate`} onClick={props.onClick}>
      {body}
    </g>
  )
})

/* ------------------------------------------------------------------ collars */

export interface CollarProfileProps {
  kind: 'eleiko-competition' | 'metcon-fastclip' | 'generic'
  x: number
  widthMm: number
  uid: string
}

export function CollarProfile({ kind, x, widthMm, uid }: CollarProfileProps) {
  if (kind === 'eleiko-competition') {
    const r = 78
    return (
      <g aria-label="Competition collar">
        <rect x={x} y={-r} width={widthMm} height={r * 2} rx={6} fill={`url(#${uid}-chrome)`} />
        <rect x={x} y={-r} width={widthMm} height={r * 2} rx={6} fill={`url(#${uid}-round)`} />
        <rect x={x + widthMm * 0.34} y={-r - 16} width={widthMm * 0.3} height={26} rx={4} fill="#2b2f34" />
        <rect x={x - 1} y={-26} width={widthMm + 2} height={52} rx={3} fill="#0b0c0e" opacity="0.7" />
      </g>
    )
  }
  if (kind === 'metcon-fastclip') {
    const r = 62
    return (
      <g aria-label="Metcon Fast Clip">
        <rect x={x} y={-r} width={widthMm} height={r * 2} rx={16} fill="#24262a" />
        <rect x={x} y={-r} width={widthMm} height={r * 2} rx={16} fill={`url(#${uid}-round)`} />
        <rect x={x + 0.6} y={-r + 0.6} width={widthMm - 1.2} height={r * 2 - 1.2} rx={15} fill="none" stroke="#fff" strokeOpacity="0.22" strokeWidth="1.3" />
        <rect x={x + widthMm * 0.2} y={-r - 12} width={widthMm * 0.6} height={20} rx={7} fill="#e03a2f" />
        <rect x={x - 1} y={-26} width={widthMm + 2} height={52} rx={3} fill="#0b0c0e" opacity="0.6" />
      </g>
    )
  }
  const r = 56
  return (
    <g aria-label="Gym clip">
      <rect x={x} y={-r} width={widthMm} height={r * 2} rx={10} fill="#3a3f45" />
      <rect x={x} y={-r} width={widthMm} height={r * 2} rx={10} fill={`url(#${uid}-round)`} />
      <rect x={x + 0.6} y={-r + 0.6} width={widthMm - 1.2} height={r * 2 - 1.2} rx={9} fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.3" />
      <rect x={x - 1} y={-26} width={widthMm + 2} height={52} rx={3} fill="#0b0c0e" opacity="0.6" />
    </g>
  )
}

import type { Unit } from '../data/plates'

export const KG_PER_LB = 0.45359237

export const lbToKg = (lb: number) => lb * KG_PER_LB
export const kgToLb = (kg: number) => kg / KG_PER_LB

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value
  return from === 'kg' ? kgToLb(value) : lbToKg(value)
}

/** Round to a sensible display precision and drop trailing zeros. */
export function fmt(n: number, maxDecimals = 2): string {
  if (!Number.isFinite(n)) return '—'
  const s = n.toFixed(maxDecimals)
  return s.replace(/\.?0+$/, '')
}

export const fmtWeight = (n: number, unit: Unit, maxDecimals = 2) => `${fmt(n, maxDecimals)} ${unit}`

/** The other unit, for the “≈” line next to the target. */
export function converted(value: number, unit: Unit): string {
  const other: Unit = unit === 'kg' ? 'lb' : 'kg'
  return `${fmt(convert(value, unit, other), 1)} ${other}`
}

export const roundTo = (n: number, step: number) => Math.round(n / step) * step

/** Nearest multiple of `step`, never below `min`. */
export function clampStep(n: number, step: number, min = 0): number {
  return Math.max(min, roundTo(n, step))
}

export const mm = (n: number) => `${Math.round(n)} mm`

export const pct = (n: number) => `${Math.round(n * 100)}%`

/** “45 + 45 + 10” from a plate list. */
export function platesLine(plates: { weight: number; count: number }[]): string {
  return plates.flatMap((p) => Array.from({ length: p.count }, () => fmt(p.weight))).join(' + ') || '—'
}

/** “2 × 25, 1 × 10” — compact form for long stacks. */
export function platesCompact(plates: { weight: number; count: number }[]): string {
  return plates.map((p) => (p.count > 1 ? `${p.count} × ${fmt(p.weight)}` : fmt(p.weight))).join(', ') || '—'
}

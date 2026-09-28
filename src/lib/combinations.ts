/**
 * PlateLoad combination engine.
 *
 * All arithmetic runs on integer milli-units (1 kg = 1000, 1 lb = 1000) so that
 * 2.5 + 1.25 never drifts, then on a gcd-scaled grid so the search space stays
 * tiny (an Eleiko kg set collapses to steps of 0.25 kg).
 *
 * Loading is always symmetric: we only ever solve for one side.
 */

import type { PlateDef, PlateKind, Unit } from '../data/plates'

export const MILLI = 1000
export const toMilli = (n: number) => Math.round(n * MILLI)
export const fromMilli = (n: number) => n / MILLI

export interface Denom {
  id: string
  weight: number
  milli: number
  /** Pairs available, i.e. floor(gymCount / 2). */
  maxPerSide: number
  kind: PlateKind
  thicknessMm: number
}

export interface ComboPlate {
  id: string
  weight: number
  count: number
  thicknessMm: number
  kind: PlateKind
}

export interface Combo {
  /** Stable identity for React keys and equality checks. */
  id: string
  /** Inside-out: heaviest first, which is the order you load the bar. */
  plates: ComboPlate[]
  perSide: number
  plateCount: number
  changeCount: number
  /** Sleeve length consumed per side, including the collar when fitted. */
  sleeveMm: number
  overCapacity: boolean
  /** True for the platform-standard stack (largest plates innermost). */
  competitionLegal: boolean
}

export type RankMode = 'recommended' | 'competition' | 'fewest' | 'compact' | 'inventory' | 'all'

export interface SolveInput {
  target: number
  unit: Unit
  /** Bar weight already expressed in `unit`. */
  bar: number
  collarsOn: boolean
  /** Per collar, in `unit`. */
  collarWeight: number
  collarWidthMm: number
  denoms: Denom[]
  sleeveMm: number
  /** Max combos returned after ranking. */
  limit?: number
}

export type SolveReason = 'ok' | 'below-bar' | 'no-plates' | 'not-divisible' | 'unreachable' | 'too-wide'

export interface SolveResult {
  ok: boolean
  reason: SolveReason
  /** target − bar − collars. */
  platesTotal: number
  perSide: number
  combos: Combo[]
  /** True when more combos existed than `limit`. */
  truncated: boolean
  totalFound: number
  nearestBelow: number | null
  nearestAbove: number | null
  /** Smallest reachable total strictly above the target. */
  smallestStep: number | null
}

/* ------------------------------------------------------------------ helpers */

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b]
  return a
}

export function denomsFromPlates(plates: PlateDef[], inventory: Record<string, number>, includeChange = true): Denom[] {
  return plates
    .filter((p) => includeChange || p.kind === 'bumper')
    .map((p) => ({
      id: p.id,
      weight: p.weight,
      milli: toMilli(p.weight),
      maxPerSide: Math.floor((inventory[p.id] ?? 0) / 2),
      kind: p.kind,
      thicknessMm: p.thicknessMm,
    }))
    .filter((d) => d.maxPerSide > 0 && d.milli > 0)
    .sort((a, b) => b.milli - a.milli)
}

/** Bar + collars, in the input's unit. */
export function baseWeight(input: Pick<SolveInput, 'bar' | 'collarsOn' | 'collarWeight'>): number {
  return input.bar + (input.collarsOn ? input.collarWeight * 2 : 0)
}

/* ------------------------------------------------------------ reachability */

interface Reach {
  /** Grid step in milli-units. */
  step: number
  /** reach[i] === 1 when i * step milli is a reachable per-side load. */
  bits: Uint8Array
  maxMilli: number
}

/** Bounded-knapsack reachability over per-side loads. */
export function reachablePerSide(denoms: Denom[]): Reach {
  if (denoms.length === 0) return { step: 1, bits: Uint8Array.of(1), maxMilli: 0 }
  const step = denoms.reduce((g, d) => gcd(g, d.milli), 0) || 1
  const maxMilli = denoms.reduce((s, d) => s + d.milli * d.maxPerSide, 0)
  const n = Math.floor(maxMilli / step)
  const bits = new Uint8Array(n + 1)
  bits[0] = 1
  const used = new Int32Array(n + 1)
  for (const d of denoms) {
    const w = d.milli / step
    used.fill(-1) // -1 = position reached without using this denomination
    for (let j = w; j <= n; j++) {
      if (bits[j]) continue
      if (!bits[j - w]) continue
      const prior = used[j - w] < 0 ? 0 : used[j - w]
      if (prior + 1 <= d.maxPerSide) {
        bits[j] = 1
        used[j] = prior + 1
      }
    }
  }
  return { step, bits, maxMilli }
}

/* ---------------------------------------------------- fitting on the sleeve */

interface FitReach extends Reach {
  /** Thinnest stack, in mm, that makes each per-side load; Infinity where none does. */
  thinnest: Float64Array
  /** choice[d][i] = how many of denomination d the thinnest stack for cell i uses. */
  choice: Uint16Array[]
}

const fitCache = new Map<string, FitReach>()

/**
 * Per-side loads the plates can make *and* the sleeve can hold. Reachability
 * alone said 900 lb was loadable when every way of making it was 642 mm on a
 * 415 mm sleeve, and every suggestion built on it — nearest weights, steppers,
 * warm-ups — inherited the mistake. Also records the thinnest stack per load,
 * which the depth-first search can miss once it hits its cap.
 */
export function fittingReach(input: Pick<SolveInput, 'denoms' | 'sleeveMm' | 'collarsOn' | 'collarWidthMm'>): FitReach {
  const collarMm = input.collarsOn ? input.collarWidthMm : 0
  const key = `${input.sleeveMm}|${collarMm}|${input.denoms.map((d) => `${d.id}:${d.maxPerSide}:${d.milli}:${d.thicknessMm}`).join(',')}`
  const hit = fitCache.get(key)
  if (hit) return hit

  const raw = reachablePerSide(input.denoms)
  const n = raw.bits.length
  let prev = new Float64Array(n).fill(Infinity)
  prev[0] = 0
  const choice: Uint16Array[] = []
  for (const d of input.denoms) {
    const w = d.milli / raw.step
    const next = new Float64Array(n).fill(Infinity)
    const pick = new Uint16Array(n)
    for (let i = 0; i < n; i++) {
      for (let c = 0; c <= d.maxPerSide && c * w <= i; c++) {
        const t = prev[i - c * w] + c * d.thicknessMm
        if (t < next[i]) {
          next[i] = t
          pick[i] = c
        }
      }
    }
    choice.push(pick)
    prev = next
  }
  const bits = new Uint8Array(n)
  for (let i = 0; i < n; i++) bits[i] = raw.bits[i] && prev[i] + collarMm <= input.sleeveMm + 0.001 ? 1 : 0

  const out: FitReach = { step: raw.step, bits, maxMilli: raw.maxMilli, thinnest: prev, choice }
  if (fitCache.size > 16) fitCache.delete(fitCache.keys().next().value!)
  fitCache.set(key, out)
  return out
}

/** Plate counts, per denomination, of the thinnest stack for a per-side load. */
function thinnestCounts(fit: FitReach, denoms: Denom[], cell: number): number[] | null {
  if (!Number.isFinite(fit.thinnest[cell])) return null
  const counts = new Array<number>(denoms.length).fill(0)
  let i = cell
  for (let d = denoms.length - 1; d >= 0; d--) {
    const c = fit.choice[d][i]
    counts[d] = c
    i -= c * (denoms[d].milli / fit.step)
  }
  return i === 0 ? counts : null
}

const isReachable = (r: Reach, perSideMilli: number): boolean =>
  perSideMilli >= 0 && perSideMilli % r.step === 0 && perSideMilli <= r.maxMilli && r.bits[perSideMilli / r.step] === 1

/**
 * Nearest reachable *totals* around a target, searching outward on the grid.
 * Totals are bar + collars + 2 × per-side.
 */
export function nearestTotals(
  input: SolveInput,
  reach: Reach,
): { below: number | null; above: number | null; next: number | null } {
  const base = baseWeight(input)
  const targetPlates = toMilli(input.target) - toMilli(base)
  const perSideExact = targetPlates / 2
  const total = (perSideMilli: number) => fromMilli(toMilli(base) + perSideMilli * 2)

  let below: number | null = base <= input.target ? base : null
  let above: number | null = null

  const maxIdx = Math.floor(reach.maxMilli / reach.step)
  const centre = perSideExact / reach.step

  for (let i = Math.min(maxIdx, Math.floor(centre)); i >= 0; i--) {
    if (reach.bits[i] && i * reach.step * 2 + toMilli(base) < toMilli(input.target)) {
      below = total(i * reach.step)
      break
    }
  }
  for (let i = Math.max(0, Math.ceil(centre)); i <= maxIdx; i++) {
    if (reach.bits[i] && i * reach.step * 2 + toMilli(base) > toMilli(input.target)) {
      above = total(i * reach.step)
      break
    }
  }
  return { below, above, next: above }
}

/* ------------------------------------------------------------------ search */

const HARD_CAP = 4000
const NODE_BUDGET = 400_000

interface RawCombo {
  counts: number[]
  plateCount: number
}

/** Depth-first, denominations descending, counts descending → unique, inside-out combos. */
function search(denoms: Denom[], perSideMilli: number, step: number): { combos: RawCombo[]; truncated: boolean } {
  const n = denoms.length
  const w = denoms.map((d) => d.milli / step)
  const target = perSideMilli / step

  // suffix[i] = max reachable with denominations i..n-1
  const suffix = new Array<number>(n + 1).fill(0)
  for (let i = n - 1; i >= 0; i--) suffix[i] = suffix[i + 1] + w[i] * denoms[i].maxPerSide

  const out: RawCombo[] = []
  const counts = new Array<number>(n).fill(0)
  let nodes = 0
  let truncated = false

  const walk = (i: number, remaining: number, plateCount: number): void => {
    if (truncated) return
    if (remaining === 0) {
      out.push({ counts: counts.slice(), plateCount })
      if (out.length >= HARD_CAP) truncated = true
      return
    }
    if (i >= n || remaining > suffix[i]) return
    if (++nodes > NODE_BUDGET) {
      truncated = true
      return
    }
    const max = Math.min(denoms[i].maxPerSide, Math.floor(remaining / w[i]))
    for (let c = max; c >= 0; c--) {
      counts[i] = c
      walk(i + 1, remaining - c * w[i], plateCount + c)
      if (truncated) break
    }
    counts[i] = 0
  }

  walk(0, target, 0)
  return { combos: out, truncated }
}

/* ----------------------------------------------------------------- ranking */

/** Lexicographic comparison of the plate vector (denoms are descending). */
function lexDesc(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return b[i] - a[i]
  }
  return 0
}

const comboKey = (c: Combo) => c.plates.map((p) => `${p.id}x${p.count}`).join('|')

export function rankCombos(combos: Combo[], mode: RankMode, denoms: Denom[]): Combo[] {
  const idx = new Map(denoms.map((d, i) => [d.id, i]))
  const vec = (c: Combo) => {
    const v = new Array<number>(denoms.length).fill(0)
    for (const p of c.plates) v[idx.get(p.id) ?? 0] = p.count
    return v
  }
  const cache = new Map<string, number[]>()
  const V = (c: Combo) => {
    const k = c.id
    let v = cache.get(k)
    if (!v) cache.set(k, (v = vec(c)))
    return v
  }
  /** Consumption of the two heaviest denominations available. */
  const heavyUse = (c: Combo) => {
    const v = V(c)
    return (v[0] ?? 0) * 100 + (v[1] ?? 0) * 10
  }

  const sorted = [...combos]
  switch (mode) {
    case 'competition':
      sorted.sort((a, b) => lexDesc(V(a), V(b)) || a.plateCount - b.plateCount)
      break
    case 'fewest':
      sorted.sort((a, b) => a.plateCount - b.plateCount || lexDesc(V(a), V(b)))
      break
    case 'compact':
      sorted.sort((a, b) => a.sleeveMm - b.sleeveMm || a.plateCount - b.plateCount || lexDesc(V(a), V(b)))
      break
    case 'inventory':
      sorted.sort((a, b) => heavyUse(b) - heavyUse(a) || a.plateCount - b.plateCount || lexDesc(V(a), V(b)))
      break
    case 'all':
      sorted.sort((a, b) => a.plateCount - b.plateCount || lexDesc(V(a), V(b)))
      break
    case 'recommended':
    default:
      sorted.sort(
        (a, b) =>
          Number(a.overCapacity) - Number(b.overCapacity) ||
          a.plateCount - b.plateCount ||
          lexDesc(V(a), V(b)) ||
          a.changeCount - b.changeCount,
      )
      break
  }
  return sorted
}

/* ------------------------------------------------------------------- solve */

export function solve(input: SolveInput, mode: RankMode = 'recommended'): SolveResult {
  const limit = input.limit ?? 80
  const base = baseWeight(input)
  const platesTotal = round3(input.target - base)
  const perSide = round3(platesTotal / 2)

  const empty = (reason: SolveReason, extra?: Partial<SolveResult>): SolveResult => ({
    ok: false,
    reason,
    platesTotal,
    perSide,
    combos: [],
    truncated: false,
    totalFound: 0,
    nearestBelow: null,
    nearestAbove: null,
    smallestStep: null,
    ...extra,
  })

  if (input.denoms.length === 0) {
    if (toMilli(platesTotal) < 0) return empty('below-bar')
    return platesTotal === 0
      ? { ...empty('ok'), ok: true, combos: [emptyCombo(input)], totalFound: 1 }
      : empty('no-plates')
  }

  const reach = fittingReach(input)
  const near = nearestTotals(input, reach)

  if (toMilli(platesTotal) < 0) return empty('below-bar', { nearestAbove: near.above, nearestBelow: near.below })

  const perSideMilli = toMilli(input.target) - toMilli(base)
  if (perSideMilli % 2 !== 0 || !isReachable(reach, perSideMilli / 2)) {
    const makeable = perSideMilli % 2 === 0 && isReachable(reachablePerSide(input.denoms), perSideMilli / 2)
    const reason: SolveReason = makeable
      ? 'too-wide'
      : perSideMilli % 2 !== 0 || (perSideMilli / 2) % reach.step !== 0
        ? 'not-divisible'
        : 'unreachable'
    return empty(reason, { nearestBelow: near.below, nearestAbove: near.above, smallestStep: near.next })
  }

  if (perSideMilli === 0) {
    return { ...empty('ok'), ok: true, combos: [emptyCombo(input)], totalFound: 1, nearestBelow: near.below, nearestAbove: near.above, smallestStep: near.next }
  }

  const { combos: raw, truncated } = search(input.denoms, perSideMilli / 2, reach.step)
  // A capped search walks heaviest-first and can stop before it reaches the
  // thinnest stack, so "Compact" would rank a stack that isn't the shortest.
  if (truncated) {
    const thin = thinnestCounts(reach, input.denoms, perSideMilli / 2 / reach.step)
    if (thin && !raw.some((r) => r.counts.every((c, i) => c === thin[i]))) {
      raw.push({ counts: thin, plateCount: thin.reduce((a, b) => a + b, 0) })
    }
  }
  if (raw.length === 0) return empty('unreachable', { nearestBelow: near.below, nearestAbove: near.above, smallestStep: near.next })

  const collarMm = input.collarsOn ? input.collarWidthMm : 0
  const built: Combo[] = raw.map((r) => {
    const plates: ComboPlate[] = []
    let sleeve = collarMm
    let changeCount = 0
    for (let i = 0; i < r.counts.length; i++) {
      const c = r.counts[i]
      if (!c) continue
      const d = input.denoms[i]
      plates.push({ id: d.id, weight: d.weight, count: c, thicknessMm: d.thicknessMm, kind: d.kind })
      sleeve += d.thicknessMm * c
      if (d.kind !== 'bumper') changeCount += c
    }
    const combo: Combo = {
      id: plates.map((p) => `${p.id}x${p.count}`).join('|'),
      plates,
      perSide,
      plateCount: r.plateCount,
      changeCount,
      sleeveMm: round3(sleeve),
      overCapacity: sleeve > input.sleeveMm + 0.001,
      competitionLegal: false,
    }
    return combo
  })

  // The platform-standard stack: largest plates innermost, i.e. lexicographic max.
  const idx = new Map(input.denoms.map((d, i) => [d.id, i]))
  const vecOf = (c: Combo) => {
    const v = new Array<number>(input.denoms.length).fill(0)
    for (const p of c.plates) v[idx.get(p.id)!] = p.count
    return v
  }
  let bestIdx = 0
  for (let i = 1; i < built.length; i++) {
    if (lexDesc(vecOf(built[i]), vecOf(built[bestIdx])) < 0) bestIdx = i
  }
  built[bestIdx].competitionLegal = true

  const ranked = rankCombos(built, mode, input.denoms)
  return {
    ok: true,
    reason: 'ok',
    platesTotal,
    perSide,
    combos: ranked.slice(0, limit),
    truncated: truncated || ranked.length > limit,
    totalFound: ranked.length,
    nearestBelow: near.below,
    nearestAbove: near.above,
    smallestStep: near.next,
  }
}

function emptyCombo(input: SolveInput): Combo {
  return {
    id: 'bare-bar',
    plates: [],
    perSide: 0,
    plateCount: 0,
    changeCount: 0,
    sleeveMm: input.collarsOn ? input.collarWidthMm : 0,
    overCapacity: false,
    competitionLegal: true,
  }
}

export const round3 = (n: number) => Math.round(n * 1000) / 1000

/* -------------------------------------------------------------- utilities */

/** Total weight a combo puts on the bar, bar and collars included. */
export function comboTotal(combo: Combo, input: Pick<SolveInput, 'bar' | 'collarsOn' | 'collarWeight'>): number {
  const plates = combo.plates.reduce((s, p) => s + p.weight * p.count, 0)
  return round3(baseWeight(input) + plates * 2)
}

/**
 * The finest total step the plates allow: twice the per-side grid. Not twice
 * the lightest plate — with bumpers only (25/20/15/10 kg) the lightest pair is
 * 20 kg but 10 kg steps are reachable.
 */
export function smallestIncrement(denoms: Denom[], unit: Unit): number {
  if (denoms.length === 0) return unit === 'kg' ? 2.5 : 5
  return fromMilli(reachablePerSide(denoms).step * 2)
}

/** Every reachable total between `from` and `to`, for pickers and warm-ups. */
export function reachableTotals(input: SolveInput, from: number, to: number): number[] {
  const reach = fittingReach(input)
  const base = toMilli(baseWeight(input))
  const out: number[] = []
  const maxIdx = Math.floor(reach.maxMilli / reach.step)
  for (let i = 0; i <= maxIdx; i++) {
    if (!reach.bits[i]) continue
    const total = fromMilli(base + i * reach.step * 2)
    if (total >= from - 1e-9 && total <= to + 1e-9) out.push(round3(total))
  }
  return out.sort((a, b) => a - b)
}

/** Closest loadable total to `want` (ties go up). */
export function snapToLoadable(input: SolveInput, want: number): number {
  const reach = fittingReach(input)
  const base = baseWeight(input)
  if (want <= base) return base
  const wantPerSide = (toMilli(want) - toMilli(base)) / 2
  const maxIdx = Math.floor(reach.maxMilli / reach.step)
  const centre = wantPerSide / reach.step
  let lo: number | null = null
  let hi: number | null = null
  for (let i = Math.min(maxIdx, Math.floor(centre)); i >= 0; i--) if (reach.bits[i]) { lo = i; break }
  for (let i = Math.max(0, Math.ceil(centre)); i <= maxIdx; i++) if (reach.bits[i]) { hi = i; break }
  const toTotal = (i: number) => fromMilli(toMilli(base) + i * reach.step * 2)
  if (lo == null && hi == null) return base
  if (lo == null) return round3(toTotal(hi!))
  if (hi == null) return round3(toTotal(lo))
  const a = toTotal(lo)
  const b = toTotal(hi)
  return round3(want - a < b - want ? a : b)
}

export { comboKey }

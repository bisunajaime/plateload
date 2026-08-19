import type { Unit } from '../data/plates'
import { baseWeight, round3, snapToLoadable, toMilli, type SolveInput } from './combinations'
import { reachablePerSide } from './combinations'

export interface WarmupStep {
  key: string
  label: string
  /** Fraction of the work weight, 1 = work set. */
  pct: number
  /** Ideal weight before snapping to what the gym can load. */
  ideal: number
  /** What you can actually put on the bar. */
  weight: number
  bareBar: boolean
}

export const DEFAULT_RAMP = [0.4, 0.6, 0.8]

/** Bar → ramp percentages → work weight, each snapped to a loadable total. */
export function warmupPlan(work: number, input: SolveInput, percents: number[] = DEFAULT_RAMP): WarmupStep[] {
  const base = baseWeight(input)
  const steps: WarmupStep[] = [
    { key: 'bar', label: 'Bar', pct: 0, ideal: base, weight: round3(base), bareBar: true },
  ]
  for (const p of percents) {
    const ideal = round3(work * p)
    if (ideal <= base) continue
    const weight = snapToLoadable(input, ideal)
    if (steps.some((s) => s.weight === weight)) continue
    steps.push({ key: `p${p}`, label: `${Math.round(p * 100)}%`, pct: p, ideal, weight, bareBar: false })
  }
  const workLoad = snapToLoadable(input, work)
  if (!steps.some((s) => s.weight === workLoad)) {
    steps.push({ key: 'work', label: 'Work', pct: 1, ideal: work, weight: workLoad, bareBar: false })
  } else {
    steps[steps.length - 1] = { ...steps[steps.length - 1], key: 'work', label: 'Work', pct: 1 }
  }
  return steps
}

export interface PercentRow {
  pct: number
  ideal: number
  weight: number
  exact: boolean
}

/** 50–100 % of a 1RM, each row snapped to a loadable total. */
export function percentTable(oneRm: number, input: SolveInput, from = 50, to = 100, step = 5): PercentRow[] {
  const rows: PercentRow[] = []
  for (let p = from; p <= to + 1e-9; p += step) {
    const ideal = round3((oneRm * p) / 100)
    const weight = snapToLoadable(input, ideal)
    rows.push({ pct: p, ideal, weight, exact: Math.abs(weight - ideal) < 0.001 })
  }
  return rows
}

/** Competition minimum increment: 1 kg under IWF/IPF rules, 5 lb in a US meet. */
export const competitionIncrement = (unit: Unit) => (unit === 'kg' ? 1 : 5)

export interface JumpInfo {
  up: number | null
  down: number | null
  competitionUp: number | null
}

/** Smallest change from `current` that the gym can actually load. */
export function nextJump(input: SolveInput, current: number): JumpInfo {
  const reach = reachablePerSide(input.denoms)
  const base = baseWeight(input)
  const baseMilli = toMilli(base)
  const currentPerSide = (toMilli(current) - baseMilli) / 2
  const maxIdx = Math.floor(reach.maxMilli / reach.step)
  const total = (i: number) => round3((baseMilli + i * reach.step * 2) / 1000)

  let up: number | null = null
  let down: number | null = null
  for (let i = Math.floor(currentPerSide / reach.step) + 1; i <= maxIdx; i++) {
    if (reach.bits[i] && total(i) > current + 1e-9) {
      up = total(i)
      break
    }
  }
  for (let i = Math.min(maxIdx, Math.ceil(currentPerSide / reach.step) - 1); i >= 0; i--) {
    if (reach.bits[i] && total(i) < current - 1e-9) {
      down = total(i)
      break
    }
  }

  const inc = competitionIncrement(input.unit)
  let competitionUp: number | null = null
  for (let i = Math.floor(currentPerSide / reach.step) + 1; i <= maxIdx; i++) {
    if (!reach.bits[i]) continue
    const t = total(i)
    if (t >= current + inc - 1e-9 && Math.abs(t / inc - Math.round(t / inc)) < 1e-6) {
      competitionUp = t
      break
    }
  }
  return { up, down, competitionUp }
}

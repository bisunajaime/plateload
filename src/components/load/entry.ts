import type { Unit } from '../../data/plates'
import { fmt } from '../../lib/format'
import { MAX_TARGET } from '../../lib/settings'

export type Entry = { ok: true; value: number } | { ok: false; message: string }

/**
 * Check a typed weight before it goes on the bar. Every refusal says why and
 * what would work — nothing typed is ever silently dropped or clamped.
 */
export function checkEntry(raw: string, base: number, unit: Unit): Entry {
  const text = raw.trim().replace(',', '.')
  const n = Number(text)
  if (text === '' || !Number.isFinite(n) || n <= 0) return { ok: false, message: 'Enter a weight.' }
  const value = Math.round(n * 1000) / 1000
  if (value > MAX_TARGET) return { ok: false, message: `PlateLoad goes up to ${fmt(MAX_TARGET)} ${unit}.` }
  if (value < base) return { ok: false, message: `The empty bar already weighs ${fmt(base)} ${unit} — enter at least that.` }
  return { ok: true, value }
}

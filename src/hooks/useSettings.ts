import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BARS, type Brand, type Unit } from '../data/plates'
import type { RankMode } from '../lib/combinations'
import { MAX_TARGET, RANK_MODES, STORAGE_KEY, applyBrand, brandForUnit, defaultSettings, hydrate, type Settings } from '../lib/settings'

/* ------------------------------------------------------------------- URL sync */

function readUrl(base: Settings): Settings {
  if (typeof window === 'undefined') return base
  const q = new URLSearchParams(window.location.search)
  if ([...q.keys()].length === 0) return base
  let s = { ...base }
  // The brand carries the unit, so `brand` wins and a bare `u` implies a brand.
  // Switch only when it differs: the app writes `brand` into every URL, and
  // switching resets the bar and collars — so every reload used to wipe them.
  const brandParam = q.get('brand')
  const unit = q.get('u')
  const brand: Brand | null =
    brandParam === 'eleiko' || brandParam === 'metcon' ? brandParam : unit === 'kg' || unit === 'lb' ? brandForUnit(unit) : null
  if (brand && brand !== s.brand) s = applyBrand(s, brand)
  const w = Number(q.get('w'))
  if (q.get('w') && Number.isFinite(w) && w > 0 && w <= MAX_TARGET) s.target = w
  const bar = q.get('bar')?.trim()
  if (bar && BARS.some((b) => b.id === bar)) s.barId = bar
  else if (bar && Number.isFinite(Number(bar)) && Number(bar) > 0) {
    s.barId = 'custom'
    s.customBarWeight = Number(bar)
  }
  const collars = q.get('collars')
  if (collars != null) s.collars = collars === '1' || collars === 'true'
  const mode = q.get('mode')
  if (mode && (RANK_MODES as string[]).includes(mode)) s.mode = mode as RankMode
  const sleeveView = q.get('sleeve')
  if (sleeveView != null) s.closeUp = sleeveView === '1'
  const change = q.get('change')
  if (change != null) s.includeChange = change === '1'
  return s
}

function writeUrl(s: Settings) {
  if (typeof window === 'undefined') return
  const q = new URLSearchParams()
  q.set('w', String(s.target))
  q.set('u', s.unit)
  q.set('brand', s.brand)
  q.set('bar', s.barId === 'custom' && s.customBarWeight ? String(s.customBarWeight) : s.barId)
  q.set('collars', s.collars ? '1' : '0')
  if (!s.includeChange) q.set('change', '0')
  const next = `${window.location.pathname}?${q.toString()}`
  window.history.replaceState(null, '', next)
}

/* --------------------------------------------------------------------- hook */

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => {
    let base = defaultSettings()
    let stored = false
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        base = hydrate(JSON.parse(raw))
        stored = true
      }
    } catch {
      /* corrupted storage — fall back to defaults */
    }
    if (!stored) {
      // A phone in a dark gym is the default case: start in gym mode there.
      const smallAndDark =
        window.innerWidth < 640 && window.matchMedia('(prefers-color-scheme: dark)').matches
      base = { ...base, gymMode: smallAndDark }
    }
    return readUrl(base)
  })

  // Persist, debounced enough to survive a stepper being hammered.
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      } catch {
        /* private mode / quota — the app still works, it just forgets */
      }
      writeUrl(settings)
    }, 250)
    return () => window.clearTimeout(timer.current)
  }, [settings])

  // Theme
  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = settings.theme === 'dark' || (settings.theme === 'system' && mql.matches)
      root.classList.toggle('dark', dark)
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', dark ? '#0c0c0d' : '#f4f2ee')
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [settings.theme])

  useEffect(() => {
    document.documentElement.classList.toggle('gym-mode', settings.gymMode)
  }, [settings.gymMode])

  const update = useCallback((patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => {
    setSettings((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }))
  }, [])

  const setBrand = useCallback((brand: Brand) => {
    // Tapping the brand you are already on used to reset the bar and collars.
    setSettings((prev) => (prev.brand === brand ? prev : applyBrand(prev, brand)))
  }, [])

  const setTarget = useCallback((target: number) => {
    setSettings((prev) => ({ ...prev, target: Math.min(MAX_TARGET, Math.max(0, Math.round(target * 1000) / 1000)) }))
  }, [])

  /** Push a weight onto the recents list (deduped by weight and unit, newest first). */
  const rememberWeight = useCallback((weight: number, unit?: Unit) => {
    setSettings((prev) => remember(prev, weight, unit ?? prev.unit))
  }, [])

  /**
   * Load a weight that already knows its own unit — a recent or a favourite.
   * Pounds mean Metcon, kilos mean Eleiko, so this can switch brand; the weight
   * is then used as-is rather than converted, because it is already in that unit.
   */
  const pickWeight = useCallback((weight: number, unit: Unit) => {
    setSettings((prev) => {
      const next = prev.unit === unit ? prev : applyBrand(prev, brandForUnit(unit))
      return remember({ ...next, target: weight }, weight, unit)
    })
  }, [])

  const reset = useCallback(() => setSettings(defaultSettings()), [])

  const isDark = useMemo(
    () => settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
    [settings.theme],
  )

  return { settings, update, setBrand, setTarget, rememberWeight, pickWeight, reset, isDark }
}

function remember(s: Settings, weight: number, unit: Unit): Settings {
  const list = [{ weight, unit }, ...s.lastWeights.filter((x) => !(x.weight === weight && x.unit === unit))]
  return { ...s, lastWeights: list.slice(0, 15) }
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

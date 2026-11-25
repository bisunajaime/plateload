import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Moment } from '../components/Celebration'
import { COLLARS, type Brand, type Unit } from '../data/plates'
import { feedback, useReducedMotion } from '../feel'
import { useSettings } from '../hooks/useSettings'
import { useToast } from '../hooks/useToast'
import { snapToLoadable, solve, type Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { WORLD_RECORD, plateMilestone } from '../lib/milestones'
import { applyBrand, brandForUnit, buildSolveInput, resolveLoadout, type AppTab, type Settings } from '../lib/settings'
import { nextJump } from '../lib/warmup'

/** Settings that move together when the brand changes — and come back together on Undo. */
const BRAND_KEYS = ['brand', 'unit', 'barId', 'customBarWeight', 'collarKind', 'collarWeight', 'target', 'inventory'] as const

const brandName = (b: Brand) => (b === 'metcon' ? 'Metcon' : 'Eleiko')

/**
 * The app's state and everything you can do to it, in one place. Screens read
 * it through `useApp()`; none of them owns a piece of the load.
 */
export function useAppModel() {
  const { settings, update, setTarget, rememberWeight, pickWeight, reset } = useSettings()
  const { toast, show: showToast, dismiss: dismissToast } = useToast()
  const animate = !useReducedMotion()

  const loadout = useMemo(() => resolveLoadout(settings), [settings])
  const input = useMemo(() => buildSolveInput(settings), [settings])
  const result = useMemo(() => solve(input, settings.mode), [input, settings.mode])
  const jumps = useMemo(() => nextJump(input, settings.target), [input, settings.target])
  const collarKind = settings.collars ? settings.collarKind : null
  const collarWidth = COLLARS[settings.collarKind].widthMm

  /* ----------------------------------------------------- the chosen stack */

  // A picked combination belongs to the load it was picked for; stepping away
  // and back must not resurrect a choice made for another weight.
  const [picked, setPicked] = useState<{ load: string; id: string } | null>(null)
  const loadKey = `${settings.brand}:${settings.target}:${JSON.stringify(input.denoms.map((d) => d.maxPerSide))}`
  // Derived during render, no effect: a new load drops the old pick for good.
  const [prevLoadKey, setPrevLoadKey] = useState(loadKey)
  if (loadKey !== prevLoadKey) {
    setPrevLoadKey(loadKey)
    setPicked(null)
  }
  const selectedId = picked?.load === loadKey ? picked.id : null
  const selected: Combo | null = useMemo(() => {
    if (!result.ok || result.combos.length === 0) return null
    return result.combos.find((c) => c.id === selectedId) ?? result.combos[0]
  }, [result, selectedId])
  // Picking a combination while the bar is scrolled away flashes the preview, so you see what changed.
  const [peek, setPeek] = useState(0)
  const selectCombo = (c: Combo, barOffScreen: boolean) => {
    setPicked({ load: loadKey, id: c.id })
    feedback('select')
    if (barOffScreen) setPeek((n) => n + 1)
  }

  /* ----------------------------------------------------------- undo */

  /**
   * Changes that rewrite your setup in one tap apply at once and offer Undo,
   * instead of asking first. Undo puts back exactly what the change replaced,
   * and only while those settings are still as the change left them.
   */
  const latest = useRef(settings)
  useEffect(() => {
    latest.current = settings
  })
  const applyUndoable = (message: string, next: Partial<Settings>) => {
    const keys = Object.keys(next) as (keyof Settings)[]
    const before = Object.fromEntries(keys.map((k) => [k, settings[k]])) as Partial<Settings>
    update(next)
    showToast({
      message,
      action: {
        label: 'Undo',
        run: () => {
          const untouched = keys.every((k) => JSON.stringify(latest.current[k]) === JSON.stringify(next[k]))
          if (untouched) update(before)
          else showToast({ message: 'Can’t undo — that’s been changed since.', tone: 'bad' })
        },
      },
    })
  }

  const brandPatch = (brand: Brand, target?: number) => {
    const next = applyBrand(settings, brand)
    const patch = Object.fromEntries(BRAND_KEYS.map((k) => [k, next[k]])) as Partial<Settings>
    if (target !== undefined) patch.target = target
    return patch
  }

  const switchBrand = (brand: Brand) => {
    if (brand === settings.brand) return
    applyUndoable(`Switched to ${brandName(brand)}, in ${brand === 'metcon' ? 'pounds' : 'kilos'}. Bar and collars reset.`, brandPatch(brand))
  }

  /* ------------------------------------------------------ choosing a weight */

  /** A weight chosen on purpose. Remembered only if the plates can make it. */
  const pick = useCallback(
    (w: number) => {
      setTarget(w)
      if (solve(buildSolveInput(settings, w, 1)).ok) rememberWeight(w)
    },
    [setTarget, rememberWeight, settings],
  )

  /** A quick jump: at least this far either way, landing on something loadable. */
  const jump = (delta: number) => {
    const want = settings.target + delta
    if (want <= loadout.base) return setTarget(loadout.base)
    const r = solve(buildSolveInput(settings, want, 1))
    const landing = r.ok ? want : delta > 0 ? r.nearestAbove : r.nearestBelow
    setTarget(landing ?? want)
  }

  /**
   * Load a saved or recent weight. One in the other unit belongs to the other
   * brand's plates, so it switches brand too — at once, with Undo.
   */
  const loadSaved = (weight: number, unit: Unit) => {
    if (unit === settings.unit) return pickWeight(weight, unit)
    const brand = brandForUnit(unit)
    applyUndoable(`Switched to ${brandName(brand)} for ${fmt(weight)} ${unit}.`, brandPatch(brand, weight))
  }

  /* ------------------------------------------------------------- saving */

  const saveFavorite = (label: string, weight = settings.target, unit = settings.unit) => {
    update({ favorites: [...settings.favorites, { label, weight, unit }] })
    feedback('confirm')
    showToast({ message: `Saved ${label ? `${label} · ` : ''}${fmt(weight)} ${unit}` })
  }

  const removeFavorite = (index: number) => {
    const f = settings.favorites[index]
    if (!f) return
    applyUndoable(`Removed ${f.label || 'weight'} · ${fmt(f.weight)} ${f.unit}.`, {
      favorites: settings.favorites.filter((_, i) => i !== index),
    })
  }

  const isSaved = settings.favorites.some((f) => f.weight === settings.target && f.unit === settings.unit)

  /* ------------------------------------------------------------- sharing */

  const summary = useMemo(() => {
    if (!selected) return ''
    const bar = `${fmt(loadout.barWeight)} ${settings.unit} bar`
    const collar = settings.collars
      ? `${COLLARS[settings.collarKind].label}${loadout.collarWeight ? ` (${fmt(loadout.collarWeight * 2)} ${settings.unit})` : ''}`
      : 'no collars'
    const plates = selected.plates.length
      ? `${selected.plates.flatMap((p) => Array.from({ length: p.count }, () => fmt(p.weight))).join('/')} each side`
      : 'no plates'
    return `${fmt(settings.target)} ${settings.unit} — ${bar}, ${collar}, ${plates}`
  }, [selected, settings, loadout])

  /**
   * Share the load: the phone's share sheet where there is one (a training
   * partner gets the words and a link that opens on this exact bar), the
   * clipboard otherwise.
   */
  const share = async () => {
    const url = window.location.href
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> }
    if (nav.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await nav.share({ title: 'PlateLoad', text: summary, url })
        return
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(`${summary}\n${url}`)
      feedback('confirm')
      showToast({ message: 'Copied the load and a link to it.' })
    } catch {
      feedback('error')
      showToast({ message: 'Couldn’t copy — this browser blocked the clipboard.', tone: 'bad' })
    }
  }

  /* ------------------------------------------------------ moments of joy */

  // Two plates, three plates: marked once you land there and stay a moment —
  // not on page load, and not while a held + is rushing past.
  const [moment, setMoment] = useState<Moment | null>(null)
  const momentSeq = useRef(0)
  const milestone = result.ok ? plateMilestone(settings.target, loadout.base, settings.unit) : null
  const lastMilestone = useRef(milestone)
  // The caption reads the weight when it fires; only a change of milestone reschedules it.
  const landedOn = useRef(`${fmt(settings.target)} ${settings.unit}`)
  useEffect(() => {
    landedOn.current = `${fmt(settings.target)} ${settings.unit}`
  })
  useEffect(() => {
    if (milestone === lastMilestone.current) return
    lastMilestone.current = milestone
    if (!milestone) return
    const t = window.setTimeout(() => {
      setMoment({ id: ++momentSeq.current, kind: 'milestone', title: milestone, detail: landedOn.current })
      feedback('milestone')
    }, 350)
    return () => window.clearTimeout(t)
  }, [milestone])

  /** The hidden one: hold the logo and the world-record clean & jerk goes on the bar. */
  const loadWorldRecord = () => {
    const record = snapToLoadable(input, WORLD_RECORD[settings.unit])
    applyUndoable('World record on the bar.', { target: record, tab: 'load' })
    lastMilestone.current = null
    setMoment({ id: ++momentSeq.current, kind: 'record', title: 'Good lift.', detail: `${fmt(record)} ${settings.unit} · clean & jerk world record` })
    feedback('milestone', { delay: 480 })
  }

  /* ---------------------------------------------------------- navigation */

  const go = (tab: AppTab) => {
    if (tab === settings.tab) return
    update({ tab })
    window.scrollTo({ top: 0 })
  }

  const resetAll = () => {
    // Nothing from before a reset can be undone into the fresh state.
    dismissToast()
    reset()
    feedback('confirm')
    showToast({ message: 'Everything’s back to how it started.' })
  }

  return {
    settings,
    update,
    animate,
    loadout,
    input,
    result,
    jumps,
    collarKind,
    collarWidth,
    selected,
    selectCombo,
    peek,
    setTarget,
    pick,
    jump,
    loadSaved,
    switchBrand,
    applyUndoable,
    saveFavorite,
    removeFavorite,
    isSaved,
    summary,
    share,
    moment,
    loadWorldRecord,
    go,
    resetAll,
    toast,
    showToast,
    dismissToast,
  }
}

export type AppModel = ReturnType<typeof useAppModel>

import { useCallback, useMemo, useRef, useState } from 'react'
import { ComboList } from './components/ComboList'
import { Header } from './components/Header'
import { LoadCard } from './components/LoadCard'
import { MiniBar } from './components/MiniBar'
import { SettingsSheet } from './components/InventoryEditor'
import { WarmupPanel } from './components/WarmupPanel'
import { YourWeights } from './components/YourWeights'
import { Sheet } from './components/ui'
import { COLLARS } from './data/plates'
import { comboTotal, solve, type Combo } from './lib/combinations'
import { fmt } from './lib/format'
import { buildSolveInput, resolveLoadout } from './lib/settings'
import { nextJump } from './lib/warmup'
import { useHasScrolled, useVisibility } from './hooks/useOnScreen'
import { prefersReducedMotion, useSettings } from './hooks/useSettings'

export default function App() {
  const { settings, update, setBrand, setTarget, rememberWeight, pickWeight, reset } = useSettings()
  const [setupOpen, setSetupOpen] = useState(false)
  const [favOpen, setFavOpen] = useState(false)
  const [favLabel, setFavLabel] = useState('')
  const [removing, setRemoving] = useState<number | null>(null)
  // A picked combination belongs to the load it was picked for; stepping away
  // and back must not resurrect a choice made for another weight.
  const [picked, setPicked] = useState<{ load: string; id: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const loadout = useMemo(() => resolveLoadout(settings), [settings])
  const input = useMemo(() => buildSolveInput(settings), [settings])
  const result = useMemo(() => solve(input, settings.mode), [input, settings.mode])
  const jumps = useMemo(() => nextJump(input, settings.target), [input, settings.target])

  // The jumps a lifter actually makes between sets.
  const quickSteps = settings.unit === 'kg' ? [2.5, 5, 10, 20] : [5, 10, 25, 45]

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

  const collarKind = settings.collars ? settings.collarKind : null
  const collarWidth = COLLARS[settings.collarKind].widthMm

  const summary = useMemo(() => {
    if (!selected) return ''
    const bar = `${fmt(loadout.barWeight)} ${settings.unit} bar`
    const collar = settings.collars
      ? `${COLLARS[settings.collarKind].label.toLowerCase()}${loadout.collarWeight ? ` (${fmt(loadout.collarWeight * 2)} ${settings.unit})` : ''}`
      : 'no collars'
    const plates = selected.plates.length
      ? `${selected.plates.flatMap((p) => Array.from({ length: p.count }, () => fmt(p.weight))).join('/')} each side`
      : 'no plates'
    return `${fmt(settings.target)} ${settings.unit} — ${bar}, ${collar}, ${plates}`
  }, [selected, settings, loadout])

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }, [summary])

  /** A weight chosen on purpose. Remembered only if the plates can make it. */
  const pick = useCallback(
    (w: number) => {
      setTarget(w)
      if (solve(buildSolveInput(settings, w, 1)).ok) rememberWeight(w)
    },
    [setTarget, rememberWeight, settings],
  )

  /** A quick jump: at least this much heavier, landing on something loadable. */
  const jump = (delta: number) => {
    const want = settings.target + delta
    const r = solve(buildSolveInput(settings, want, 1))
    setTarget(r.ok ? want : (r.nearestAbove ?? want))
  }

  // Every favourite is shown whatever its unit — tapping one in the other unit
  // switches brand with it. The index rides along so removal is unambiguous.
  const favorites = settings.favorites.map((f, index) => ({ ...f, index }))

  // The star only ever saves — two lifts can share a weight (clean 100, squat 100),
  // so removal lives in the favourites list where you can see which is which.
  const addFavorite = () => {
    setFavLabel('')
    setFavOpen(true)
  }

  const saveFavorite = (e: React.FormEvent) => {
    e.preventDefault()
    setFavOpen(false)
    update({
      favorites: [...settings.favorites, { label: favLabel.trim(), weight: settings.target, unit: settings.unit }],
    })
  }

  const animate = !prefersReducedMotion()

  // A thumbnail of the load stands in for the card once you have scrolled
  // away from it — but not over the combination list, whose rows already
  // draw every sleeve, and not before you have scrolled at all.
  const heroRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const hero = useVisibility(heroRef)
  const list = useVisibility(listRef, 72, 1, 160)
  const scrolled = useHasScrolled()
  const showPreview = !hero.onScreen && !list.onScreen && (scrolled || hero.passed)

  return (
    <div className="min-h-dvh">
      <Header settings={settings} setBrand={setBrand} onSettings={() => setSetupOpen(true)} />

      {/* One column on a phone, the answer first. On desktop the answer stays
          pinned on the left while everything optional scrolls on the right. */}
      <main
        id="main"
        className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-3 pb-10 pt-4 sm:px-5 sm:pt-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-8"
      >
        <div className="lg:sticky lg:top-[76px]">
          <LoadCard
            ref={heroRef}
            target={settings.target}
            unit={settings.unit}
            result={result}
            combo={selected}
            bar={loadout.bar}
            plates={loadout.plates}
            barWeight={loadout.barWeight}
            collarWeight={loadout.collarWeight}
            collarKind={collarKind}
            collarWidthMm={collarWidth}
            base={loadout.base}
            showLabels={settings.showLabels}
            closeUp={settings.closeUp}
            animate={animate}
            down={jumps.down}
            up={jumps.up}
            quickSteps={quickSteps}
            onStep={setTarget}
            onJump={jump}
            onEnter={pick}
            onToggleCloseUp={() => update({ closeUp: !settings.closeUp })}
            onSave={addFavorite}
            onCopy={copy}
            copied={copied}
            changeOff={!settings.includeChange}
            onEnableChange={() => update({ includeChange: true })}
            onOpenSetup={() => setSetupOpen(true)}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <YourWeights
            favorites={favorites}
            recents={settings.lastWeights}
            unit={settings.unit}
            onPick={pickWeight}
            onRemove={setRemoving}
          />

          {result.ok && (
            <div ref={listRef}>
              <ComboList
                combos={result.combos}
                mode={settings.mode}
                onMode={(mode) => update({ mode })}
                plates={loadout.plates}
                collarKind={collarKind}
                collarWidthMm={collarWidth}
                sleeveMm={loadout.sleeveMm}
                selectedId={selected?.id ?? null}
                onSelect={(c) => {
                  setPicked({ load: loadKey, id: c.id })
                  if ('vibrate' in navigator) navigator.vibrate?.(10)
                }}
                truncated={result.truncated}
                totalFound={result.totalFound}
              />
            </div>
          )}

          <WarmupPanel input={input} unit={settings.unit} target={settings.target} onPick={pick} onPickStep={setTarget} />

          <footer className="px-1 text-xs leading-relaxed text-muted gym-hide">
            <p>
              {selected ? `${fmt(comboTotal(selected, input))} ${settings.unit} on the bar. ` : ''}Plate geometry from
              Eleiko competition specs and the Metcon Group PH bumper range. Works offline once installed.{' '}
              <a href="/" className="underline decoration-line underline-offset-2 hover:text-ink">
                About PlateLoad
              </a>
            </p>
          </footer>
        </div>
      </main>

      <MiniBar
        show={showPreview}
        bar={loadout.bar}
        plates={loadout.plates}
        combo={selected}
        collarKind={collarKind}
        collarWidthMm={collarWidth}
        unit={settings.unit}
        total={settings.target}
        loadable={result.ok}
        pos={settings.preview}
        onMove={(preview) => update({ preview })}
        animate={animate}
        onClick={() =>
          heroRef.current?.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'start' })
        }
      />

      <SettingsSheet
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
        settings={settings}
        update={update}
        onReset={() => {
          reset()
          setSetupOpen(false)
        }}
      />


      <Sheet
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove favourite?"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setRemoving(null)}>
              Keep it
            </button>
            <button
              className="btn btn-danger px-5"
              onClick={() => {
                update({ favorites: settings.favorites.filter((_, i) => i !== removing) })
                setRemoving(null)
              }}
            >
              Remove
            </button>
          </div>
        }
      >
        {removing !== null && settings.favorites[removing] && (
          <p className="text-sm text-muted">
            <span className="font-semibold text-ink">
              {settings.favorites[removing].label || 'Unnamed'}
            </span>{' '}
            —{' '}
            <span className="tabular-nums text-ink">
              {fmt(settings.favorites[removing].weight)} {settings.favorites[removing].unit}
            </span>{' '}
            will be removed from your favourites. Nothing else changes.
          </p>
        )}
      </Sheet>

      <Sheet
        open={favOpen}
        onClose={() => setFavOpen(false)}
        title="Save favourite"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setFavOpen(false)}>
              Cancel
            </button>
            {/* Submits the form below, so the button, Enter and a phone keyboard's
                Go key all take the same path and the sheet closes on the first tap. */}
            <button type="submit" form="save-favourite" className="btn btn-primary px-5">
              Save
            </button>
          </div>
        }
      >
        <form id="save-favourite" onSubmit={saveFavorite} className="flex flex-col gap-2">
          <label className="label" htmlFor="favourite-name">
            Name
          </label>
          <input
            id="favourite-name"
            className="btn w-full justify-start px-4"
            placeholder="Squat"
            enterKeyHint="done"
            value={favLabel}
            onChange={(e) => setFavLabel(e.target.value)}
          />
          <span className="text-xs text-muted">
            Pins {fmt(settings.target)} {settings.unit} for next time. Two lifts can share a weight — the name is
            how you tell them apart.
          </span>
        </form>
      </Sheet>
    </div>
  )
}

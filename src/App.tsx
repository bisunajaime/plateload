import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarbellSVG } from './components/BarbellSVG'
import { ComboList } from './components/ComboList'
import { EmptyState } from './components/EmptyState'
import { Header } from './components/Header'
import { SettingsSheet } from './components/InventoryEditor'
import { LoaderView } from './components/LoaderView'
import { WarmupPanel } from './components/WarmupPanel'
import { WeightInput } from './components/WeightInput'
import { CopyIcon, LoaderIcon, RulerIcon, Sheet, SpeakerIcon, StarIcon, TagIcon, ZoomIcon } from './components/ui'
import { COLLARS } from './data/plates'
import { comboTotal, smallestIncrement, solve, type Combo } from './lib/combinations'
import { fmt, platesCompact } from './lib/format'
import { buildSolveInput, resolveLoadout } from './lib/settings'
import { speak, speechAvailable } from './lib/speech'
import { nextJump } from './lib/warmup'
import { prefersReducedMotion, useSettings } from './hooks/useSettings'

export default function App() {
  const { settings, update, setBrand, setTarget, rememberWeight, reset } = useSettings()
  const [setupOpen, setSetupOpen] = useState(false)
  const [loaderOpen, setLoaderOpen] = useState(false)
  const [favOpen, setFavOpen] = useState(false)
  const [favLabel, setFavLabel] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [copied, setCopied] = useState(false)

  const loadout = useMemo(() => resolveLoadout(settings), [settings])
  const input = useMemo(() => buildSolveInput(settings), [settings])
  const result = useMemo(() => solve(input, settings.mode), [input, settings.mode])
  const jumps = useMemo(() => nextJump(input, settings.target), [input, settings.target])

  const step = smallestIncrement(loadout.denoms, settings.unit)
  const quickSteps = settings.unit === 'kg' ? [1.25, 2.5, 5, 10] : [2.5, 5, 10, 45]

  const selected: Combo | null = useMemo(() => {
    if (!result.ok || result.combos.length === 0) return null
    return result.combos.find((c) => c.id === selectedId) ?? result.combos[0]
  }, [result, selectedId])

  useEffect(() => {
    if (result.ok && result.combos.length && !result.combos.some((c) => c.id === selectedId)) {
      setSelectedId(result.combos[0].id)
    }
  }, [result, selectedId])

  useEffect(() => {
    if (settings.announce && selected) {
      speak(`${fmt(settings.target)} ${settings.unit}. ${platesCompact(selected.plates)} each side.`)
    }
    // Announcing on every keystroke would be unbearable — only on a new combo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id])

  const collarKind = settings.collars ? settings.collarKind : null
  const collarWidth = COLLARS[settings.collarKind].widthMm

  const summary = useMemo(() => {
    if (!selected) return ''
    const bar = `${fmt(loadout.barWeight)} ${settings.unit} bar`
    const collar = settings.collars
      ? `${COLLARS[settings.collarKind].label.toLowerCase()}${loadout.collarWeight ? ` (${fmt(loadout.collarWeight * 2)} ${settings.unit})` : ''}`
      : 'no collars'
    const plates = selected.plates.length
      ? selected.plates.flatMap((p) => Array.from({ length: p.count }, () => fmt(p.weight))).join('/')
      : 'bare bar'
    return `${fmt(settings.target)} ${settings.unit} — ${bar}, ${collar}, ${plates} each side`
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

  const pick = useCallback(
    (w: number) => {
      setTarget(w)
      rememberWeight(w)
    },
    [setTarget, rememberWeight],
  )

  const isFavorite = settings.favorites.some((f) => f.weight === settings.target && f.unit === settings.unit)
  const toggleFavorite = () => {
    if (isFavorite) {
      update({ favorites: settings.favorites.filter((f) => !(f.weight === settings.target && f.unit === settings.unit)) })
    } else {
      setFavLabel('')
      setFavOpen(true)
    }
  }

  const animate = !prefersReducedMotion()

  return (
    <div className="min-h-dvh">
      <Header settings={settings} update={update} setBrand={setBrand} onSettings={() => setSetupOpen(true)} />

      <main id="main" className="mx-auto grid max-w-6xl gap-4 px-3 py-4 sm:px-5 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start">
        {/* ------------------------------------------------------- controls */}
        <div className="flex min-w-0 flex-col gap-4">
          <WeightInput
            value={settings.target}
            unit={settings.unit}
            step={step}
            loadable={result.ok}
            onChange={setTarget}
            onCommit={rememberWeight}
            quickSteps={quickSteps}
          />

          {/* live breakdown */}
          <section className="card px-4 py-3" aria-label="Weight breakdown">
            <p className="text-sm tabular-nums">
              <span className="text-muted">Bar</span> {fmt(loadout.barWeight)}
              <span className="text-muted"> + collars</span> {fmt(settings.collars ? loadout.collarWeight * 2 : 0)}
              <span className="text-muted"> + plates</span>{' '}
              <span className={result.ok ? '' : 'text-bad'}>{fmt(Math.max(0, result.platesTotal))}</span>
              <span className="text-muted"> = </span>
              <span className="font-semibold">
                {fmt(settings.target)} {settings.unit}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted tabular-nums">
              {fmt(result.perSide > 0 ? result.perSide : 0)} {settings.unit} a side · smallest step here {fmt(step)}{' '}
              {settings.unit}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {jumps.down != null && (
                <button className="chip" onClick={() => pick(jumps.down!)}>
                  ↓ {fmt(jumps.down)}
                </button>
              )}
              {jumps.up != null && (
                <button className="chip" onClick={() => pick(jumps.up!)}>
                  ↑ {fmt(jumps.up)}
                </button>
              )}
              {jumps.competitionUp != null && jumps.competitionUp !== jumps.up && (
                <button className="chip" onClick={() => pick(jumps.competitionUp!)} title="Next competition increment">
                  ↑ {fmt(jumps.competitionUp)} comp
                </button>
              )}
              <button
                className="chip"
                onClick={toggleFavorite}
                aria-pressed={isFavorite}
                title={isFavorite ? 'Remove favourite' : 'Save as favourite'}
              >
                <StarIcon filled={isFavorite} />
              </button>
              <button className="chip" onClick={copy} title="Copy a summary">
                <CopyIcon />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          {(settings.favorites.length > 0 || settings.lastWeights.length > 0) && (
            <section className="card px-4 py-3" aria-label="Saved weights">
              {settings.favorites.length > 0 && (
                <>
                  <h2 className="label mb-2">Favourites</h2>
                  <div className="hide-scroll -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
                    {settings.favorites.map((f) => (
                      <button
                        key={`${f.label}-${f.weight}-${f.unit}`}
                        className="chip"
                        onClick={() => f.unit === settings.unit && pick(f.weight)}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          update({ favorites: settings.favorites.filter((x) => x !== f) })
                        }}
                        title="Long-press or right-click to remove"
                      >
                        <span className="font-semibold">{f.label || fmt(f.weight)}</span>
                        <span className="text-muted tabular-nums">
                          {fmt(f.weight)} {f.unit}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {settings.lastWeights.length > 0 && (
                <>
                  <h2 className="label mb-2">Recent</h2>
                  <div className="hide-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                    {settings.lastWeights.map((w) => (
                      <button key={w} className="chip tabular-nums" onClick={() => pick(w)}>
                        {fmt(w)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* ------------------------------------------------------ hero + list */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section className="card platform-grain overflow-hidden" aria-label="Loaded barbell">
            <div className="hide-scroll overflow-x-auto">
              <BarbellSVG
                bar={loadout.bar}
                plates={loadout.plates}
                combo={selected}
                collarKind={collarKind}
                collarWidthMm={collarWidth}
                unit={settings.unit}
                showLabels={settings.showLabels}
                showRuler={settings.showRuler}
                closeUp={settings.closeUp}
                animate={animate}
                zoom={zoom}
                className="block h-auto"
              />
            </div>
            <div className="hide-scroll flex items-center gap-2 overflow-x-auto border-t border-line px-3 py-2">
              <button
                className="chip"
                aria-pressed={settings.closeUp}
                onClick={() => update({ closeUp: !settings.closeUp })}
                title="Zoom to one sleeve"
              >
                <ZoomIcon />
                Sleeve
              </button>
              <button
                className="chip"
                aria-pressed={settings.showLabels}
                onClick={() => update({ showLabels: !settings.showLabels })}
              >
                <TagIcon />
                Labels
              </button>
              <button
                className="chip"
                aria-pressed={settings.showRuler}
                onClick={() => update({ showRuler: !settings.showRuler })}
              >
                <RulerIcon />
                Ruler
              </button>
              <button className="chip" onClick={() => setZoom((z) => (z >= 2.4 ? 1 : z + 0.7))} title="Magnify the bar">
                {zoom > 1 ? `${zoom.toFixed(1)}×` : 'Zoom'}
              </button>
              <button className="chip" onClick={() => setLoaderOpen(true)} disabled={!selected}>
                <LoaderIcon />
                Loader view
              </button>
              {speechAvailable() && (
                <button
                  className="chip"
                  aria-pressed={settings.announce}
                  onClick={() => update({ announce: !settings.announce })}
                  title="Speak each combination"
                >
                  <SpeakerIcon />
                  Announce
                </button>
              )}
              {selected && (
                <span className="ml-auto shrink-0 pl-2 text-xs text-muted tabular-nums">
                  {Math.round(selected.sleeveMm)} / {loadout.sleeveMm} mm
                </span>
              )}
            </div>
          </section>

          {result.ok ? (
            <ComboList
              combos={result.combos}
              mode={settings.mode}
              onMode={(mode) => update({ mode })}
              plates={loadout.plates}
              unit={settings.unit}
              collarKind={collarKind}
              collarWidthMm={collarWidth}
              sleeveMm={loadout.sleeveMm}
              selectedId={selected?.id ?? null}
              onSelect={(c) => {
                setSelectedId(c.id)
                if ('vibrate' in navigator) navigator.vibrate?.(10)
              }}
              truncated={result.truncated}
              totalFound={result.totalFound}
            />
          ) : (
            <EmptyState
              reason={result.reason}
              target={settings.target}
              unit={settings.unit}
              base={loadout.base}
              nearestBelow={result.nearestBelow}
              nearestAbove={result.nearestAbove}
              onPick={pick}
              changeOff={!settings.includeChange}
              onEnableChange={() => update({ includeChange: true })}
              onOpenSetup={() => setSetupOpen(true)}
              smallestStep={result.smallestStep}
            />
          )}
        </div>

        {/* ---------------------------------------------------------- tools */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-2">
          <WarmupPanel input={input} unit={settings.unit} target={settings.target} onPick={pick} />
          <footer className="px-1 pb-6 text-xs text-muted gym-hide">
            <p>
              Plate geometry from Eleiko competition specs and the Metcon Group PH bumper range — 450 mm, 50.4 mm insert,
              90A, gloss–matte–gloss.
            </p>
            <p className="mt-1">
              {selected ? `${fmt(comboTotal(selected, input))} ${settings.unit} on the bar.` : 'Nothing loaded.'} Works
              offline once installed.
            </p>
          </footer>
        </div>
      </main>

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

      <LoaderView
        open={loaderOpen}
        onClose={() => setLoaderOpen(false)}
        combo={selected}
        plates={loadout.plates}
        unit={settings.unit}
        total={settings.target}
        collarKind={collarKind}
        announce={settings.announce}
      />

      <Sheet
        open={favOpen}
        onClose={() => setFavOpen(false)}
        title="Save favourite"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setFavOpen(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary px-5"
              onClick={() => {
                update({
                  favorites: [
                    ...settings.favorites,
                    { label: favLabel.trim(), weight: settings.target, unit: settings.unit },
                  ],
                })
                setFavOpen(false)
              }}
            >
              Save
            </button>
          </div>
        }
      >
        <label className="flex flex-col gap-2">
          <span className="label">Name</span>
          <input
            className="btn w-full justify-start px-4"
            placeholder="Squat"
            value={favLabel}
            onChange={(e) => setFavLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                update({
                  favorites: [...settings.favorites, { label: favLabel.trim(), weight: settings.target, unit: settings.unit }],
                })
                setFavOpen(false)
              }
            }}
          />
          <span className="text-xs text-muted">
            Pins {fmt(settings.target)} {settings.unit} to the top for next time.
          </span>
        </label>
      </Sheet>
    </div>
  )
}

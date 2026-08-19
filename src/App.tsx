import { useCallback, useMemo, useState } from 'react'
import { BarbellSVG } from './components/BarbellSVG'
import { ComboList } from './components/ComboList'
import { EmptyState } from './components/EmptyState'
import { Header } from './components/Header'
import { SettingsSheet } from './components/InventoryEditor'
import { WarmupPanel } from './components/WarmupPanel'
import { WeightInput } from './components/WeightInput'
import { ClockIcon, CopyIcon, ScaleIcon, SectionHeader, Sheet, StarIcon, TagIcon, XIcon, ZoomIcon } from './components/ui'
import { COLLARS } from './data/plates'
import { comboTotal, smallestIncrement, solve, type Combo } from './lib/combinations'
import { fmt } from './lib/format'
import { buildSolveInput, resolveLoadout } from './lib/settings'
import { nextJump } from './lib/warmup'
import { prefersReducedMotion, useSettings } from './hooks/useSettings'

export default function App() {
  const { settings, update, setBrand, setTarget, rememberWeight, pickWeight, reset } = useSettings()
  const [setupOpen, setSetupOpen] = useState(false)
  const [favOpen, setFavOpen] = useState(false)
  const [favLabel, setFavLabel] = useState('')
  const [removing, setRemoving] = useState<number | null>(null)
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
            <SectionHeader icon={<ScaleIcon />} tone="steel">
              Breakdown
            </SectionHeader>

            <dl className="mt-3 grid grid-cols-3 gap-2">
              {[
                { k: 'Bar', v: fmt(loadout.barWeight), tone: '' },
                { k: 'Collars', v: fmt(settings.collars ? loadout.collarWeight * 2 : 0), tone: '' },
                {
                  k: 'Plates',
                  v: fmt(Math.max(0, result.platesTotal)),
                  tone: result.ok ? 'text-good' : 'text-bad',
                },
              ].map((cell) => (
                <div key={cell.k} className="rounded-xl bg-surface2/70 px-2 py-2 text-center">
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">{cell.k}</dt>
                  <dd className={`text-base font-semibold tabular-nums ${cell.tone}`}>{cell.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-2.5 flex items-baseline justify-between border-t border-line pt-2.5">
              <span className="text-xs text-muted">
                {fmt(result.perSide > 0 ? result.perSide : 0)} {settings.unit} a side · steps of {fmt(step)}
              </span>
              <span className="text-sm font-semibold tabular-nums">
                {fmt(settings.target)} {settings.unit}
              </span>
            </div>

            {/* Loadable weights near this one — a scrolling row, never wrapping. */}
            <div className="hide-scroll -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {jumps.down != null && (
                <button className="chip shrink-0" onClick={() => pick(jumps.down!)}>
                  ↓ {fmt(jumps.down)}
                </button>
              )}
              {jumps.up != null && (
                <button className="chip shrink-0" onClick={() => pick(jumps.up!)}>
                  ↑ {fmt(jumps.up)}
                </button>
              )}
              {jumps.competitionUp != null && jumps.competitionUp !== jumps.up && (
                <button
                  className="chip shrink-0"
                  onClick={() => pick(jumps.competitionUp!)}
                  title="Next competition increment"
                >
                  ↑ {fmt(jumps.competitionUp)} comp
                </button>
              )}
            </div>

            {/* Actions on this weight, kept apart from the weights you can jump to. */}
            <div className="mt-3 flex overflow-hidden rounded-xl border border-line" role="group" aria-label="Actions">
              <button
                type="button"
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 text-sm font-medium transition hover:bg-surface2"
                onClick={addFavorite}
                title="Save as favourite"
              >
                <span className="text-gold">
                  <StarIcon size={16} />
                </span>
                Save
              </button>
              <button
                type="button"
                className="flex min-h-[44px] flex-1 items-center justify-center gap-2 border-l border-line text-sm font-medium transition hover:bg-surface2"
                onClick={copy}
                title="Copy a summary"
              >
                <CopyIcon />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </section>

          {favorites.length > 0 && (
            <section className="card overflow-hidden" aria-label="Favourites">
              <SectionHeader
                icon={<StarIcon size={16} filled />}
                tone="gold"
                className="px-4 pb-2.5 pt-3"
                right={<span className="text-xs text-muted tabular-nums">{favorites.length} saved</span>}
              >
                Favourites
              </SectionHeader>
              <ul className="max-h-64 divide-y divide-line overflow-y-auto border-t border-line">
                {favorites.map((f) => {
                  const foreign = f.unit !== settings.unit
                  return (
                    <li key={f.index} className="flex items-stretch">
                      <button
                        type="button"
                        className="flex min-h-[52px] flex-1 items-center gap-3 px-4 text-left transition hover:bg-surface2"
                        onClick={() => pickWeight(f.weight, f.unit)}
                        title={foreign ? `Switches to ${f.unit === 'lb' ? 'Metcon' : 'Eleiko'}` : undefined}
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {f.label || <span className="text-muted">Unnamed</span>}
                        </span>
                        <span className="shrink-0 text-sm tabular-nums">
                          <span className="font-semibold">{fmt(f.weight)}</span>{' '}
                          <span className={foreign ? 'text-ink' : 'text-muted'}>{f.unit}</span>
                        </span>
                        {foreign && (
                          <span className="shrink-0 rounded-full bg-surface2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
                            {f.unit === 'lb' ? 'Metcon' : 'Eleiko'}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        className="flex min-h-[52px] w-12 shrink-0 items-center justify-center border-l border-line text-muted transition hover:bg-surface2 hover:text-bad"
                        onClick={() => setRemoving(f.index)}
                        aria-label={`Remove favourite ${f.label || 'unnamed'} — ${fmt(f.weight)} ${f.unit}`}
                        title="Remove"
                      >
                        <XIcon />
                      </button>
                    </li>
                  )
                })}
              </ul>
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
              <button className="chip" onClick={() => setZoom((z) => (z >= 2.4 ? 1 : z + 0.7))} title="Magnify the bar">
                {zoom > 1 ? `${zoom.toFixed(1)}×` : 'Zoom'}
              </button>
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

          {settings.lastWeights.length > 0 && (
            <section className="card px-4 py-3" aria-label="Recent weights">
              <SectionHeader icon={<ClockIcon />} tone="sky" className="mb-2.5">
                Recent
              </SectionHeader>
              <div className="hide-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                {settings.lastWeights.map((r) => (
                  <button
                    key={`${r.weight}-${r.unit}`}
                    className="chip tabular-nums"
                    onClick={() => pickWeight(r.weight, r.unit)}
                    title={r.unit === settings.unit ? undefined : `Switches to ${r.unit === 'lb' ? 'Metcon' : 'Eleiko'}`}
                  >
                    <span className="font-semibold">{fmt(r.weight)}</span>
                    <span className={r.unit === settings.unit ? 'text-muted' : 'text-ink'}>{r.unit}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
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

import { useEffect, useMemo, useState } from 'react'
import {
  BARS,
  COLLARS,
  PRESETS,
  barById,
  barWeight,
  defaultInventory,
  getPlateSet,
  type CollarKind,
  type PlateDef,
} from '../data/plates'
import { fmt } from '../lib/format'
import { collarWeightOf, type Settings } from '../lib/settings'
import { NumberField } from './NumberField'
import { ThemeToggle } from './ThemeToggle'
import { Segmented, Sheet, Toggle } from './ui'

export function SettingsSheet({
  open,
  onClose,
  settings,
  update,
  onReset,
}: {
  open: boolean
  onClose: () => void
  settings: Settings
  update: (patch: Partial<Settings>) => void
  onReset: () => void
}) {
  const bar = barById(settings.barId)
  const collar = COLLARS[settings.collarKind]

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Setup"
      wide
      footer={
        <div className="flex items-center justify-between gap-3">
          <ResetButton onReset={onReset} />
          <button className="btn btn-primary px-6" onClick={onClose}>
            Done
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        {/* --------------------------------------------------------- display */}
        <section aria-labelledby="set-display">
          <h3 id="set-display" className="label mb-2">
            Display
          </h3>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-ink">Theme</span>
            <ThemeToggle theme={settings.theme} onChange={(theme) => update({ theme })} />
          </div>
          <div className="mt-2 border-t border-line pt-1">
            <Toggle
              checked={settings.gymMode}
              onChange={(gymMode) => update({ gymMode })}
              label="Gym mode"
              hint="Bigger type, higher contrast, secondary controls hidden — for reading the bar from a couple of metres away"
            />
          </div>
          <div className="border-t border-line pt-1">
            <Toggle
              checked={settings.showLabels}
              onChange={(showLabels) => update({ showLabels })}
              label="Weights on the drawing"
              hint="Print each plate’s weight above it on the bar"
            />
          </div>
          {settings.brand === 'eleiko' && (
            <div className="flex items-center justify-between gap-4 border-t border-line py-2">
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">Eleiko plates</span>
                <span className="text-xs text-muted">Rubber bumpers or calibrated steel discs</span>
              </span>
              <Segmented
                value={settings.plateStyle === 'calibrated-steel' ? 'calibrated-steel' : 'bumper'}
                onChange={(plateStyle) => update({ plateStyle })}
                label="Eleiko plate style"
                options={[
                  { value: 'bumper', label: 'Bumper' },
                  { value: 'calibrated-steel', label: 'Steel' },
                ]}
              />
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------- bar */}
        <section aria-labelledby="set-bar">
          <h3 id="set-bar" className="label mb-2">
            Bar
          </h3>
          <select
            className="btn w-full justify-between"
            value={settings.barId}
            onChange={(e) => update({ barId: e.target.value })}
            aria-label="Bar"
          >
            {BARS.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-muted">
            {bar.note ?? 'Custom weight'} · {fmt(barWeight(bar, settings.unit, settings.customBarWeight))} {settings.unit} ·
            sleeve {bar.sleeveMm} mm
          </p>
          {bar.custom && (
            <label className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-muted">Bar weight ({settings.unit})</span>
              <NumberField
                className="btn w-32 justify-center"
                value={settings.customBarWeight}
                placeholder={fmt(barWeight(bar, settings.unit, null))}
                onCommit={(v) => update({ customBarWeight: v && v > 0 ? v : null })}
                aria-label={`Custom bar weight in ${settings.unit}`}
              />
            </label>
          )}
        </section>

        {/* --------------------------------------------------------- collars */}
        <section aria-labelledby="set-collars">
          <h3 id="set-collars" className="label mb-2">
            Collars
          </h3>
          <Toggle
            checked={settings.collars}
            onChange={(v) => update({ collars: v })}
            label="Collars on the bar"
            hint={`${collar.label} — ${collar.note}`}
          />
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <select
              className="btn justify-between"
              value={settings.collarKind}
              onChange={(e) => update({ collarKind: e.target.value as CollarKind, collarWeight: null })}
              aria-label="Collar type"
            >
              {Object.values(COLLARS).map((c) => (
                <option key={c.kind} value={c.kind}>
                  {c.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 text-sm">
              <span className="shrink-0 text-muted">Each ({settings.unit})</span>
              <NumberField
                className="btn w-full justify-center"
                value={collarWeightOf(settings)}
                onCommit={(v) => update({ collarWeight: v })}
                aria-label={`Collar weight in ${settings.unit}`}
              />
            </label>
          </div>
        </section>

        {/* ------------------------------------------------------- inventory */}
        <InventoryEditor settings={settings} update={update} />
      </div>
    </Sheet>
  )
}

export function InventoryEditor({
  settings,
  update,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
}) {
  const plates = useMemo(
    () =>
      getPlateSet({
        brand: settings.brand,
        unit: settings.unit,
        metconStyle: 'colored',
        eleikoStyle: settings.plateStyle,
      }),
    [settings.brand, settings.unit, settings.plateStyle],
  )
  const relevant = PRESETS.filter((p) => p.brand === settings.brand && p.unit === settings.unit)
  const bumpers = plates.filter((p) => p.kind === 'bumper')
  const change = plates.filter((p) => p.kind !== 'bumper')

  const setCount = (id: string, n: number) =>
    update({ inventory: { ...settings.inventory, [id]: Math.max(0, Math.min(99, Math.round(n))) } })

  return (
    <section aria-labelledby="set-inv">
      <h3 id="set-inv" className="label mb-2">
        Plates in the gym
      </h3>
      <p className="mb-3 text-xs text-muted">
        Count every plate in the building. Loading is symmetric, so a pair gives you one plate a side.
      </p>

      <div className="hide-scroll -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">
        {relevant.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chip"
            title={p.hint}
            onClick={() => update({ inventory: { ...settings.inventory, ...zeroed(plates), ...p.counts } })}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() => update({ inventory: { ...settings.inventory, ...defaultInventory(settings.brand, settings.unit) } })}
        >
          Reset to default
        </button>
      </div>

      <Toggle
        checked={settings.includeChange}
        onChange={(v) => update({ includeChange: v })}
        label="Change plates available"
        hint={settings.brand === 'metcon' ? 'Metcon sells bumpers only — turn this off to match the catalogue' : 'Small plates for fine increments'}
      />

      <PlateRows title="Bumpers" plates={bumpers} settings={settings} setCount={setCount} />
      {change.length > 0 && (
        <PlateRows title="Change plates" plates={change} settings={settings} setCount={setCount} dimmed={!settings.includeChange} />
      )}
    </section>
  )
}

const zeroed = (plates: PlateDef[]) => Object.fromEntries(plates.map((p) => [p.id, 0]))

function PlateRows({
  title,
  plates,
  settings,
  setCount,
  dimmed = false,
}: {
  title: string
  plates: PlateDef[]
  settings: Settings
  setCount: (id: string, n: number) => void
  dimmed?: boolean
}) {
  return (
    <div className={`mt-4 ${dimmed ? 'opacity-45' : ''}`}>
      <h4 className="label mb-2">{title}</h4>
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line">
        {plates.map((p) => {
          const count = settings.inventory[p.id] ?? 0
          return (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2">
              <span
                className="h-7 w-7 shrink-0 rounded-full border border-black/20 shadow-inner"
                style={{ background: p.color }}
                aria-hidden="true"
              />
              <span className="w-24 shrink-0 text-sm font-semibold tabular-nums">
                {fmt(p.weight)} {p.unit}
              </span>
              <span className="hidden flex-1 text-xs text-muted sm:block">
                ⌀{p.diameterMm} mm · {p.thicknessMm} mm
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className="btn h-10 w-10 min-h-0 rounded-lg px-0 text-lg"
                  onClick={() => setCount(p.id, count - 2)}
                  aria-label={`Remove a pair of ${p.weight} ${p.unit} plates`}
                >
                  −
                </button>
                <NumberField
                  integer
                  max={99}
                  className="h-10 w-14 rounded-lg border border-line bg-surface text-center text-sm tabular-nums"
                  value={count}
                  onCommit={(v) => setCount(p.id, v ?? 0)}
                  aria-label={`${p.weight} ${p.unit} plates in the gym`}
                />
                <button
                  type="button"
                  className="btn h-10 w-10 min-h-0 rounded-lg px-0 text-lg"
                  onClick={() => setCount(p.id, count + 2)}
                  aria-label={`Add a pair of ${p.weight} ${p.unit} plates`}
                >
                  +
                </button>
              </div>
              <span className="w-16 shrink-0 text-right text-xs text-muted tabular-nums">
                {Math.floor(count / 2)}/side
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * Reset wipes favourites, recents, inventory and setup, so it takes a second
 * tap — the first only arms it, and it disarms itself after a few seconds.
 */
function ResetButton({ onReset }: { onReset: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => window.clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={`btn ${armed ? 'btn-danger' : 'btn-ghost'}`}
      onClick={() => (armed ? onReset() : setArmed(true))}
      aria-live="polite"
    >
      {armed ? 'Tap again to erase everything' : 'Reset everything'}
    </button>
  )
}

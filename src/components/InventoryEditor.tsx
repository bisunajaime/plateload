import { useEffect, useMemo, useRef, useState } from 'react'
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
import { feedback, hapticsSupported, primeSound, setSoundEnabled } from '../feel'

export function SettingsSheet({
  open,
  onClose,
  settings,
  update,
  onInventory,
  onReset,
}: {
  open: boolean
  onClose: () => void
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /** Replace the plate counts wholesale (a preset, a reset) — undoable, with a message. */
  onInventory: (inventory: Record<string, number>, message: string) => void
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

        {/* -------------------------------------------------------- feedback */}
        <section aria-labelledby="set-feedback">
          <h3 id="set-feedback" className="label mb-2">
            Feedback
          </h3>
          <Toggle
            checked={settings.sound}
            onChange={(sound) => {
              // Turning sound on answers with a sound, so you know what you asked for.
              setSoundEnabled(sound)
              if (sound) {
                primeSound()
                feedback('confirm')
              }
              update({ sound })
            }}
            label="Sounds"
            hint="Quiet clicks, and a thunk as each plate goes on. Follows your phone’s silent switch."
          />
          {hapticsSupported() && (
            <div className="border-t border-line pt-1">
              <Toggle
                checked={settings.haptics}
                onChange={(haptics) => update({ haptics })}
                label="Vibration"
                hint="A light tap under your thumb on steps, plates and saves"
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
        <InventoryEditor settings={settings} update={update} onInventory={onInventory} />
      </div>
    </Sheet>
  )
}

export function InventoryEditor({
  settings,
  update,
  onInventory,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  onInventory: (inventory: Record<string, number>, message: string) => void
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
            onClick={() => onInventory({ ...settings.inventory, ...zeroed(plates), ...p.counts }, `Plates set to “${p.label}”.`)}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() =>
            onInventory({ ...settings.inventory, ...defaultInventory(settings.brand, settings.unit) }, 'Plates back to the default set.')
          }
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

/** How long to hold before everything is erased. */
const ERASE_HOLD_MS = 1200
/** How long a keyboard-armed erase waits for the second press. */
const ERASE_ARM_MS = 4000

/**
 * Reset wipes favourites, recents, inventory and setup, with no undo — so it
 * takes deliberate effort. With a finger or a mouse: hold, while a bar fills;
 * let go early and nothing happens. A keyboard, screen reader or switch can
 * only click, so there it is two presses: the first arms, the second erases.
 */
function ResetButton({ onReset }: { onReset: () => void }) {
  const [holding, setHolding] = useState(false)
  const [armed, setArmed] = useState(false)
  const [hint, setHint] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const resetRef = useRef(onReset)
  useEffect(() => {
    resetRef.current = onReset
  })
  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (!armed && !hint) return
    const t = window.setTimeout(() => {
      setArmed(false)
      setHint(false)
    }, armed ? ERASE_ARM_MS : 2400)
    return () => window.clearTimeout(t)
  }, [armed, hint])

  const erase = () => {
    setHolding(false)
    setArmed(false)
    feedback('confirm')
    resetRef.current()
  }
  const start = () => {
    setHint(false)
    setHolding(true)
    feedback('step')
    // Scheduled here, once: a re-render mid-hold must not restart the count.
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(erase, ERASE_HOLD_MS)
  }
  const stop = () => {
    if (!holding) return
    window.clearTimeout(timer.current)
    setHolding(false)
    // Let go too soon: say how it works rather than doing nothing silently.
    setHint(true)
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className={`btn relative select-none overflow-hidden [-webkit-touch-callout:none] ${holding || armed ? 'btn-danger' : 'btn-ghost'}`}
        style={{ ['--hold-ms' as string]: `${ERASE_HOLD_MS}ms` }}
        onPointerDown={(e) => e.button === 0 && start()}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onClick={(e) => {
          // Pointer clicks are handled by the hold. A click with no pointer
          // behind it (detail 0) is a keyboard or assistive press: arm, then erase.
          if (e.detail !== 0) return
          if (armed) erase()
          else {
            setArmed(true)
            feedback('step')
          }
        }}
        onContextMenu={(e) => e.preventDefault()}
        aria-describedby="erase-hint"
      >
        <span aria-hidden="true" data-holding={holding} className="hold-fill absolute inset-0 bg-black/20" />
        <span className="relative">{holding ? 'Keep holding…' : armed ? 'Press again to erase everything' : 'Reset everything'}</span>
      </button>
      <span id="erase-hint" className="sr-only">
        Erases favourites, recents, plates and setup. Hold to erase, or press twice.
      </span>
      <span className="sr-only" aria-live="polite">
        {armed ? 'Press again to erase everything.' : ''}
      </span>
      {hint && (
        <span className="pointer-events-none absolute inset-x-0 -top-6 whitespace-nowrap text-center text-xs text-muted fade-up" aria-hidden="true">
          Hold to erase
        </span>
      )}
    </span>
  )
}

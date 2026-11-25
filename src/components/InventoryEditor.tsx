import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  BARS,
  COLLARS,
  PRESETS,
  barById,
  barWeight,
  defaultInventory,
  getPlateSet,
  type BarDef,
  type CollarKind,
  type PlateDef,
  type Unit,
} from '../data/plates'
import { feedback, hapticsSupported, primeSound, setSoundEnabled } from '../feel'
import { fmt } from '../lib/format'
import { collarWeightOf, type Settings } from '../lib/settings'
import { Choice } from './kit/Choice'
import { Chip } from './kit/Chip'
import { Field } from './kit/Field'
import { ChevronDownIcon } from './kit/icons'
import { Section } from './kit/Section'
import { Stepper } from './kit/Stepper'
import { Switch } from './kit/Switch'
import { buttonClass, inputClass } from './kit/styles'
import { NumberField } from './NumberField'
import { ThemeToggle } from './ThemeToggle'

/**
 * The Gym tab. Your equipment first — it decides whether every answer is
 * right — then how the app looks and sounds, then the one destructive action,
 * last and out of the way.
 */
export function GymSettings({
  settings,
  update,
  onInventory,
  onReset,
  footer,
}: {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  /** Replace the plate counts wholesale (a preset, a reset) — undoable, with a message. */
  onInventory: (inventory: Record<string, number>, message: string) => void
  onReset: () => void
  footer?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-10">
      <PlatesSection settings={settings} update={update} onInventory={onInventory} />
      <BarSection settings={settings} update={update} />
      <CollarSection settings={settings} update={update} />
      <DisplaySection settings={settings} update={update} />
      <FeedbackSection settings={settings} update={update} />
      <Section title="Start over">
        <ResetButton onReset={onReset} />
      </Section>
      {footer}
    </div>
  )
}

type Part = { settings: Settings; update: (patch: Partial<Settings>) => void }

/** Settings inside a section: rules between, not boxes around. */
const Rows = ({ children }: { children: ReactNode }) => <div className="flex flex-col divide-y divide-line">{children}</div>

/* ------------------------------------------------------------------ plates */

/** Counts for exactly this set of plates, missing ones as 0 — what a preset would leave behind. */
const countsFor = (plates: PlateDef[], counts: Record<string, number>) => plates.map((p) => counts[p.id] ?? 0).join(',')

function PlatesSection({ settings, update, onInventory }: Part & { onInventory: (inventory: Record<string, number>, message: string) => void }) {
  const plates = useMemo(
    () => getPlateSet({ brand: settings.brand, unit: settings.unit, metconStyle: 'colored', eleikoStyle: settings.plateStyle }),
    [settings.brand, settings.unit, settings.plateStyle],
  )
  const presets = PRESETS.filter((p) => p.brand === settings.brand && p.unit === settings.unit)
  const current = countsFor(plates, settings.inventory)
  const active = presets.find((p) => countsFor(plates, p.counts) === current)
  const defaults = defaultInventory(settings.brand, settings.unit)
  const isDefault = countsFor(plates, defaults) === current

  const bumpers = plates.filter((p) => p.kind === 'bumper')
  const small = plates.filter((p) => p.kind !== 'bumper')
  const setCount = (id: string, n: number) => update({ inventory: { ...settings.inventory, [id]: Math.max(0, Math.min(99, Math.round(n))) } })
  const zeroed = Object.fromEntries(plates.map((p) => [p.id, 0]))

  return (
    <Section title="Plates in your gym">
      <p className="mb-4 text-base text-muted">Count every plate in the building. Loading is even on both sides, so a pair gives you one plate a side.</p>

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Start from a gym like yours</h3>
      <ul className="flex flex-col gap-2">
        {presets.map((p) => {
          const on = p === active
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => {
                  if (on) return
                  onInventory({ ...settings.inventory, ...zeroed, ...p.counts }, `Plates set to “${p.label}”.`)
                }}
                className={`flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-4 py-2.5 text-left transition active:scale-press-wide ${
                  on ? 'border-transparent bg-ink text-bg' : 'border-edge bg-surface text-ink hover:bg-surface2'
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-base font-semibold">{p.label}</span>
                  <span className={`text-sm ${on ? 'text-bg/80' : 'text-muted'}`}>{p.hint}</span>
                </span>
                {on && <span className="shrink-0 text-sm font-semibold">In use</span>}
              </button>
            </li>
          )
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Chip
          disabled={isDefault}
          className="disabled:cursor-not-allowed disabled:border-line disabled:text-muted"
          onClick={() => onInventory({ ...settings.inventory, ...defaults }, 'Plate counts back to the standard set.')}
        >
          Put back the standard counts
        </Chip>
        <span className="text-sm text-muted">{isDefault ? 'You’re on the standard counts.' : 'Only the plate counts — nothing else.'}</span>
      </div>

      <div className="mt-6">
        <Switch
          checked={settings.includeChange}
          onChange={(includeChange) => update({ includeChange })}
          label="Small plates"
          hint={
            settings.brand === 'metcon'
              ? 'The 5 and 2.5 lb plates (change plates). Metcon sells bumpers only — switch off to match.'
              : 'The 5 kg and smaller plates (change plates), for fine jumps.'
          }
        />
      </div>

      <PlateList title="Bumpers" plates={bumpers} settings={settings} setCount={setCount} />
      {small.length > 0 && (
        <PlateList
          title="Small plates"
          plates={small}
          settings={settings}
          setCount={setCount}
          off={!settings.includeChange}
          note={!settings.includeChange ? 'Switched off — the app won’t use these. Your counts are kept for when you switch them back on.' : undefined}
        />
      )}

      <details className="group mt-4">
        <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-2 rounded-lg text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
          <span className="transition group-open:rotate-180">
            <ChevronDownIcon />
          </span>
          Plate sizes
        </summary>
        <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-muted sm:grid-cols-3">
          {plates.map((p) => (
            <li key={p.id} className="tabular-nums">
              <span className="font-semibold text-ink">
                {fmt(p.weight)} {p.unit}
              </span>{' '}
              ⌀{p.diameterMm} · {p.thicknessMm} mm
            </li>
          ))}
        </ul>
      </details>
    </Section>
  )
}

function PlateList({
  title,
  plates,
  settings,
  setCount,
  off = false,
  note,
}: {
  title: string
  plates: PlateDef[]
  settings: Settings
  setCount: (id: string, n: number) => void
  off?: boolean
  note?: string
}) {
  const [adjusted, setAdjusted] = useState<string | null>(null)
  useEffect(() => {
    if (!adjusted) return
    const t = window.setTimeout(() => setAdjusted(null), 4000)
    return () => window.clearTimeout(t)
  }, [adjusted])
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">{title}</h3>
      {note && <p className="mb-2 text-sm text-muted">{note}</p>}
      <ul className="flex flex-col divide-y divide-line rounded-2xl border border-line bg-surface">
        {plates.map((p) => {
          const count = settings.inventory[p.id] ?? 0
          const perSide = Math.floor(count / 2)
          const name = `${fmt(p.weight)} ${p.unit}`
          return (
            <li key={p.id} className="flex items-center gap-2.5 py-2 pl-3 pr-2">
              <span
                aria-hidden="true"
                className={`h-6 w-6 shrink-0 rounded-full ${off ? 'opacity-50' : ''}`}
                style={{ background: p.color, boxShadow: 'inset 0 0 0 1px rgb(var(--ink) / 0.28)' }}
              />
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className={`font-cond text-lg font-bold tabular-nums ${off ? 'text-muted' : 'text-ink'}`}>{name}</span>
                <span className="text-sm tabular-nums text-muted">
                  {perSide} a side{count % 2 ? ' · 1 spare' : ''}
                </span>
              </span>
              <Stepper
                value={count}
                step={2}
                onChange={(n) => setCount(p.id, n)}
                onAdjust={(m) => setAdjusted(`${name}: ${m}`)}
                label={`${name} plates in the gym`}
                decreaseLabel={`One pair fewer of ${name}`}
                increaseLabel={`One more pair of ${name}`}
              />
            </li>
          )
        })}
      </ul>
      <p role="status" className={`mt-1 text-sm text-accent-ink ${adjusted ? '' : 'sr-only'}`}>
        {adjusted ?? ''}
      </p>
    </div>
  )
}

/* --------------------------------------------------------------------- bar */

/**
 * A bar's name with its weight in the unit you're loading in. A bar made to a
 * round number in the other unit keeps it, with yours beside it: "20 kg (44.1 lb)",
 * not "44.09 lb".
 */
function barName(b: BarDef, unit: Unit) {
  if (b.custom) return 'Custom bar'
  const name = b.label.split(' — ')[0]
  const native: Unit = Number.isInteger(b.kg) && !Number.isInteger(b.lb) ? 'kg' : 'lb'
  const mine = barWeight(b, unit)
  if (native === unit) return `${name} — ${fmt(mine)} ${unit}`
  return `${name} — ${fmt(b[native])} ${native} (${fmt(Math.round(mine * 10) / 10)} ${unit})`
}

function Select({
  id,
  value,
  onChange,
  children,
  describedBy,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  children: ReactNode
  describedBy?: string
}) {
  return (
    <span className="relative block">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={describedBy}
        className={`${inputClass} cursor-pointer appearance-none pr-10`}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
        <ChevronDownIcon />
      </span>
    </span>
  )
}

function BarSection({ settings, update }: Part) {
  const bar = barById(settings.barId)
  // This brand's bars and the unbranded ones; whatever is chosen stays listed.
  const bars = BARS.filter((b) => b.brand === settings.brand || b.brand === null || b.id === settings.barId)
  const weight = barWeight(bar, settings.unit, settings.customBarWeight)
  return (
    <Section title="Bar">
      <Field label="Which bar" hint={bar.custom ? undefined : `${bar.note ? `${bar.note} · ` : ''}sleeve ${bar.sleeveMm} mm`}>
        {({ id, ...aria }) => (
          <Select id={id} value={settings.barId} onChange={(barId) => update({ barId })} describedBy={aria['aria-describedby']}>
            {bars.map((b) => (
              <option key={b.id} value={b.id}>
                {barName(b, settings.unit)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      {bar.custom && (
        <div className="mt-4">
          <Field label={`Bar weight (${settings.unit})`} hint={`Leave it empty for ${fmt(barWeight(bar, settings.unit, null))} ${settings.unit}.`}>
            {({ onAdjust, ...control }) => (
              <NumberField
                {...control}
                className={`${inputClass} max-w-[10rem]`}
                min={0.5}
                max={200}
                value={settings.customBarWeight}
                placeholder={fmt(barWeight(bar, settings.unit, null))}
                onAdjust={onAdjust}
                onCommit={(v) => update({ customBarWeight: v && v > 0 ? v : null })}
              />
            )}
          </Field>
          <p className="mt-1 text-sm text-muted">
            Counting it as{' '}
            <span className="font-semibold tabular-nums text-ink">
              {fmt(weight)} {settings.unit}
            </span>
            .
          </p>
        </div>
      )}
    </Section>
  )
}

/* ----------------------------------------------------------------- collars */

function CollarSection({ settings, update }: Part) {
  const collar = COLLARS[settings.collarKind]
  const each = collarWeightOf(settings)
  const custom = settings.collarWeight != null
  return (
    <Section title="Collars">
      <Switch
        checked={settings.collars}
        onChange={(collars) => update({ collars })}
        label="Collars on the bar"
        hint={settings.collars ? `${fmt(each * 2)} ${settings.unit} for the pair, counted in every load.` : 'Nothing is added for collars.'}
      />
      {settings.collars && (
        <div className="mt-4 flex flex-col gap-4">
          <Field label="Type" hint={collar.note}>
            {({ id, ...aria }) => (
              <Select
                id={id}
                value={settings.collarKind}
                onChange={(v) => update({ collarKind: v as CollarKind, collarWeight: null })}
                describedBy={aria['aria-describedby']}
              >
                {Object.values(COLLARS).map((c) => (
                  <option key={c.kind} value={c.kind}>
                    {c.label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field
            label={`Weight of each (${settings.unit})`}
            hint={
              custom
                ? 'Your own weight. Changing the type puts back that type’s weight.'
                : `The ${collar.label.toLowerCase()}’s own weight. Type to change it.`
            }
          >
            {({ onAdjust, ...control }) => (
              <NumberField
                {...control}
                className={`${inputClass} max-w-[10rem]`}
                min={0}
                max={settings.unit === 'kg' ? 10 : 25}
                value={each}
                onAdjust={onAdjust}
                onCommit={(v) => update({ collarWeight: v })}
              />
            )}
          </Field>
        </div>
      )}
    </Section>
  )
}

/* ----------------------------------------------------------------- display */

function DisplaySection({ settings, update }: Part) {
  return (
    <Section title="Display">
      <div className="flex flex-col gap-2 pb-3">
        <span className="text-base font-medium text-ink">Theme</span>
        <ThemeToggle theme={settings.theme} onChange={(theme) => update({ theme })} />
      </div>
      <Rows>
        <Switch
          checked={settings.gymMode}
          onChange={(gymMode) => update({ gymMode })}
          label="Gym mode"
          hint="Bigger type and stronger text, for reading the bar from a couple of metres away."
        />
        <Switch
          checked={settings.showLabels}
          onChange={(showLabels) => update({ showLabels })}
          label="Weights on the drawing"
          hint="Print each plate’s weight above it on the bar."
        />
        {settings.brand === 'eleiko' && (
          <div className="flex flex-col gap-2 py-3">
            <span className="flex flex-col">
              <span className="text-base font-medium text-ink">Eleiko plates</span>
              <span className="text-sm text-muted">Rubber bumpers, or thinner calibrated steel discs.</span>
            </span>
            <Choice
              label="Eleiko plate style"
              value={settings.plateStyle === 'calibrated-steel' ? 'calibrated-steel' : 'bumper'}
              onChange={(plateStyle) => update({ plateStyle })}
              options={[
                { value: 'bumper', label: 'Bumpers' },
                { value: 'calibrated-steel', label: 'Steel' },
              ]}
            />
          </div>
        )}
      </Rows>
    </Section>
  )
}

/* ---------------------------------------------------------------- feedback */

function FeedbackSection({ settings, update }: Part) {
  return (
    <Section title="Sound and vibration">
      <Rows>
        <Switch
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
          <Switch
            checked={settings.haptics}
            onChange={(haptics) => update({ haptics })}
            label="Vibration"
            hint="A light tap under your thumb on steps, plates and saves."
          />
        )}
      </Rows>
    </Section>
  )
}

/* ------------------------------------------------------------------- reset */

/** How long to hold before everything is erased. */
const ERASE_HOLD_MS = 1200
/** How long a keyboard-armed erase waits for the second press. */
const ERASE_ARM_MS = 4000

/**
 * Erase wipes favourites, recents, inventory and setup, with no undo — so it
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
    const t = window.setTimeout(
      () => {
        setArmed(false)
        setHint(false)
      },
      armed ? ERASE_ARM_MS : 2400,
    )
    return () => window.clearTimeout(t)
  }, [armed, hint])

  // The reset itself confirms (sound, buzz, toast); this only clears the button.
  const erase = () => {
    setHolding(false)
    setArmed(false)
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
    <div className="flex flex-col items-start gap-2">
      <p id="erase-hint" className="text-sm text-muted">
        Erases saved weights, recents, plate counts and every setting here. It can’t be undone — hold the button, or press it twice.
      </p>
      <button
        type="button"
        className={`relative select-none overflow-hidden [-webkit-touch-callout:none] ${buttonClass(holding || armed ? 'danger' : 'secondary')}`}
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
        <span className="relative">{holding ? 'Keep holding…' : armed ? 'Press again to erase everything' : 'Erase everything'}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {armed ? 'Press again to erase everything.' : ''}
      </span>
      <span className={`text-sm text-accent-ink ${hint ? 'fade-up' : 'invisible'}`} aria-hidden="true">
        Hold it down until it fills.
      </span>
    </div>
  )
}

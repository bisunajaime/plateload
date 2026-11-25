import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useApp } from '../app/context'
import type { PlateDef, Unit } from '../data/plates'
import { feedback } from '../feel'
import type { ComboPlate } from '../lib/combinations'
import { fmt } from '../lib/format'
import { MAX_TARGET } from '../lib/settings'
import { RAMP_PRESETS, percentTable, platesFor, warmupPlan } from '../lib/warmup'
import { Button } from './kit/Button'
import { Chip } from './kit/Chip'
import { Choice } from './kit/Choice'
import { Field } from './kit/Field'
import { PlatePill } from './kit/PlatePill'
import { inputClass } from './kit/styles'
import { NumberField } from './NumberField'

/**
 * Climbing to the working set without leaving the tab: a ramp from the bar up
 * to the work weight, or a table of percentages of your best single. Every row
 * shows its own plates, so the Load tab is never needed mid-warm-up.
 */
export function WarmupPanel() {
  const { settings, update } = useApp()
  const prefs = settings.warmup

  // A brand switch converts the target into the other unit; a pinned max in
  // the old unit would silently mean a different load. Only on a unit change.
  const { unit } = settings
  const lastUnit = useRef(unit)
  useEffect(() => {
    if (unit === lastUnit.current) return
    lastUnit.current = unit
    if (prefs.oneRm != null) update({ warmup: { ...prefs, oneRm: null } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit])

  return (
    <div className="flex flex-col gap-5">
      <Choice
        label="Tool"
        value={prefs.tool}
        onChange={(tool) => update({ warmup: { ...prefs, tool } })}
        options={[
          { value: 'ramp', label: 'Ramp' },
          { value: 'percent', label: '% of max' },
        ]}
      />
      {prefs.tool === 'ramp' ? <Ramp /> : <Percent />}
    </div>
  )
}

/* -------------------------------------------------------------------- ramp */

/**
 * The work weight outlives the tab: hop to Load to check the bar mid-ramp and
 * come back, and the ramp is still the one you were climbing.
 */
let kept: { work: number; unit: Unit } | null = null

function Ramp() {
  const app = useApp()
  const { settings, update, input, loadout } = app
  const { target, unit } = settings
  const prefs = settings.warmup

  // The weight the ramp is built towards, held apart from the weight on the bar.
  // Tying the plan to the target made the list rewrite itself the moment you
  // used it: tap 60 % and the ramp became a ramp to 60, work weight gone.
  const [work, setWork] = useState(() => (kept && kept.unit === unit && kept.work >= target ? kept.work : target))
  useEffect(() => {
    kept = { work, unit }
  }, [work, unit])
  // Derived during render: every step sits at or below the top, so anything
  // heavier is a new working weight. Lighter is someone climbing the ramp.
  const [seen, setSeen] = useState({ target, unit })
  if (target !== seen.target || unit !== seen.unit) {
    setSeen({ target, unit })
    // A unit change converts everything; start again from the bar's weight.
    if (unit !== seen.unit || target > work + 1e-9) setWork(target)
  }

  const plan = useMemo(() => warmupPlan(work, input, prefs.ramp), [work, input, prefs.ramp])
  const byId = usePlateIndex()
  const base = loadout.base
  const onlyBar = work <= base + 1e-9
  const workStep = plan[plan.length - 1]
  const workSnapped = !onlyBar && Math.abs(workStep.weight - work) > 0.001

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <p className="text-base text-ink">
          Ramping to{' '}
          <span className="font-cond text-lg font-bold tabular-nums">
            {fmt(work)} {unit}
          </span>
          <span className="sr-only">. Every step is a weight your plates can make.</span>
        </p>
        {work - target > 0.001 ? (
          <Chip onClick={() => setWork(target)}>
            Ramp to {fmt(target)} {unit} instead
          </Chip>
        ) : (
          // On a desktop the load is right beside this pane.
          <Button size="sm" variant="ghost" onClick={() => app.go('load')} className="-mr-3 lg:hidden" aria-label="Change the working weight on the Load tab">
            Change
          </Button>
        )}
      </div>

      {onlyBar ? (
        <Notice>
          {fmt(work)} {unit} is the empty bar — nothing to warm up with plates. Set a heavier working weight on the Load tab.
        </Notice>
      ) : (
        <>
          {workSnapped && (
            <Notice>
              Your plates can’t make {fmt(work)} {unit}, so the work set is the nearest you can load: {fmt(workStep.weight)} {unit}.
            </Notice>
          )}
          {plan.length <= 2 && (
            <Notice>Too light for warm-up steps between the bar and the work set — go straight from the bar.</Notice>
          )}
          <PerSide />
          <ol className="flex flex-col gap-2" aria-label="Warm-up sets, lightest first">
            {plan.map((s) => (
              <li key={s.key}>
                <Row
                  label={s.bareBar ? 'Bar' : s.key === 'work' ? 'Work' : s.label}
                  weight={s.weight}
                  unit={unit}
                  note={!s.bareBar && Math.abs(s.weight - s.ideal) > 0.001 ? `aimed for ${fmt(s.ideal)}` : undefined}
                  plates={platesFor(input, s.weight)}
                  byId={byId}
                  current={Math.abs(s.weight - target) < 0.001}
                  onClick={() => {
                    // Climbing moves the bar but isn't worth remembering.
                    feedback('select')
                    app.setTarget(s.weight)
                  }}
                />
              </li>
            ))}
          </ol>
        </>
      )}

      <div className="flex flex-col gap-2">
        <span id="ramp-label" className="text-sm font-medium text-ink">
          Steps
        </span>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="ramp-label">
          {RAMP_PRESETS.map((p) => (
            <Chip
              key={p.label}
              selected={prefs.ramp.join() === p.ramp.join()}
              onClick={() => update({ warmup: { ...prefs, ramp: p.ramp } })}
            >
              {p.label}
              <span className="font-normal opacity-80">· {p.ramp.length + 2} sets</span>
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- percent */

function Percent() {
  const app = useApp()
  const { settings, update, input, loadout } = app
  const { target, unit } = settings
  const prefs = settings.warmup
  const oneRm = prefs.oneRm ?? target
  const pinned = prefs.oneRm != null
  const rows = useMemo(() => percentTable(oneRm, input, 50, 100, prefs.step), [oneRm, input, prefs.step])
  const byId = usePlateIndex()

  return (
    <div className="flex flex-col gap-4">
      <Field
        label={`Your best single lift (1RM), in ${unit}`}
        hint={pinned ? 'Clear it to follow the weight on the bar again.' : 'Starts at the weight on the bar — type your max to keep it.'}
      >
        {(control) => (
          <NumberField
            {...control}
            className={`${inputClass} max-w-[12rem] font-cond text-lg font-bold`}
            value={oneRm}
            min={Math.max(1, loadout.base)}
            max={MAX_TARGET}
            onCommit={(v) => update({ warmup: { ...prefs, oneRm: v } })}
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-ink">A row every</span>
        <Choice
          label="A row every"
          value={String(prefs.step) as '2.5' | '5' | '10'}
          onChange={(v) => update({ warmup: { ...prefs, step: Number(v) } })}
          options={[
            { value: '2.5', label: '2.5%' },
            { value: '5', label: '5%' },
            { value: '10', label: '10%' },
          ]}
          className="max-w-xs"
        />
      </div>
      <PerSide />
      <ol className="flex flex-col gap-2" aria-label={`Percentages of ${fmt(oneRm)} ${unit}`}>
        {rows.map((r) => (
          <li key={r.pct}>
            <Row
              label={`${r.pct}%`}
              weight={r.weight}
              unit={unit}
              note={r.exact ? undefined : `aimed for ${fmt(r.ideal)}`}
              plates={platesFor(input, r.weight)}
              byId={byId}
              current={Math.abs(r.weight - target) < 0.001}
              onClick={() => {
                // Loading a row moves the bar, and the max follows the bar until
                // it's set — so pin it first, or the row you tapped becomes the
                // new 100 % and the table rebuilds under your thumb.
                if (!pinned) update({ warmup: { ...prefs, oneRm } })
                feedback('select')
                app.pick(r.weight)
              }}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

/* --------------------------------------------------------------------- row */

/**
 * One set: what it is, the weight big enough to read at arm's length, and the
 * plates for one side. The set on the bar is edged in ink and says so.
 */
function Row({
  label,
  weight,
  unit,
  note,
  plates,
  byId,
  current,
  onClick,
}: {
  label: string
  weight: number
  unit: Unit
  note?: string
  plates: ComboPlate[] | null
  byId: Map<string, PlateDef>
  current: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
      className={`grid min-h-[64px] w-full select-none grid-cols-[3rem_auto_minmax(0,1fr)] items-center gap-x-3 rounded-xl border bg-surface px-4 py-2 text-left transition active:scale-press-wide ${
        current ? 'border-ink ring-1 ring-ink' : 'border-edge hover:bg-surface2'
      }`}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="flex flex-col">
        <span className="flex items-baseline gap-1">
          <span className="font-cond text-xl font-bold tabular-nums text-ink">{fmt(weight)}</span>
          <span className="text-sm text-muted">{unit}</span>
        </span>
        {current ? (
          <span className="mt-0.5 w-max rounded-full bg-accent px-2 text-xs font-semibold leading-5 text-on-accent">On the bar</span>
        ) : (
          note && <span className="text-xs text-muted">{note}</span>
        )}
      </span>
      <span className="flex flex-wrap items-center justify-end gap-1">
        <span className="sr-only">{describe(plates, unit)}</span>
        {plates == null ? (
          <span className="text-sm text-bad" aria-hidden="true">
            Can’t load this
          </span>
        ) : plates.length === 0 ? (
          <span className="text-sm text-muted" aria-hidden="true">
            Empty bar
          </span>
        ) : (
          plates.map((p) => {
            const def = byId.get(p.id)
            return def ? (
              <span key={p.id} aria-hidden="true" className="contents">
                <PlatePill plate={def} count={p.count} size="sm" />
              </span>
            ) : null
          })
        )}
      </span>
    </button>
  )
}

function usePlateIndex() {
  const { loadout } = useApp()
  return useMemo(() => new Map(loadout.plates.map((p) => [p.id, p])), [loadout.plates])
}

/** The plates in every row are one side's — said once, above the list. */
function PerSide() {
  return (
    <p className="-mb-2 text-right text-xs font-semibold uppercase tracking-[0.14em] text-muted" aria-hidden="true">
      Plates each side
    </p>
  )
}

function Notice({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-edge bg-surface2 px-4 py-3 text-sm text-ink">{children}</p>
}

const describe = (plates: ComboPlate[] | null, unit: Unit) =>
  plates == null
    ? 'Can’t be loaded with your plates.'
    : plates.length === 0
      ? 'Empty bar.'
      : `${plates.map((p) => `${p.count > 1 ? `${p.count} × ` : ''}${fmt(p.weight)}`).join(', ')} ${unit} each side.`

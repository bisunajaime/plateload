import { forwardRef, useMemo, useState } from 'react'
import type { BarDef, CollarKind, PlateDef, Unit } from '../data/plates'
import type { Combo, SolveResult } from '../lib/combinations'
import { converted, fmt } from '../lib/format'
import { BarbellSVG } from './BarbellSVG'
import { EmptyState } from './EmptyState'
import { CopyIcon, MinusIcon, PlusIcon, Sheet, StarIcon, ZoomIcon } from './ui'
import { Keypad } from './Keypad'

/**
 * The answer, in one place: the loaded bar, the weight, and the plates that
 * make it. Everything a lifter needs between sets; the rest of the page is
 * optional.
 */
export const LoadCard = forwardRef<
  HTMLElement,
  {
    target: number
    unit: Unit
    result: SolveResult
    combo: Combo | null
    bar: BarDef
    plates: PlateDef[]
    barWeight: number
    collarWeight: number
    collarKind: CollarKind | null
    collarWidthMm: number
    base: number
    showLabels: boolean
    closeUp: boolean
    animate: boolean
    /** The loadable weights either side of the target, for the − and + buttons. */
    down: number | null
    up: number | null
    quickSteps: number[]
    /** −/+: move the bar, not worth remembering. */
    onStep: (w: number) => void
    /** A quick jump by this much, landing on something loadable. */
    onJump: (delta: number) => void
    /** A weight chosen on purpose — typed, or a suggested load. */
    onEnter: (w: number) => void
    onToggleCloseUp: () => void
    onSave: () => void
    onCopy: () => void
    copied: boolean
    changeOff: boolean
    onEnableChange: () => void
    onOpenSetup: () => void
  }
>(function LoadCard(props, ref) {
  const { target, unit, result, combo, plates } = props
  const [zoom, setZoom] = useState(1)
  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [keypad, setKeypad] = useState(false)
  // One row of jumps that goes either way: a second row of minus buttons
  // doubled the controls for the less common direction.
  const [down, setDown] = useState(false)
  const byId = useMemo(() => new Map(plates.map((p) => [p.id, p])), [plates])

  const buzz = () => {
    if ('vibrate' in navigator) navigator.vibrate?.(8)
  }
  const step = (w: number | null) => {
    if (w == null) return
    props.onStep(w)
    buzz()
  }

  // A phone gets the big keypad; a keyboard gets a field to type into.
  const startTyping = () => {
    if (window.matchMedia('(pointer: coarse)').matches) setKeypad(true)
    else {
      setDraft(fmt(target))
      setTyping(true)
    }
  }
  // Empty or zero is a change of mind, not a request for an empty bar weight.
  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(n) && n > 0) props.onEnter(Math.round(n * 1000) / 1000)
    setTyping(false)
  }

  const digits = fmt(target).length
  const size = digits > 5 ? 'text-5xl sm:text-6xl' : digits > 4 ? 'text-6xl sm:text-7xl' : 'text-7xl sm:text-8xl'

  return (
    <section ref={ref} className="card overflow-hidden" aria-label="Your load">
      {/* ---------------------------------------------------------- the bar */}
      <div className="platform-grain relative bg-surface">
        <div className={`hide-scroll flex overflow-x-auto ${zoom > 1 ? '' : 'justify-center'}`}>
          <BarbellSVG
            bar={props.bar}
            plates={plates}
            combo={combo}
            collarKind={props.collarKind}
            collarWidthMm={props.collarWidthMm}
            unit={unit}
            showLabels={props.showLabels}
            closeUp={props.closeUp}
            animate={props.animate}
            zoom={zoom}
            maxHeightPx={300}
            className="block h-auto"
          />
        </div>
        {/* View controls sit on the drawing they change, out of the way. */}
        <div className="absolute right-2 top-2 flex gap-1 gym-hide">
          <button
            type="button"
            className="view-btn"
            aria-pressed={props.closeUp}
            onClick={props.onToggleCloseUp}
            title={props.closeUp ? 'Show the whole bar' : 'Close up on one sleeve'}
          >
            {props.closeUp ? 'Whole bar' : 'Sleeve'}
          </button>
          <button
            type="button"
            className="view-btn w-9 px-0"
            onClick={() => setZoom((z) => (z >= 2.4 ? 1 : z + 0.7))}
            aria-label={zoom > 1 ? `Magnified ${zoom.toFixed(1)} times — tap to change` : 'Magnify the bar'}
            title="Magnify"
          >
            {zoom > 1 ? <span className="text-[11px] font-semibold tabular-nums">{zoom.toFixed(1)}×</span> : <ZoomIcon />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 pt-5 sm:px-6">
        {/* ------------------------------------------------------ the weight */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            className="step-btn"
            onClick={() => step(props.down)}
            disabled={props.down == null}
            aria-label={props.down != null ? `Down to ${fmt(props.down)} ${unit}` : 'Nothing lighter to load'}
          >
            <MinusIcon />
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            {typing ? (
              <input
                autoFocus
                inputMode="decimal"
                type="number"
                step="any"
                className={`w-full min-w-0 bg-transparent text-center font-display font-semibold tabular-nums outline-none ${size}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => commit(draft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commit(draft)
                  if (e.key === 'Escape') setTyping(false)
                }}
                aria-label={`Target weight in ${unit}`}
              />
            ) : (
              <button
                type="button"
                onClick={startTyping}
                className="group flex items-baseline gap-1.5 rounded-2xl px-3 transition hover:bg-surface2/60"
                aria-label={`${fmt(target)} ${unit}. Tap to enter a weight.`}
              >
                <span className={`font-display font-semibold leading-none tabular-nums ${size}`}>{fmt(target)}</span>
                <span className="text-xl font-medium text-muted">{unit}</span>
              </button>
            )}
            <span className="mt-1.5 text-sm text-muted tabular-nums">≈ {converted(target, unit)}</span>
          </div>

          <button
            type="button"
            className="step-btn"
            onClick={() => step(props.up)}
            disabled={props.up == null}
            aria-label={props.up != null ? `Up to ${fmt(props.up)} ${unit}` : 'Nothing heavier to load'}
          >
            <PlusIcon />
          </button>
        </div>

        {/* ------------------------------------------------------ the plates */}
        {/* One short sentence for screen readers, instead of re-reading the chips and buttons. */}
        <p className="sr-only" aria-live="polite">
          {result.ok && combo
            ? combo.plates.length
              ? `${fmt(target)} ${unit}: ${combo.plates.map((p) => `${p.count > 1 ? `${p.count} × ` : ''}${fmt(p.weight)}`).join(', ')} each side`
              : `${fmt(target)} ${unit}: empty bar`
            : `${fmt(target)} ${unit} can’t be loaded`}
        </p>
        <div className="mt-5 min-h-[76px]">
          {result.ok && combo ? (
            <div className="flex flex-col items-center gap-2.5">
              <ul className="flex flex-wrap justify-center gap-1.5" aria-label="Plates on each side, heaviest first">
                {combo.plates.length ? (
                  combo.plates.map((p) => {
                    const def = byId.get(p.id)
                    return (
                      <li
                        key={p.id}
                        className="plate-pill"
                        style={{ background: def?.color, color: def?.textColor }}
                        aria-label={`${p.count} × ${fmt(p.weight)} ${unit}`}
                      >
                        {p.count > 1 && <span className="font-medium opacity-75">{p.count}×</span>}
                        {fmt(p.weight)}
                      </li>
                    )
                  })
                ) : (
                  <li className="plate-pill bg-surface2 text-muted">Empty bar</li>
                )}
                {combo.plates.length > 0 && <li className="self-center pl-1 text-sm text-muted">each side</li>}
              </ul>
              <p className="text-center text-xs text-muted tabular-nums">
                {fmt(props.barWeight)} bar
                {props.collarKind && props.collarWeight > 0 && <> + {fmt(props.collarWeight * 2)} collars</>}
                {combo.plates.length > 0 && <> + {fmt(combo.perSide * 2)} plates</>}
              </p>
            </div>
          ) : (
            <EmptyState
              reason={result.reason}
              target={target}
              unit={unit}
              base={props.base}
              nearestBelow={result.nearestBelow}
              nearestAbove={result.nearestAbove}
              onPick={props.onEnter}
              changeOff={props.changeOff}
              onEnableChange={props.onEnableChange}
              onOpenSetup={props.onOpenSetup}
            />
          )}
        </div>

        {/* ---------------------------------------------------- quick jumps */}
        <div className="mt-4 grid grid-cols-[auto_repeat(4,minmax(0,1fr))] gap-2" role="group" aria-label="Jump by">
          <button
            type="button"
            className="jump-btn w-11 text-muted"
            onClick={() => setDown((d) => !d)}
            aria-pressed={down}
            aria-label={down ? 'Jumping down — switch to up' : 'Jumping up — switch to down'}
            title={down ? 'Jumps go down' : 'Jumps go up'}
          >
            <span className="text-lg leading-none" aria-hidden="true">
              {down ? '↓' : '↑'}
            </span>
          </button>
          {props.quickSteps.map((q) => (
            <button
              key={q}
              type="button"
              className="jump-btn"
              onClick={() => {
                props.onJump(down ? -q : q)
                buzz()
              }}
            >
              {down ? '−' : '+'}
              {fmt(q)}
            </button>
          ))}
        </div>
      </div>

      {/* --------------------------------------------------------- actions */}
      <div className="grid grid-cols-2 border-t border-line">
        <button type="button" className="action-btn" onClick={props.onSave} disabled={!result.ok}>
          <StarIcon size={17} />
          Save weight
        </button>
        <button type="button" className="action-btn border-l border-line" onClick={props.onCopy} disabled={!result.ok}>
          <CopyIcon />
          {props.copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <Sheet open={keypad} onClose={() => setKeypad(false)} title="Enter a weight">
        <Keypad
          initial={fmt(target)}
          unit={unit}
          onDone={(v) => {
            commit(v)
            setKeypad(false)
          }}
        />
      </Sheet>
    </section>
  )
})

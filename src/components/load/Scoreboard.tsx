import { forwardRef, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { BarDef, CollarKind, PlateDef, Unit } from '../../data/plates'
import { feedback } from '../../feel'
import { useHoldRepeat } from '../../feel/hold'
import type { Combo, SolveResult } from '../../lib/combinations'
import { converted, fmt } from '../../lib/format'
import { BarbellSVG } from '../BarbellSVG'
import { Celebration, type Moment } from '../Celebration'
import { EmptyState } from '../EmptyState'
import { cantLoadReason } from './reason'
import { Keypad } from '../Keypad'
import { MinusIcon, PencilIcon, PlusIcon, ShareIcon, StarIcon } from '../kit/icons'
import { PlatePill } from '../kit/PlatePill'
import { RollingNumber } from '../RollingNumber'
import { Sheet } from '../ui'
import { checkEntry } from './entry'

/** Barlow Condensed Bold, measured: a tabular digit is ~0.5em, a point ~0.22em. */
const DIGIT_EM = 0.5
const POINT_EM = 0.22

export interface ScoreboardProps {
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
  /** The finest total step the plates allow — for saying why a weight can't be made. */
  step: number
  showLabels: boolean
  closeUp: boolean
  animate: boolean
  /** The loadable weights either side of the target, for − and +. */
  down: number | null
  up: number | null
  /** The quick jumps, each applied both ways. */
  jumps: number[]
  /** −/+: move the bar, not worth remembering. */
  onStep: (w: number) => void
  /** A quick jump by this much, landing on something loadable. */
  onJump: (delta: number) => void
  /** A weight chosen on purpose — typed, or a suggested load. */
  onEnter: (w: number) => void
  onToggleCloseUp: () => void
  moment: Moment | null
  saved: boolean
  onSave: () => void
  onShare: () => void
  smallPlatesOff: boolean
  onUseSmallPlates: () => void
  onEditPlates: () => void
  /** Desktop: a shorter drawing, so the pinned card fits a laptop screen. */
  compact?: boolean
}

/**
 * The answer, scoreboard style: the weight, the plates that make it, the bar
 * drawn with them on, and the controls to change it — all in one card.
 */
export const Scoreboard = forwardRef<HTMLElement, ScoreboardProps>(function Scoreboard(props, ref) {
  const { target, unit, result, combo, plates } = props
  const byId = useMemo(() => new Map(plates.map((p) => [p.id, p])), [plates])
  const loadable = result.ok && combo != null

  /* --------------------------------------------------------- the number */

  const [typing, setTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [keypad, setKeypad] = useState(false)
  const numberButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!note) return
    const t = window.setTimeout(() => setNote(null), 4000)
    return () => window.clearTimeout(t)
  }, [note])

  const check = (raw: string) => {
    const e = checkEntry(raw, props.base, unit)
    return e.ok ? null : e.message
  }

  // A phone gets the big keypad; a keyboard gets a field to type into.
  const startTyping = () => {
    setNote(null)
    if (window.matchMedia('(pointer: coarse)').matches) setKeypad(true)
    else {
      setDraft(fmt(target))
      setTyping(true)
    }
  }
  const stopTyping = () => {
    setTyping(false)
    // The field is about to unmount; hand focus back to the number, not to <body>.
    requestAnimationFrame(() => numberButton.current?.focus({ preventScroll: true }))
  }
  const commitDraft = (leaving: boolean) => {
    if (draft.trim() === fmt(target)) return stopTyping()
    const e = checkEntry(draft, props.base, unit)
    if (e.ok) {
      props.onEnter(e.value)
      return stopTyping()
    }
    feedback('error')
    if (leaving) {
      // Clicked away mid-mistake: keep the weight, and say what was wrong.
      setNote(`Kept ${fmt(target)} ${unit}. ${e.message}`)
      stopTyping()
    } else setNote(e.message)
  }

  // Sized to fill its row from the integer digits plus room for one decimal,
  // so 100 and 102.5 are the same size and a step never makes it jump.
  const [intPart, frac = ''] = fmt(target).split('.')
  const ems = intPart.length * DIGIT_EM + POINT_EM + Math.max(1, frac.length) * DIGIT_EM
  const heroSize: CSSProperties = { fontSize: `min(var(--hero-cap), calc((100cqi - 5.5rem) / ${ems}))` }

  /* ------------------------------------------------------- the steppers */

  const step = (w: number | null) => {
    if (w == null) return false
    props.onStep(w)
    feedback('step')
  }
  // Held, these repeat — reading the latest neighbour each time — until there's nowhere left to go.
  const holdDown = useHoldRepeat(() => step(props.down))
  const holdUp = useHoldRepeat(() => step(props.up))

  /* ------------------------------------------------- said, once it settles */

  const reason = cantLoadReason({ reason: result.reason, target, unit, base: props.base, step: props.step, smallPlatesOff: props.smallPlatesOff })
  const near = [result.nearestBelow, result.nearestAbove].filter((n): n is number => n != null).map((n) => `${fmt(n)} ${unit}`)
  const sentence = loadable
    ? combo.plates.length
      ? `${fmt(target)} ${unit}: ${combo.plates.map((p) => `${p.count > 1 ? `${p.count} × ` : ''}${fmt(p.weight)}`).join(', ')} each side`
      : `${fmt(target)} ${unit}: empty bar`
    : `${reason.title}. ${reason.why}${near.length ? ` Nearest: ${near.join(' or ')}.` : ''}`
  const [announcement, setAnnouncement] = useState(sentence)
  useEffect(() => {
    const t = window.setTimeout(() => setAnnouncement(sentence), 450)
    return () => window.clearTimeout(t)
  }, [sentence])

  const stepBtn =
    'flex min-h-[56px] flex-1 select-none items-center justify-center gap-2 rounded-xl border border-edge bg-surface text-ink transition hover:bg-surface2 active:scale-press-wide aria-disabled:cursor-not-allowed aria-disabled:border-line aria-disabled:text-muted aria-disabled:active:scale-100'

  return (
    <section
      ref={ref}
      // Pinned on a desktop, a very tall stack scrolls inside the card rather than off the bottom of the screen.
      className={`card overflow-hidden ${props.compact ? 'hide-scroll max-h-[calc(100dvh-92px)] overflow-y-auto' : ''}`}
      aria-label="Your load"
    >
      <div className="px-4 pt-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-cond text-sm font-bold uppercase tracking-[0.18em] text-muted">On the bar</h2>
          {!loadable && <span className="rounded-full bg-bad/15 px-2.5 py-0.5 text-xs font-semibold text-bad">Can’t load</span>}
        </div>

        {/* ----------------------------------------------------- the weight */}
        <div
          className={`mt-1 flex flex-col items-center [--hero-cap:6.5rem] [container-type:inline-size] ${props.compact ? 'sm:[--hero-cap:6rem]' : 'sm:[--hero-cap:8rem]'}`}
        >
          {typing ? (
            <div className="flex w-full items-baseline justify-center gap-2">
              <input
                autoFocus
                inputMode="decimal"
                className="w-full min-w-0 rounded-xl bg-surface2 text-center font-cond font-bold leading-none tabular-nums outline-none"
                style={heroSize}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value)
                  setNote(null)
                }}
                onBlur={() => commitDraft(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitDraft(false)
                  if (e.key === 'Escape') stopTyping()
                }}
                aria-label={`Weight in ${unit}`}
                aria-invalid={note ? true : undefined}
                aria-describedby="weight-note"
              />
            </div>
          ) : (
            <button
              ref={numberButton}
              type="button"
              onClick={startTyping}
              className="group flex max-w-full items-baseline gap-2 rounded-2xl px-3 transition hover:bg-surface2/60 active:scale-press-wide"
              aria-label={`${fmt(target)} ${unit}. Type a weight`}
            >
              <RollingNumber
                value={target}
                className={`font-cond font-bold leading-none tabular-nums ${loadable ? 'text-ink' : 'text-muted'}`}
                style={heroSize}
              />
              <span className="font-cond text-xl font-bold uppercase text-muted">{unit}</span>
              <span className="self-center rounded-full border border-edge p-1.5 text-muted transition group-hover:text-ink" aria-hidden="true">
                <PencilIcon size={16} />
              </span>
            </button>
          )}
          <span className="mt-1 text-sm text-muted tabular-nums">≈ {converted(target, unit)}</span>
          <span id="weight-note" role="status" className={`mt-1 text-center text-sm font-medium text-bad ${note ? '' : 'sr-only'}`}>
            {note ?? ''}
          </span>
        </div>

        {/* ----------------------------------------------------- the plates */}
        {/* One short sentence for screen readers, instead of re-reading the chips and buttons. */}
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
        <div className={props.compact ? 'mt-3' : 'mt-4'}>
          {loadable ? (
            <div className="flex flex-col items-center gap-2">
              <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Plates on each side, heaviest first">
                {combo.plates.length ? (
                  combo.plates.map((p) => {
                    const def = byId.get(p.id)
                    return (
                      <li key={p.id} aria-label={`${p.count} × ${fmt(p.weight)} ${unit}`}>
                        {def && <PlatePill plate={def} count={p.count} size="lg" />}
                      </li>
                    )
                  })
                ) : (
                  <li className="rounded-lg border border-edge px-3 py-1.5 font-cond text-xl font-bold text-muted">Empty bar</li>
                )}
                {combo.plates.length > 0 && (
                  <li className="font-cond text-base font-bold uppercase tracking-wide text-muted" aria-hidden="true">
                    each side
                  </li>
                )}
              </ul>
              <p className="text-center text-sm text-muted tabular-nums">
                {fmt(props.barWeight)} bar
                {props.collarKind && props.collarWeight > 0 && <> + {fmt(props.collarWeight * 2)} collars</>}
                {combo.plates.length > 0 && <> + {fmt(combo.perSide * 2)} plates</>}
              </p>
              {combo.overCapacity && (
                <p className="rounded-xl bg-bad/10 px-3 py-2 text-center text-sm font-medium text-bad">
                  This stack is too wide for the sleeve — pick another way below, or use fewer, bigger plates.
                </p>
              )}
            </div>
          ) : (
            <EmptyState
              reason={result.reason}
              target={target}
              unit={unit}
              base={props.base}
              step={props.step}
              nearestBelow={result.nearestBelow}
              nearestAbove={result.nearestAbove}
              onPick={props.onEnter}
              smallPlatesOff={props.smallPlatesOff}
              onUseSmallPlates={props.onUseSmallPlates}
              onEditPlates={props.onEditPlates}
            />
          )}
        </div>
      </div>

      {/* ------------------------------------------------------ the drawing */}
      {/* The drawing is its own control: tap it to go between the sleeve and the whole bar. */}
      <div className={`platform-grain relative border-y border-line bg-surface ${props.compact ? 'mt-3' : 'mt-4'}`}>
        <button
          type="button"
          onClick={() => {
            feedback('select')
            props.onToggleCloseUp()
          }}
          aria-pressed={!props.closeUp}
          aria-label="Show the whole bar"
          className="group relative flex w-full justify-center focus-visible:ring-inset"
        >
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
            feedback
            unloadable={!result.ok}
            loadId={target}
            maxHeightPx={props.compact ? 130 : 220}
            className="block h-auto"
          />
          <span
            aria-hidden="true"
            className="absolute bottom-2 right-2 rounded-lg bg-bg/80 px-2 py-1 text-xs font-semibold text-muted backdrop-blur transition group-hover:text-ink"
          >
            {props.closeUp ? 'Tap for whole bar' : 'Tap for close-up'}
          </span>
        </button>
        <Celebration moment={props.moment} />
      </div>

      {/* ----------------------------------------------------- the controls */}
      <div className={`px-4 sm:px-6 ${props.compact ? 'py-3' : 'py-4'}`}>
        <div className="flex gap-2">
          <button
            type="button"
            className={stepBtn}
            {...holdDown}
            aria-disabled={props.down == null || undefined}
            aria-label={props.down != null ? `Down to ${fmt(props.down)} ${unit}` : 'Nothing lighter to load'}
          >
            <MinusIcon />
            {props.down != null && <span className="font-cond text-lg font-bold tabular-nums">{fmt(props.down)}</span>}
          </button>
          <button
            type="button"
            className={stepBtn}
            {...holdUp}
            aria-disabled={props.up == null || undefined}
            aria-label={props.up != null ? `Up to ${fmt(props.up)} ${unit}` : 'Nothing heavier to load'}
          >
            <PlusIcon />
            {props.up != null && <span className="font-cond text-lg font-bold tabular-nums">{fmt(props.up)}</span>}
          </button>
        </div>
        <div className="mt-2 grid grid-cols-6 gap-1.5" role="group" aria-label={`Jump by ${unit}`}>
          {[...props.jumps].reverse().map((q) => -q).concat(props.jumps).map((d) => (
            <button
              key={d}
              type="button"
              className="min-h-[48px] min-w-0 select-none rounded-xl bg-surface2 font-cond text-lg font-bold tabular-nums text-ink transition hover:bg-line active:scale-press"
              onClick={() => {
                props.onJump(d)
                feedback('step')
              }}
              aria-label={`${d < 0 ? 'Down' : 'Up'} about ${fmt(Math.abs(d))} ${unit}`}
            >
              {d < 0 ? '−' : '+'}
              {fmt(Math.abs(d))}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------ the actions */}
      <div className="grid grid-cols-2 border-t border-line">
        <button type="button" className="action-btn text-base" onClick={props.onSave} disabled={!loadable}>
          {/* Keyed on the state, so filling the star replays the pop. */}
          <span key={props.saved ? 'on' : 'off'} className={`inline-flex ${props.saved ? 'text-accent-ink' : ''} ${props.saved && props.animate ? 'pop' : ''}`}>
            <StarIcon filled={props.saved} />
          </span>
          {props.saved ? 'Saved' : 'Save'}
        </button>
        <button type="button" className="action-btn border-l border-line text-base" onClick={props.onShare} disabled={!loadable}>
          <ShareIcon />
          Share
        </button>
      </div>

      <Sheet open={keypad} onClose={() => setKeypad(false)} title="Type a weight">
        <Keypad
          initial={fmt(target)}
          unit={unit}
          check={check}
          onDone={(raw) => {
            const e = checkEntry(raw, props.base, unit)
            if (e.ok) props.onEnter(e.value)
            setKeypad(false)
          }}
        />
      </Sheet>
    </section>
  )
})

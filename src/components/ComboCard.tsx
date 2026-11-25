import { forwardRef, memo } from 'react'
import type { PlateDef } from '../data/plates'
import type { Combo } from '../lib/combinations'
import { fmt } from '../lib/format'
import { PlatePill } from './kit/PlatePill'
import type { WayReason } from './ways/reasons'

/**
 * One way to load the bar, as a radio you can pick: the plates each side in
 * loading order, how many, and one plain reason it's worth a look.
 */
export const ComboCard = memo(
  forwardRef<
    HTMLButtonElement,
    {
      combo: Combo
      byId: Map<string, PlateDef>
      unit: string
      reason: WayReason
      /** A sentence that replaces the reason — for the top recommendation. */
      why?: string
      selected: boolean
      /** The one radio in the group that takes Tab. */
      focusable: boolean
      onSelect: () => void
    }
  >(function ComboCard({ combo, byId, unit, reason, why, selected, focusable, onSelect }, ref) {
    const count = combo.plateCount
    const summary = combo.plates.length
      ? `${combo.plates.map((p) => `${p.count > 1 ? `${p.count} × ` : ''}${fmt(p.weight)}`).join(', ')} ${unit} each side`
      : 'Just the bar'
    return (
      <button
        ref={ref}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={`${summary}. ${(why ?? reason.text).replace(/\.$/, '')}.`}
        tabIndex={focusable ? 0 : -1}
        onClick={onSelect}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
          selected ? 'bg-surface2 shadow-[inset_0_0_0_2px_rgb(var(--ink))]' : 'hover:bg-surface2/60'
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5" aria-hidden="true">
            {combo.plates.length ? (
              combo.plates.map((p) => {
                const def = byId.get(p.id)
                return def ? <PlatePill key={p.id} plate={def} count={p.count} size="sm" /> : null
              })
            ) : (
              <span className="text-base font-semibold">Just the bar</span>
            )}
          </span>
          <span className="mt-1.5 block text-sm" aria-hidden="true">
            {combo.plates.length > 0 && (
              <span className="font-cond text-base font-semibold tabular-nums text-ink">
                {count} plate{count === 1 ? '' : 's'} a side
                <span className="text-muted"> · </span>
              </span>
            )}
            <span className={reason.warn ? 'font-semibold text-bad' : 'text-muted'}>{why ?? reason.text}</span>
          </span>
        </span>
        {/* The row on the bar right now: a filled mark, not a colour alone. */}
        <span
          aria-hidden="true"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
            selected ? 'border-ink bg-ink text-bg' : 'border-edge'
          }`}
        >
          {selected && (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5 10 17l9-10" />
            </svg>
          )}
        </span>
      </button>
    )
  }),
)

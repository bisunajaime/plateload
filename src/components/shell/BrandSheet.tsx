import type { Brand } from '../../data/plates'
import { Sheet } from '../ui'

const BRANDS: { brand: Brand; name: string; unit: string; detail: string; stripe: string }[] = [
  {
    brand: 'metcon',
    name: 'Metcon',
    unit: 'Pounds',
    detail: 'Colour bumpers, a 45 lb bar, Fast Clip collars',
    stripe: 'linear-gradient(90deg, #C8102E 0 20%, #1D5CA8 20% 40%, #F4C400 40% 60%, #1E8A3C 60% 80%, #9AA0A5 80%)',
  },
  {
    brand: 'eleiko',
    name: 'Eleiko',
    unit: 'Kilos',
    detail: 'IWF colours, a 20 kg bar, spring clips',
    stripe: 'linear-gradient(90deg, #C8102E 0 20%, #0033A0 20% 40%, #FFD100 40% 60%, #007A33 60% 80%, #F5F5F5 80%)',
  },
]

/**
 * Pounds or kilos is really a question of whose plates are in the gym: Metcon
 * is sold in pounds, Eleiko in kilos. So the unit is picked by picking plates,
 * and this says so in words rather than leaving it to be discovered.
 */
export function BrandSheet({
  open,
  onClose,
  brand,
  onPick,
}: {
  open: boolean
  onClose: () => void
  brand: Brand
  onPick: (b: Brand) => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Plates and units">
      <p className="mb-4 text-base text-muted">The plates you load decide the unit. Switching resets the bar and collars to that brand’s; you can undo it.</p>
      <div role="radiogroup" aria-label="Plates" className="flex flex-col gap-3">
        {BRANDS.map((b) => {
          const on = b.brand === brand
          return (
            <button
              key={b.brand}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                onPick(b.brand)
                onClose()
              }}
              className={`flex min-h-[72px] items-center gap-4 rounded-2xl border px-4 py-3 text-left transition active:scale-press-wide ${
                on ? 'border-transparent bg-ink text-bg' : 'border-edge bg-surface text-ink hover:bg-surface2'
              }`}
            >
              <span aria-hidden="true" className="h-10 w-3 shrink-0 rounded" style={{ background: b.stripe, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / 0.25)' }} />
              <span className="flex flex-1 flex-col">
                <span className="text-lg font-semibold">
                  {b.name} <span className="font-cond font-bold uppercase tracking-wide opacity-80">· {b.unit}</span>
                </span>
                <span className={`text-sm ${on ? 'text-bg/80' : 'text-muted'}`}>{b.detail}</span>
              </span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}

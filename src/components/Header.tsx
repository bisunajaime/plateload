import type { Brand } from '../data/plates'
import type { Settings } from '../lib/settings'
import { GearIcon, LockIcon, Segmented } from './ui'

export function Header({
  settings,
  update,
  setBrand,
  onSettings,
}: {
  settings: Settings
  update: (p: Partial<Settings>) => void
  setBrand: (b: Brand) => void
  onSettings: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-3 py-2 sm:px-5 sm:py-3">
        <a href="#main" className="sr-only focus:not-sr-only focus:btn">
          Skip to content
        </a>
        <div className="mr-auto flex items-baseline gap-2">
          <span className="font-display text-lg font-semibold tracking-tight">PlateLoad</span>
          <span className="hidden text-xs text-muted lg:inline gym-hide">Load any weight. See every combination.</span>
        </div>

        <Segmented
          value={settings.brand}
          onChange={setBrand}
          label="Brand"
          options={[
            { value: 'eleiko', label: 'Eleiko', title: 'Eleiko — kilos' },
            { value: 'metcon', label: 'Metcon', title: 'Metcon — pounds' },
          ]}
        />

        {/* The brand fixes the unit: Eleiko is a kilo brand, Metcon is sold in pounds. */}
        <span
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-line bg-surface2 px-3 text-sm font-semibold text-ink"
          title={
            settings.brand === 'eleiko'
              ? 'Eleiko plates are kilos. Switch to Metcon for pounds.'
              : 'Metcon plates are pounds. Switch to Eleiko for kilos.'
          }
        >
          <LockIcon />
          {settings.unit}
        </span>

        {settings.brand === 'eleiko' && (
          <Segmented
            value={settings.plateStyle === 'calibrated-steel' ? 'calibrated-steel' : 'bumper'}
            onChange={(plateStyle) => update({ plateStyle })}
            label="Eleiko plate style"
            options={[
              { value: 'bumper', label: 'Bumper' },
              { value: 'calibrated-steel', label: 'Steel' },
            ]}
          />
        )}

        <button type="button" className="btn min-h-[40px] px-3" onClick={onSettings} aria-label="Setup: bar, collars, inventory">
          <GearIcon />
        </button>
      </div>
    </header>
  )
}

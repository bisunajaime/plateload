import type { Brand } from '../data/plates'
import type { Settings } from '../lib/settings'
import { GearIcon, Segmented } from './ui'

/**
 * Three things: where you are, which plates you are loading, and setup. The
 * brand carries its unit — Eleiko is kilos, Metcon is pounds — so the switch
 * says both and there is no separate unit control to misread.
 */
export function Header({
  settings,
  setBrand,
  onSettings,
}: {
  settings: Settings
  setBrand: (b: Brand) => void
  onSettings: () => void
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 pt-[env(safe-area-inset-top,0px)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-3 py-2 sm:px-5">
        <a href="#main" className="sr-only focus:not-sr-only focus:btn">
          Skip to content
        </a>
        <a href="/" className="mr-auto flex min-h-[44px] items-center gap-2 rounded-lg pr-2 font-display text-[17px] font-semibold tracking-tight">
          <span className="brand-mark" aria-hidden="true" />
          <span className="hidden min-[400px]:inline">PlateLoad</span>
        </a>

        <Segmented
          value={settings.brand}
          onChange={setBrand}
          label="Plates"
          options={[
            {
              value: 'eleiko',
              label: (
                <>
                  Eleiko <span className="opacity-60">kg</span>
                </>
              ),
              title: 'Eleiko plates, in kilos',
            },
            {
              value: 'metcon',
              label: (
                <>
                  Metcon <span className="opacity-60">lb</span>
                </>
              ),
              title: 'Metcon plates, in pounds',
            },
          ]}
        />

        <button type="button" className="btn btn-ghost h-11 w-11 px-0" onClick={onSettings} aria-label="Setup: bar, collars, plates and display">
          <GearIcon />
        </button>
      </div>
    </header>
  )
}

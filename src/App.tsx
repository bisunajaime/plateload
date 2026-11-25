import { useState } from 'react'
import { AppContext } from './app/context'
import { useAppModel } from './app/useAppModel'
import { Header } from './components/Header'
import { Choice } from './components/kit/Choice'
import { BrandSheet } from './components/shell/BrandSheet'
import { TabBar } from './components/shell/TabBar'
import { Toaster } from './components/Toast'
import { DESKTOP, useMedia } from './hooks/useMedia'
import type { AppTab } from './lib/settings'
import { GymScreen } from './screens/GymScreen'
import { LoadScreen, OtherWays } from './screens/LoadScreen'
import { SavedScreen } from './screens/SavedScreen'
import { WarmupScreen } from './screens/WarmupScreen'

function Screen({ tab }: { tab: AppTab }) {
  switch (tab) {
    case 'warmup':
      return <WarmupScreen />
    case 'saved':
      return <SavedScreen />
    case 'gym':
      return <GymScreen />
    case 'ways':
      return <OtherWays />
    default:
      return <LoadScreen />
  }
}

const PANES: { value: AppTab; label: string }[] = [
  { value: 'warmup', label: 'Warm-up' },
  { value: 'ways', label: 'Other ways' },
  { value: 'saved', label: 'Saved' },
  { value: 'gym', label: 'Gym' },
]

/**
 * Where you are. On a phone, one place at a time with a tab bar under the
 * thumb. On a desktop the load stays pinned on the left and the tools sit in
 * a pane beside it.
 */
export default function App() {
  const app = useAppModel()
  const [brandOpen, setBrandOpen] = useState(false)
  const desktop = useMedia(DESKTOP)
  const { tab } = app.settings
  const paneTab: AppTab = tab === 'load' ? 'warmup' : tab
  const phoneTab: AppTab = tab === 'ways' ? 'load' : tab

  return (
    <AppContext.Provider value={app}>
      <div className="min-h-dvh pb-[calc(56px+env(safe-area-inset-bottom,0px))] lg:pb-0">
        <Header brand={app.settings.brand} onBrand={() => setBrandOpen(true)} onLogoHold={app.loadWorldRecord} />

        <main id="main" className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
          <h1 className="sr-only">PlateLoad</h1>
          {desktop ? (
            <div className="grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-start gap-8">
              <div className="sticky top-[76px]">
                <LoadScreen pinned />
              </div>
              <div className="flex min-w-0 flex-col gap-6">
                <Choice label="Tools" value={paneTab} onChange={app.go} options={PANES} />
                <div key={paneTab} className="fade-up">
                  <Screen tab={paneTab} />
                </div>
              </div>
            </div>
          ) : (
            <div key={phoneTab} className="fade-up">
              <Screen tab={phoneTab} />
            </div>
          )}
        </main>

        {!desktop && <TabBar value={phoneTab} onChange={app.go} />}
        <BrandSheet open={brandOpen} onClose={() => setBrandOpen(false)} brand={app.settings.brand} onPick={app.switchBrand} />
        <Toaster toast={app.toast} onDismiss={app.dismissToast} />
      </div>
    </AppContext.Provider>
  )
}

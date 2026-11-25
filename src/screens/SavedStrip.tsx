import { useApp } from '../app/context'
import { YourWeights } from '../components/YourWeights'

/** Saved and recent weights, one tap from the load. The full list lives in the Saved tab. */
export function SavedStrip() {
  const app = useApp()
  const { settings } = app
  return (
    <YourWeights
      favorites={settings.favorites.map((f, index) => ({ ...f, index }))}
      recents={settings.lastWeights}
      unit={settings.unit}
      onPick={app.loadSaved}
      onRemove={app.removeFavorite}
    />
  )
}

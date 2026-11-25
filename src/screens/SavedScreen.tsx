import { useApp } from '../app/context'
import { YourWeights } from '../components/YourWeights'

/** Weights you've saved, and the ones you've used lately. */
export function SavedScreen() {
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

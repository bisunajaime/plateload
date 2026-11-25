import { useApp } from '../app/context'
import { ComboList } from '../components/ComboList'

/** Every other way to make the same weight. */
export function OtherWays({ barOffScreen = false }: { barOffScreen?: boolean }) {
  const app = useApp()
  const { settings, result } = app
  if (!result.ok) return null
  return (
    <ComboList
      combos={result.combos}
      mode={settings.mode}
      onMode={(mode) => app.update({ mode })}
      plates={app.loadout.plates}
      collarKind={app.collarKind}
      collarWidthMm={app.collarWidth}
      sleeveMm={app.loadout.sleeveMm}
      selectedId={app.selected?.id ?? null}
      onSelect={(c) => app.selectCombo(c, barOffScreen)}
      truncated={result.truncated}
      totalFound={result.totalFound}
    />
  )
}

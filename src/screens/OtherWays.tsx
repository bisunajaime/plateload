import { useApp } from '../app/context'
import { ComboList } from '../components/ComboList'
import { Section } from '../components/kit/Section'
import { DESKTOP, useMedia } from '../hooks/useMedia'

/**
 * Every other way to make the same weight. On a phone it sits under the load
 * and stays out of the way when there's nothing to choose; on a desktop it's
 * a pane of its own, so it always says something.
 */
export function OtherWays({ barOffScreen = false, standalone }: { barOffScreen?: boolean; standalone?: boolean }) {
  const app = useApp()
  const { settings, result } = app
  // The desktop layout never shows this under the load, so there it's the pane.
  const desktop = useMedia(DESKTOP)
  const pane = standalone ?? desktop

  if (!result.ok || result.totalFound <= 1) {
    if (!pane) return null
    return (
      <Section title="Other ways to load it">
        <p className="card px-4 py-5 text-base text-muted">
          {result.ok
            ? 'There’s only one way to load this weight with your plates.'
            : 'Your plates can’t make this weight, so there’s nothing to compare. Pick one of the nearby weights beside the bar.'}
        </p>
      </Section>
    )
  }

  return (
    <ComboList
      combos={result.combos}
      mode={settings.mode}
      onMode={(mode) => app.update({ mode })}
      plates={app.loadout.plates}
      unit={settings.unit}
      sleeveMm={app.loadout.sleeveMm}
      selectedId={app.selected?.id ?? null}
      onSelect={(c) => app.selectCombo(c, barOffScreen)}
      truncated={result.truncated}
      totalFound={result.totalFound}
    />
  )
}

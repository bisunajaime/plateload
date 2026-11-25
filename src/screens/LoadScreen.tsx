import { useRef, useState } from 'react'
import { useApp } from '../app/context'
import { LoadCard } from '../components/LoadCard'
import { MiniBar } from '../components/MiniBar'
import { SaveFavoriteSheet } from '../components/SaveFavoriteSheet'
import { OtherWays } from './OtherWays'
import { SavedStrip } from './SavedStrip'
import { useHasScrolled, useVisibility } from '../hooks/useOnScreen'

/** The load: the answer, the controls to change it, and the other ways to make it. */
export function LoadScreen({ pinned = false }: { pinned?: boolean }) {
  const app = useApp()
  const { settings, update, loadout, result, selected } = app
  const [saving, setSaving] = useState(false)

  // A thumbnail of the load stands in for the card once you have scrolled
  // away from it — but not over the combination list, whose rows already
  // draw every sleeve, and not before you have scrolled at all.
  const heroRef = useRef<HTMLElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const hero = useVisibility(heroRef)
  const list = useVisibility(listRef, 72, 1, 160)
  const scrolled = useHasScrolled()
  const showPreview = !pinned && !hero.onScreen && !list.onScreen && (scrolled || hero.passed)
  const quickSteps = settings.unit === 'kg' ? [2.5, 5, 10, 20] : [5, 10, 25, 45]

  return (
    <div className="flex flex-col gap-6">
      <LoadCard
        ref={heroRef}
        target={settings.target}
        unit={settings.unit}
        result={result}
        combo={selected}
        bar={loadout.bar}
        plates={loadout.plates}
        barWeight={loadout.barWeight}
        collarWeight={loadout.collarWeight}
        collarKind={app.collarKind}
        collarWidthMm={app.collarWidth}
        base={loadout.base}
        showLabels={settings.showLabels}
        closeUp={settings.closeUp}
        animate={app.animate}
        down={app.jumps.down}
        up={app.jumps.up}
        quickSteps={quickSteps}
        onStep={app.setTarget}
        onJump={app.jump}
        onEnter={app.pick}
        onToggleCloseUp={() => update({ closeUp: !settings.closeUp })}
        moment={app.moment}
        onSave={() => setSaving(true)}
        saved={app.isSaved}
        onCopy={app.share}
        copied={false}
        changeOff={!settings.includeChange}
        onEnableChange={() => update({ includeChange: true })}
        onOpenSetup={() => app.go('gym')}
      />
      {!pinned && (
        <>
          <SavedStrip />
          <div ref={listRef}>
            <OtherWays barOffScreen={!hero.onScreen} />
          </div>
          <MiniBar
            show={showPreview}
            bar={loadout.bar}
            plates={loadout.plates}
            combo={selected}
            collarKind={app.collarKind}
            collarWidthMm={app.collarWidth}
            unit={settings.unit}
            total={settings.target}
            loadable={result.ok}
            pos={settings.preview}
            peek={app.peek}
            onMove={(preview) => update({ preview })}
            animate={app.animate}
            onClick={() => heroRef.current?.scrollIntoView({ behavior: app.animate ? 'smooth' : 'auto', block: 'start' })}
          />
        </>
      )}
      <SaveFavoriteSheet
        open={saving}
        onClose={() => setSaving(false)}
        target={settings.target}
        unit={settings.unit}
        favorites={settings.favorites}
        onSave={(label) => {
          setSaving(false)
          app.saveFavorite(label)
        }}
      />
    </div>
  )
}

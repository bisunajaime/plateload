import { useRef, useState } from 'react'
import { useApp } from '../app/context'
import { Scoreboard } from '../components/load/Scoreboard'
import { feedback } from '../feel'
import { smallestIncrement } from '../lib/combinations'
import { MiniBar } from '../components/MiniBar'
import { SaveFavoriteSheet } from '../components/SaveFavoriteSheet'
import { OtherWays } from './OtherWays'
import { SavedStrip } from './SavedStrip'
import { useHasScrolled, useVisibility } from '../hooks/useOnScreen'

/**
 * The load: the answer and the controls to change it, then — on a phone — the
 * saved weights and the other ways to make it. Pinned on a desktop, just the card.
 */
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

  return (
    <div className="flex flex-col gap-6">
      <Scoreboard
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
        step={smallestIncrement(app.input.denoms, settings.unit)}
        showLabels={settings.showLabels}
        closeUp={settings.closeUp}
        animate={app.animate}
        down={app.jumps.down}
        up={app.jumps.up}
        jumps={settings.unit === 'kg' ? [2.5, 5, 10] : [5, 10, 25]}
        onStep={app.setTarget}
        onJump={app.jump}
        onEnter={app.pick}
        onToggleCloseUp={() => update({ closeUp: !settings.closeUp })}
        moment={app.moment}
        saved={app.isSaved}
        onSave={() => setSaving(true)}
        onShare={app.share}
        smallPlatesOff={!settings.includeChange}
        onUseSmallPlates={() => {
          app.applyUndoable('Small plates are back on.', { includeChange: true })
          feedback('confirm')
        }}
        onEditPlates={() => app.go('gym')}
        compact={pinned}
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

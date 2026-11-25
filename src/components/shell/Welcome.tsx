import { useEffect, useRef } from 'react'
import { useApp } from '../../app/context'
import { fmt } from '../../lib/format'
import { Button } from '../kit/Button'

/**
 * First visit only. The answer is useful straight away, but it rests on plates
 * the app assumed — so say that once, briefly, and offer the one step that
 * fixes it. Using the app is answer enough: changing the weight dismisses it.
 */
export function Welcome() {
  const app = useApp()
  const { settings, loadout, update } = app
  const firstTarget = useRef(settings.target)
  useEffect(() => {
    if (settings.intro && settings.target !== firstTarget.current) update({ intro: false })
  }, [settings.intro, settings.target, update])
  if (!settings.intro) return null

  const brand = settings.brand === 'metcon' ? 'Metcon' : 'Eleiko'
  const dismiss = () => {
    update({ intro: false })
    // The card is about to go; don't let keyboard focus go with it.
    const next = document.querySelector<HTMLElement>('[data-weight-button]') ?? document.getElementById('main')
    window.setTimeout(() => next?.focus({ preventScroll: true }), 0)
  }
  return (
    <section aria-labelledby="welcome-title" className="card mb-4 border-accent/60 px-4 py-3 fade-up">
      <h2 id="welcome-title" className="text-base font-semibold">
        Set for a typical {brand} gym
      </h2>
      <p className="text-sm text-muted">
        {fmt(loadout.barWeight)} {settings.unit} bar, a full set of plates. Different at yours? Tell it once.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            update({ intro: false })
            app.go('gym')
          }}
        >
          Set up my gym
        </Button>
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Looks right
        </Button>
      </div>
    </section>
  )
}

import { useApp } from '../../app/context'
import { fmt } from '../../lib/format'
import { Button } from '../kit/Button'

/**
 * First visit only. The answer is useful straight away, but it rests on plates
 * the app assumed — so say that once, and offer the one step that fixes it.
 */
export function Welcome() {
  const app = useApp()
  const { settings, loadout } = app
  if (!settings.intro) return null
  const brand = settings.brand === 'metcon' ? 'Metcon' : 'Eleiko'
  const dismiss = () => app.update({ intro: false })
  return (
    <section aria-labelledby="welcome-title" className="card mb-6 border-accent/60 p-4 fade-up sm:p-5">
      <h2 id="welcome-title" className="text-lg font-semibold">
        Ready when you are
      </h2>
      <p className="mt-1 text-base text-muted">
        This assumes a typical {brand} gym: a {fmt(loadout.barWeight)} {settings.unit} bar and a full set of plates. If yours is different, tell it once and every load will match what’s on your floor.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="accent"
          size="sm"
          onClick={() => {
            dismiss()
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

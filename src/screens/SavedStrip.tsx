import { useEffect, useRef, useState } from 'react'
import { useApp } from '../app/context'
import { Chip } from '../components/kit/Chip'
import { Section } from '../components/kit/Section'
import type { Unit } from '../data/plates'
import { fmt } from '../lib/format'

const brandOf = (u: Unit) => (u === 'lb' ? 'Metcon' : 'Eleiko')

/**
 * Saved and recent weights, one tap from the load: favourites first, then
 * what you've used lately. It scrolls sideways, and says so with a fade at
 * whichever edge has more. The full list lives in the Saved tab.
 */
export function SavedStrip() {
  const app = useApp()
  const { settings } = app
  const scroller = useRef<HTMLUListElement>(null)
  const [more, setMore] = useState({ left: false, right: false })

  const favorites = settings.favorites
  const isFavorite = (w: number, u: Unit) => favorites.some((f) => f.weight === w && f.unit === u)
  const recents = settings.lastWeights.filter((r) => !isFavorite(r.weight, r.unit))
  const count = favorites.length + recents.length

  const measure = () => {
    const el = scroller.current
    if (!el) return
    setMore({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [count])

  if (count === 0) return null

  const onBar = (w: number, u: Unit) => w === settings.target && u === settings.unit
  // A weight in the other unit belongs to the other brand's plates: dashed,
  // tagged with the brand it would switch to — but still full-contrast text.
  const tag = (u: Unit) => (u === settings.unit ? u : `${u} · ${brandOf(u)}`)
  const fade = `linear-gradient(to right, ${more.left ? 'transparent, #000 32px' : '#000'}, ${more.right ? '#000 calc(100% - 40px), transparent' : '#000'})`

  return (
    <Section
      level={3}
      title="Saved & recent"
      action={
        <button
          type="button"
          onClick={() => app.go('saved')}
          className="-mr-2 min-h-[44px] rounded-lg px-3 text-sm font-semibold text-ink underline decoration-edge underline-offset-4 transition hover:bg-surface2"
        >
          See all
        </button>
      }
    >
      <ul
        ref={scroller}
        onScroll={measure}
        aria-label="Saved and recent weights"
        className="hide-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
        style={{ WebkitMaskImage: fade, maskImage: fade }}
      >
        {favorites.map((f, i) => (
          <li key={`f${i}`}>
            <Chip
              quiet={f.unit !== settings.unit}
              selected={onBar(f.weight, f.unit) || undefined}
              onClick={() => app.loadSaved(f.weight, f.unit)}
              className="whitespace-nowrap"
            >
              <span>{f.label || 'Saved'}</span>
              <span className="font-cond text-base font-bold">{fmt(f.weight)}</span>
              <span className="font-medium">{tag(f.unit)}</span>
            </Chip>
          </li>
        ))}
        {recents.map((r) => (
          <li key={`r${r.weight}-${r.unit}`}>
            <Chip
              quiet={r.unit !== settings.unit}
              selected={onBar(r.weight, r.unit) || undefined}
              onClick={() => app.loadSaved(r.weight, r.unit)}
              className="whitespace-nowrap"
            >
              <span className="font-cond text-base font-bold">{fmt(r.weight)}</span>
              <span className="font-medium">{tag(r.unit)}</span>
            </Chip>
          </li>
        ))}
      </ul>
    </Section>
  )
}

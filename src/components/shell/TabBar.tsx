import type { ReactNode } from 'react'
import { feedback } from '../../feel'
import type { AppTab } from '../../lib/settings'
import { BarbellIcon, BookmarkIcon, PlateIcon, RampIcon } from '../kit/icons'

const PHONE_TABS: { tab: AppTab; label: string; icon: ReactNode }[] = [
  { tab: 'load', label: 'Load', icon: <BarbellIcon /> },
  { tab: 'warmup', label: 'Warm-up', icon: <RampIcon /> },
  { tab: 'saved', label: 'Saved', icon: <BookmarkIcon /> },
  { tab: 'gym', label: 'Gym', icon: <PlateIcon /> },
]

/** Bottom of a phone screen, under the thumb: the four places in the app. */
export function TabBar({ value, onChange }: { value: AppTab; onChange: (t: AppTab) => void }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {PHONE_TABS.map(({ tab, label, icon }) => {
          const on = tab === value
          return (
            <li key={tab}>
              <button
                type="button"
                aria-current={on ? 'page' : undefined}
                onClick={() => {
                  if (!on) feedback('select')
                  onChange(tab)
                }}
                className={`relative flex min-h-[56px] w-full select-none flex-col items-center justify-center gap-0.5 text-xs font-semibold transition active:scale-press ${
                  on ? 'text-ink' : 'text-muted hover:text-ink'
                }`}
              >
                {/* The current place is marked twice: a yellow bar and bolder ink. */}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-6 top-0 h-[3px] rounded-b-full bg-accent transition-transform duration-base ${on ? 'scale-x-100' : 'scale-x-0'}`}
                />
                {icon}
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

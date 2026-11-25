import type { Settings } from '../lib/settings'
import { Choice } from './kit/Choice'

/** Light, dark, or whatever the phone is doing — in words, not just icons. */
export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Settings['theme']
  onChange: (t: Settings['theme']) => void
}) {
  return (
    <Choice
      value={theme}
      onChange={onChange}
      label="Theme"
      options={[
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'Auto', title: 'Follow the phone’s light or dark setting' },
      ]}
    />
  )
}

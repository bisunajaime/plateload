import type { Settings } from '../lib/settings'
import { MoonIcon, Segmented, SunIcon, SystemIcon } from './ui'

export function ThemeToggle({
  theme,
  onChange,
}: {
  theme: Settings['theme']
  onChange: (t: Settings['theme']) => void
}) {
  return (
    <Segmented
      value={theme}
      onChange={onChange}
      label="Theme"
      options={[
        { value: 'light', label: <SunIcon />, title: 'Light' },
        { value: 'dark', label: <MoonIcon />, title: 'Dark' },
        { value: 'system', label: <SystemIcon />, title: 'Match system' },
      ]}
    />
  )
}

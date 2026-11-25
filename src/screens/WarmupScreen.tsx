import { useApp } from '../app/context'
import { WarmupPanel } from '../components/WarmupPanel'

/** Climbing to the working set: a ramp, or percentages of a max. */
export function WarmupScreen() {
  const app = useApp()
  return <WarmupPanel input={app.input} unit={app.settings.unit} target={app.settings.target} onPick={app.pick} onPickStep={app.setTarget} />
}

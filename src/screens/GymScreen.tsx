import { useApp } from '../app/context'
import { GymSettings } from '../components/InventoryEditor'
import { feedback } from '../feel'

/** Your gym — plates, bar, collars — then how the app looks and sounds. */
export function GymScreen() {
  const app = useApp()
  return (
    <GymSettings
      settings={app.settings}
      update={app.update}
      onInventory={(inventory, label) => {
        app.applyUndoable(label, { inventory })
        feedback('confirm')
      }}
      onReset={app.resetAll}
      footer={
        <p className="text-sm leading-relaxed text-muted">
          Plate geometry from Eleiko competition specs and the Metcon Group PH bumper range. Works offline once installed.{' '}
          <a href="/" className="font-medium text-ink underline decoration-edge underline-offset-4">
            About PlateLoad
          </a>
        </p>
      }
    />
  )
}

import { createContext, useContext } from 'react'
import type { AppModel } from './useAppModel'

export const AppContext = createContext<AppModel | null>(null)

/** Everything a screen needs: the settings, the solved load, and the actions on them. */
export function useApp(): AppModel {
  const app = useContext(AppContext)
  if (!app) throw new Error('useApp outside <AppContext>')
  return app
}

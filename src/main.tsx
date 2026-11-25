import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import './index.css'

// The service worker caches the app for offline use. The first time that
// finishes, the app says so — once — instead of leaving it to be guessed.
registerSW({
  immediate: true,
  onOfflineReady: () => window.dispatchEvent(new Event('plateload:offline-ready')),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

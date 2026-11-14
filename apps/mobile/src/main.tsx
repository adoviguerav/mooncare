import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import './styles/theme.css'
import { App } from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="stars" aria-hidden="true" />
    <App />
  </StrictMode>,
)

// The service worker keeps the app itself on the device, so it opens with no network. Only in the built app:
// in development it would serve stale files over Vite's hot reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // without it the app still works online
    })
  })
}

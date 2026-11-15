import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/700.css'
import '@mooncare/web/styles/index.css'
import './styles/phone.css'
import WebApp from '@mooncare/web/App.tsx'
import { SolarSky } from '@mooncare/web/components/SolarSky.tsx'

// The crew app shows the dashboard's own screens (apps/web), so the two cannot drift apart: what this app adds
// is being installable and opening with no network. Its earlier screens are kept in src/App.tsx and
// src/screens, with their styles in src/styles/theme.css, and are not shown.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolarSky />
    <WebApp />
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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { SolarSky } from './components/SolarSky.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolarSky />
    <App />
  </StrictMode>,
)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './game/analytics'
import { debug, world } from './game/state'

// Bot/pre-simulation debug sessions never pollute the analytics.
if (!debug.autoplay && !debug.sim) initAnalytics(world)

// Installable / offline (PWA). Dev keeps the network as-is so HMR is never served from a cache.
if ('serviceWorker' in navigator && import.meta.env.PROD && !debug.record)
  window.addEventListener('load', () => void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

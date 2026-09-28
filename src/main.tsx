import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './game/analytics'
import { debug, world } from './game/state'

// Bot/pre-simulation debug sessions never pollute the analytics.
if (!debug.autoplay && !debug.sim) initAnalytics(world)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

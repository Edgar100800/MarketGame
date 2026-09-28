import posthog, { type CaptureOptions } from 'posthog-js'
import type { World } from './world'
import { editedLevel, unlockTiers } from './editor'

// Set by the deploy workflow (GitHub repo variable). Unset locally, so dev sessions send nothing;
// put it in .env.local to test analytics.
const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = 'https://us.i.posthog.com'
export const LEVEL = 1

const BEAT_MS = 60_000
const MIN_SEGMENT_MS = 5_000

let ready = false
let playMs = 0
let segmentMs = 0
let lastBeat = 0
let seenUnlocks: string[] = []
let completedSent = false
/** Chain order and purchase wave of every unlock, from the level definition. */
let chain: string[] = []
let tiers: Record<string, number> = {}
/** Latest progress snapshot, refreshed every frame so exits carry game state. */
let progress = { last_unlock: null as string | null, unlock_count: 0, tier: 0, money: 0, earned: 0 }

const secs = (ms: number) => Math.round(ms / 1000)

function send(event: string, props: Record<string, unknown> = {}, options?: CaptureOptions) {
  posthog.capture(event, { level: LEVEL, ...progress, ...props }, options)
}

function readProgress(w: World) {
  const last = w.unlocked[w.unlocked.length - 1] ?? null
  progress = {
    last_unlock: last,
    unlock_count: w.unlocked.length,
    tier: last ? tiers[last] ?? 0 : 0,
    money: Math.round(w.money),
    earned: Math.round(w.earned),
  }
}

/** Registers page listeners and fires level_start. Called once from main.tsx. */
export function initAnalytics(w: World) {
  if (!KEY || ready) return
  ready = true
  const level = editedLevel()
  chain = level.unlocks.map((u) => u.id)
  tiers = unlockTiers(level)
  seenUnlocks = [...w.unlocked]
  readProgress(w)
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: false,
    disable_session_recording: true,
    persistence: 'localStorage',
  })
  send('level_start', { returning: w.earned > 0 || seenUnlocks.length > 0 })
  setInterval(() => {
    if (document.visibilityState !== 'visible') return
    playMs += 1000
    segmentMs += 1000
    if (segmentMs - lastBeat >= BEAT_MS) {
      lastBeat = segmentMs
      send('game_time', { seconds: secs(playMs) })
    }
  }, 1000)
  window.addEventListener('pagehide', flushEnd)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushEnd()
  })
}

/** Detects unlock and completion transitions; called once per frame from sync(). */
export function frameAnalytics(w: World) {
  if (!ready) return
  readProgress(w)
  if (w.unlocked.length !== seenUnlocks.length) {
    for (const id of w.unlocked) {
      if (seenUnlocks.includes(id)) continue
      send('unlock', { id, chain_index: chain.indexOf(id), tier: tiers[id] ?? 0 })
    }
    seenUnlocks = [...w.unlocked]
  }
  if (w.completed && !completedSent) {
    completedSent = true
    send('level_complete', { seconds: secs(playMs) })
  }
}

/** Counts an abandoned run before a manual restart. */
export function levelRestarted() {
  if (!ready) return
  send('level_restart', { seconds: secs(playMs) })
  completedSent = false
}

/**
 * Play time plus the progress the player left at. Sent through the SDK (so it carries device, OS
 * and host like every other event) as an immediate beacon, which survives the tab closing.
 */
function flushEnd() {
  if (!ready || segmentMs < MIN_SEGMENT_MS) return
  send('session_end', { seconds: secs(segmentMs), total_seconds: secs(playMs) }, { send_instantly: true, transport: 'sendBeacon' })
  segmentMs = 0
  lastBeat = 0
}

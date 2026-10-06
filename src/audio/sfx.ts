import { debug, onGameEvent, world } from '../game/state'
import type { GameEvent, Vec2, Vec3 } from '../game/types'

// Procedural sound effects (Web Audio, no asset files), in the spirit of the procedural models:
// short bubbly pops, bright coins and little bell chords. Every repeated action climbs a
// pentatonic scale (stack height, pickup streak, payment progress) so chains feel rewarding.

const MUTE_KEY = 'minimart.muted'
const VOLUME_KEY = 'minimart.volume'
/** Master gain at 100% volume. */
const MAX_GAIN = 0.8
/** Sounds from workers/customers fade out at this distance from the player. */
const HEAR_RADIUS = 16

/** Major pentatonic: any run of these notes sounds pleasant. */
const PENTA = [0, 2, 4, 7, 9]
function penta(base: number, step: number) {
  const s = Math.max(0, Math.floor(step))
  const semis = PENTA[s % 5] + 12 * Math.floor(s / 5)
  return base * Math.pow(2, semis / 12)
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let analyser: AnalyserNode | null = null
let meterData: Float32Array<ArrayBuffer> | null = null
const stored = typeof localStorage !== 'undefined' ? localStorage : null
let muted = stored?.getItem(MUTE_KEY) === '1'
let volume = Math.min(1, Math.max(0, Number(stored?.getItem(VOLUME_KEY) ?? 0.7) || 0))

/** Squared slider value: loudness feels linear along the slider. */
function targetGain() {
  return muted ? 0 : volume * volume * MAX_GAIN
}
const lastPlayed: Record<string, number> = {}

function ensureContext() {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  const comp = ctx.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 6
  // the analyser taps the final mix for the level meter in the sound panel
  analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  meterData = new Float32Array(analyser.fftSize)
  comp.connect(analyser)
  analyser.connect(ctx.destination)
  master = ctx.createGain()
  master.gain.value = targetGain()
  master.connect(comp)
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return ctx
}

/** Skips a sound when the same one fired less than `gap` seconds ago (dozens of events can land in one frame). */
function throttle(key: string, gap: number) {
  const now = ctx!.currentTime
  if (now - (lastPlayed[key] ?? -1) < gap) return false
  lastPlayed[key] = now
  return true
}

function ready() {
  return ctx !== null && master !== null && ctx.state === 'running' && !muted
}

interface ToneOpts {
  freq: number
  /** Pitch at the end of the note (exponential glide). */
  to?: number
  type?: OscillatorType
  dur: number
  vol: number
  attack?: number
  delay?: number
}

function tone({ freq, to, type = 'sine', dur, vol, attack = 0.004, delay = 0 }: ToneOpts) {
  const c = ctx!
  const t = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(master!)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

function hiss({ dur, vol, freq, to, q = 1, type = 'bandpass', delay = 0 }: { dur: number; vol: number; freq: number; to?: number; q?: number; type?: BiquadFilterType; delay?: number }) {
  const c = ctx!
  const t = c.currentTime + delay
  const src = c.createBufferSource()
  src.buffer = noise
  const f = c.createBiquadFilter()
  f.type = type
  f.Q.value = q
  f.frequency.setValueAtTime(freq, t)
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(vol, t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master!)
  src.start(t)
  src.stop(t + dur + 0.02)
}

/** 1 next to the player, fading to 0 at HEAR_RADIUS. */
function nearness(p: Vec2 | Vec3) {
  const x = Array.isArray(p) ? p[0] : p.x
  const z = Array.isArray(p) ? p[2] : p.z
  const d = Math.hypot(x - world.player.pos.x, z - world.player.pos.z)
  return Math.max(0, 1 - d / HEAR_RADIUS)
}

// --- the sound palette -------------------------------------------------------

// Pickup / place live above ~700 Hz: lower notes vanish on laptop and phone speakers.

/** Bubbly upward "bloop" when an item lands on the player's stack; higher the taller the stack. */
function pickup(height: number) {
  const f = penta(698, height)
  tone({ freq: f * 0.75, to: f * 1.5, type: 'triangle', dur: 0.1, vol: 0.4 })
  tone({ freq: f * 1.5, to: f * 3, type: 'sine', dur: 0.08, vol: 0.14, delay: 0.01 })
  hiss({ dur: 0.025, vol: 0.08, freq: 4000, q: 1.5 })
}

/** Woody "tok" + downward blip when the player places an item (shelf, machine, animal feed). */
function place(height: number) {
  const f = penta(880, height)
  tone({ freq: f * 1.3, to: f * 0.7, type: 'triangle', dur: 0.09, vol: 0.38 })
  tone({ freq: f * 2.6, to: f * 1.4, type: 'sine', dur: 0.05, vol: 0.1 })
  hiss({ dur: 0.04, vol: 0.14, freq: 1800, q: 3 })
}

/** Soft scuff; alternate feet get slightly different filters so the rhythm reads as left/right. */
function footstep(foot: number) {
  hiss({ dur: 0.05, vol: 0.09, freq: foot ? 1300 : 1100, to: 500, q: 1.2 })
  tone({ freq: foot ? 190 : 170, to: 110, type: 'sine', dur: 0.05, vol: 0.08 })
}

/** Bright two-note coin; the streak walks it up the scale. */
function coin(streak: number) {
  const f = penta(988, Math.min(streak, 12))
  tone({ freq: f, type: 'square', dur: 0.05, vol: 0.05 })
  tone({ freq: f * 1.335, type: 'square', dur: 0.16, vol: 0.06, delay: 0.045 })
  tone({ freq: f * 2.67, type: 'sine', dur: 0.12, vol: 0.05, delay: 0.045 })
}

/** Coins dropping into a buy zone, rising as the zone fills up. */
function pay(progress: number) {
  const f = penta(523, progress * 9)
  tone({ freq: f, to: f * 1.06, type: 'triangle', dur: 0.07, vol: 0.18 })
  tone({ freq: f * 3, type: 'sine', dur: 0.05, vol: 0.04 })
}

/** Whoomp + rising arpeggio + sparkle when something new gets built. */
function unlock() {
  tone({ freq: 160, to: 55, type: 'sine', dur: 0.35, vol: 0.5 })
  hiss({ dur: 0.35, vol: 0.18, freq: 500, to: 6000, q: 0.8 })
  const notes = [523, 659, 784, 1047, 1319]
  notes.forEach((f, i) => {
    tone({ freq: f, type: 'triangle', dur: 0.22, vol: 0.16, delay: 0.06 + i * 0.06 })
    tone({ freq: f * 2, type: 'sine', dur: 0.15, vol: 0.04, delay: 0.06 + i * 0.06 })
  })
  for (let i = 0; i < 6; i++) tone({ freq: 2200 + Math.random() * 2200, type: 'sine', dur: 0.12, vol: 0.035, delay: 0.32 + i * 0.045 })
}

/** Cash register "cha-ching" when a customer pays. */
function sale(vol: number) {
  hiss({ dur: 0.06, vol: 0.12 * vol, freq: 3500, q: 1.5 })
  tone({ freq: 1568, type: 'square', dur: 0.12, vol: 0.05 * vol, delay: 0.05 })
  tone({ freq: 2093, type: 'square', dur: 0.3, vol: 0.06 * vol, delay: 0.12 })
  tone({ freq: 4186, type: 'sine', dur: 0.25, vol: 0.04 * vol, delay: 0.12 })
}

/** Little kitchen-timer bell when a machine finishes a batch. */
function cooked(vol: number) {
  tone({ freq: 1760, type: 'sine', dur: 0.5, vol: 0.12 * vol })
  tone({ freq: 1760 * 2.76, type: 'sine', dur: 0.18, vol: 0.03 * vol })
}

/** Low whoosh into the bin. */
function trash(vol: number) {
  hiss({ dur: 0.22, vol: 0.2 * vol, freq: 1800, to: 200, q: 0.7 })
  tone({ freq: 140, to: 70, type: 'sine', dur: 0.12, vol: 0.2 * vol, delay: 0.08 })
}

/** Soft descending "bwoop" when a customer finds an empty shelf. */
function noStock(vol: number) {
  tone({ freq: 440, to: 330, type: 'triangle', dur: 0.14, vol: 0.12 * vol })
  tone({ freq: 330, to: 220, type: 'triangle', dur: 0.2, vol: 0.12 * vol, delay: 0.13 })
}

/** Quiet pop for other characters' transfers (workers, customers), so the store feels alive. */
function npcPop(vol: number) {
  const f = 500 + Math.random() * 300
  tone({ freq: f, to: f * 1.4, type: 'sine', dur: 0.06, vol: 0.08 * vol })
}

function upgrade() {
  tone({ freq: 392, to: 784, type: 'triangle', dur: 0.18, vol: 0.18 })
  ;[784, 988, 1175, 1568].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.2, vol: 0.12, delay: 0.1 + i * 0.05 }))
}

function complete() {
  const chord = [523, 659, 784, 1047]
  ;[0, 0.14, 0.28].forEach((d, k) => chord.forEach((f) => tone({ freq: f * (k === 2 ? 2 : 1), type: 'triangle', dur: k === 2 ? 0.9 : 0.12, vol: 0.1, delay: d })))
  for (let i = 0; i < 10; i++) tone({ freq: 2000 + Math.random() * 3000, type: 'sine', dur: 0.15, vol: 0.03, delay: 0.3 + i * 0.06 })
}

/** Tiny tick for HUD buttons. */
export function uiClick() {
  if (!ready() || !throttle('ui', 0.03)) return
  tone({ freq: 1200, to: 900, type: 'triangle', dur: 0.05, vol: 0.12 })
}

// --- wiring ------------------------------------------------------------------

/** Seconds between steps; matches the Character walk cycle (phase += dt * 10, two steps per turn). */
const STEP_TIME = Math.PI / 10

/** Footsteps have no game event: poll the player each frame while the context is live. */
function stepLoop() {
  let raf = 0
  let last = performance.now()
  let acc = 0
  let foot = 0
  const frame = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000)
    last = now
    if (world.player.moving && ready()) {
      acc += dt
      if (acc >= STEP_TIME) {
        acc -= STEP_TIME
        foot ^= 1
        footstep(foot)
      }
    } else acc = STEP_TIME * 0.6 // first step lands right after starting to walk
    raf = requestAnimationFrame(frame)
  }
  raf = requestAnimationFrame(frame)
  return () => cancelAnimationFrame(raf)
}

/** Several sim sub-steps can run before sounds play, so the player may have moved a little since the throw. */
function isPlayerAt(p: Vec3) {
  return Math.hypot(p[0] - world.player.pos.x, p[2] - world.player.pos.z) < 0.8
}

function play(e: GameEvent) {
  switch (e.type) {
    case 'fly': {
      if (e.to.type === 'player') {
        if (e.kind === 'money') {
          if (throttle('coin', 0.035)) coin(world.player.moneyStreak)
        } else if (throttle('pickup', 0.04)) pickup(world.player.stack.length)
      } else if (e.kind === 'money') {
        // buy zones and customer payments have their own cues
      } else if (e.to.type === 'point' && isPlayerAt(e.from)) {
        if (throttle('place', 0.04)) place(world.player.stack.length)
      } else {
        const v = nearness(e.from)
        if (v > 0.05 && throttle('npc', 0.07)) npcPop(v)
      }
      break
    }
    case 'pay':
      if (throttle('pay', 0.03)) pay(e.progress)
      break
    case 'unlock':
      unlock()
      break
    case 'sale': {
      const v = Math.max(0.35, nearness(e.pos))
      if (throttle('sale', 0.12)) sale(v)
      break
    }
    case 'cooked': {
      const v = nearness(e.pos)
      if (v > 0.05 && throttle('cooked', 0.15)) cooked(v)
      break
    }
    case 'trash':
      if (throttle('trash', 0.1)) trash(Math.max(0.3, nearness(e.pos)))
      break
    case 'float':
      if (e.text === '¡Sin stock!') {
        const v = nearness(e.pos)
        if (v > 0.05 && throttle('nostock', 0.4)) noStock(v)
      }
      break
    case 'upgrade':
      upgrade()
      break
    case 'complete':
      complete()
      break
  }
}

export function isMuted() {
  return muted
}

export function setMuted(m: boolean) {
  muted = m
  localStorage.setItem(MUTE_KEY, m ? '1' : '0')
  if (ctx && master) master.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.02)
}

export function getVolume() {
  return volume
}

/** 0..1 slider value. Moving it above zero also unmutes. */
export function setVolume(v: number) {
  volume = Math.min(1, Math.max(0, v))
  localStorage.setItem(VOLUME_KEY, String(volume))
  if (volume > 0 && muted) setMuted(false)
  else if (ctx && master) master.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.02)
}

/** Sample of the game's typical sounds, so the player hears the chosen volume. */
export function previewSound() {
  if (!ready() || !throttle('preview', 0.12)) return
  pickup(2)
  coin(3)
}

/** Peak level of the final mix, 0..1 (for the meter). */
export function outputLevel() {
  if (!analyser || !meterData || !ctx || ctx.state !== 'running') return 0
  analyser.getFloatTimeDomainData(meterData)
  let peak = 0
  for (const v of meterData) peak = Math.max(peak, Math.abs(v))
  return Math.min(1, peak)
}

/** Hooks game events to sounds. Browsers only allow audio after a user gesture, so the context starts on the first input. */
export function startSound() {
  if (debug.shot || debug.record) return () => {}
  const unlockAudio = () => {
    const c = ensureContext()
    if (!c || c.state === 'running') return
    void c.resume()
    // iOS Safari only unlocks output after something plays inside the gesture
    const blip = c.createBufferSource()
    blip.buffer = c.createBuffer(1, 1, c.sampleRate)
    blip.connect(c.destination)
    blip.start()
  }
  const onVisibility = () => {
    if (!ctx) return
    if (document.visibilityState === 'hidden') void ctx.suspend()
    else void ctx.resume()
  }
  const off = onGameEvent((e) => {
    if (ready()) play(e)
  })
  const stopSteps = stepLoop()
  window.addEventListener('pointerdown', unlockAudio)
  window.addEventListener('keydown', unlockAudio)
  window.addEventListener('touchend', unlockAudio)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    off()
    stopSteps()
    window.removeEventListener('pointerdown', unlockAudio)
    window.removeEventListener('keydown', unlockAudio)
    window.removeEventListener('touchend', unlockAudio)
    document.removeEventListener('visibilitychange', onVisibility)
  }
}

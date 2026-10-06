import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { PerspectiveCamera } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type PerspectiveCamera as Cam } from 'three'
import { CAMERA_YAW } from '../game/systems/movement'

// `?record`: deterministic capture for promo videos. The canvas runs with frameloop="never" and an
// external driver (scripts/record-promo.ts) calls window.__step() once per video frame, then grabs a
// screenshot, so the result plays at exactly FPS no matter how slow the machine renders.

export const FPS = 30
/** `?vertical`: 9:16 promo. Cameras pull back so the narrow frame still shows the store. */
const VERTICAL = new URLSearchParams(location.search).has('vertical')
const DIST_SCALE = VERTICAL ? 1.55 : 1

/** Total promo length and when the end card (logo over the live store) starts. */
export const PROMO_SECONDS = 12
const END_CARD = 8.5

/** One camera move: orbit angles and distance around a look point, eased from `from` to `to`. */
type Pose = { yaw: number; pitch: number; dist: number }
type Shot = { until: number; from: Pose; to: Pose; look: () => { x: number; z: number } }

const deg = (d: number) => (d * Math.PI) / 180
const storeCenter = () => ({ x: 4.5, z: 0.5 })
/** Travelling shot along the store, left to right, timed to the follow shot. */
let clockNow = 0
const aisle = () => {
  const k = ease(Math.min(1, Math.max(0, (clockNow - 3) / (END_CARD - 3))))
  return { x: lerp(-6, 12, k), z: lerp(0.5, -1, k) }
}

/** Wide sweep over the busy store, then a close travelling shot along the aisles. */
const SHOTS: Shot[] = [
  {
    until: 3,
    from: { yaw: CAMERA_YAW + deg(30), pitch: deg(56), dist: 30 },
    to: { yaw: CAMERA_YAW - deg(2), pitch: deg(40), dist: 21 },
    look: storeCenter,
  },
  {
    until: END_CARD,
    from: { yaw: CAMERA_YAW - deg(8), pitch: deg(40), dist: 14 },
    to: { yaw: CAMERA_YAW + deg(6), pitch: deg(38), dist: 12.5 },
    look: aisle,
  },
  {
    // pull-back reveal of the whole store behind the logo
    until: Infinity,
    from: { yaw: CAMERA_YAW - deg(12), pitch: deg(34), dist: 17 },
    to: { yaw: CAMERA_YAW + deg(2), pitch: deg(44), dist: 27 },
    look: storeCenter,
  },
]
/** Length of the last shot's move. */
const LAST_SHOT_SECONDS = PROMO_SECONDS - END_CARD

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export function RecordCamera() {
  const cam = useRef<Cam>(null)
  const look = useRef(new Vector3())
  useFrame(({ clock }) => {
    const c = cam.current
    if (!c) return
    const t = clock.elapsedTime
    clockNow = t
    const index = SHOTS.findIndex((s) => t < s.until)
    const shot = SHOTS[index]
    const start = index === 0 ? 0 : SHOTS[index - 1].until
    const span = shot.until === Infinity ? LAST_SHOT_SECONDS : shot.until - start
    const k = ease(Math.min(1, (t - start) / span))
    const yaw = lerp(shot.from.yaw, shot.to.yaw, k)
    const pitch = lerp(shot.from.pitch, shot.to.pitch, k)
    const dist = lerp(shot.from.dist, shot.to.dist, k) * DIST_SCALE
    const p = shot.look()
    // targets are tracked softly; the first frame of a shot snaps (hard cut)
    const target = new Vector3(p.x, 0, p.z - 1)
    if (t - start < 1 / FPS + 1e-6) look.current.copy(target)
    else look.current.lerp(target, 0.12)
    c.position.set(
      look.current.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist,
      look.current.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    )
    c.lookAt(look.current)
  })
  return <PerspectiveCamera ref={cam} makeDefault fov={34} />
}

/** Exposes window.__step(): advances the whole scene by exactly one video frame and renders it. */
export function RecordDriver() {
  const advance = useThree((s) => s.advance)
  const frame = useRef(0)
  useEffect(() => {
    const w = window as unknown as { __step?: () => number; __recordReady?: boolean }
    w.__step = () => {
      frame.current++
      advance(frame.current / FPS)
      window.dispatchEvent(new CustomEvent('record-frame', { detail: frame.current / FPS }))
      return frame.current
    }
    w.__recordReady = true
    return () => {
      delete w.__step
      w.__recordReady = false
    }
  }, [advance])
  return null
}

// ---- Promo overlay: captions and the end card, drawn as DOM over the live render ----

const COPY = {
  es: {
    hook: '¿PUEDES CON TU PROPIO SÚPER?',
    beats: ['COSECHA · COCINA · VENDE', 'CONTRATA A TU EQUIPO'],
    tagline: 'Construye · Abastece · Crece',
    cta: '¡JUGAR GRATIS!',
    sub: 'Juega gratis en tu navegador',
  },
  en: {
    hook: 'CAN YOU RUN YOUR OWN MART?',
    beats: ['HARVEST · COOK · SELL', 'HIRE YOUR CREW'],
    tagline: 'Build · Stock · Grow',
    cta: 'PLAY FREE!',
    sub: 'Play free in your browser',
  },
}

const params = new URLSearchParams(location.search)
const copy = COPY[params.get('lang') === 'en' ? 'en' : 'es']
const LINK = params.get('link') ?? 'minimart-lab.pages.dev'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const backOut = (x: number) => {
  const c = 1.9
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2)
}
/** 0 before `at`, springs to 1 over `len` seconds (with overshoot). */
const pop = (t: number, at: number, len = 0.35) => (t < at ? 0 : backOut(clamp01((t - at) / len)))
const fade = (t: number, at: number, len = 0.25) => clamp01((t - at) / len)

const INK = '#1e1914'
const outlined: CSSProperties = { color: '#fff', WebkitTextStroke: `9px ${INK}`, paintOrder: 'stroke fill', textShadow: `0 7px 0 ${INK}` }

function Caption({ t, text, from, to }: { t: number; text: string; from: number; to: number }) {
  if (t < from || t > to) return null
  const k = pop(t, from, 0.25)
  const out = clamp01((to - t) / 0.15)
  return (
    <div
      style={{
        position: 'absolute',
        top: VERTICAL ? 110 : 44,
        left: VERTICAL ? 28 : 0,
        right: VERTICAL ? 28 : 0,
        textAlign: 'center',
        fontSize: VERTICAL ? 64 : 66,
        lineHeight: 1.1,
        letterSpacing: 1,
        opacity: Math.min(1, k) * out,
        transform: `scale(${0.6 + 0.4 * k})`,
        ...outlined,
      }}
    >
      {/* wrap only between beats, keeping each separator dot with the word before it */}
      {text.includes(' · ')
        ? text.split(' · ').map((part, i, all) => (
            <span key={i}>
              <span style={{ whiteSpace: 'nowrap' }}>{i < all.length - 1 ? `${part} ·` : part}</span>
              {i < all.length - 1 ? ' ' : ''}
            </span>
          ))
        : text}
    </div>
  )
}

function EndCard({ t }: { t: number }) {
  const shade = fade(t, END_CARD, 0.5)
  const logo = pop(t, END_CARD + 0.2, 0.55)
  const tag = fade(t, END_CARD + 0.9, 0.3)
  const cta = pop(t, END_CARD + 1.2, 0.35)
  const pulse = 1 + 0.045 * Math.max(0, Math.sin((t - END_CARD - 1.6) * 5)) * (t > END_CARD + 1.6 ? 1 : 0)
  const link = fade(t, END_CARD + 1.6, 0.3)
  const float = Math.sin((t - END_CARD) * 2.2) * 4
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: shade,
          background: `linear-gradient(180deg, rgba(30,25,20,.55) 0%, rgba(30,25,20,0) 42%), linear-gradient(0deg, rgba(30,25,20,.75) 0%, rgba(30,25,20,0) 38%)`,
        }}
      />
      <div style={{ position: 'absolute', top: VERTICAL ? 150 : 40, left: '50%', transform: `translate(-50%, ${(1 - logo) * -420 + float}px) rotate(-2deg) scale(${VERTICAL ? 1.08 : 1})`, textAlign: 'center' }}>
        <div style={{ height: 34, margin: '0 18px -8px', border: `8px solid ${INK}`, borderBottom: 'none', borderRadius: '18px 18px 0 0', background: 'repeating-linear-gradient(90deg,#e8413c 0 42px,#fff 42px 84px)' }} />
        <div style={{ background: '#fff6dc', border: `8px solid ${INK}`, borderRadius: 32, padding: '10px 54px 16px', boxShadow: `0 12px 0 ${INK}` }}>
          <div style={{ fontSize: 40, letterSpacing: 12, color: INK, lineHeight: 1, whiteSpace: 'nowrap' }}>MINI MART</div>
          <div style={{ fontSize: 138, lineHeight: 0.9, color: '#ffd23f', WebkitTextStroke: `8px ${INK}`, paintOrder: 'stroke fill', textShadow: `0 8px 0 ${INK}` }}>
            L<span style={{ color: '#ff8a3d' }}>A</span>B
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: VERTICAL ? 190 : 84,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: VERTICAL ? 'column-reverse' : 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: VERTICAL ? 26 : 20,
        }}
      >
        <div style={{ opacity: tag, transform: `translateY(${(1 - tag) * 30}px)`, background: 'rgba(30,25,20,.85)', color: '#fff', fontSize: 32, padding: '12px 28px', borderRadius: 40, border: '4px solid #fff' }}>
          {copy.tagline}
        </div>
        <div style={{ transform: `scale(${cta * pulse})`, background: '#34e0ff', color: INK, fontSize: VERTICAL ? 48 : 38, padding: VERTICAL ? '16px 48px' : '12px 36px', borderRadius: 40, border: `6px solid ${INK}`, boxShadow: `0 7px 0 ${INK}` }}>
          {copy.cta}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: VERTICAL ? 70 : 18, left: 0, right: 0, textAlign: 'center', opacity: link, transform: `translateY(${(1 - link) * 16}px)` }}>
        <span style={{ color: '#b9ef62', fontSize: 28 }}>
          {copy.sub}
          {VERTICAL ? <br /> : ' · '}
        </span>
        <span style={{ color: '#fff', fontSize: VERTICAL ? 44 : 38 }}>{LINK}</span>
      </div>
    </>
  )
}

/** Captions and end card for `?record` (optional `?lang=en`, `?link=host`, `?vertical`), re-rendered on every stepped frame. */
export function PromoOverlay() {
  const [t, setT] = useState(0)
  useEffect(() => {
    const on = (e: Event) => setT((e as CustomEvent<number>).detail)
    window.addEventListener('record-frame', on)
    return () => window.removeEventListener('record-frame', on)
  }, [])
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, fontFamily: "'Lilita One', sans-serif", overflow: 'hidden' }}>
      <Caption t={t} text={copy.hook} from={0.25} to={2.9} />
      <Caption t={t} text={copy.beats[0]} from={3.2} to={5.6} />
      <Caption t={t} text={copy.beats[1]} from={5.8} to={END_CARD - 0.15} />
      {t >= END_CARD && <EndCard t={t} />}
    </div>
  )
}

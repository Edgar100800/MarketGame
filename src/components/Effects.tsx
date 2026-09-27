import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { C } from '../materials/palette'
import { Ball, Box, Part } from '../models/parts'
import { Product } from '../models/Products'
import { SafeHtml } from '../models/Labels'
import { onGameEvent, useGame, world } from '../game/state'
import type { FlyKind, FlyTarget, Vec3 } from '../game/types'
import { floorY } from './StationView'

const FLY_TIME = 0.28

type Flight = { key: number; kind: FlyKind; from: Vec3; to: FlyTarget; t0: number }

function targetPos(to: FlyTarget): Vec3 | null {
  if (to.type === 'point') return to.p
  if (to.type === 'player') {
    const p = world.player
    return [p.pos.x, floorY(p.pos.x, p.pos.z) + 0.8 + p.stack.length * 0.26, p.pos.z]
  }
  if (to.type === 'worker') {
    const wk = world.workers.find((x) => x.id === to.id)
    return wk ? [wk.pos.x, floorY(wk.pos.x, wk.pos.z) + 0.8 + wk.count * 0.25, wk.pos.z] : null
  }
  const c = world.customers.find((x) => x.id === to.id)
  if (!c) return null
  const y = c.carryMode === 'cart' ? 0.75 : c.carryMode === 'basket' ? 1.0 : 1.0 + c.items.length * 0.12
  return [c.pos.x, floorY(c.pos.x, c.pos.z) + y, c.pos.z]
}

function FlyingItem({ f, onDone }: { f: Flight; onDone: (key: number) => void }) {
  const ref = useRef<Group>(null)
  const finished = useRef(false)
  useFrame(() => {
    const g = ref.current
    if (!g || finished.current) return
    const t = Math.min(1, (world.time - f.t0) / FLY_TIME)
    const to = targetPos(f.to)
    if (!to || t >= 1) {
      finished.current = true
      g.visible = false
      onDone(f.key)
      return
    }
    // parabola: lerp + arc, squash near the end
    const e = t * (2 - t)
    g.position.set(f.from[0] + (to[0] - f.from[0]) * e, f.from[1] + (to[1] - f.from[1]) * e + Math.sin(Math.PI * t) * 1.2, f.from[2] + (to[2] - f.from[2]) * e)
    const s = t > 0.8 ? 1 + (1 - t) * 0.8 : 1
    g.scale.set(s, 2 - s, s)
    g.rotation.y = t * Math.PI
  })
  return (
    <group ref={ref} position={f.from}>
      <Product kind={f.kind} />
    </group>
  )
}

/** Every item transfer is drawn as a short arc from source to destination. */
export function FlyingItems() {
  const [flights, setFlights] = useState<Flight[]>([])
  const next = useRef(0)
  useEffect(
    () =>
      onGameEvent((e) => {
        if (e.type !== 'fly') return
        const f = { key: next.current++, kind: e.kind, from: e.from, to: e.to, t0: world.time }
        setFlights((fs) => (fs.length > 60 ? [...fs.slice(-60), f] : [...fs, f]))
      }),
    [],
  )
  const done = (key: number) => setFlights((fs) => fs.filter((f) => f.key !== key))
  return (
    <>
      {flights.map((f) => (
        <FlyingItem key={f.key} f={f} onDone={done} />
      ))}
    </>
  )
}

type Floater = { key: number; text: string; pos: Vec3; big?: boolean }

/** "+$12" texts that rise and fade (CSS animation), plus unlock banners. */
export function FloatingTexts() {
  const [items, setItems] = useState<Floater[]>([])
  const next = useRef(0)
  useEffect(
    () =>
      onGameEvent((e) => {
        let f: Floater | null = null
        if (e.type === 'float') f = { key: next.current++, text: e.text, pos: e.pos }
        if (e.type === 'unlock') f = { key: next.current++, text: '¡Desbloqueado!', pos: [e.pos.x, 2.5, e.pos.z], big: true }
        if (!f) return
        const key = f.key
        setItems((xs) => [...xs, f])
        setTimeout(() => setItems((xs) => xs.filter((x) => x.key !== key)), 1200)
      }),
    [],
  )
  return (
    <>
      {items.map((f) => (
        <SafeHtml key={f.key} position={f.pos} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className={f.big ? 'floater big' : 'floater'}>{f.text}</div>
        </SafeHtml>
      ))}
    </>
  )
}

type Burst = { key: number; x: number; z: number; t0: number }

function Puff({ b, onDone }: { b: Burst; onDone: (k: number) => void }) {
  const ref = useRef<Group>(null)
  const finished = useRef(false)
  useFrame(() => {
    const g = ref.current
    if (!g || finished.current) return
    const t = (world.time - b.t0) / 0.7
    if (t >= 1) {
      finished.current = true
      g.visible = false
      return onDone(b.key)
    }
    g.children.forEach((c, i) => {
      const a = (i / g.children.length) * Math.PI * 2
      const r = 0.4 + t * 1.8
      c.position.set(Math.cos(a) * r, 0.3 + Math.sin(t * Math.PI) * 0.8, Math.sin(a) * r)
      c.scale.setScalar(Math.max(0.01, 1 - t))
    })
  })
  return (
    <group ref={ref} position={[b.x, floorY(b.x, b.z), b.z]}>
      {Array.from({ length: 10 }, (_, i) => (
        <Ball key={i} r={0.22} color={C.white} outline={false} />
      ))}
    </group>
  )
}

/** White puff ring where something gets unlocked. */
export function UnlockBursts() {
  const [bursts, setBursts] = useState<Burst[]>([])
  const next = useRef(0)
  useEffect(
    () =>
      onGameEvent((e) => {
        if (e.type !== 'unlock') return
        const key = next.current++
        setBursts((bs) => [...bs, { key, x: e.pos.x, z: e.pos.z, t0: world.time }])
      }),
    [],
  )
  const done = (k: number) => setBursts((bs) => bs.filter((b) => b.key !== k))
  return (
    <>
      {bursts.map((b) => (
        <Puff key={b.key} b={b} onDone={done} />
      ))}
    </>
  )
}

/** Big bobbing yellow arrow over the current objective. */
export function TutorialArrow() {
  const target = useGame((s) => s.objective.target)
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current || !target) return
    ref.current.position.set(target.x, floorY(target.x, target.z) + 2.6 + Math.sin(clock.elapsedTime * 5) * 0.25, target.z)
    ref.current.rotation.y = clock.elapsedTime * 1.5
  })
  if (!target) return null
  return (
    <group ref={ref}>
      <Part color={C.yellow} position={[0, 0, 0]} rotation={[Math.PI, 0, 0]} line={3}>
        <coneGeometry args={[0.55, 0.7, 4]} />
      </Part>
      <Box size={[0.4, 0.7, 0.4]} color={C.yellow} position={[0, 0.65, 0]} line={3} />
    </group>
  )
}

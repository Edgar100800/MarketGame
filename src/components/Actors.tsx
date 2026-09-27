import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { C, CUSTOMER_COLORS, WORKER_COLOR } from '../materials/palette'
import { Character, type HatKind } from '../models/Character'
import { CarryStack } from '../models/CarryStack'
import { ShoppingBasket, ShoppingCart } from '../models/ShoppingContainers'
import { Bubble, Pill } from '../models/Labels'
import { ICON, ROLE_NAME } from '../game/config'
import type { WorkerRole } from '../game/types'
import { PopIn } from './PopIn'
import { useGame, world } from '../game/state'
import { floorY } from './StationView'
import { CHARACTER_SCALE } from '../game/sizes'

/** Turns smoothly towards `target` angle. */
function turn(g: Group, target: number, dt: number) {
  let d = target - g.rotation.y
  d = Math.atan2(Math.sin(d), Math.cos(d))
  g.rotation.y += d * Math.min(1, dt * 14)
}

/**
 * Little squash-and-stretch of the body every time an item is loaded or unloaded
 * (the "toss" feel when the stack changes). Returns a ref for the group to squash.
 */
function useTransferBounce(count: number) {
  const ref = useRef<Group>(null)
  const sp = useRef({ x: 0, v: 0 })
  const prev = useRef(count)
  useEffect(() => {
    if (count === prev.current) return
    // unloading pushes the body down harder than loading
    sp.current.v += count < prev.current ? -2.4 : -1.4
    prev.current = count
  }, [count])
  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const s = sp.current
    s.v += (-220 * s.x - 14 * s.v) * dt
    s.x += s.v * dt
    if (ref.current) ref.current.scale.set(1 - s.x * 0.5, 1 + s.x, 1 - s.x * 0.5)
  })
  return ref
}

export function PlayerView() {
  useGame((s) => s.sigs.player)
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  useFrame((_, dt) => {
    const p = world.player
    if (!root.current || !body.current) return
    root.current.position.set(p.pos.x, floorY(p.pos.x, p.pos.z), p.pos.z)
    turn(body.current, p.facing, dt)
  })
  const p = world.player
  const bounce = useTransferBounce(p.stack.length)
  return (
    <group ref={root}>
      <group ref={body}>
        <group ref={bounce}>
          {/* mixed stack: tomatoes, eggs... in pickup order, animated on load / unload */}
          <Character scale={CHARACTER_SCALE} color={C.player} walking={p.moving} carry={p.stack.length > 0 && <CarryStack items={p.stack} moving={p.moving} />} />
        </group>
      </group>
      {p.stack.length >= p.cap && <Pill text="MAX" position={[0, 2.3 * CHARACTER_SCALE, 0]} />}
    </group>
  )
}

function CustomerView({ id }: { id: number }) {
  useGame((s) => s.sigs[`c${id}`])
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  useFrame((_, dt) => {
    const c = world.customers.find((x) => x.id === id)
    if (!c || !root.current || !body.current) return
    root.current.position.set(c.pos.x, floorY(c.pos.x, c.pos.z), c.pos.z)
    turn(body.current, c.facing, dt)
  })
  const c = world.customers.find((x) => x.id === id)
  if (!c) return null
  const shopping = c.state === 'toShelf' || c.state === 'waitStock'
  const queued = c.state === 'toQueue' || c.state === 'inQueue'
  const line = c.shopping[c.lineIndex]
  const carry = c.carryMode === 'hands' ? (c.items.length > 0 ? <CarryStack items={c.items} moving={c.moving} /> : null) : c.carryMode === 'basket' ? <ShoppingBasket items={c.items} /> : null
  const push = c.carryMode === 'cart' ? <ShoppingCart items={c.items} moving={c.moving} /> : null
  return (
    <group ref={root} position={[c.pos.x, 0, c.pos.z]}>
      <group ref={body}>
        <Character
          scale={CHARACTER_SCALE}
          color={CUSTOMER_COLORS[c.color]}
          hat={c.hat}
          hatColor={c.hatColor}
          walking={c.moving}
          carry={carry}
          push={push}
        />
      </group>
      {/* the bubble only shows the want they are chasing right now: icon + count + one dot per list item */}
      {shopping && line && <Bubble icon={ICON[line.kind]} text={`${line.collected}/${line.requested}`} dots={{ done: c.lineIndex, total: c.shopping.length }} position={[0, 2.2 * CHARACTER_SCALE, 0]} />}
      {queued && <Bubble text="Caja" position={[0, 2.2 * CHARACTER_SCALE, 0]} />}
    </group>
  )
}

export function Customers() {
  useGame((s) => s.version)
  return (
    <>
      {world.customers.map((c) => (
        <CustomerView key={c.id} id={c.id} />
      ))}
    </>
  )
}

const ROLE_LOOK: Record<WorkerRole, { hat: HatKind; hatColor: string; vest?: string; top?: string; buttons?: string }> = {
  shelver: { hat: 'cap', hatColor: '#3D8BFF', vest: '#3D8BFF' },
  chef: { hat: 'chef', hatColor: C.white, top: C.white, buttons: C.dark },
  farmer: { hat: 'straw', hatColor: C.straw },
}

function WorkerBody({ bounceKey, children }: { bounceKey: number; children: React.ReactNode }) {
  const ref = useTransferBounce(bounceKey)
  return <group ref={ref}>{children}</group>
}

function WorkerView({ id }: { id: string }) {
  useGame((s) => s.sigs[`w:${id}`])
  const root = useRef<Group>(null)
  const body = useRef<Group>(null)
  useFrame((_, dt) => {
    const wk = world.workers.find((x) => x.id === id)
    if (!wk || !root.current || !body.current) return
    root.current.position.set(wk.pos.x, floorY(wk.pos.x, wk.pos.z), wk.pos.z)
    turn(body.current, wk.facing, dt)
  })
  const wk = world.workers.find((x) => x.id === id)
  if (!wk) return null
  const look = ROLE_LOOK[wk.role]
  // workers carry one kind and always move the top item, so index ids are stable enough
  const items = wk.carry ? Array.from({ length: wk.count }, (_, i) => ({ id: i, kind: wk.carry! })) : []
  return (
    <group ref={root} position={[wk.pos.x, 0, wk.pos.z]}>
      <PopIn bornAt={wk.bornAt}>
        <group ref={body}>
          <WorkerBody bounceKey={wk.count}>
            <Character scale={CHARACTER_SCALE} color={WORKER_COLOR} hat={look.hat} hatColor={look.hatColor} vest={look.vest} top={look.top} buttons={look.buttons} walking={wk.moving} carry={items.length > 0 && <CarryStack items={items} moving={wk.moving} />} />
          </WorkerBody>
        </group>
      </PopIn>
      <Pill text={wk.paused ? `⏸ ${ROLE_NAME[wk.role]}` : ROLE_NAME[wk.role]} position={[0, 2.3 * CHARACTER_SCALE, 0]} />
    </group>
  )
}

export function Workers() {
  useGame((s) => s.version)
  return (
    <>
      {world.workers.map((wk) => (
        <WorkerView key={wk.id} id={wk.id} />
      ))}
    </>
  )
}

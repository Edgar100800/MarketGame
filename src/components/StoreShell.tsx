import { useEffect, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { C } from '../materials/palette'
import { toon } from '../materials/toon'
import { Box } from '../models/parts'
import { BuyZone, Awning, FloorMat, TrashBin, Wall } from '../models/Store'
import { Bush, Fence } from '../models/Farm'
import { DecoView } from './DecoView'
import { Pill, PriceTag } from '../models/Labels'
import { onGameEvent, useGame, world } from '../game/state'
import { activeDoors, activeTrash, trashZone, unlockDef } from '../game/world'
import type { AreaDef } from '../game/types'
import { PopIn } from './PopIn'
import { floorY } from './StationView'
import { ZonePad } from './ZonePad'

const SLAB = 0.15
const TILE = 1

/** Store floor. Areas unlocked during play build themselves tile by tile in a wave. */
function AreaFloor({ area, bornAt }: { area: AreaDef; bornAt: number }) {
  const r = area.rect
  const tiles = useRef<(Mesh | null)[]>([])
  const done = useRef(bornAt < 0)
  const cols = Math.round(r.w / TILE)
  const rows = Math.round(r.d / TILE)
  const x0 = r.x - r.w / 2
  const z0 = r.z - r.d / 2
  useFrame(() => {
    if (done.current) return
    let all = true
    tiles.current.forEach((m, i) => {
      if (!m) return
      const c = i % cols
      const row = Math.floor(i / cols)
      // wave from the left edge (where the buy zone is) to the right
      const delay = c * 0.06 + Math.abs(row - rows / 2) * 0.02
      const t = Math.min(1, Math.max(0, (world.time - bornAt - delay) / 0.3))
      if (t < 1) all = false
      m.position.y = SLAB / 2 - (1 - t) * 0.5
      m.scale.setScalar(Math.max(0.001, t))
    })
    if (all) done.current = true
  })
  if (bornAt < 0)
    return (
      <>
        <Box size={[r.w + 0.6, 0.1, r.d + 0.6]} color={C.floorEdge} position={[r.x, 0.05, r.z]} outline={false} />
        <Box size={[r.w, SLAB, r.d]} color={C.floor} position={[r.x, SLAB / 2, r.z]} outline={false} />
      </>
    )
  return (
    <>
      <Box size={[r.w + 0.6, 0.1, r.d + 0.6]} color={C.floorEdge} position={[r.x, 0.05, r.z]} outline={false} />
      {Array.from({ length: cols * rows }, (_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            tiles.current[i] = m
          }}
          receiveShadow
          material={toon(C.floor)}
          position={[x0 + (i % cols) * TILE + TILE / 2, -1, z0 + Math.floor(i / cols) * TILE + TILE / 2]}
          scale={0.001}
        >
          <boxGeometry args={[TILE, SLAB, TILE]} />
        </mesh>
      ))}
    </>
  )
}

/** Wall that rises from the ground when its area is unlocked. */
function RisingWall({ bornAt, children }: { bornAt: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const t = bornAt < 0 ? 1 : Math.min(1, Math.max(0, (world.time - bornAt - 0.4) / 0.5))
    ref.current.scale.y = Math.max(0.001, t)
  })
  return <group ref={ref}>{children}</group>
}

/** Side walls and door dressing for an enclosed area (the hiring office). */
function EnclosedWalls({ area }: { area: AreaDef }) {
  const r = area.rect
  const x0 = r.x - r.w / 2
  const x1 = r.x + r.w / 2
  const z0 = r.z - r.d / 2
  const z1 = r.z + r.d / 2
  const door = area.door
  const gap: [number, number] | null = door ? [door.at - door.width / 2, door.at + door.width / 2] : null
  // a side wall splits around the doorway when the door is on it; the north side is the shared back wall
  const segs = (side: string, lo: number, hi: number): [number, number][] => (gap && door?.side === side ? [[lo, gap[0]], [gap[1], hi]] : [[lo, hi]])
  // door dressing is drawn in a frame where the doorway runs along local z and "outside" is +x
  const frame =
    door?.side === 'south'
      ? { position: [door.at, 0, z1] as const, rotation: [0, -Math.PI / 2, 0] as const }
      : door?.side === 'west'
        ? { position: [x0, 0, door.at] as const, rotation: [0, Math.PI, 0] as const }
        : door
          ? { position: [x1, 0, door.at] as const, rotation: [0, 0, 0] as const }
          : null
  return (
    <>
      {segs('west', z0, z1).map(([lo, hi], i) => (
        <Wall key={`w${i}`} length={hi - lo} position={[x0, 0, (lo + hi) / 2]} rotation={[0, Math.PI / 2, 0]} />
      ))}
      {segs('south', x0, x1).map(([lo, hi], i) => (
        <Wall key={`s${i}`} length={hi - lo} position={[(lo + hi) / 2, 0, z1]} rotation={[0, Math.PI, 0]} />
      ))}
      {segs('east', z0, z1).map(([lo, hi], i) => (
        <Wall key={`e${i}`} length={hi - lo} position={[x1, 0, (lo + hi) / 2]} rotation={[0, Math.PI / 2, 0]} />
      ))}
      {door && frame && (
        <group position={[...frame.position]} rotation={[...frame.rotation]}>
          <Box size={[0.3, 0.4, door.width + 0.04]} color={C.wall} position={[0, 2, 0]} />
          <group position={[0, 0.9, -door.width / 2]} rotation={[0, -1.2, 0]}>
            <Box size={[0.06, 1.8, 0.66]} color={C.wood} position={[0, 0, 0.34]} />
          </group>
          <FloorMat w={1.8} position={[-0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
          <FloorMat w={1.8} position={[0.45, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
          <Awning length={2} stripes={6} position={[0.1, 2.1, 0]} rotation={[0, Math.PI / 2, 0]} />
        </group>
      )}
    </>
  )
}

/** Customer entrance in the back wall: frame, sign board, slid-open glass doors and mats. */
function StoreDoor({ x, width, z }: { x: number; width: number; z: number }) {
  const h = 2.2
  return (
    <group position={[x, 0, z]}>
      {/* posts and lintel */}
      <Box size={[0.25, h, 0.4]} color={C.wallStripe} position={[-width / 2 - 0.12, h / 2, 0]} />
      <Box size={[0.25, h, 0.4]} color={C.wallStripe} position={[width / 2 + 0.12, h / 2, 0]} />
      <Box size={[width + 0.5, 0.45, 0.4]} color={C.wallStripe} position={[0, h - 0.1, 0]} />
      {/* glass panels slid open behind the posts */}
      <Box size={[width / 2, h - 0.5, 0.06]} color={C.glass} position={[-width / 2 - 0.1, (h - 0.5) / 2, -0.25]} />
      <Box size={[width / 2, h - 0.5, 0.06]} color={C.glass} position={[width / 2 + 0.1, (h - 0.5) / 2, -0.25]} />
      <Awning length={width + 0.4} stripes={6} position={[0, h + 0.05, 0.3]} />
      <FloorMat w={width} position={[0, 0, 0.75]} />
    </group>
  )
}

function Walls() {
  useGame((s) => s.version)
  const lv = world.level
  return (
    <>
      {lv.areas.map((a) => {
        const bornAt = world.areas.get(a.id)
        if (bornAt === undefined) return null
        const r = a.rect
        const doors = (lv.doors ?? []).filter((d) => d.area === a.id).sort((p, q) => p.x - q.x)
        // back wall pieces between doorways; windows only where they fit inside a piece
        const pieces: [number, number][] = []
        let lo = r.x - r.w / 2
        for (const d of doors) {
          pieces.push([lo, d.x - d.width / 2])
          lo = d.x + d.width / 2
        }
        pieces.push([lo, r.x + r.w / 2])
        return (
          <RisingWall key={a.id} bornAt={bornAt}>
            <group position={[0, SLAB, 0]}>
              {pieces
                .filter(([p0, p1]) => p1 - p0 > 0.05)
                .map(([p0, p1]) => {
                  const len = p1 - p0
                  const windows: [number, number][] = len >= 7 ? [[-len / 4, 2.4], [len / 4, 2.4]] : len >= 3.5 ? [[0, Math.min(2.4, len - 1.2)]] : []
                  return <Wall key={p0} length={len} position={[(p0 + p1) / 2, 0, lv.wallZ - 0.15]} windows={windows} />
                })}
              {doors.map((d) => (
                <StoreDoor key={d.id} x={d.x} width={d.width} z={lv.wallZ - 0.15} />
              ))}
              {a.enclose && <EnclosedWalls area={a} />}
            </group>
          </RisingWall>
        )
      })}
    </>
  )
}

/** Locked areas: fenced-off grass with a "coming soon" feel. */
function LockedAreas() {
  useGame((s) => s.version)
  return (
    <>
      {world.level.areas
        .filter((a) => !world.areas.has(a.id))
        .map((a) => {
          const r = a.rect
          return (
            <group key={a.id}>
              <mesh position={[r.x, 0.01, r.z]} rotation={[-Math.PI / 2, 0, 0]} material={toon(C.grassDark)} receiveShadow>
                <planeGeometry args={[r.w, r.d]} />
              </mesh>
              {Array.from({ length: Math.round(r.d / 3) }, (_, i) => (
                <Fence key={i} length={3} position={[r.x - r.w / 2, 0, r.z - r.d / 2 + 1.5 + i * 3]} rotation={[0, Math.PI / 2, 0]} />
              ))}
            </group>
          )
        })}
    </>
  )
}

/** Paying zone with a green fill that grows as money goes in. */
function BuyZoneView({ id }: { id: string }) {
  useGame((s) => s.sigs[`z:${id}`])
  const bornAt = world.zoneBorn[id] ?? -1
  const def = unlockDef(world, id)
  const paid = world.zonePaid[id] ?? 0
  const y = floorY(def.zone.x, def.zone.z)
  const fill = paid / def.price
  // repeatable (per-plant) zones show which plant you are buying
  const label = def.units ? `${def.label} ${(world.units[id] ?? 0) + 1}/${def.units}` : def.label
  return (
    <PopIn bornAt={bornAt} position={[def.zone.x, y, def.zone.z]}>
      <BuyZone />
      {fill > 0 && <Box size={[1.6 * fill, 0.03, 1.6]} color={C.money} position={[-0.8 + 0.8 * fill, 0.08, 0]} outline={false} />}
      <PriceTag icon={def.icon} label={label} price={def.price - paid} position={[0, 0.6, 0]} />
    </PopIn>
  )
}

export function BuyZones() {
  useGame((s) => s.version)
  return (
    <>
      {world.visibleZones.map((id) => (
        <BuyZoneView key={id} id={id} />
      ))}
    </>
  )
}

function FunctionalTrashBin({ x, z }: { x: number; z: number }) {
  const [useCount, setUseCount] = useState(0)
  useEffect(
    () =>
      onGameEvent((event) => {
        if (event.type === 'trash' && event.pos.x === x && event.pos.z === z) setUseCount((count) => count + 1)
      }),
    [x, z],
  )
  return <TrashBin useCount={useCount} position={[x, floorY(x, z), z]} />
}

/** Functional trash bins (throw away what you carry). */
function TrashBins() {
  useGame((s) => s.version)
  return (
    <>
      {activeTrash(world).map((t) => (
        <group key={t.id}>
          <FunctionalTrashBin x={t.pos.x} z={t.pos.z} />
          <ZonePad rect={trashZone(t)} />
        </group>
      ))}
    </>
  )
}

export function StoreShell({ editing = false }: { editing?: boolean }) {
  useGame((s) => s.version)
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshToonMaterial color={C.grass} />
      </mesh>
      {world.level.areas.map((a) => {
        const bornAt = world.areas.get(a.id)
        return bornAt === undefined ? null : <AreaFloor key={a.id} area={a} bornAt={bornAt} />
      })}
      <LockedAreas />
      <Walls />
      {/* in the editor these render live inside EditorScene; here they would leave frozen ghosts */}
      {!editing && <TrashBins />}
      {/* farm decoration */}
      {/* L-shaped fence around the hen yard's back corner */}
      <Fence length={4} position={[-12.5, 0, 11.5]} rotation={[0, Math.PI / 2, 0]} />
      <Fence length={4} position={[-10.5, 0, 13.5]} />
      <Bush position={[-17, 0, -4.5]} />
      <Bush position={[17.5, 0, 6.5]} scale={0.8} />
      <Bush position={[9, 0, 12]} scale={0.9} />
      {/* movable decorations from the level (editor can rearrange them) */}
      {!editing && (world.level.deco ?? []).map((piece) => <DecoView key={piece.id} def={piece} />)}
      <OfficeSign />
      <DoorSigns />
    </>
  )
}

/** "PERSONAL" sign over the office door (Html pills refuse to mount under the rising-walls subtree). */
function OfficeSign() {
  const area = world.level.areas.find((a) => a.enclose && a.door)
  if (!area?.door) return null
  const r = area.rect
  const d = area.door
  const pos: [number, number, number] =
    d.side === 'south' ? [d.at, 2.55, r.z + r.d / 2 + 0.15] : d.side === 'west' ? [r.x - r.w / 2 - 0.15, 2.55, d.at] : [r.x + r.w / 2 + 0.15, 2.55, d.at]
  return <Pill text="PERSONAL" position={pos} />
}

/** "ENTRADA" sign over each open customer door. */
function DoorSigns() {
  useGame((s) => s.version)
  return (
    <>
      {activeDoors(world).map((d) => (
        <Pill key={d.id} text="ENTRADA" position={[d.x, 2.9, world.level.wallZ]} />
      ))}
    </>
  )
}

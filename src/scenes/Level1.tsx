import { useMemo, useRef, useState } from 'react'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Vector3, type PerspectiveCamera as Cam } from 'three'
import { C } from '../materials/palette'
import { Lighting } from './Lighting'
import { debug, input, sync, useGame, world } from '../game/state'
import { tick } from '../game/loop'
import { CAMERA_YAW } from '../game/systems/movement'
import { autopilot } from '../game/systems/autopilot'
import { StationView } from '../components/StationView'
import { Customers, PlayerView, Workers } from '../components/Actors'
import { FloatingTexts, FlyingItems, TutorialArrow, UnlockBursts } from '../components/Effects'
import { BuyZones, StoreShell } from '../components/StoreShell'
import { buildStation } from '../game/world'
import { PADS, STATION_SCALE } from '../game/sizes'
import { stationDefs, stationRelations, TIER_COLORS, unlockTiers, useEditor, type EditorSelection } from '../game/editor'
import { SafeHtml } from '../models/Labels'
import { BuyZone, TrashBin } from '../models/Store'
import { DecoView } from '../components/DecoView'

const PITCH = (52 * Math.PI) / 180
const DIST = 24
const OFFSET = new Vector3(Math.sin(CAMERA_YAW) * Math.cos(PITCH) * DIST, Math.sin(PITCH) * DIST, Math.cos(CAMERA_YAW) * Math.cos(PITCH) * DIST)

/** Runs the simulation in fixed sub-steps (no tunnelling on slow frames or `?fast`), then pushes changes to React. */
function GameLoop() {
  useFrame((_, dt) => {
    let left = Math.min(dt, 0.1) * debug.speed
    const total = left
    while (left > 1e-6) {
      const step = Math.min(left, 1 / 30)
      if (debug.autoplay) autopilot(world, input)
      tick(world, input, step)
      left -= step
    }
    sync(world, total)
  }, -1)
  return null
}

/** Follows the player from a fixed angle, like the original. */
function CameraRig() {
  const cam = useRef<Cam>(null)
  const look = useRef(new Vector3(world.player.pos.x, 0, world.player.pos.z))
  useFrame((_, dt) => {
    const c = cam.current
    if (!c) return
    const p = world.player.pos
    look.current.lerp(new Vector3(p.x, 0, p.z - 1), 1 - Math.exp(-dt * 6))
    c.position.copy(look.current).add(OFFSET)
    c.lookAt(look.current)
  })
  return <PerspectiveCamera ref={cam} makeDefault fov={32} position={[world.player.pos.x + OFFSET.x, OFFSET.y, world.player.pos.z + OFFSET.z]} />
}

/** `?shot`: fixed wide view of the whole store for the share preview image. */
function ShotCamera() {
  const p = new URLSearchParams(location.search)
  const num = (key: string, fallback: number) => (p.has(key) ? Number(p.get(key)) : fallback)
  const target = new Vector3(num('cx', 3.5), 0, num('cz', 1.5))
  const pitch = (num('pitch', 48) * Math.PI) / 180
  const dist = num('dist', 38)
  const offset = new Vector3(Math.sin(CAMERA_YAW) * Math.cos(pitch) * dist, Math.sin(pitch) * dist, Math.cos(CAMERA_YAW) * Math.cos(pitch) * dist)
  const cam = useRef<Cam>(null)
  useFrame(() => cam.current?.lookAt(target))
  return <PerspectiveCamera ref={cam} makeDefault fov={num('fov', 32)} position={target.clone().add(offset).toArray()} />
}

function Stations() {
  useGame((s) => s.version)
  return (
    <>
      {world.stations.map((s) => (
        <StationView key={s.id} s={s} />
      ))}
    </>
  )
}

function EditorGrid() {
  const visible = useEditor((state) => state.gridVisible)
  if (!visible) return null
  return <gridHelper args={[40, 80, '#18251c', '#75955c']} position={[1, 0.18, 3.5]} />
}

function EditorCamera({ enabled }: { enabled: boolean }) {
  return (
    <>
      <PerspectiveCamera makeDefault fov={38} position={[19, 27, 28]} />
      <OrbitControls enabled={enabled} makeDefault target={[1, 0, 3.5]} minDistance={12} maxDistance={48} maxPolarAngle={Math.PI / 2.15} />
    </>
  )
}

/** Editor footprint of a level area: soft fill + grabbable frame + floating label. */
function AreaOverlay({
  rect,
  color,
  opacity,
  label,
  onGrab,
}: {
  rect: { x: number; z: number; w: number; d: number }
  color: string
  opacity: number
  label: string
  onGrab: (point: { x: number; z: number }) => void
}) {
  const { x, z, w, d } = rect
  const bars: [number, number, number, number][] = [
    [x, z - d / 2, w + 0.16, 0.16],
    [x, z + d / 2, w + 0.16, 0.16],
    [x - w / 2, z, 0.16, d + 0.16],
    [x + w / 2, z, 0.16, d + 0.16],
  ]
  return (
    <group>
      {/* fill sits under the drag plane, so it never steals clicks */}
      <mesh position={[x, 0.05, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
      </mesh>
      {bars.map(([bx, bz, bw, bd], i) => (
        <mesh
          key={i}
          position={[bx, 0.26, bz]}
          onPointerDown={(event) => {
            event.stopPropagation()
            onGrab({ x: event.point.x, z: event.point.z })
          }}
        >
          <boxGeometry args={[bw, 0.04, bd]} />
          <meshBasicMaterial color={color} transparent opacity={Math.min(0.8, opacity + 0.4)} depthWrite={false} />
        </mesh>
      ))}
      <SafeHtml position={[x, 0.12, z]} center zIndexRange={[8, 0]} style={{ pointerEvents: 'none' }}>
        <span className="area-badge" style={{ borderColor: color }}>
          {label}
        </span>
      </SafeHtml>
    </group>
  )
}

function EditorScene() {
  const level = useEditor((state) => state.level)
  const selected = useEditor((state) => state.selected)
  const levelsVisible = useEditor((state) => state.levelsVisible)
  const tierFilter = useEditor((state) => state.tierFilter)
  const [dragging, setDragging] = useState<{ selection: EditorSelection; offset: { x: number; z: number } } | null>(null)
  const stations = useMemo(() => stationDefs(level).map((definition) => buildStation(definition, -10)), [level])
  const tiers = useMemo(() => unlockTiers(level), [level])
  // when a station is picked, light up what feeds it and where it is bought
  const relations = selected?.type === 'station' ? stationRelations(level, selected.id) : null

  // grab offset keeps big objects (area footprints) from jumping to the pointer
  const beginDrag = (selection: EditorSelection, pos: { x: number; z: number }, point?: { x: number; z: number }) => {
    const offset = point ? { x: pos.x - point.x, z: pos.z - point.z } : { x: 0, z: 0 }
    useEditor.getState().select(selection)
    useEditor.getState().move(selection, point ? { x: point.x + offset.x, z: point.z + offset.z } : pos, true)
    setDragging({ selection, offset })
  }

  return (
    <>
      <EditorCamera enabled={!dragging} />
      <EditorGrid />
      {stations.map((station) => {
        const active = selected?.type === 'station' && selected.id === station.id
        const related = relations?.providers.some((provider) => provider.id === station.id) ?? false
        const inside = Math.abs(station.pos.x - level.bounds.x) <= level.bounds.w / 2 && Math.abs(station.pos.z - level.bounds.z) <= level.bounds.d / 2
        return (
          <group key={station.id}>
            <StationView s={station} />
            <mesh
              position={[station.pos.x, 0.24, station.pos.z]}
              onPointerDown={(event) => {
                event.stopPropagation()
                beginDrag({ type: 'station', id: station.id }, station.pos)
              }}
            >
              <boxGeometry args={[Math.max(2.2, station.pad.w), 0.15, Math.max(1.8, station.pad.d)]} />
              <meshBasicMaterial color={related ? '#86db55' : inside ? '#ffd23f' : '#e0403c'} transparent opacity={active ? 0.38 : related ? 0.28 : 0.001} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
      {levelsVisible &&
        level.areas.map((area) => {
          const unlock = level.unlocks.find((candidate) => candidate.area === area.id)
          const start = level.startAreas.includes(area.id)
          const tier = unlock ? tiers[unlock.id] ?? 0 : 0
          const active = selected?.type === 'area' && selected.id === area.id
          const linked = selected?.type === 'zone' && unlock?.id === selected.id
          const filteredOut = !start && tierFilter !== null && tier !== tierFilter
          const color = start || !tier ? '#eef2e6' : TIER_COLORS[(tier - 1) % TIER_COLORS.length]
          const opacity = active || linked ? 0.3 : filteredOut ? 0.03 : 0.13
          return (
            <AreaOverlay
              key={area.id}
              rect={area.rect}
              color={color}
              opacity={opacity}
              label={start ? `${area.id} · inicial` : `${area.id} · ${unlock?.label ?? area.id}${tier ? ` · N${tier}` : ''}`}
              onGrab={(point) => beginDrag({ type: 'area', id: area.id }, { x: area.rect.x, z: area.rect.z }, point)}
            />
          )
        })}
      {level.unlocks.map((unlock) => {
        const active = selected?.type === 'zone' && selected.id === unlock.id
        const related = (relations?.zones.some((zone) => zone.id === unlock.id) ?? false) || (selected?.type === 'area' && unlock.area === selected.id)
        const tier = tiers[unlock.id] ?? 0
        // purchase-wave coloring: only while the levels toggle is on
        const showTier = levelsVisible && tier > 0
        const filteredOut = showTier && tierFilter !== null && tier !== tierFilter
        const baseColor = showTier ? TIER_COLORS[(tier - 1) % TIER_COLORS.length] : '#34e0ff'
        const baseOpacity = active ? 0.42 : related ? 0.3 : showTier ? (filteredOut ? 0.05 : 0.3) : 0.001
        return (
          <group key={unlock.id} position={[unlock.zone.x, 0.2, unlock.zone.z]}>
            <BuyZone />
            <mesh
              position={[0, 0.08, 0]}
              onPointerDown={(event) => {
                event.stopPropagation()
                beginDrag({ type: 'zone', id: unlock.id }, unlock.zone)
              }}
            >
              <boxGeometry args={[PADS.buy.w, 0.16, PADS.buy.d]} />
              <meshBasicMaterial color={baseColor} transparent opacity={baseOpacity} depthWrite={false} />
            </mesh>
            {showTier && !filteredOut && (
              <SafeHtml position={[0, 0.55, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
                <span className="tier-badge" style={{ background: TIER_COLORS[(tier - 1) % TIER_COLORS.length] }}>
                  {tier}
                </span>
              </SafeHtml>
            )}
          </group>
        )
      })}
      {(level.trash ?? []).map((bin) => {
        const active = selected?.type === 'trash' && selected.id === bin.id
        return (
          <group key={bin.id}>
            <TrashBin position={[bin.pos.x, 0, bin.pos.z]} scale={STATION_SCALE} />
            <mesh
              position={[bin.pos.x, 0.2, bin.pos.z]}
              onPointerDown={(event) => {
                event.stopPropagation()
                beginDrag({ type: 'trash', id: bin.id }, bin.pos)
              }}
            >
              <boxGeometry args={[PADS.bin.w * STATION_SCALE + 0.1, 0.16, PADS.bin.d * STATION_SCALE + 0.1]} />
              <meshBasicMaterial color="#7cff5e" transparent opacity={active ? 0.42 : 0.001} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
      {(level.deco ?? []).map((piece) => {
        const active = selected?.type === 'deco' && selected.id === piece.id
        return (
          <group key={piece.id}>
            {/* DecoView positions itself; the hitbox sits beside it for dragging */}
            <DecoView def={piece} />
            <mesh
              position={[piece.pos.x, 0.2, piece.pos.z]}
              onPointerDown={(event) => {
                event.stopPropagation()
                beginDrag({ type: 'deco', id: piece.id }, piece.pos)
              }}
            >
              <boxGeometry args={[2, 0.16, 2]} />
              <meshBasicMaterial color="#7cff5e" transparent opacity={active ? 0.42 : 0.001} depthWrite={false} />
            </mesh>
          </group>
        )
      })}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[level.bounds.x, 0.21, level.bounds.z]}
        onPointerDown={() => {
          useEditor.getState().select(null)
          setDragging(null)
        }}
        onPointerMove={(event) => {
          if (!dragging) return
          event.stopPropagation()
          useEditor.getState().move(dragging.selection, { x: event.point.x + dragging.offset.x, z: event.point.z + dragging.offset.z })
        }}
        onPointerUp={() => setDragging(null)}
        onPointerLeave={() => setDragging(null)}
      >
        <planeGeometry args={[level.bounds.w, level.bounds.d]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </>
  )
}

export function Level1({ editing = false }: { editing?: boolean }) {
  return (
    <>
      {!editing && <GameLoop />}
      {editing ? <EditorScene /> : debug.shot ? <ShotCamera /> : <CameraRig />}
      <color attach="background" args={[C.grass]} />
      <Lighting size={26} />
      <StoreShell editing={editing} />
      {!editing && <Stations />}
      {!editing && <BuyZones />}
      {!editing && <Customers />}
      {!editing && <Workers />}
      {!editing && <PlayerView />}
      {!editing && <FlyingItems />}
      {!editing && <FloatingTexts />}
      {!editing && <UnlockBursts />}
      {!editing && !debug.shot && <TutorialArrow />}
    </>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Shape, ShapeGeometry, type Group, type MeshToonMaterial } from 'three'
import { C } from '../materials/palette'
import { world } from '../game/state'
import { groundY, inRect } from '../game/world'
import type { Rect } from '../game/types'

const geoCache = new Map<string, ShapeGeometry>()

/** Flat rounded rectangle in the XY plane (rotated onto the floor by the caller). */
function roundedRect(w: number, d: number, r: number) {
  const key = `${w}:${d}:${r}`
  let g = geoCache.get(key)
  if (!g) {
    const s = new Shape()
    const x = -w / 2
    const y = -d / 2
    s.moveTo(x + r, y)
    s.lineTo(x + w - r, y)
    s.quadraticCurveTo(x + w, y, x + w, y + r)
    s.lineTo(x + w, y + d - r)
    s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
    s.lineTo(x + r, y + d)
    s.quadraticCurveTo(x, y + d, x, y + d - r)
    s.lineTo(x, y + r)
    s.quadraticCurveTo(x, y, x + r, y)
    g = new ShapeGeometry(s, 6)
    geoCache.set(key, g)
  }
  return g
}

const BASE = new Color(C.pad)
const ACTIVE = new Color('#C3CBCF')

/**
 * The gray rounded floor pad under a station. It is also the interaction area:
 * standing on it (or on one of `zones`, e.g. a machine's halves) makes it grow and brighten a bit.
 */
export function ZonePad({ rect, zones, color = C.pad }: { rect: Rect; zones?: Rect[]; color?: string }) {
  const ref = useRef<Group>(null)
  const mat = useRef<MeshToonMaterial>(null)
  const spring = useRef({ x: 0, v: 0 })
  const geo = useMemo(() => roundedRect(rect.w, rect.d, Math.min(0.45, rect.w / 4, rect.d / 4)), [rect.w, rect.d])
  const base = useMemo(() => (color === C.pad ? BASE : new Color(color)), [color])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const on = (zones ?? [rect]).some((z) => inRect(world.player.pos, z))
    const s = spring.current
    // springy grow: overshoots a little when you step on it
    s.v += (-160 * (s.x - (on ? 1 : 0)) - 13 * s.v) * dt
    s.x += s.v * dt
    if (ref.current) {
      const k = 1 + 0.07 * s.x
      ref.current.scale.set(k, k, 1)
      ref.current.position.y = groundY(world, rect.x, rect.z) + 0.014
    }
    if (mat.current) mat.current.color.copy(base).lerp(ACTIVE, Math.max(0, Math.min(1, s.x)) * 0.6)
  })

  return (
    <group ref={ref} position={[rect.x, 0.014, rect.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geo} receiveShadow>
        <meshToonMaterial ref={mat} color={color} transparent opacity={0.8} depthWrite={false} />
      </mesh>
    </group>
  )
}

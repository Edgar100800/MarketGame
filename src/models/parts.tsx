import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { BoxGeometry, CapsuleGeometry, CylinderGeometry, ExtrudeGeometry, Shape, SphereGeometry, type BufferGeometry, type Group, type Mesh } from 'three'
import { toon } from '../materials/toon'
import { C } from '../materials/palette'
import { inkMesh } from '../materials/ink'

/** Ink line width for every model. Tweak here to make the whole game thicker or thinner. */
export const OUTLINE_PX = 2.5
/** Variable ink weight, like hand-inked cartoons: thick silhouette, thinner inner parts. */
export const LINE_BOLD = 3.6
export const LINE_MID = 2.4
export const LINE_FINE = 1.4

type MeshProps = Omit<ThreeElements['mesh'], 'material' | 'children'>

export type PartProps = MeshProps & {
  color: string
  opacity?: number
  outline?: boolean
  /** Outline thickness in CSS pixels (constant on screen, like a 2D ink line). */
  line?: number
  children: ReactNode
}

/**
 * Whether parts cast shadows. Small, numerous things (products, stacks, money) turn it off:
 * their shadows are a few pixels but each caster is one more draw call in the shadow pass.
 */
const CastShadow = createContext(true)
export function NoShadow({ children }: { children: ReactNode }) {
  return <CastShadow.Provider value={false}>{children}</CastShadow.Provider>
}

/** Adds the shared ink outline to its parent mesh (see materials/ink). */
function Ink({ line }: { line: number }) {
  const ref = useRef<Group>(null)
  const current = useRef<{ source: BufferGeometry; mesh: Mesh } | null>(null)
  // no deps: the parent's geometry can be swapped when JSX geometry args change
  useLayoutEffect(() => {
    const group = ref.current
    const parent = group?.parent as Mesh | null
    if (!group || !parent?.geometry) return
    if (current.current?.source === parent.geometry) return
    if (current.current) group.remove(current.current.mesh)
    const mesh = inkMesh(parent.geometry, line)
    group.add(mesh)
    current.current = { source: parent.geometry, mesh }
  })
  return <group ref={ref} />
}

/** One toon-shaded mesh with the dark cartoon outline. Pass the geometry as child, or a shared one as `geometry`. */
export function Part({ color, opacity = 1, outline = true, line = OUTLINE_PX, children, ...props }: PartProps) {
  const cast = useContext(CastShadow)
  return (
    <mesh castShadow={cast} receiveShadow material={toon(color, opacity)} {...props}>
      {children}
      {outline && <Ink key={line} line={line} />}
    </mesh>
  )
}

type Vec3 = [number, number, number]
type Shaped = Omit<PartProps, 'children'>

// Primitive geometries are shared by size: thousands of parts reuse a few hundred buffers.
const geometries = new Map<string, BufferGeometry>()
function shared(key: string, make: () => BufferGeometry) {
  let geometry = geometries.get(key)
  if (!geometry) geometries.set(key, (geometry = make()))
  return geometry
}

/** Same extrusion drei's <RoundedBoxGeometry smoothness={3}> builds, made once per size. */
function roundedBox([w, h, d]: Vec3, radius: number) {
  const eps = 0.00001
  const r = radius - eps
  const shape = new Shape()
  shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true)
  shape.absarc(eps, h - r * 2, eps, Math.PI, Math.PI / 2, true)
  shape.absarc(w - r * 2, h - r * 2, eps, Math.PI / 2, 0, true)
  shape.absarc(w - r * 2, eps, eps, 0, -Math.PI / 2, true)
  const geometry = new ExtrudeGeometry(shape, {
    depth: d - radius * 2,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: radius - eps,
    bevelThickness: radius,
    curveSegments: 3,
  })
  return geometry.center()
}

/** Rounded box shortcut: most props in the game are chunky boxes with soft edges. */
export function RBox({ size, radius = 0.06, ...props }: Shaped & { size: Vec3; radius?: number }) {
  const r = Math.min(radius, Math.min(...size) / 2 - 0.001)
  return <Part {...props} geometry={shared(`rbox:${size}:${r}`, () => roundedBox(size, r))}>{null}</Part>
}

export function Box({ size, ...props }: Shaped & { size: Vec3 }) {
  return <Part {...props} geometry={shared(`box:${size}`, () => new BoxGeometry(...size))}>{null}</Part>
}

export function Ball({ r, ...props }: Shaped & { r: number }) {
  return <Part {...props} geometry={shared(`ball:${r}`, () => new SphereGeometry(r, 14, 10))}>{null}</Part>
}

export function Cyl({ r, h, rTop, seg = 14, ...props }: Shaped & { r: number; h: number; rTop?: number; seg?: number }) {
  const top = rTop ?? r
  return <Part {...props} geometry={shared(`cyl:${top}:${r}:${h}:${seg}`, () => new CylinderGeometry(top, r, h, seg))}>{null}</Part>
}

export function Capsule({ r, len, ...props }: Shaped & { r: number; len: number }) {
  return <Part {...props} geometry={shared(`cap:${r}:${len}`, () => new CapsuleGeometry(r, len, 4, 10))}>{null}</Part>
}

/** Flat gray floor pad under every station (no outline, like the game). */
export function Pad({ w, d, color = C.pad, opacity = 0.75 }: { w: number; d: number; color?: string; opacity?: number }) {
  return (
    <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={toon(color, opacity)}>
      <planeGeometry args={[w, d]} />
    </mesh>
  )
}

/**
 * Item that pops into place (0 -> 1.25 -> 1) `delay` seconds after it mounts.
 * The delay matches the flight time, so it appears as the thrown item lands.
 * `animate` is read once on mount: items already there when the shelf appears don't pop.
 */
export function ItemPop({ animate, delay = 0.22, children, ...props }: ThreeElements['group'] & { animate: boolean; delay?: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const [pop] = useState(animate)
  const start = useRef<number | null>(null)
  useFrame(({ clock }) => {
    const g = ref.current
    if (!g || !pop) return
    if (start.current === null) start.current = clock.elapsedTime + delay
    const t = (clock.elapsedTime - start.current) / 0.25
    if (t >= 1) {
      g.scale.setScalar(1)
      return
    }
    // easeOutBack with a bigger overshoot, so each new item "bounces" in
    const k = t <= 0 ? 0.0001 : 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2)
    g.scale.setScalar(Math.max(0.0001, k))
  })
  return (
    <group ref={ref} scale={pop ? 0.0001 : 1} userData={{ dynamic: true }} {...props}>
      {children}
    </group>
  )
}

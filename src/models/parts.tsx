import { useRef, useState, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { Outlines, RoundedBoxGeometry } from '@react-three/drei'
import { toon } from '../materials/toon'
import { C } from '../materials/palette'

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

/** One toon-shaded mesh with the dark cartoon outline. Pass the geometry as child. */
export function Part({ color, opacity = 1, outline = true, line = OUTLINE_PX, children, ...props }: PartProps) {
  // Outlines measures thickness in drawing-buffer pixels, so scale by the pixel ratio.
  const dpr = useThree((s) => s.viewport.dpr)
  return (
    <mesh castShadow receiveShadow material={toon(color, opacity)} {...props}>
      {children}
      {outline && <Outlines thickness={line * dpr} color={C.outline} />}
    </mesh>
  )
}

type Vec3 = [number, number, number]

/** Rounded box shortcut: most props in the game are chunky boxes with soft edges. */
export function RBox({ size, radius = 0.06, ...props }: Omit<PartProps, 'children'> & { size: Vec3; radius?: number }) {
  return (
    <Part {...props}>
      <RoundedBoxGeometry args={size} radius={Math.min(radius, Math.min(...size) / 2 - 0.001)} smoothness={3} />
    </Part>
  )
}

export function Box({ size, ...props }: Omit<PartProps, 'children'> & { size: Vec3 }) {
  return (
    <Part {...props}>
      <boxGeometry args={size} />
    </Part>
  )
}

export function Ball({ r, ...props }: Omit<PartProps, 'children'> & { r: number }) {
  return (
    <Part {...props}>
      <sphereGeometry args={[r, 14, 10]} />
    </Part>
  )
}

export function Cyl({ r, h, rTop, seg = 14, ...props }: Omit<PartProps, 'children'> & { r: number; h: number; rTop?: number; seg?: number }) {
  return (
    <Part {...props}>
      <cylinderGeometry args={[rTop ?? r, r, h, seg]} />
    </Part>
  )
}

export function Capsule({ r, len, ...props }: Omit<PartProps, 'children'> & { r: number; len: number }) {
  return (
    <Part {...props}>
      <capsuleGeometry args={[r, len, 4, 10]} />
    </Part>
  )
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
    <group ref={ref} scale={pop ? 0.0001 : 1} {...props}>
      {children}
    </group>
  )
}

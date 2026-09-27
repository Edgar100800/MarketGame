import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { C } from '../materials/palette'
import { Box, Cyl, RBox } from './parts'

type GroupProps = ThreeElements['group']

/** Blocky white hen. Pecks slowly when idle. */
export function Chicken(props: GroupProps) {
  const head = useRef<Group>(null)
  const seed = useMemo(() => Math.random() * 10, [])
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.x = Math.max(0, Math.sin(clock.elapsedTime * 1.5 + seed)) * 0.5
  })
  return (
    <group {...props}>
      <Cyl r={0.025} h={0.18} color={C.orange} position={[-0.1, 0.09, 0]} outline={false} />
      <Cyl r={0.025} h={0.18} color={C.orange} position={[0.1, 0.09, 0]} outline={false} />
      <RBox size={[0.5, 0.42, 0.6]} radius={0.12} color={C.white} position={[0, 0.38, 0]} />
      <RBox size={[0.34, 0.26, 0.2]} radius={0.08} color={C.white} position={[0, 0.58, -0.3]} rotation={[0.5, 0, 0]} />
      <RBox size={[0.08, 0.2, 0.34]} radius={0.03} color={C.cream} position={[-0.26, 0.4, 0]} />
      <RBox size={[0.08, 0.2, 0.34]} radius={0.03} color={C.cream} position={[0.26, 0.4, 0]} />
      <group ref={head} position={[0, 0.55, 0.22]}>
        <RBox size={[0.3, 0.32, 0.3]} radius={0.1} color={C.white} position={[0, 0.2, 0]} />
        <Box size={[0.06, 0.12, 0.18]} color={C.tomato} position={[0, 0.42, 0]} />
        <Box size={[0.12, 0.08, 0.14]} color={C.yellow} position={[0, 0.2, 0.2]} />
        <Box size={[0.07, 0.1, 0.05]} color={C.tomato} position={[0, 0.1, 0.17]} />
        <Box size={[0.04, 0.05, 0.02]} color={C.dark} position={[-0.1, 0.26, 0.15]} outline={false} />
        <Box size={[0.04, 0.05, 0.02]} color={C.dark} position={[0.1, 0.26, 0.15]} outline={false} />
      </group>
    </group>
  )
}

const SPOTS: [number, number, number, number, number][] = [
  // x, y, z, width, depth (flat patches on the body surface)
  [0.46, 0.95, 0.2, 0.02, 0.45],
  [0.46, 0.75, -0.45, 0.02, 0.35],
  [-0.46, 0.9, -0.1, 0.02, 0.5],
  [-0.46, 0.7, 0.45, 0.02, 0.25],
  [0.1, 1.22, -0.3, 0.4, 0.4],
  [-0.2, 1.22, 0.35, 0.25, 0.3],
]

/** Blocky black and white cow with pink snout. */
export function Cow(props: GroupProps) {
  const head = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (head.current) head.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.2
  })
  return (
    <group {...props}>
      {[
        [-0.28, 0.5],
        [0.28, 0.5],
        [-0.28, -0.5],
        [0.28, -0.5],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <RBox size={[0.24, 0.5, 0.24]} radius={0.05} color={C.white} position={[0, 0.3, 0]} />
          <Box size={[0.25, 0.1, 0.25]} color={C.dark} position={[0, 0.05, 0]} />
        </group>
      ))}
      <RBox size={[0.92, 0.72, 1.5]} radius={0.14} color={C.white} position={[0, 0.88, 0]} />
      {SPOTS.map(([x, y, z, w, d], i) => (
        <Box key={i} size={w < 0.1 ? [w, 0.3, d] : [w, 0.02, d]} color={C.dark} position={[x, y + (w < 0.1 ? 0 : 0.03), z]} outline={false} />
      ))}
      <Box size={[0.06, 0.5, 0.06]} color={C.white} position={[0, 0.8, -0.78]} rotation={[0.2, 0, 0]} />
      <RBox size={[0.3, 0.2, 0.2]} radius={0.06} color={C.pink} position={[0, 0.4, 0.2]} />
      <group ref={head} position={[0, 1.0, 0.82]}>
        <RBox size={[0.62, 0.58, 0.55]} radius={0.12} color={C.white} position={[0, 0.1, 0.1]} />
        <RBox size={[0.64, 0.28, 0.2]} radius={0.06} color={C.pink} position={[0, -0.05, 0.4]} />
        <Box size={[0.07, 0.07, 0.02]} color={C.dark} position={[-0.14, -0.03, 0.51]} outline={false} />
        <Box size={[0.07, 0.07, 0.02]} color={C.dark} position={[0.14, -0.03, 0.51]} outline={false} />
        <Box size={[0.08, 0.1, 0.02]} color={C.dark} position={[-0.18, 0.2, 0.38]} outline={false} />
        <Box size={[0.08, 0.1, 0.02]} color={C.dark} position={[0.18, 0.2, 0.38]} outline={false} />
        <Box size={[0.22, 0.1, 0.12]} color={C.dark} position={[-0.4, 0.25, 0.05]} />
        <Box size={[0.22, 0.1, 0.12]} color={C.dark} position={[0.4, 0.25, 0.05]} />
        <Cyl r={0.05} rTop={0.02} h={0.18} color={C.cream} position={[-0.2, 0.46, 0.05]} />
        <Cyl r={0.05} rTop={0.02} h={0.18} color={C.cream} position={[0.2, 0.46, 0.05]} />
      </group>
    </group>
  )
}

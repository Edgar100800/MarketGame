import type { ThreeElements } from '@react-three/fiber'
import { C } from '../materials/palette'
import { Ball, Box, Cyl } from './parts'

type GroupProps = ThreeElements['group']

/** Round-canopy tree for the map borders. */
export function Tree(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.16} rTop={0.22} h={1.5} color={C.wood} position={[0, 0.75, 0]} />
      <Ball r={0.75} color={C.leaf} position={[0, 1.9, 0]} scale={[1.1, 0.9, 1.1]} />
      <Ball r={0.5} color={C.leafDark} position={[0.45, 1.5, 0.2]} />
      <Ball r={0.45} color={C.leafDark} position={[-0.45, 1.6, -0.15]} />
    </group>
  )
}

/** Small grass mound with scattered flowers. `colors` cycles through the petal palette. */
export function FlowerPatch({ count = 5, colors = [C.pink, C.yellow, C.white, C.strawberry], ...props }: GroupProps & { count?: number; colors?: string[] }) {
  const spots: [number, number, number][] = [
    [0.3, 0, 0.15],
    [-0.25, 0, 0.22],
    [0.05, 0, -0.25],
    [-0.38, 0, -0.1],
    [0.35, 0, 0.38],
    [-0.1, 0, 0.05],
  ]
  return (
    <group {...props}>
      <Cyl r={0.62} h={0.06} seg={9} color={C.grassDark} position={[0, 0.03, 0]} />
      {spots.slice(0, count).map(([x, , z], i) => (
        <group key={i} position={[x, 0.06, z]}>
          <Cyl r={0.014} h={0.22} color={C.leafDark} position={[0, 0.11, 0]} outline={false} />
          <Ball r={0.06} color={colors[i % colors.length]} position={[0, 0.26, 0]} />
        </group>
      ))}
    </group>
  )
}

/** Cluster of two rounded rocks. */
export function Rock(props: GroupProps) {
  return (
    <group {...props}>
      <Ball r={0.3} color={C.gray} position={[0, 0.18, 0]} scale={[1.2, 0.7, 1]} />
      <Ball r={0.18} color={C.lightGray} position={[0.3, 0.1, 0.15]} scale={[1.1, 0.7, 1]} />
    </group>
  )
}

/** Park lamp: dark pole with a warm head. */
export function StreetLamp(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.07} h={2.4} color={C.dark} position={[0, 1.2, 0]} />
      <Cyl r={0.14} h={0.06} color={C.dark} position={[0, 0.03, 0]} />
      <Ball r={0.16} color={C.straw} position={[0, 2.48, 0]} scale={[1, 1.2, 1]} />
      <Cyl r={0.1} rTop={0.2} h={0.12} color={C.dark} position={[0, 2.62, 0]} />
    </group>
  )
}

/** Wooden park bench facing +z. */
export function Bench(props: GroupProps) {
  return (
    <group {...props}>
      <Box size={[1.7, 0.08, 0.5]} color={C.wood} position={[0, 0.42, 0]} />
      <Box size={[1.7, 0.4, 0.07]} color={C.wood} position={[0, 0.65, -0.22]} />
      <Box size={[0.08, 0.42, 0.45]} color={C.woodDark} position={[-0.75, 0.21, 0]} />
      <Box size={[0.08, 0.42, 0.45]} color={C.woodDark} position={[0.75, 0.21, 0]} />
    </group>
  )
}

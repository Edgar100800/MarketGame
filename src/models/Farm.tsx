import type { ThreeElements } from '@react-three/fiber'
import { C } from '../materials/palette'
import { Ball, Box, Cyl, Part, RBox } from './parts'
import { Egg, Milk, WheatBundle } from './Products'
import { Chicken, Cow } from './Animals'

type GroupProps = ThreeElements['group']

export function TomatoPlant({ ripe = 3, ...props }: GroupProps & { ripe?: number }) {
  const spots: [number, number, number][] = [
    [0.18, 0.55, 0.08],
    [-0.16, 0.7, 0.06],
    [0.05, 0.9, 0.14],
  ]
  return (
    <group {...props}>
      <Cyl r={0.04} h={1.0} color={C.leaf} position={[0, 0.5, 0]} />
      {[0, 2.1, 4.2].map((a, i) => (
        <group key={i} rotation={[0, a, 0]} position={[0, 0.35 + i * 0.22, 0]}>
          <Part color={C.leaf} position={[0.17, 0, 0]} rotation={[0, 0, -1.1]}>
            <coneGeometry args={[0.1, 0.36, 5]} />
          </Part>
        </group>
      ))}
      {spots.slice(0, ripe).map((p, i) => (
        <Ball key={i} r={0.14} color={C.tomato} position={p} scale={[1, 0.85, 1]} />
      ))}
    </group>
  )
}

export function WheatPlant({ grown = true, ...props }: GroupProps & { grown?: boolean }) {
  const stalks: [number, number, number][] = [
    [0, 0, 0],
    [0.14, 0.12, 0.3],
    [-0.14, -0.08, -0.3],
    [0.02, -0.16, 0.2],
  ]
  const h = grown ? 0.5 : 0.25
  return (
    <group {...props}>
      {stalks.map(([x, z, tilt], i) => (
        <group key={i} position={[x, 0, z]} rotation={[tilt * 0.5, 0, tilt]}>
          <Cyl r={0.018} h={h} color={grown ? C.wheat : C.leaf} position={[0, h / 2, 0]} outline={false} />
          {grown && <Ball r={0.07} color={C.wheat} position={[0, h + 0.08, 0]} scale={[0.75, 2, 0.75]} />}
        </group>
      ))}
    </group>
  )
}

/** Raised wooden planter with tomato plants. `stock` spreads ripe tomatoes over the plants (3 each). */
export function Planter({ plants = 2, length = 2.6, stock, ...props }: GroupProps & { plants?: number; length?: number; stock?: number }) {
  return (
    <group {...props}>
      <RBox size={[length, 0.3, 0.7]} radius={0.05} color={C.wood} position={[0, 0.15, 0]} />
      <Box size={[length - 0.15, 0.04, 0.55]} color={C.soil} position={[0, 0.3, 0]} outline={false} />
      {Array.from({ length: plants }, (_, i) => (
        <TomatoPlant
          key={i}
          position={[(i - (plants - 1) / 2) * (length / plants), 0.3, 0]}
          ripe={stock === undefined ? 2 + (i % 2) : Math.max(0, Math.min(3, stock - i * 3))}
        />
      ))}
    </group>
  )
}

/** Orange field with a grid of dark soil tiles. `grown` = how many cells have ripe wheat (the rest show sprouts). */
export function CropPlot({ cols = 4, rows = 3, grown, ...props }: GroupProps & { cols?: number; rows?: number; grown?: number }) {
  const tile = 0.85
  const w = cols * tile + 0.3
  const d = rows * tile + 0.3
  const tiles = []
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const x = (c - (cols - 1) / 2) * tile
      const z = (r - (rows - 1) / 2) * tile
      tiles.push(
        <group key={`${c}-${r}`} position={[x, 0.1, z]}>
          <Box size={[tile - 0.1, 0.06, tile - 0.1]} color={C.soil} position={[0, 0.03, 0]} outline={false} />
          <WheatPlant position={[0, 0.06, 0]} grown={grown === undefined ? (c + r) % 5 !== 0 : r * cols + c < grown} />
        </group>,
      )
    }
  return (
    <group {...props}>
      <RBox size={[w, 0.1, d]} radius={0.04} color={C.soilBase} position={[0, 0.05, 0]} />
      {tiles}
    </group>
  )
}

/**
 * Orange nest ring with straw, eggs and a hen sitting on it.
 * `eggs` lays a 4x2 grid in front of the hen; `feed` shows the tomato pile
 * on the soil patch, one mini tomato each, so the exact count reads at a glance.
 */
export function Nest({ eggs = 4, feed = 2, hen = true, ...props }: GroupProps & { eggs?: number; feed?: number; hen?: boolean }) {
  return (
    <group {...props}>
      <Cyl r={1} h={0.14} seg={10} color={C.nest} position={[0, 0.07, 0]} scale={[1.5, 1, 1]} />
      <Cyl r={0.82} h={0.02} seg={10} color={C.straw} position={[0, 0.15, 0]} scale={[1.5, 1, 1]} outline={false} />
      <Cyl r={0.4} h={0.02} seg={10} color={C.soil} position={[0.55, 0.165, 0.1]} scale={[1.4, 1, 1]} outline={false} />
      {Array.from({ length: eggs }, (_, i) => (
        <Egg key={i} position={[-0.95 + (i % 4) * 0.3, 0.13, 0.3 + Math.floor(i / 4) * 0.34]} />
      ))}
      {Array.from({ length: feed }, (_, i) => (
        <Ball
          key={`feed-${i}`}
          r={0.085}
          color={C.tomato}
          scale={[1, 0.85, 1]}
          position={[0.55 + ((i % 4) - 1.5) * 0.24, 0.24, 0.1 + (Math.floor(i / 4) - 0.5) * 0.22]}
        />
      ))}
      {hen && <Chicken position={[0.1, 0.12, -0.35]} rotation={[0, 0.6, 0]} scale={0.9} />}
    </group>
  )
}

/**
 * Compact cow pen; the wheat trough is the visual feed side of the producer pad.
 * `milk` cartons and `feed` wheat bundles sit in the open front so the exact
 * stock and food counts read like the wheat field does.
 */
export function CowPen({ milk = 2, feed = 2, ...props }: GroupProps & { milk?: number; feed?: number }) {
  return (
    <group {...props}>
      <Cow position={[0.25, 0, -0.15]} scale={0.9} />
      <WaterTrough position={[-1.15, 0, 0.55]} scale={0.8} />
      {Array.from({ length: milk }, (_, i) => (
        <Milk key={i} position={[-1.5 + i * 0.3, 0, 1.25]} />
      ))}
      {Array.from({ length: feed }, (_, i) => (
        <WheatBundle key={`feed-${i}`} scale={0.55} position={[0.8 + ((i % 4) - 1.5) * 0.34, 0, 1.2 + Math.floor(i / 4) * 0.34]} />
      ))}
      <Fence length={3.4} position={[0, 0, -1.15]} />
      <Fence length={2.2} position={[-1.7, 0, -0.05]} rotation={[0, Math.PI / 2, 0]} />
      <Fence length={2.2} position={[1.7, 0, -0.05]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  )
}

export function WaterTrough(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[1.1, 0.32, 0.75]} radius={0.05} color={C.water} position={[0, 0.16, 0]} />
      <Box size={[0.95, 0.02, 0.6]} color={C.waterDeep} position={[0, 0.31, 0]} outline={false} />
    </group>
  )
}

export function Fence({ length = 3, ...props }: GroupProps & { length?: number }) {
  const posts = Math.max(2, Math.round(length / 1) + 1)
  return (
    <group {...props}>
      {Array.from({ length: posts }, (_, i) => (
        <Box key={i} size={[0.14, 0.7, 0.14]} color={C.fence} position={[-length / 2 + (i * length) / (posts - 1), 0.35, 0]} />
      ))}
      <Box size={[length, 0.1, 0.06]} color={C.fence} position={[0, 0.5, 0.06]} />
      <Box size={[length, 0.1, 0.06]} color={C.fence} position={[0, 0.25, 0.06]} />
    </group>
  )
}

export function Bush(props: GroupProps) {
  return (
    <group {...props}>
      <Ball r={0.5} color={C.leaf} position={[0, 0.45, 0]} />
      <Ball r={0.35} color={C.leaf} position={[0.4, 0.35, 0.1]} />
      <Ball r={0.3} color={C.leaf} position={[-0.35, 0.3, 0.15]} />
    </group>
  )
}

/** Low leafy plant with berries. `ripe` = how many strawberries are visible (3 max). */
export function StrawberryPlant({ ripe = 3, ...props }: GroupProps & { ripe?: number }) {
  const spots: [number, number, number][] = [
    [0.16, 0.22, 0.14],
    [-0.14, 0.26, -0.1],
    [0.02, 0.3, 0.24],
  ]
  return (
    <group {...props}>
      <Ball r={0.22} color={C.leaf} position={[0, 0.18, 0]} scale={[1.15, 0.7, 1.15]} />
      {spots.slice(0, ripe).map((p, i) => (
        <Ball key={i} r={0.07} color={C.strawberry} position={p} scale={[1, 1.25, 1]} />
      ))}
    </group>
  )
}

/** Ground patch of strawberry mounds. `stock` spreads ripe berries over the plants (3 each). */
export function StrawberryPatch({ plants = 2, stock, ...props }: GroupProps & { plants?: number; stock?: number }) {
  return (
    <group {...props}>
      {Array.from({ length: plants }, (_, i) => (
        <group key={i} position={[(i - (plants - 1) / 2) * 1.1, 0, 0]}>
          <Cyl r={0.42} h={0.12} seg={9} color={C.soil} position={[0, 0.06, 0]} />
          <StrawberryPlant position={[0, 0.12, 0]} ripe={stock === undefined ? 2 + (i % 2) : Math.max(0, Math.min(3, stock - i * 3))} />
        </group>
      ))}
    </group>
  )
}

/** Classic white box hive: stacked super boxes, dark roof and an entrance. */
export function Beehive(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[1.1, 0.34, 0.85]} radius={0.04} color={C.cream} position={[0, 0.17, 0]} />
      <RBox size={[1.0, 0.3, 0.78]} radius={0.04} color={C.cream} position={[0, 0.49, 0]} />
      <RBox size={[0.9, 0.26, 0.7]} radius={0.04} color={C.cream} position={[0, 0.77, 0]} />
      <RBox size={[1.2, 0.12, 0.95]} radius={0.05} color={C.woodDark} position={[0, 0.96, 0]} />
      <Ball r={0.06} color={C.dark} position={[0, 0.2, 0.44]} scale={[1.4, 1, 0.7]} outline={false} />
      <Ball r={0.05} color={C.honey} position={[0, 0.5, 0.4]} scale={[1.3, 1, 0.7]} outline={false} />
    </group>
  )
}

/** Fruit tree with a leaf crown. `ripe` = how many apples hang from it (5 max). */
export function AppleTree({ ripe = 5, ...props }: GroupProps & { ripe?: number }) {
  const spots: [number, number, number][] = [
    [0.35, 1.25, 0.25],
    [-0.4, 1.35, 0.05],
    [0.05, 1.55, -0.3],
    [-0.15, 1.2, 0.35],
    [0.42, 1.45, -0.15],
  ]
  return (
    <group {...props}>
      <Cyl r={0.14} rTop={0.18} h={1.1} color={C.wood} position={[0, 0.55, 0]} />
      <Ball r={0.62} color={C.leaf} position={[0, 1.35, 0]} scale={[1.15, 0.85, 1.15]} />
      <Ball r={0.4} color={C.leafDark} position={[0.35, 1.1, 0.15]} />
      <Ball r={0.35} color={C.leafDark} position={[-0.35, 1.15, -0.1]} />
      {spots.slice(0, ripe).map((p, i) => (
        <Ball key={i} r={0.11} color={C.tomato} position={p} scale={[1, 0.92, 1]} />
      ))}
    </group>
  )
}

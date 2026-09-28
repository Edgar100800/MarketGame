import type { ThreeElements } from '@react-three/fiber'
import { C } from '../materials/palette'
import { Ball, Box, Cyl, NoShadow, Part, RBox } from './parts'
import type { ProductKind } from '../game/types'
export type { ProductKind } from '../game/types'

type GroupProps = ThreeElements['group']

export function Tomato(props: GroupProps) {
  return (
    <group {...props}>
      <Ball r={0.16} color={C.tomato} position={[0, 0.14, 0]} scale={[1, 0.85, 1]} />
      <Cyl r={0.07} rTop={0.01} h={0.06} seg={5} color={C.leafDark} position={[0, 0.28, 0]} outline={false} />
    </group>
  )
}

export function Egg(props: GroupProps) {
  return (
    <group {...props}>
      <Ball r={0.12} color={C.egg} position={[0, 0.15, 0]} scale={[1, 1.3, 1]} />
    </group>
  )
}

export function Bread(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.36, 0.2, 0.22]} radius={0.09} color={C.bread} position={[0, 0.1, 0]} />
      <RBox size={[0.28, 0.06, 0.14]} radius={0.03} color={C.breadTop} position={[0, 0.2, 0]} outline={false} />
    </group>
  )
}

export function WheatBundle(props: GroupProps) {
  return (
    <group {...props}>
      {[-0.35, 0, 0.35].map((a, i) => (
        <group key={i} rotation={[0, 0, a]} position={[0, 0.05, 0]}>
          <Cyl r={0.015} h={0.2} color={C.wheat} position={[0, 0.1, 0]} outline={false} />
          <Ball r={0.06} color={C.wheat} position={[0, 0.26, 0]} scale={[0.8, 1.9, 0.8]} />
        </group>
      ))}
    </group>
  )
}

export function Can(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.1} h={0.26} color={C.can} position={[0, 0.13, 0]} />
      <Cyl r={0.1} h={0.03} color={C.lightGray} position={[0, 0.275, 0]} outline={false} />
    </group>
  )
}

/** Canned tomato: red can with a white label band and a tomato dot. */
export function TomatoCan(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.11} h={0.28} color={C.tomato} position={[0, 0.14, 0]} />
      <Cyl r={0.112} h={0.11} color={C.white} position={[0, 0.14, 0]} outline={false} />
      <Ball r={0.035} color={C.tomato} position={[0, 0.14, 0.1]} outline={false} />
      <Cyl r={0.1} h={0.03} color={C.lightGray} position={[0, 0.295, 0]} outline={false} />
    </group>
  )
}

/** Flour sack: chunky cream bag with a tied top. */
export function Flour(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.3, 0.3, 0.22]} radius={0.09} color={C.cream} position={[0, 0.15, 0]} />
      <Cyl r={0.07} rTop={0.1} h={0.08} color={C.cream} position={[0, 0.33, 0]} />
      <Box size={[0.16, 0.1, 0.01]} color={C.wheat} position={[0, 0.15, 0.115]} outline={false} />
    </group>
  )
}

export function Milk(props: GroupProps) {
  return (
    <group {...props}>
      <Box size={[0.18, 0.26, 0.18]} color={C.milk} position={[0, 0.13, 0]} />
      <Box size={[0.185, 0.08, 0.185]} color={C.milkBand} position={[0, 0.12, 0]} outline={false} />
      <Box size={[0.16, 0.08, 0.1]} color={C.milk} position={[0, 0.29, 0]} rotation={[0, 0, Math.PI / 4]} scale={[0.7, 0.7, 1]} />
    </group>
  )
}

/** Cheese wedge: quarter of a wheel, pale yellow with a darker rind edge. */
export function Cheese(props: GroupProps) {
  return (
    <group {...props}>
      <Part color={C.cheese} position={[0, 0.09, 0]} rotation={[0, Math.PI / 4, 0]}>
        <cylinderGeometry args={[0.16, 0.16, 0.16, 14, 1, false, 0, Math.PI / 2]} />
      </Part>
      <Ball r={0.03} color={C.cheeseRind} position={[0.06, 0.13, 0.1]} outline={false} />
      <Ball r={0.03} color={C.cheeseRind} position={[-0.04, 0.06, 0.08]} outline={false} />
    </group>
  )
}

/** Round cake: two sponge layers with cream filling and a cherry on top. */
export function Cake(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.17} h={0.07} color={C.bread} position={[0, 0.035, 0]} />
      <Cyl r={0.17} h={0.03} color={C.cream} position={[0, 0.085, 0]} />
      <Cyl r={0.16} h={0.07} color={C.bread} position={[0, 0.135, 0]} />
      <Cyl r={0.165} h={0.025} color={C.cream} position={[0, 0.18, 0]} />
      <Ball r={0.045} color={C.tomato} position={[0, 0.215, 0]} />
    </group>
  )
}

/** Strawberry: red berry with a tiny leaf crown. */
export function Strawberry(props: GroupProps) {
  return (
    <group {...props}>
      <Ball r={0.11} color={C.strawberry} position={[0, 0.12, 0]} scale={[1, 1.2, 1]} />
      <Cyl r={0.05} rTop={0.09} h={0.04} seg={6} color={C.leaf} position={[0, 0.24, 0]} />
    </group>
  )
}

/** Honey jar: amber glass with a wooden lid and a label band. */
export function Honey(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.13} h={0.24} color={C.honey} position={[0, 0.12, 0]} />
      <Cyl r={0.132} h={0.09} color={C.cream} position={[0, 0.13, 0]} outline={false} />
      <Cyl r={0.14} h={0.05} color={C.wood} position={[0, 0.265, 0]} />
    </group>
  )
}

/** Apple: red fruit with a stem and a leaf. */
export function Apple(props: GroupProps) {
  return (
    <group {...props}>
      <Ball r={0.14} color={C.tomato} position={[0, 0.14, 0]} scale={[1, 0.92, 1]} />
      <Cyl r={0.015} h={0.09} color={C.woodDark} position={[0, 0.28, 0]} outline={false} />
      <Ball r={0.05} color={C.leaf} position={[0.05, 0.3, 0]} scale={[1.4, 0.5, 0.8]} outline={false} />
    </group>
  )
}

/** Jam jar: deep red content, white label and a cloth cap. */
export function Jam(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.12} h={0.22} color={C.jam} position={[0, 0.11, 0]} />
      <Cyl r={0.122} h={0.08} color={C.white} position={[0, 0.12, 0]} outline={false} />
      <Ball r={0.1} color={C.strawberry} position={[0, 0.23, 0]} scale={[1.2, 0.5, 1.2]} />
    </group>
  )
}

/** Whole pizza: dough base, tomato sauce, melted cheese and pepperoni. */
export function Pizza(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.21} h={0.05} color={C.bread} position={[0, 0.025, 0]} />
      <Cyl r={0.18} h={0.02} color={C.tomato} position={[0, 0.06, 0]} outline={false} />
      <Cyl r={0.19} h={0.02} color={C.cheese} position={[0, 0.08, 0]} outline={false} />
      {([
        [0.09, 0.05],
        [-0.08, 0.08],
        [0, -0.1],
        [-0.1, -0.04],
        [0.1, -0.06],
      ] as const).map(([x, z], i) => (
        <Ball key={i} r={0.035} color={C.jam} position={[x, 0.1, z]} outline={false} />
      ))}
    </group>
  )
}

export function Money(props: GroupProps) {
  return (
    <group {...props}>
      {/* thin line: bundles are stacked by dozens and full-width ink turns the pile black */}
      <Box size={[0.4, 0.08, 0.22]} color={C.money} position={[0, 0.04, 0]} line={1} />
      <Box size={[0.08, 0.085, 0.225]} color={C.moneyDark} position={[0, 0.04, 0]} outline={false} />
    </group>
  )
}

const REGISTRY: Record<ProductKind, (p: GroupProps) => React.JSX.Element> = {
  tomato: Tomato,
  egg: Egg,
  bread: Bread,
  wheat: WheatBundle,
  can: Can,
  milk: Milk,
  money: Money,
  tomatoCan: TomatoCan,
  flour: Flour,
  cheese: Cheese,
  cake: Cake,
  strawberry: Strawberry,
  honey: Honey,
  apple: Apple,
  jam: Jam,
  pizza: Pizza,
}

/** Height used when stacking a product on top of another one. */
export const PRODUCT_HEIGHT: Record<ProductKind, number> = {
  tomato: 0.26,
  egg: 0.3,
  bread: 0.22,
  wheat: 0.3,
  can: 0.29,
  milk: 0.34,
  money: 0.085,
  tomatoCan: 0.3,
  flour: 0.36,
  cheese: 0.18,
  cake: 0.24,
  strawberry: 0.26,
  honey: 0.3,
  apple: 0.27,
  jam: 0.28,
  pizza: 0.11,
}

export function Product({ kind, ...props }: GroupProps & { kind: ProductKind }) {
  const Comp = REGISTRY[kind]
  return (
    <NoShadow>
      <Comp {...props} />
    </NoShadow>
  )
}

/** Vertical stack, like what the player carries or money piles on counters. */
export function ProductStack({ kind, count, ...props }: GroupProps & { kind: ProductKind; count: number }) {
  const h = PRODUCT_HEIGHT[kind]
  return (
    <group {...props}>
      {Array.from({ length: count }, (_, i) => (
        <Product key={i} kind={kind} position={[0, i * h, 0]} rotation={[0, (i % 2) * 0.15, 0]} />
      ))}
    </group>
  )
}

/** Block of money bundles, cols x rows x layers. */
export function MoneyPile({ cols = 3, rows = 2, layers = 3, ...props }: GroupProps & { cols?: number; rows?: number; layers?: number }) {
  const items = []
  for (let l = 0; l < layers; l++)
    for (let c = 0; c < cols; c++)
      for (let r = 0; r < rows; r++)
        items.push(<Money key={`${l}-${c}-${r}`} position={[(c - (cols - 1) / 2) * 0.42, l * 0.085, (r - (rows - 1) / 2) * 0.24]} />)
  return (
    <NoShadow>
      <group {...props}>{items}</group>
    </NoShadow>
  )
}

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { C, CUSTOMER_COLORS } from '../materials/palette'
import { Lighting } from './Lighting'
import { Box } from '../models/parts'
import { Character, type HatKind } from '../models/Character'
import { Cow } from '../models/Animals'
import { Bush, CropPlot, Fence, Nest, Planter, WaterTrough } from '../models/Farm'
import { Awning, BuyZone, Checkout, Crate, Desk, DisplayTable, FloorMat, Fridge, Shelf, TrashBin, Wall } from '../models/Store'
import { MoneyPile, ProductStack, type ProductKind } from '../models/Products'
import { Bubble, ICON, Pill, PriceTag } from '../models/Labels'

// Store floor bounds (world units). The farm sits in front of it (+z).
const STORE = { x0: -15, x1: 15, z0: -8, z1: 7 }
const FLOOR_Y = 0.15
const W = STORE.x1 - STORE.x0
const D = STORE.z1 - STORE.z0
const CX = (STORE.x0 + STORE.x1) / 2
const CZ = (STORE.z0 + STORE.z1) / 2

// Camera: low FOV, ~52° pitch, rotated ~18° so the back wall slopes like in the game.
const TARGET: [number, number, number] = [-1, 0, 2.2]
const YAW = (18 * Math.PI) / 180
const PITCH = (52 * Math.PI) / 180
const DIST = 37
const CAMERA: [number, number, number] = [
  TARGET[0] + Math.sin(YAW) * Math.cos(PITCH) * DIST,
  TARGET[1] + Math.sin(PITCH) * DIST,
  TARGET[2] + Math.cos(YAW) * Math.cos(PITCH) * DIST,
]

type NPC = {
  pos: [number, number, number]
  rot?: number
  color?: number
  hat?: HatKind
  carry?: { kind: ProductKind; count: number }
  bubble?: { icon?: ProductKind; text?: string }
  walking?: boolean
}

// Customers inside the store (store-local coordinates).
const CUSTOMERS: NPC[] = [
  { pos: [-6.2, 0, 3.4], rot: Math.PI, color: 0, hat: 'beanie', carry: { kind: 'egg', count: 3 }, bubble: { text: 'Caja' } },
  { pos: [-6.2, 0, 4.8], rot: Math.PI, color: 2, carry: { kind: 'bread', count: 2 }, bubble: { text: 'Caja' } },
  { pos: [-10.2, 0, -0.6], rot: 0.4, color: 3, hat: 'cap', bubble: { icon: ICON.egg, text: '0/2' } },
  { pos: [-0.5, 0, 0.6], rot: -2.4, color: 4, walking: true },
  { pos: [4.2, 0, 0.3], rot: Math.PI, color: 1, carry: { kind: 'bread', count: 3 }, bubble: { icon: ICON.bread, text: '3/3' } },
  { pos: [8.7, 0, 6.0], rot: Math.PI, color: 0, hat: 'beanie', carry: { kind: 'wheat', count: 2 }, bubble: { text: 'Caja' } },
  { pos: [2.6, 0, 4.6], rot: 2.6, color: 5, walking: true },
  { pos: [-3.5, 0, 5.5], rot: 1.2, color: 1, hat: 'cap', walking: true },
]

function Npc({ n }: { n: NPC }) {
  return (
    <group position={n.pos}>
      <Character
        rotation={[0, n.rot ?? 0, 0]}
        color={CUSTOMER_COLORS[n.color ?? 0]}
        hat={n.hat}
        hatColor={n.hat === 'beanie' ? '#4AA8FF' : C.white}
        walking={n.walking}
        carry={n.carry && <ProductStack kind={n.carry.kind} count={n.carry.count} />}
      />
      {n.bubble && <Bubble icon={n.bubble.icon} text={n.bubble.text} position={[0, 2.2, 0]} />}
    </group>
  )
}

function Ground() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshToonMaterial color={C.grass} />
      </mesh>
      {/* green border + store floor slab */}
      <Box size={[W + 0.8, 0.1, D + 0.8]} color={C.floorEdge} position={[CX, 0.05, CZ]} outline={false} />
      <Box size={[W, FLOOR_Y, D]} color={C.floor} position={[CX, FLOOR_Y / 2, CZ]} outline={false} />
      {/* pink office room behind the left wall */}
      <Box size={[8, 0.12, 7]} color={C.pinkFloor} position={[-19.4, 0.06, -4.5]} outline={false} />
    </>
  )
}

function Store() {
  return (
    <group position={[0, FLOOR_Y, 0]}>
      {/* walls */}
      <Wall length={W} position={[CX, 0, STORE.z0 - 0.15]} windows={[[-4.5, 3.4], [9.5, 3.4]]} />
      <Wall length={10} position={[STORE.x0 - 0.15, 0, -3]} rotation={[0, Math.PI / 2, 0]} windows={[[2.5, 2.5]]} />
      <Awning length={4} position={[STORE.x0 + 0.2, 1.9, -1.2]} rotation={[0, Math.PI / 2, 0]} />

      {/* mats along the back wall and at the entrance */}
      <FloorMat position={[-12, 0, -7.4]} />
      <FloorMat position={[-3.2, 0, -7.4]} w={3.4} />
      <FloorMat position={[10, 0, -7.4]} w={3.4} />
      <FloorMat position={[-14.3, 0, 4.5]} w={0.9} d={2.6} />

      {/* back row */}
      <TrashBin position={[-11.2, 0, -7.35]} />
      <TrashBin position={[3.5, 0, -7.35]} />
      <TrashBin position={[12.6, 0, -7.35]} />
      <Shelf product="can" position={[-7, 0, -5.9]} width={2} />
      <DisplayTable product="tomato" position={[-0.8, 0, -5.4]} />
      <Pill icon={ICON.tomato} text="4/8" position={[-0.4, 1.6, -5.4]} />
      <Fridge position={[7.6, 0, -7.0]} />

      {/* middle row */}
      <Crate product="egg" cardboard position={[-10.5, 0, -2.6]} />
      <Pill icon={ICON.egg} text="5/8" position={[-10.5, 1.4, -2.6]} />
      <Crate product="tomato" position={[-4.6, 0, -2.6]} />
      <Shelf product="bread" tiers={2} width={1.8} position={[0.6, 0, -2.4]} />
      <DisplayTable product="bread" position={[6.2, 0, -2.4]} />
      <Pill icon={ICON.bread} text="3/8" position={[5.2, 1.5, -2.6]} />
      <Shelf product="bread" tiers={4} width={1.6} position={[11.6, 0, -2.2]} />

      {/* front row: checkouts and wheat */}
      <MoneyPile cols={2} rows={3} layers={12} position={[-10.4, 0, 1.8]} />
      <Checkout position={[-6.4, 0, 1.9]} />
      <Character color={CUSTOMER_COLORS[0]} position={[-6.9, 0, 1.2]} />
      <Crate product="can" cardboard cols={3} rows={2} position={[-1.3, 0, 2.6]} />
      <Pill icon={ICON.can} text="0/8" position={[-2.3, 1.2, 2.2]} />
      <Shelf product="wheat" tiers={3} width={1.6} position={[2.6, 0, 2.2]} />
      <Checkout position={[8.4, 0, 4.2]} />
      <Character color={CUSTOMER_COLORS[0]} position={[8.0, 0, 3.5]} />

      {CUSTOMERS.map((n, i) => (
        <Npc key={i} n={n} />
      ))}
    </group>
  )
}

function Office() {
  return (
    <group position={[-19.5, 0.12, -6.2]}>
      <Desk />
      <Character color={CUSTOMER_COLORS[4]} position={[0.2, 0, 1.2]} rotation={[0, Math.PI, 0]} />
    </group>
  )
}

function Farm() {
  return (
    <group>
      {/* chicken nests */}
      <Nest position={[-12.2, 0, 9.4]} />
      <Pill icon={ICON.tomato} text="0/4" position={[-11.1, 1.3, 9.0]} />
      <Nest position={[-12.8, 0, 12.2]} eggs={5} />
      <Pill icon={ICON.tomato} text="0/4" position={[-11.8, 1.3, 11.8]} />
      <Fence length={3} position={[-16, 0, 11]} rotation={[0, Math.PI / 2, 0]} />
      <Fence length={3} position={[-15.5, 0, 14]} />

      {/* tomato planters */}
      <Planter position={[-3.6, 0, 9.4]} />
      <Planter position={[-4.2, 0, 11.8]} />

      {/* wheat field */}
      <CropPlot position={[3.8, 0, 11]} />

      {/* cow pen */}
      <mesh position={[10.4, 0.02, 11]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.6, 8]} />
        <meshToonMaterial color={C.grassDark} />
      </mesh>
      <Cow position={[10, 0, 10.6]} rotation={[0, -0.9, 0]} />
      <WaterTrough position={[11.5, 0, 11.8]} rotation={[0, -0.4, 0]} />
      <Pill icon={ICON.wheat} text="0/4" position={[8.6, 1.9, 9.6]} />

      {/* unlock zone */}
      <BuyZone position={[-8, 0, 13]} />
      <PriceTag icon={ICON.money} level={2} price={300} position={[-8, 0.5, 13]} />

      {/* player carrying tomatoes towards the store */}
      <Character color={C.player} position={[-7.6, 0, 9.6]} rotation={[0, Math.PI - 0.5, 0]} carry={<ProductStack kind="tomato" count={4} />} walking />
      <group position={[-9.8, 0, 14.6]}>
        <Character color={CUSTOMER_COLORS[5]} walking rotation={[0, 0.8, 0]} />
      </group>
      <group position={[-9.9, 0, 10.4]}>
        <Character color={CUSTOMER_COLORS[0]} hat="beanie" hatColor="#4AA8FF" rotation={[0, -0.8, 0]} carry={<ProductStack kind="egg" count={2} />} />
        <Pill text="MAX" position={[0, 2.2, 0]} />
      </group>

      <Bush position={[-18.5, 0, 3]} />
      <Bush position={[16.5, 0, 8.5]} scale={0.8} />
    </group>
  )
}

export function TestLevel() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={30} position={CAMERA} />
      <OrbitControls target={TARGET} maxPolarAngle={Math.PI / 2.3} />
      <color attach="background" args={[C.grass]} />
      <Lighting size={32} />
      <Ground />
      <Store />
      <Office />
      <Farm />
    </>
  )
}

import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, type ReactNode } from 'react'
import type { Group } from 'three'
import { C, CASHIER_COLOR, CUSTOMER_COLORS, WORKER_COLOR } from '../materials/palette'
import { Lighting } from './Lighting'
import { Character } from '../models/Character'
import { Chicken, Cow } from '../models/Animals'
import { AppleTree, Beehive, CropPlot, Fence, Nest, Planter, StrawberryPatch, TomatoPlant, WaterTrough, WheatPlant } from '../models/Farm'
import { Awning, BakeryCase, BuyZone, Checkout, CoffeeCorner, Crate, Desk, DisplayTable, FlowerStand, Fridge, Shelf, TrashBin, Wall } from '../models/Store'
import { Bench, FlowerPatch, Rock, StreetLamp, Tree } from '../models/Deco'
import { MoneyPile, Product, ProductStack } from '../models/Products'
import { MachineStation } from '../models/Machines'
import { CarryStack } from '../models/CarryStack'
import { ShoppingBasket, ShoppingCart } from '../models/ShoppingContainers'
import { AlertTag, Bubble, ICON, OrderTag, Pill, PriceTag, SafeHtml } from '../models/Labels'
import { AlarmLight, CatchNet, CaughtThief, EmptyDrawer, MoneySack, Thief } from '../models/Thief'
import { Car, LaneArrow, Motorbike, ParkingSign, ParkingSpot, ToGoBag, TrafficCone } from '../models/Vehicles'

type Entry = { name: string; node: ReactNode; scale?: number }

const BASKET_ITEMS = (['tomato', 'egg', 'milk', 'bread'] as const).map((kind, id) => ({ id: 100 + id, kind }))
const CART_ITEMS = (['tomato', 'egg', 'milk', 'bread', 'tomatoCan', 'cheese', 'cake', 'bread'] as const).map((kind, id) => ({ id: 200 + id, kind }))

const CAR_CARGO = (['cake', 'pizza', 'juice'] as const).map((kind, id) => ({ id: 300 + id, kind }))

const ENTRIES: Entry[] = [
  { name: 'Thief', node: <Thief />, scale: 1.1 },
  { name: 'Thief running', node: <><Thief running pose={1.2} /><AlertTag loot={240} position={[0, 1.9, 0]} /></>, scale: 1.0 },
  { name: 'Thief sneaking', node: <Thief sneaking loot={0} />, scale: 1.1 },
  { name: 'Player with net', node: <Character color={C.player} hold={<CatchNet />} />, scale: 0.8 },
  { name: 'Player swinging net', node: <Character color={C.player} hold={<CatchNet />} swing walking pace={1.5} />, scale: 0.8 },
  { name: 'Chase', node: <><Thief running position={[0, 0, 0.9]} /><Character color={C.player} hold={<CatchNet />} walking pace={1.5} position={[0, 0, -0.9]} /></>, scale: 0.7 },
  { name: 'Caught thief', node: <CaughtThief />, scale: 0.9 },
  { name: 'Robbed checkout', node: <><Checkout cash={false} /><AlarmLight position={[0.95, 0.8, 0]} /><EmptyDrawer position={[-0.45, 0.8, 0.3]} /></>, scale: 0.9 },
  { name: 'Net + sack + alarm', node: <><CatchNet position={[-0.6, 0.1, 0]} rotation={[0, 0, 0.5]} /><MoneySack position={[0.3, 0, 0.2]} /><AlarmLight position={[0.9, 0, -0.4]} /></>, scale: 1.1 },
  { name: 'Car', node: <Car color="#4AA8FF" driver="#F5D64A" hair="#5C3A21" />, scale: 0.9 },
  { name: 'Car driving', node: <Car color="#E0574F" driver="#5ED36B" driving />, scale: 0.9 },
  { name: 'Car trunk open', node: <Car color="#F5D64A" driver="#E0574F" waiting trunkOpen cargo={<CarryStack items={CAR_CARGO} />} />, scale: 0.9 },
  { name: 'Motorbike', node: <Motorbike color="#5ED36B" rider="#F28A3B" />, scale: 1.2 },
  { name: 'Motorbike box open', node: <Motorbike color="#A77BEA" rider="#F0F0F0" helmet="#F5D64A" waiting boxOpen cargo={<ToGoBag scale={0.8} />} />, scale: 1.2 },
  { name: 'Parking spot', node: <ParkingSpot />, scale: 0.8 },
  {
    name: 'Drive-up order',
    node: (
      <group>
        <ParkingSpot dropSide={1} />
        <Car color="#E0574F" driver="#F5D64A" waiting trunkOpen position={[0, 0, 0.1]} cargo={<CarryStack items={CAR_CARGO.slice(0, 2)} />} />
        <OrderTag lines={[{ kind: 'cake', done: 1, total: 1 }, { kind: 'pizza', done: 1, total: 2 }, { kind: 'juice', done: 0, total: 3 }]} timeLeft={22} timeTotal={45} reward={180} position={[0, 2.6, 0]} />
      </group>
    ),
    scale: 0.7,
  },
  {
    name: 'Moto order',
    node: (
      <group>
        <ParkingSpot w={1.6} d={2.4} dropSide={1} />
        <Motorbike color="#4AA8FF" rider="#5ED36B" waiting boxOpen cargo={<ToGoBag scale={0.8} />} />
        <OrderTag lines={[{ kind: 'iceCream', done: 1, total: 2 }]} timeLeft={6} timeTotal={25} reward={60} position={[0, 2.2, 0]} />
      </group>
    ),
    scale: 0.9,
  },
  {
    name: 'Parking lot',
    node: (
      <group>
        {[-1, 0, 1].map((i) => (
          <ParkingSpot key={i} position={[i * 2.45, 0, 0]} dropSide={0} />
        ))}
        <Car color="#4AA8FF" driver="#F28A3B" position={[-2.45, 0, 0.1]} />
        <Motorbike color="#F5D64A" rider="#E0574F" position={[2.45, 0, 0.3]} />
        <LaneArrow position={[0, 0, 2.7]} rotation={[0, Math.PI / 2, 0]} scale={1.6} />
        <ParkingSign position={[-4.1, 0, -1.2]} />
        <TrafficCone position={[3.9, 0, 2.3]} />
      </group>
    ),
    scale: 0.4,
  },
  { name: 'Sign + cone + bag', node: <><ParkingSign position={[-0.5, 0, 0]} /><TrafficCone position={[0.5, 0, 0.3]} /><ToGoBag position={[0.3, 0, -0.5]} scale={1.6} /></> },
  // fill order of a 12-slot tomato shelf, like in the game
  ...[0, 3, 6, 9, 12].map((n) => ({ name: `Estante ${n}/12`, node: <Shelf product="tomato" tiers={2} width={1.9} cap={12} count={n} /> })),
  { name: 'Player', node: <Character color={C.player} /> },
  { name: 'Player carrying', node: <Character color={C.player} carry={<ProductStack kind="tomato" count={4} />} walking /> },
  {
    name: 'Pila mixta',
    node: (
      <Character
        color={C.player}
        walking
        carry={<CarryStack moving items={(['tomato', 'tomato', 'egg', 'egg', 'tomatoCan'] as const).map((kind, id) => ({ id, kind }))} />}
      />
    ),
  },
  { name: 'Customer', node: <><Character color="#E24FD0" hat="beanie" hatColor="#4AA8FF" /><Bubble text="Caja" position={[0, 2.1, 0]} /></> },
  { name: 'Cashier', node: <Character color={CASHIER_COLOR} hat="visor" hatColor={C.wallStripe} tie /> },
  { name: 'Shelver', node: <Character color={WORKER_COLOR} hat="cap" hatColor="#3D8BFF" vest="#3D8BFF" /> },
  { name: 'Chef', node: <Character color={WORKER_COLOR} hat="chef" top={C.white} buttons={C.dark} /> },
  { name: 'Farmer', node: <Character color={WORKER_COLOR} hat="straw" hatColor={C.straw} /> },
  { name: 'Canasta 4 productos', node: <ShoppingBasket items={BASKET_ITEMS} />, scale: 1.8 },
  { name: 'Cliente con canasta', node: <Character color={CUSTOMER_COLORS[2]} hat="bob" hatColor="#5C3A21" carry={<ShoppingBasket items={BASKET_ITEMS} />} />, scale: 1.15 },
  { name: 'Carrito vacío', node: <ShoppingCart items={[]} />, scale: 1.25 },
  { name: 'Carrito 8 productos', node: <ShoppingCart items={CART_ITEMS} />, scale: 1.25 },
  { name: 'Cliente con carrito', node: <Character color={CUSTOMER_COLORS[3]} hat="beanie" hatColor={C.wallStripe} walking push={<ShoppingCart items={CART_ITEMS} moving />} />, scale: 1.05 },
  { name: 'Chicken', node: <Chicken />, scale: 1.6 },
  { name: 'Cow', node: <Cow /> },
  { name: 'Tomato plant', node: <TomatoPlant />, scale: 1.4 },
  { name: 'Wheat', node: <WheatPlant />, scale: 1.8 },
  { name: 'Planter', node: <Planter /> },
  { name: 'Crop plot', node: <CropPlot cols={3} rows={3} />, scale: 0.9 },
  { name: 'Nest', node: <><Nest /><Pill icon={ICON.tomato} text="0/4" position={[0, 1.4, 0]} /></>, scale: 0.9 },
  { name: 'Water trough', node: <WaterTrough /> },
  { name: 'Fence', node: <Fence length={2.6} /> },
  { name: 'Products', node: (
    <group>
      {(['tomato', 'egg', 'bread', 'wheat', 'can', 'milk', 'cheese', 'cake', 'money', 'pizza'] as const).map((k, i) => (
        <Product key={k} kind={k} position={[((i % 5) - 2) * 0.55, 0, Math.floor(i / 5) * 0.6 - 0.3]} scale={1.3} />
      ))}
    </group>
  ) },
  { name: 'Money pile', node: <MoneyPile cols={3} rows={2} layers={5} /> },
  { name: 'Shelf (tomato)', node: <><Shelf product="tomato" /><Pill icon={ICON.tomato} text="6/8" position={[0, 2.6, 0]} /></>, scale: 0.9 },
  { name: 'Shelf (bread)', node: <Shelf product="bread" tiers={4} width={1.6} />, scale: 0.8 },
  { name: 'Egg crate', node: <Crate product="egg" cardboard /> },
  { name: 'Display table', node: <DisplayTable product="bread" />, scale: 0.9 },
  { name: 'Checkout', node: <Checkout />, scale: 0.9 },
  { name: 'Fridge', node: <Fridge />, scale: 0.9 },
  { name: 'Trash bin', node: <TrashBin />, scale: 1.3 },
  { name: 'Desk', node: <Desk />, scale: 0.9 },
  { name: 'Wall + awning', node: <><Wall length={3} windows={[[0, 1.4]]} position={[0, 0, -0.5]} /><Awning length={3} position={[0, 1.8, -0.3]} /></>, scale: 0.8 },
  { name: 'Buy zone', node: <><BuyZone /><PriceTag icon={ICON.money} level={2} price={200} position={[0, 0.6, 0]} /></> },
  { name: 'Strawberry patch', node: <StrawberryPatch plants={3} stock={7} /> },
  { name: 'Beehive', node: <Beehive /> },
  { name: 'Apple tree', node: <AppleTree ripe={4} /> },
  { name: 'Cheese press', node: <MachineStation model="cheesePress" inputs={[{ kind: 'milk', count: 3 }]} outputKind="cheese" output={2} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Mixer', node: <MachineStation model="mixer" inputs={[{ kind: 'flour', count: 2 }, { kind: 'milk', count: 2 }, { kind: 'egg', count: 2 }]} outputKind="cake" output={1} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Jam pot', node: <MachineStation model="jamPot" inputs={[{ kind: 'strawberry', count: 2 }, { kind: 'honey', count: 2 }]} outputKind="jam" output={2} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Pizza oven', node: <MachineStation model="pizzaOven" inputs={[{ kind: 'flour', count: 2 }, { kind: 'tomato', count: 2 }, { kind: 'cheese', count: 2 }]} outputKind="pizza" output={2} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Juicer', node: <MachineStation model="juicer" inputs={[{ kind: 'apple', count: 4 }]} outputKind="juice" output={2} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Butter churn', node: <MachineStation model="butterChurn" inputs={[{ kind: 'milk', count: 3 }]} outputKind="butter" output={3} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Ice cream machine', node: <MachineStation model="iceCreamMachine" inputs={[{ kind: 'milk', count: 2 }, { kind: 'strawberry', count: 3 }]} outputKind="iceCream" output={2} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Ketchup bottler', node: <MachineStation model="ketchupBottler" inputs={[{ kind: 'tomato', count: 5 }]} outputKind="ketchup" output={3} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'Griddle', node: <MachineStation model="griddle" inputs={[{ kind: 'flour', count: 2 }, { kind: 'egg', count: 2 }, { kind: 'honey', count: 2 }]} outputKind="pancakes" output={2} working getProgress={() => 0.5} />, scale: 0.7 },
  { name: 'New products', node: (
    <group>
      {(['juice', 'butter', 'iceCream', 'ketchup', 'pancakes'] as const).map((k, i) => (
        <Product key={k} kind={k} position={[(i - 2) * 0.55, 0, 0]} scale={1.5} />
      ))}
    </group>
  ) },
  { name: 'Bakery case', node: <BakeryCase />, scale: 0.9 },
  { name: 'Flower stand', node: <FlowerStand />, scale: 0.9 },
  { name: 'Coffee corner', node: <CoffeeCorner />, scale: 1.2 },
  { name: 'Tree', node: <Tree /> },
  { name: 'Bench', node: <Bench /> },
  { name: 'Street lamp', node: <StreetLamp /> },
  { name: 'Flowers + rock', node: <><FlowerPatch /><Rock position={[0.7, 0, 0.3]} /></> },
]

const COLS = 5
const GAP = 4.2

/** Slow turntable: `?spin=1` rotates forever, `?angle=N` fixes a yaw in degrees. */
function Turntable({ spin, angle, children }: { spin: boolean; angle: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (spin && ref.current) ref.current.rotation.y += dt * 0.7
  })
  return (
    <group ref={ref} rotation={[0, (angle * Math.PI) / 180, 0]}>
      {children}
    </group>
  )
}

/** `?view=models&model=carrito&spin=1&angle=45`: one model alone on a turntable you can orbit. */
function IsolatedModel({ entry, spin, angle }: { entry: Entry; spin: boolean; angle: number }) {
  return (
    <>
      <PerspectiveCamera makeDefault fov={38} position={[2.6, 1.9, 3.2]} />
      <OrbitControls target={[0, 0.7, 0]} makeDefault />
      <color attach="background" args={[C.grass]} />
      <Lighting size={12} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshToonMaterial color={C.grass} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[1.8, 32]} />
        <meshToonMaterial color={C.floor} />
      </mesh>
      <Turntable spin={spin} angle={angle}>
        <group scale={entry.scale ?? 1}>{entry.node}</group>
      </Turntable>
    </>
  )
}

export function ModelGallery() {
  const params = new URLSearchParams(location.search)
  const wanted = params.get('model')?.toLowerCase()
  const entry = wanted ? ENTRIES.find((e) => e.name.toLowerCase() === wanted) ?? ENTRIES.find((e) => e.name.toLowerCase().includes(wanted)) : null
  if (entry) return <IsolatedModel entry={entry} spin={params.has('spin')} angle={Number(params.get('angle') ?? 0) || 0} />

  const rows = Math.ceil(ENTRIES.length / COLS)
  const w = (COLS - 1) * GAP
  const d = (rows - 1) * GAP
  return (
    <>
      <PerspectiveCamera makeDefault fov={32} position={[0, 21, 22]} />
      <OrbitControls target={[0, 0, 0.8]} />
      <color attach="background" args={[C.grass]} />
      <Lighting size={20} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshToonMaterial color={C.grass} />
      </mesh>
      {ENTRIES.map((e, i) => {
        const x = (i % COLS) * GAP - w / 2
        const z = Math.floor(i / COLS) * GAP - d / 2
        return (
          <group key={e.name} position={[x, 0, z]}>
            <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[1.8, 32]} />
              <meshToonMaterial color={C.floor} />
            </mesh>
            <group scale={e.scale ?? 1}>{e.node}</group>
            <SafeHtml position={[0, 0, 1.9]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
              <div className="tag">{e.name}</div>
            </SafeHtml>
          </group>
        )
      })}
    </>
  )
}

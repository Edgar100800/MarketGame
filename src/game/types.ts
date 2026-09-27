// Pure game data types. Nothing here depends on React or three.js,
// so the whole simulation can run (and be tested) with `bun test`.

export type ItemKind = 'tomato' | 'egg' | 'wheat' | 'tomatoCan' | 'flour' | 'bread' | 'milk' | 'cheese' | 'cake' | 'strawberry' | 'honey' | 'apple' | 'jam' | 'pizza'
export type ProductKind = ItemKind | 'can' | 'money'
export type FlyKind = ItemKind | 'money'

export type Vec2 = { x: number; z: number }
export type Vec3 = [number, number, number]
export type QuarterTurn = 0 | 1 | 2 | 3

/** Headwear kinds for the chibi characters: staff uniforms + customer-only styles. */
export type HatKind = 'none' | 'cap' | 'beanie' | 'chef' | 'straw' | 'visor' | 'bob' | 'bun' | 'afro' | 'bucket'
/** Axis-aligned rectangle on the ground: center + size. */
export type Rect = { x: number; z: number; w: number; d: number }

export type ProducerModel = 'planter' | 'nest' | 'plot' | 'cow' | 'strawberryPatch' | 'beehive' | 'appleTree'
export type MachineModel = 'canner' | 'mill' | 'oven' | 'cheesePress' | 'mixer' | 'jamPot' | 'pizzaOven'
export type ShelfModel = 'shelf' | 'crate' | 'fridge'

/** Purely decorative props the editor can move around. */
export type DecoModel = 'tree' | 'flowerPatch' | 'rock' | 'streetLamp' | 'bench' | 'bakeryCase' | 'flowerStand' | 'coffeeCorner' | 'desk' | 'chair' | 'mat'
export interface DecoDef {
  id: string
  model: DecoModel
  pos: Vec2
  turn?: QuarterTurn
  /** Floating sign shown above the prop, e.g. a section name. */
  label?: string
}

/** A trash bin the player can throw items into; id makes it selectable in the editor. */
export interface DoorDef {
  id: string
  /** Center of the doorway along the back wall. */
  x: number
  width: number
  /** Area whose back wall holds the door. */
  area: string
}

export interface TrashDef {
  id: string
  pos: Vec2
  /** Area that must be unlocked before the bin appears (always there when omitted). */
  area?: string
}

export interface Recipe {
  in: Partial<Record<ItemKind, number>>
  out: ItemKind
  n: number
  /** Seconds per batch. */
  time: number
}

interface StationBase {
  id: string
  pos: Vec2
  turn: QuarterTurn
  /** World time when it appeared, used by the pop-in animation. */
  bornAt: number
  collider: Rect | null
  /** Rounded gray floor pad drawn under the station. Its interaction zones live inside it. */
  pad: Rect
}

/** Food an animal needs to produce: each produced item eats one. */
export interface Feed {
  kind: ItemKind
  stock: number
  cap: number
  baseCap: number
}

export interface Producer extends StationBase {
  type: 'producer'
  model: ProducerModel
  kind: ItemKind
  stock: number
  max: number
  /** Plants on this station. Per-plant producers start at 1 and grow per bought unit. */
  plants: number
  /** Max purchasable plants; undefined when the station is fixed. */
  units?: number
  /** Seconds to grow one item back (after upgrades). */
  regrow: number
  baseRegrow: number
  timer: number
  zone: Rect
  feed: Feed | null
}

export interface Shelf extends StationBase {
  type: 'shelf'
  model: ShelfModel
  kind: ItemKind
  stock: number
  cap: number
  tiers: number
  zone: Rect
  customerSpot: Vec2
}

export interface Machine extends StationBase {
  type: 'machine'
  model: MachineModel
  recipe: Recipe
  input: Partial<Record<ItemKind, number>>
  inputCap: number
  output: number
  outputCap: number
  /** Values before upgrades. */
  base: { inputCap: number; outputCap: number; time: number }
  /** 0..1 while a batch is cooking. */
  progress: number
  running: boolean
  inZone: Rect
  outZone: Rect
}

export interface Checkout extends StationBase {
  type: 'checkout'
  /** Money waiting on the counter to be picked up. */
  cash: number
  queue: number[]
  cashier: boolean
  payTimer: number
  zone: Rect
  /** Where the cashier (or the player) stands, behind the counter. */
  spot: Vec2
  queueStart: Vec2
}

export type Station = Producer | Shelf | Machine | Checkout

export type StationDef =
  | { type: 'producer'; id: string; pos: Vec2; turn?: QuarterTurn; model: ProducerModel; kind: ItemKind; max: number; regrow: number; start?: number; units?: number; feed?: { kind: ItemKind; cap: number } }
  | { type: 'shelf'; id: string; pos: Vec2; turn?: QuarterTurn; model: ShelfModel; kind: ItemKind; cap: number; tiers?: number }
  | { type: 'machine'; id: string; pos: Vec2; turn?: QuarterTurn; model: MachineModel; recipe: Recipe; inputCap: number; outputCap: number }
  | { type: 'checkout'; id: string; pos: Vec2; turn?: QuarterTurn }

export interface AreaDef {
  id: string
  rect: Rect
  /** Enclose the area with side walls (the north side keeps the shared back wall). */
  enclose?: boolean
  /** Doorway: a gap of `width` centered at `at` along the given side wall. */
  door?: { side: 'east' | 'west' | 'north' | 'south'; at: number; width: number }
}

export interface UnlockDef {
  id: string
  label: string
  icon: ProductKind
  price: number
  /** Repeatable purchase: total units buyable at `price` each (default 1). */
  units?: number
  /** Producer that gains one plant per extra unit (used when `spawns` is empty). */
  grows?: string
  /** Where the buy zone is drawn. */
  zone: Vec2
  spawns: StationDef[]
  area?: string
  /** Checkout id that gets an automatic cashier. */
  cashier?: string
  /** Employee hired by this unlock. */
  worker?: { id: string; role: WorkerRole }
  /** Unlock ids that become visible once this one is bought. */
  reveals: string[]
}

export interface LevelDef {
  bounds: Rect
  areas: AreaDef[]
  startAreas: string[]
  start: StationDef[]
  startReveals: string[]
  unlocks: UnlockDef[]
  playerStart: Vec2
  /** Where customers appear / leave when the level has no `doors`. */
  spawnPoint?: Vec2
  exitPoint?: Vec2
  /** Back wall z, shared by every store area. */
  wallZ: number
  /** Customer entrances cut into the back wall; each one exists once its area is open. */
  doors?: DoorDef[]
  /** Trash bins: stand in front of one to throw away what you carry (movable in the editor). */
  trash: TrashDef[]
  /** Decorative props placed around the map (movable in the editor). */
  deco?: DecoDef[]
  /** Unlock id that completes the level the moment it is bought. */
  finalUnlock?: string
}

export interface StackItem {
  id: number
  kind: ItemKind
}

export interface Player {
  pos: Vec2
  facing: number
  moving: boolean
  /** Carried items, bottom -> top. Kinds can be mixed. */
  stack: StackItem[]
  cap: number
  transferTimer: number
  moneyTimer: number
  moneyStreak: number
  payTimer: number
}

export type WorkerRole = 'shelver' | 'chef' | 'farmer'

/** Where a worker picks items up and where it drops them. */
export interface Route {
  kind: ItemKind
  from: string
  fromSlot: 'stock' | 'out'
  to: string
  toSlot: 'shelf' | 'in' | 'feed'
}

export interface Worker {
  id: string
  role: WorkerRole
  pos: Vec2
  home: Vec2
  facing: number
  moving: boolean
  path: Vec2[]
  carry: ItemKind | null
  count: number
  cap: number
  speed: number
  state: 'idle' | 'toSource' | 'loading' | 'toDest' | 'unloading' | 'toTrash' | 'waiting'
  route: Route | null
  timer: number
  /** Seconds spent idle while carrying items nowhere to put them. */
  stuck: number
  /** Bin chosen when stuck too long; null until then. */
  trashAt: TrashDef | null
  paused: boolean
  bornAt: number
}

export type CustomerState = 'toShelf' | 'waitStock' | 'toQueue' | 'inQueue' | 'leaving'
export type CustomerCarryMode = 'hands' | 'basket' | 'cart'

export interface ShoppingLine {
  kind: ItemKind
  shelfId: string
  requested: number
  collected: number
  status: 'pending' | 'active' | 'done' | 'skipped'
}

export interface CustomerItem {
  id: number
  kind: ItemKind
}

export interface Customer {
  id: number
  pos: Vec2
  facing: number
  moving: boolean
  color: number
  /** Headwear picked at spawn, always different from the staff hats. */
  hat: HatKind
  hatColor: string
  shopping: ShoppingLine[]
  lineIndex: number
  items: CustomerItem[]
  carryMode: CustomerCarryMode
  state: CustomerState
  path: Vec2[]
  checkoutId: string | null
  takeTimer: number
  /** Seconds left before giving up on an empty shelf. */
  patience: number
}

export type FlyTarget = { type: 'player' } | { type: 'customer'; id: number } | { type: 'worker'; id: string } | { type: 'point'; p: Vec3 }

export type GameEvent =
  | { type: 'fly'; kind: FlyKind; from: Vec3; to: FlyTarget }
  | { type: 'trash'; pos: Vec2 }
  | { type: 'float'; text: string; pos: Vec3 }
  | { type: 'unlock'; id: string; pos: Vec2 }

export interface Objective {
  text: string
  target: Vec2 | null
}

export interface Input {
  /** Movement in screen space, -1..1 each axis (x right, y up). */
  x: number
  y: number
}

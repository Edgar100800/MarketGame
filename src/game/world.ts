import { PLAYER_CAP, WORKER_CAP, WORKER_SPEED } from './config'
import { applyUpgrades } from './upgrades'
import { Grid } from './nav'
import { SHELF_WIDTH, slotsFor } from './layout'
import type { Customer, GameEvent, LevelDef, Player, ProducerModel, Rect, Shelf, Station, StationDef, TrashDef, UnlockDef, Vec2, Vec3, Worker } from './types'
import { localPoint, localRect, rotateOffset } from './spatial'

export interface World {
  level: LevelDef
  time: number
  money: number
  earned: number
  player: Player
  stations: Station[]
  customers: Customer[]
  workers: Worker[]
  /** Upgrade levels by key, e.g. 'player.stack', 'w:chef.speed', 'm:oven.cap'. */
  upgrades: Record<string, number>
  nextCustomerId: number
  spawnTimer: number
  areas: Map<string, number>
  /** Unlock ids whose buy zone is currently shown. */
  visibleZones: string[]
  /** Money already paid into each visible buy zone. */
  zonePaid: Record<string, number>
  /** World time when each buy zone appeared (negative = already there, no pop-in). */
  zoneBorn: Record<string, number>
  /** Units bought of each repeatable (per-plant) unlock. */
  units: Record<string, number>
  unlocked: string[]
  events: GameEvent[]
  /** Bumped whenever something is added or removed (stations, areas, zones, customers). */
  version: number
  completed: boolean
  grid: Grid
  rand: () => number
}

/** Small deterministic RNG so tests can reproduce runs. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function inRect(p: Vec2, r: Rect) {
  return Math.abs(p.x - r.x) <= r.w / 2 && Math.abs(p.z - r.z) <= r.d / 2
}

export function dist(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

/** Capacity each bought plant adds on a per-plant producer (tomato plants hold 3, wheat tiles 1). */
function unitCap(model: ProducerModel) {
  return model === 'plot' ? 1 : 3
}

/** Plant counts: purchasable producers start with 1 plant, fixed ones show their full model. */
function defaultPlants(model: ProducerModel) {
  return model === 'planter' ? 2 : model === 'plot' ? 12 : 1
}

/** Builds the runtime station (with zones and collider) from its level definition. */
export function buildStation(def: StationDef, time: number): Station {
  const turn = def.turn ?? 0
  const rect = (offsetX: number, offsetZ: number, w: number, d: number) => localRect(def.pos, { x: offsetX, z: offsetZ, w, d }, turn)
  const point = (offsetX: number, offsetZ: number) => localPoint(def.pos, { x: offsetX, z: offsetZ }, turn)
  switch (def.type) {
    case 'producer': {
      const plants = def.units ? 1 : defaultPlants(def.model)
      const max = def.units ? plants * unitCap(def.model) : def.max
      const base = {
        id: def.id,
        pos: def.pos,
        turn,
        bornAt: time,
        model: def.model,
        kind: def.kind,
        stock: Math.min(def.start ?? max, max),
        max,
        ...(def.units ? { units: def.units } : {}),
        plants,
        regrow: def.regrow,
        baseRegrow: def.regrow,
        timer: 0,
        feed: def.feed ? { kind: def.feed.kind, stock: 0, cap: def.feed.cap, baseCap: def.feed.cap } : null,
      }
      // the interaction zone IS the drawn pad (no second marker on the floor)
      if (def.model === 'planter') {
        // pad centered on the planter so tomatoes can be picked from both sides
        const pad = rect(0, 0, 3.4, 3.0)
        return { ...base, type: 'producer', collider: rect(0, 0, 2.6, 0.7), pad, zone: pad }
      }
      if (def.model === 'cow') {
        const pad = rect(0, 0, 4.3, 3.4)
        return { ...base, type: 'producer', collider: rect(0, -0.2, 3.4, 1.8), pad, zone: pad }
      }
      const pad = def.model === 'nest' || def.model === 'beehive' ? rect(0, 0, 3.6, 2.6) : rect(0, 0, 4.3, 3.4)
      return { ...base, type: 'producer', collider: null, pad, zone: pad }
    }
    case 'shelf': {
      const w = def.model === 'crate' ? 1.9 : def.model === 'fridge' ? 1.7 : SHELF_WIDTH + 0.1
      const pad = def.model === 'crate' ? rect(0, 0.45, 2.9, 2.2) : def.model === 'fridge' ? rect(0, 0.35, 2.8, 2.1) : rect(0, 0.3, 2.9, 2.5)
      return {
        type: 'shelf',
        id: def.id,
        pos: def.pos,
        turn,
        bornAt: time,
        model: def.model,
        kind: def.kind,
        stock: 0,
        cap: def.cap,
        tiers: def.tiers ?? 2,
        // stepped shelves reach further back than crates
        collider: def.model === 'crate' ? rect(0, 0, w + 0.1, 0.9) : def.model === 'fridge' ? rect(0, -0.05, w + 0.1, 0.9) : rect(0, -0.25, w + 0.1, 1.2),
        pad,
        zone: pad,
        customerSpot: point(0, 1.25),
      }
    }
    case 'machine':
      return {
        type: 'machine',
        id: def.id,
        pos: def.pos,
        turn,
        bornAt: time,
        model: def.model,
        input: {},
        inputCap: def.inputCap,
        output: 0,
        outputCap: def.outputCap,
        base: { inputCap: def.inputCap, outputCap: def.outputCap, time: def.recipe.time },
        recipe: { ...def.recipe },
        progress: 0,
        running: false,
        collider: rect(0, 0, 2.9, 0.95),
        // one pad: left half = drop ingredients (input tray side), right half = pick up (output tray side)
        pad: rect(0, 0.55, 3.8, 2.5),
        inZone: rect(-0.95, 0.55, 1.9, 2.5),
        outZone: rect(0.95, 0.55, 1.9, 2.5),
      }
    case 'checkout':
      return {
        type: 'checkout',
        id: def.id,
        pos: def.pos,
        turn,
        bornAt: time,
        cash: 0,
        queue: [],
        cashier: false,
        payTimer: 0,
        collider: rect(0, 0, 2.7, 0.9),
        // pad covers the counter and the cashier side behind it
        pad: rect(0, -0.55, 3.0, 2.1),
        zone: rect(0, -0.55, 3.0, 2.1),
        spot: point(-0.3, -1.05),
        queueStart: point(-0.5, 1.1),
      }
  }
}

/** Moves an agent along its path at `speed`. Shared by customers and workers. */
export function walkPath(a: { pos: Vec2; path: Vec2[]; facing: number; moving: boolean }, speed: number, dt: number) {
  a.moving = a.path.length > 0
  let budget = speed * dt
  while (budget > 0 && a.path.length) {
    const t = a.path[0]
    const d = dist(a.pos, t)
    if (d > 0.001) a.facing = Math.atan2(t.x - a.pos.x, t.z - a.pos.z)
    if (d <= budget) {
      a.pos.x = t.x
      a.pos.z = t.z
      a.path.shift()
      budget -= d
    } else {
      a.pos.x += ((t.x - a.pos.x) / d) * budget
      a.pos.z += ((t.z - a.pos.z) / d) * budget
      budget = 0
    }
  }
}

/** Floor height: unlocked store areas are a raised slab. */
export function groundY(w: World, x: number, z: number) {
  for (const a of w.level.areas) {
    const r = a.rect
    if (w.areas.has(a.id) && Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.d / 2) return 0.15
  }
  return 0
}

/** World position of slot `i` on a shelf (where the i-th item sits). */
export function shelfSlotPos(w: World, s: Shelf, i: number): Vec3 {
  const slots = slotsFor(s.model, s.kind, s.cap, s.tiers)
  const [x, y, z] = slots[Math.max(0, Math.min(i, slots.length - 1))]
  const p = localPoint(s.pos, { x, z }, s.turn)
  return [p.x, groundY(w, s.pos.x, s.pos.z) + y, p.z]
}

export function stationPoint(s: Station, x: number, z: number): Vec2 {
  return localPoint(s.pos, { x, z }, s.turn)
}

export function stationDirection(s: Station, x: number, z: number): Vec2 {
  return rotateOffset({ x, z }, s.turn)
}

/** Trash bins currently in play: bins tied to an area only exist once it is unlocked. */
export function activeTrash(w: World): TrashDef[] {
  return w.level.trash.filter((t) => !t.area || w.areas.has(t.area))
}

/** Zone in front of a trash bin. */
export function trashZone(t: TrashDef): Rect {
  return { x: t.pos.x, z: t.pos.z + 0.45, w: 1.7, d: 2.0 }
}

/** Point just inside the front edge of a pad: where someone walks to use it. */
export function approach(r: Rect): Vec2 {
  return { x: r.x, z: r.z + r.d / 2 - 0.45 }
}

export function unlockDef(w: World, id: string): UnlockDef {
  const u = w.level.unlocks.find((u) => u.id === id)
  if (!u) throw new Error(`Unknown unlock ${id}`)
  return u
}

/** Solid rectangles for the player and for customer pathfinding. */
export function colliders(w: World): Rect[] {
  const out: Rect[] = []
  for (const s of w.stations) if (s.collider) out.push(s.collider)
  for (const t of activeTrash(w)) out.push({ x: t.pos.x, z: t.pos.z, w: 0.8, d: 0.7 })
  // back wall over every unlocked area
  for (const a of w.level.areas) {
    const r = a.rect
    if (w.areas.has(a.id)) out.push({ x: r.x, z: w.level.wallZ, w: r.w, d: 0.5 })
    else out.push({ x: r.x, z: r.z, w: r.w, d: r.d }) // locked area is blocked
    if (!w.areas.has(a.id) || !a.enclose) continue
    // enclosed area: solid side walls, the north side is the shared back wall
    const t = 0.5
    const x0 = r.x - r.w / 2
    const x1 = r.x + r.w / 2
    const z0 = r.z - r.d / 2
    const z1 = r.z + r.d / 2
    const gapOn = (side: string) => (a.door && a.door.side === side ? [a.door.at - a.door.width / 2, a.door.at + a.door.width / 2] : null)
    const xWall = (x: number, side: string) => {
      const gap = gapOn(side)
      for (const [lo, hi] of (gap ? [[z0, gap[0]], [gap[1], z1]] : [[z0, z1]]) as [number, number][])
        if (hi - lo > 0.2) out.push({ x, z: (lo + hi) / 2, w: t, d: hi - lo })
    }
    const zWall = (z: number, side: string) => {
      const gap = gapOn(side)
      for (const [lo, hi] of (gap ? [[x0, gap[0]], [gap[1], x1]] : [[x0, x1]]) as [number, number][])
        if (hi - lo > 0.2) out.push({ x: (lo + hi) / 2, z, w: hi - lo, d: t })
    }
    xWall(x0, 'west')
    xWall(x1, 'east')
    zWall(z1, 'south')
  }
  return out
}

export function rebuildGrid(w: World) {
  w.grid = new Grid(w.level.bounds, colliders(w), 0.5, 0.3)
}

export function applyUnlock(w: World, id: string, animate = true) {
  const def = unlockDef(w, id)
  const t = animate ? w.time : -10
  const bought = w.units[id] ?? 0
  // repeat purchase: extra units grow an existing producer; `grows` defs grow from their first unit on
  if (def.units && (def.grows || bought > 0)) {
    const target = w.stations.find((s) => s.id === (def.grows ?? def.spawns[0]?.id))
    if (target?.type === 'producer') {
      target.plants++
      target.max = target.plants * unitCap(target.model)
    }
  } else {
    // stagger: each spawned station pops a bit after the previous one
    def.spawns.forEach((s, i) => w.stations.push(buildStation(s, animate ? t + i * 0.35 : t)))
    if (def.area) w.areas.set(def.area, t)
    if (def.worker) {
      const worker: Worker = {
        id: def.worker.id,
        role: def.worker.role,
        pos: { ...def.zone },
        home: { ...def.zone },
        facing: 0,
        moving: false,
        path: [],
        carry: null,
        count: 0,
        cap: WORKER_CAP,
        speed: WORKER_SPEED,
        state: 'idle',
        route: null,
        timer: 0.5,
        stuck: 0,
        trashAt: null,
        paused: false,
        bornAt: t,
      }
      w.workers.push(worker)
    }
    if (def.cashier) {
      const c = w.stations.find((s) => s.id === def.cashier)
      if (c && c.type === 'checkout') c.cashier = true
    }
  }
  if (bought === 0) {
    w.unlocked.push(id)
    for (const r of def.reveals) if (!w.unlocked.includes(r) && !w.visibleZones.includes(r)) {
      w.visibleZones.push(r)
      w.zonePaid[r] = 0
      w.zoneBorn[r] = animate ? w.time + 0.6 : -10
    }
  }
  w.units[id] = bought + 1
  if (bought + 1 >= (def.units ?? 1)) {
    w.visibleZones = w.visibleZones.filter((z) => z !== id)
    delete w.zonePaid[id]
  } else {
    // re-arm the same zone for the next unit
    w.zonePaid[id] = 0
  }
  if (animate && bought === 0) w.events.push({ type: 'unlock', id, pos: def.zone })
  applyUpgrades(w)
  rebuildGrid(w)
  w.version++
}

export interface WorldOptions {
  money?: number
  unlocked?: string[]
  /** Units bought per repeatable unlock (per-plant purchases). */
  units?: Record<string, number>
  earned?: number
  upgrades?: Record<string, number>
  paused?: string[]
  seed?: number
}

export function createWorld(level: LevelDef, opts: WorldOptions = {}): World {
  const player: Player = {
    pos: { ...level.playerStart },
    facing: Math.PI,
    moving: false,
    stack: [],
    cap: PLAYER_CAP,
    transferTimer: 0,
    moneyTimer: 0,
    moneyStreak: 0,
    payTimer: 0,
  }
  const w: World = {
    level,
    time: 0,
    money: opts.money ?? 0,
    earned: opts.earned ?? 0,
    player,
    stations: level.start.map((d) => buildStation(d, 0)),
    customers: [],
    workers: [],
    upgrades: { ...(opts.upgrades ?? {}) },
    nextCustomerId: 1,
    spawnTimer: 1.5,
    areas: new Map(level.startAreas.map((a) => [a, -10])),
    visibleZones: [...level.startReveals],
    zonePaid: Object.fromEntries(level.startReveals.map((r) => [r, 0])),
    zoneBorn: Object.fromEntries(level.startReveals.map((r) => [r, -10])),
    units: {},
    unlocked: [],
    events: [],
    version: 0,
    completed: false,
    grid: new Grid(level.bounds, [], 0.5, 0.3),
    rand: opts.seed === undefined ? Math.random : mulberry32(opts.seed),
  }
  // Replay saved unlocks in chain order (each one reveals the next).
  const units = { ...(opts.units ?? {}) }
  for (const id of opts.unlocked ?? []) {
    // saves from before per-plant buying never stored units: assume everything was bought
    const def = unlockDef(w, id)
    if (!(id in units) && def.units) units[id] = def.units
    if (w.visibleZones.includes(id)) applyUnlock(w, id, false)
  }
  // restore extra plants bought on repeatable unlocks
  for (const [id, n] of Object.entries(units)) {
    let guard = 30
    while ((w.units[id] ?? 0) < n && w.visibleZones.includes(id) && guard-- > 0) applyUnlock(w, id, false)
  }
  for (const wk of w.workers) wk.paused = opts.paused?.includes(wk.id) ?? false
  applyUpgrades(w)
  rebuildGrid(w)
  return w
}

/** Unlocks everything in chain order (debug `?unlock=all`). */
export function unlockAll(w: World) {
  let guard = 50
  while (w.visibleZones.length && guard--) applyUnlock(w, w.visibleZones[0], false)
}

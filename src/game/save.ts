import { reserveStackItemIds } from './stack'
import type { Customer, ItemKind, Player, Worker } from './types'
import type { World } from './world'

type PlayerRuntime = Omit<Player, 'cap'>
type WorkerRuntime = Omit<Worker, 'id' | 'role' | 'home' | 'cap' | 'speed' | 'bornAt'>

type StationRuntime =
  | { id: string; type: 'producer'; stock: number; timer: number; feedStock: number | null }
  | { id: string; type: 'shelf'; stock: number }
  | { id: string; type: 'machine'; input: Partial<Record<ItemKind, number>>; output: number; progress: number; running: boolean }
  | { id: string; type: 'checkout'; cash: number; queue: number[]; cashier: boolean; payTimer: number }

export interface RuntimeSnapshot {
  version: 1
  time: number
  player: PlayerRuntime
  stations: StationRuntime[]
  customers: Customer[]
  workers: Array<{ id: string; runtime: WorkerRuntime }>
  nextCustomerId: number
  spawnTimer: number
  zonePaid: Record<string, number>
  completed: boolean
  stickyBuy: string | null
}

const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export function snapshotWorld(w: World): RuntimeSnapshot {
  const { cap: _cap, ...player } = w.player
  return {
    version: 1,
    time: w.time,
    player: copy(player),
    stations: w.stations.map((station): StationRuntime => {
      if (station.type === 'producer') return { id: station.id, type: station.type, stock: station.stock, timer: station.timer, feedStock: station.feed?.stock ?? null }
      if (station.type === 'shelf') return { id: station.id, type: station.type, stock: station.stock }
      if (station.type === 'machine')
        return { id: station.id, type: station.type, input: { ...station.input }, output: station.output, progress: station.progress, running: station.running }
      return { id: station.id, type: station.type, cash: station.cash, queue: [...station.queue], cashier: station.cashier, payTimer: station.payTimer }
    }),
    customers: copy(w.customers),
    workers: w.workers.map((worker) => {
      const { id, role: _role, home: _home, cap: _cap, speed: _speed, bornAt: _bornAt, ...runtime } = worker
      return { id, runtime: copy(runtime) }
    }),
    nextCustomerId: w.nextCustomerId,
    spawnTimer: w.spawnTimer,
    zonePaid: { ...w.zonePaid },
    completed: w.completed,
    stickyBuy: w.stickyBuy,
  }
}

export function isRuntimeSnapshot(value: unknown): value is RuntimeSnapshot {
  if (!value || typeof value !== 'object') return false
  const snapshot = value as Partial<RuntimeSnapshot>
  return snapshot.version === 1 && !!snapshot.player && Array.isArray(snapshot.stations) && Array.isArray(snapshot.customers) && Array.isArray(snapshot.workers)
}

/** Applies mutable simulation data after the level structure and upgrades have been rebuilt. */
export function restoreWorld(w: World, value: unknown) {
  if (!isRuntimeSnapshot(value)) return false
  const snapshot = copy(value)
  Object.assign(w.player, snapshot.player)
  reserveStackItemIds(w.player.stack)

  for (const saved of snapshot.stations) {
    const station = w.stations.find((candidate) => candidate.id === saved.id && candidate.type === saved.type)
    if (!station) continue
    if (saved.type === 'producer' && station.type === 'producer') {
      station.stock = Math.max(0, Math.min(station.max, saved.stock))
      station.timer = Math.max(0, saved.timer)
      if (station.feed && saved.feedStock !== null) station.feed.stock = Math.max(0, Math.min(station.feed.cap, saved.feedStock))
    } else if (saved.type === 'shelf' && station.type === 'shelf') station.stock = Math.max(0, Math.min(station.cap, saved.stock))
    else if (saved.type === 'machine' && station.type === 'machine') {
      station.input = { ...saved.input }
      station.output = Math.max(0, Math.min(station.outputCap, saved.output))
      station.progress = Math.max(0, Math.min(1, saved.progress))
      station.running = saved.running
    } else if (saved.type === 'checkout' && station.type === 'checkout') {
      station.cash = Math.max(0, saved.cash)
      station.queue = [...saved.queue]
      station.cashier = saved.cashier
      station.payTimer = Math.max(0, saved.payTimer)
    }
  }

  w.customers = snapshot.customers
  const customerIds = new Set(w.customers.map((customer) => customer.id))
  for (const station of w.stations) if (station.type === 'checkout') station.queue = station.queue.filter((id) => customerIds.has(id))

  const stationIds = new Set(w.stations.map((station) => station.id))
  for (const saved of snapshot.workers) {
    const worker = w.workers.find((candidate) => candidate.id === saved.id)
    if (!worker) continue
    Object.assign(worker, saved.runtime)
    const route = worker.route
    if (route && (!stationIds.has(route.from) || !stationIds.has(route.to))) {
      worker.route = null
      worker.path = []
      worker.state = 'idle'
    }
  }

  w.time = Math.max(0, snapshot.time)
  w.nextCustomerId = Math.max(snapshot.nextCustomerId, ...w.customers.map((customer) => customer.id + 1), 1)
  w.spawnTimer = snapshot.spawnTimer
  for (const id of w.visibleZones) {
    const paid = snapshot.zonePaid[id]
    if (Number.isFinite(paid)) w.zonePaid[id] = Math.max(0, paid)
  }
  w.completed = snapshot.completed
  w.stickyBuy = snapshot.stickyBuy && w.visibleZones.includes(snapshot.stickyBuy) ? snapshot.stickyBuy : null
  w.events.length = 0
  w.version++
  return true
}

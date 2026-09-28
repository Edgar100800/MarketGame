import {
  CUSTOMER_MAX_ITEMS,
  CUSTOMER_MAX_KINDS,
  CUSTOMERS_EARLY,
  CUSTOMERS_LATE,
  DEMAND_BUILD_WEIGHT,
  ITEMS_EARLY,
  KINDS_EARLY,
  SPAWN_EARLY,
  SPAWN_LATE,
} from '../config'
import type { LevelDef, StationDef } from '../types'
import { level, WORKER_SPEED_MAX, WORKER_STACK_MAX } from '../upgrades'
import type { World } from '../world'

// Customer demand follows what the store can serve: few, small orders while it is just a planter
// and a shelf; busy, big-basket traffic once every machine is built and the staff is trained.

const sells = (def: StationDef) => def.type === 'shelf' || def.type === 'machine'
/** Points a fully trained worker is worth: hired (1) + every capacity and speed level. */
const WORKER_POINTS = 1 + WORKER_STACK_MAX + WORKER_SPEED_MAX

type Totals = { stations: number; workers: number }
const totals = new WeakMap<LevelDef, Totals>()
function levelTotals(lv: LevelDef): Totals {
  let t = totals.get(lv)
  if (!t) {
    t = {
      stations: lv.start.filter(sells).length + lv.unlocks.reduce((n, u) => n + u.spawns.filter(sells).length, 0),
      workers: lv.unlocks.filter((u) => u.worker).length,
    }
    totals.set(lv, t)
  }
  return t
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** 0 = empty store, 1 = every shelf and machine built and every worker hired at max level. */
export function demand(w: World) {
  const t = levelTotals(w.level)
  const built = t.stations ? w.stations.filter((s) => s.type === 'shelf' || s.type === 'machine').length / t.stations : 1
  const staff = t.workers
    ? w.workers.reduce((sum, wk) => sum + 1 + level(w, `w:${wk.id}.stack`) + level(w, `w:${wk.id}.speed`), 0) / (t.workers * WORKER_POINTS)
    : 1
  return clamp01(DEMAND_BUILD_WEIGHT * built + (1 - DEMAND_BUILD_WEIGHT) * staff)
}

/** Seconds until the next customer, rolled between the current [min, max]. */
export function spawnDelay(d: number, roll: number) {
  const min = lerp(SPAWN_EARLY[0], SPAWN_LATE[0], d)
  const max = lerp(SPAWN_EARLY[1], SPAWN_LATE[1], d)
  return min + roll * (max - min)
}

/** Largest shopping list a customer may bring. */
export function maxItems(d: number) {
  return Math.round(lerp(ITEMS_EARLY, CUSTOMER_MAX_ITEMS, d))
}

/** Most distinct products in one list. */
export function maxKinds(d: number) {
  return Math.round(lerp(KINDS_EARLY, CUSTOMER_MAX_KINDS, d))
}

/** Customers allowed in the store at once (before the per-shelf cap). */
export function maxCrowd(d: number) {
  return Math.round(lerp(CUSTOMERS_EARLY, CUSTOMERS_LATE, d))
}

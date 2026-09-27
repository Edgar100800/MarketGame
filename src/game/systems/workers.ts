import { EMPTY_SHELF_PRIORITY, WORKER_STUCK_TIME, WORKER_TRANSFER } from '../config'
import type { ItemKind, Machine, Producer, Rect, Route, Shelf, Station, TrashDef, Vec2, Worker } from '../types'
import { activeTrash, approach, dist, groundY, shelfSlotPos, trashZone, walkPath, type World } from '../world'
import { CHARACTER_SCALE } from '../sizes'

// Employees: each role has a set of possible routes (source -> destination).
// An idle worker picks the best route: serving waiting customers first, then covering
// shelves with the most free space (an empty shelf counts extra). It loads the destination's
// exact want (demand when a customer waits, free space otherwise) up to its own capacity.

function byId(w: World, id: string) {
  return w.stations.find((s) => s.id === id)
}

function sources(w: World, kind: ItemKind): { id: string; slot: Route['fromSlot'] }[] {
  const out: { id: string; slot: Route['fromSlot'] }[] = []
  for (const s of w.stations) {
    if (s.type === 'producer' && s.kind === kind) out.push({ id: s.id, slot: 'stock' })
    if (s.type === 'machine' && s.recipe.out === kind) out.push({ id: s.id, slot: 'out' })
  }
  return out
}

function available(s: Station | undefined, slot: Route['fromSlot']) {
  if (!s) return 0
  if (slot === 'stock' && s.type === 'producer') return s.stock
  if (slot === 'out' && s.type === 'machine') return s.output
  return 0
}

/** What waiting customers still want from this shelf. */
function waitingDemand(w: World, shelf: Shelf) {
  let n = 0
  for (const c of w.customers) {
    for (const [index, line] of c.shopping.entries()) {
      if (line.shelfId !== shelf.id || line.status === 'done' || line.status === 'skipped') continue
      const remaining = line.requested - line.collected
      // Future lines are useful to anticipate, but active demand remains dominant.
      n += index === c.lineIndex ? remaining : Math.ceil(remaining * 0.5)
    }
  }
  return n
}

/** How many customers are heading to or waiting at this shelf (0 when the destination is not a shelf). */
function waitingCustomers(w: World, shelf: Shelf | null) {
  if (!shelf) return 0
  let n = 0
  for (const c of w.customers) {
    const line = c.shopping[c.lineIndex]
    if (line?.shelfId === shelf.id && (c.state === 'toShelf' || c.state === 'waitStock')) n++
  }
  return n
}

/**
 * How many more items the destination accepts right now.
 * A shelf with waiting customers restocks exactly that demand; with nobody there it fills the
 * free space as coverage. Machines and feeders always take their free space.
 */
function needOf(w: World, s: Station | undefined, slot: Route['toSlot'], kind: ItemKind) {
  if (!s) return 0
  if (slot === 'shelf' && s.type === 'shelf') {
    const space = s.cap - s.stock
    const demand = waitingDemand(w, s)
    return demand > 0 ? Math.min(space, demand) : space
  }
  if (slot === 'in' && s.type === 'machine') return s.inputCap - (s.input[kind] ?? 0)
  if (slot === 'feed' && s.type === 'producer' && s.feed) return s.feed.cap - s.feed.stock
  return 0
}

/** Candidate routes for a role, from the stations currently built. */
export function routesFor(w: World, role: Worker['role']): Route[] {
  const routes: Route[] = []
  const add = (kind: ItemKind, to: string, toSlot: Route['toSlot']) => {
    for (const src of sources(w, kind)) if (src.id !== to) routes.push({ kind, from: src.id, fromSlot: src.slot, to, toSlot })
  }
  for (const s of w.stations) {
    if (role === 'shelver' && s.type === 'shelf') add(s.kind, s.id, 'shelf')
    if (role === 'chef' && s.type === 'machine') for (const k of Object.keys(s.recipe.in) as ItemKind[]) add(k, s.id, 'in')
    if (role === 'farmer' && s.type === 'producer' && s.feed) add(s.feed.kind, s.id, 'feed')
  }
  return routes
}

/**
 * Route score. Serving waiting customers always comes first (big flat bonus per customer),
 * then free space — an empty shelf counts extra so it gets covered before anything else —
 * and finally the source stock as a tiebreaker.
 */
function routeScore(w: World, r: Route, need: number, have: number, cap: number) {
  const dest = byId(w, r.to)
  const shelf = dest?.type === 'shelf' ? dest : null
  const empty = shelf && shelf.stock === 0 ? EMPTY_SHELF_PRIORITY : 1
  return waitingCustomers(w, shelf) * 1000 + need * 10 * empty + Math.min(have, cap)
}

/** A task is one product need at one destination, regardless of which source supplies it. */
function sameTask(a: Route, b: Route) {
  return a.kind === b.kind && a.to === b.to && a.toSlot === b.toSlot
}

/** Active workers own their task until they finish or abandon it. */
function taskClaimed(w: World, wk: Worker, route: Route) {
  return w.workers.some(
    (other) =>
      other !== wk &&
      !other.paused &&
      other.state !== 'idle' &&
      other.state !== 'toTrash' &&
      other.route !== null &&
      sameTask(other.route, route),
  )
}

/** Stock another worker still plans to collect from this exact source. */
function sourceReserved(w: World, wk: Worker, route: Route) {
  let total = 0
  for (const other of w.workers) {
    if (
      other === wk ||
      other.paused ||
      !other.route ||
      (other.state !== 'toSource' && other.state !== 'loading' && other.state !== 'waiting') ||
      other.route.kind !== route.kind ||
      other.route.from !== route.from ||
      other.route.fromSlot !== route.fromSlot
    ) continue
    const need = needOf(w, byId(w, other.route.to), other.route.toSlot, other.route.kind)
    total += Math.max(0, Math.min(other.cap, need) - other.count)
  }
  return total
}

function availableFor(w: World, wk: Worker, route: Route) {
  return Math.max(0, available(byId(w, route.from), route.fromSlot) - sourceReserved(w, wk, route))
}

function pickRoute(w: World, wk: Worker): Route | null {
  let best: Route | null = null
  let bestScore = 0
  for (const r of routesFor(w, wk.role)) {
    // a worker already holding items only takes routes that accept them
    if ((wk.carry && wk.carry !== r.kind) || taskClaimed(w, wk, r)) continue
    const need = needOf(w, byId(w, r.to), r.toSlot, r.kind)
    const have = wk.carry ? wk.count : availableFor(w, wk, r)
    if (need <= 0 || have <= 0) continue
    const score = routeScore(w, r, need, have, wk.cap)
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }
  return best
}

/** Best route worth camping at, even when its source is dry: the destination still has space. */
function pickWaitRoute(w: World, wk: Worker): Route | null {
  let best: Route | null = null
  let bestScore = 0
  for (const r of routesFor(w, wk.role)) {
    if ((wk.carry && wk.carry !== r.kind) || taskClaimed(w, wk, r)) continue
    const need = needOf(w, byId(w, r.to), r.toSlot, r.kind)
    if (need <= 0) continue
    const score = routeScore(w, r, need, available(byId(w, r.from), r.fromSlot), wk.cap)
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }
  return best
}

function zoneOf(s: Station, slot: Route['fromSlot'] | Route['toSlot']): Rect {
  if (s.type === 'machine') return slot === 'out' ? s.outZone : s.inZone
  if (s.type === 'producer' || s.type === 'shelf') return s.zone
  return s.zone
}

function goTo(w: World, wk: Worker, target: Rect) {
  wk.path = w.grid.findPath(wk.pos, approach(target))
}

/** Closest trash bin to `p` (bins are few, no need to be fancy). */
function nearestTrash(w: World, p: Vec2): TrashDef {
  const bins = activeTrash(w)
  let best = bins[0]
  let bestD = Infinity
  for (const t of bins) {
    const d = dist(t.pos, p)
    if (d < bestD) {
      bestD = d
      best = t
    }
  }
  return best
}

function pos3(w: World, s: Station) {
  return [s.pos.x, groundY(w, s.pos.x, s.pos.z) + 0.8, s.pos.z] as [number, number, number]
}

export function updateWorkers(w: World, dt: number) {
  for (const wk of w.workers) {
    if (wk.paused) {
      wk.moving = false
      continue
    }
    walkPath(wk, wk.speed, dt)
    wk.timer -= dt

    // carrying items nowhere to put them: after a while, dump the whole stack in a bin
    if (wk.state === 'toTrash') {
      if (!wk.path.length) {
        const bin = wk.trashAt ?? nearestTrash(w, wk.pos)
        if (wk.carry && wk.count > 0) {
          w.events.push({ type: 'fly', kind: wk.carry, from: [wk.pos.x, groundY(w, wk.pos.x, wk.pos.z) + 1.2 * CHARACTER_SCALE, wk.pos.z], to: { type: 'point', p: [bin.pos.x, 0.9, bin.pos.z] } })
          w.events.push({ type: 'trash', pos: bin.pos })
        }
        wk.carry = null
        wk.count = 0
        wk.stuck = 0
        wk.trashAt = null
        wk.route = null
        wk.state = 'idle'
        wk.timer = 0.5
      }
      continue
    }

    if (wk.state === 'idle') {
      // stuck = idle while still holding items nothing accepts
      if (wk.count > 0) {
        wk.stuck += dt
        if (wk.stuck >= WORKER_STUCK_TIME) {
          // committed: it walks to the bin and dumps, even if a route opens up on the way
          wk.state = 'toTrash'
          wk.route = null
          wk.trashAt = nearestTrash(w, wk.pos)
          goTo(w, wk, trashZone(wk.trashAt))
          continue
        }
      } else {
        wk.stuck = 0
      }
      if (wk.timer > 0) continue
      const r = pickRoute(w, wk)
      if (!r) {
        // nothing stocked anywhere: camp at a source whose destination still has room
        if (wk.count === 0) {
          const wait = pickWaitRoute(w, wk)
          if (wait) {
            wk.stuck = 0
            wk.route = wait
            wk.state = 'waiting'
            goTo(w, wk, zoneOf(byId(w, wait.from)!, wait.fromSlot))
            continue
          }
        }
        wk.timer = 0.8
        if (!wk.path.length && dist(wk.pos, wk.home) > 0.5) wk.path = w.grid.findPath(wk.pos, wk.home)
        continue
      }
      wk.stuck = 0
      wk.route = r
      if (wk.carry) {
        wk.state = 'toDest'
        goTo(w, wk, zoneOf(byId(w, r.to)!, r.toSlot))
      } else {
        wk.state = 'toSource'
        goTo(w, wk, zoneOf(byId(w, r.from)!, r.fromSlot))
      }
      continue
    }

    const r = wk.route!
    if (wk.state === 'toSource' && !wk.path.length) wk.state = 'loading'
    if (wk.state === 'toDest' && !wk.path.length) wk.state = 'unloading'

    // camped at a dry source: stand there until items appear (or the destination fills up elsewhere)
    if (wk.state === 'waiting') {
      const src = byId(w, r.from)
      const dest = byId(w, r.to)
      if (!src || !dest || needOf(w, dest, r.toSlot, r.kind) <= 0) {
        // pointless now (full, or demand went away): think again
        wk.state = 'idle'
        wk.route = null
        wk.timer = 0.2
      } else if (available(src, r.fromSlot) > 0) {
        wk.state = 'loading'
        wk.timer = 0
      } else {
        wk.facing = Math.atan2(src.pos.x - wk.pos.x, src.pos.z - wk.pos.z)
      }
      continue
    }

    if (wk.state === 'loading' && wk.timer <= 0) {
      const src = byId(w, r.from) as Producer | Machine | undefined
      const dest = byId(w, r.to)
      // load only what the destination actually wants in total, up to the worker's capacity
      const want = Math.min(wk.cap, Math.max(wk.count, needOf(w, dest, r.toSlot, r.kind)))
      if (src && available(src, r.fromSlot) > 0 && wk.count < want) {
        if (src.type === 'producer') src.stock--
        else src.output--
        wk.carry = r.kind
        wk.count++
        wk.timer = WORKER_TRANSFER
        w.events.push({ type: 'fly', kind: r.kind, from: pos3(w, src), to: { type: 'worker', id: wk.id } })
      } else if (wk.count > 0) {
        wk.state = 'toDest'
        goTo(w, wk, zoneOf(byId(w, r.to)!, r.toSlot))
      } else {
        // source ran dry with nothing in hand: keep camping right here
        wk.state = 'waiting'
        wk.timer = 0
      }
    }

    if (wk.state === 'unloading' && wk.timer <= 0) {
      const dest = byId(w, r.to)
      if (dest && wk.count > 0 && needOf(w, dest, r.toSlot, r.kind) > 0) {
        const from: [number, number, number] = [wk.pos.x, groundY(w, wk.pos.x, wk.pos.z) + 1.2 * CHARACTER_SCALE, wk.pos.z]
        let to: [number, number, number] = pos3(w, dest)
        if (dest.type === 'shelf') {
          to = shelfSlotPos(w, dest as Shelf, dest.stock)
          dest.stock++
        } else if (dest.type === 'machine') dest.input[r.kind] = (dest.input[r.kind] ?? 0) + 1
        else if (dest.type === 'producer' && dest.feed) dest.feed.stock++
        wk.count--
        if (wk.count === 0) wk.carry = null
        wk.timer = WORKER_TRANSFER
        w.events.push({ type: 'fly', kind: r.kind, from, to: { type: 'point', p: to } })
      } else {
        // done, or destination full: think again (may pick another destination for what's left)
        wk.state = 'idle'
        wk.route = null
        wk.timer = wk.count > 0 ? 1 : 0.2
      }
    }
  }
}

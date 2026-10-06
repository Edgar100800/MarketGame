import { CLOTH_COLORS, HAIR_COLORS } from '../../materials/palette'
import { CUSTOMER_SPEED, CUSTOMER_TAKE_TIME, PATIENCE, PAY_PER_ITEM, PAY_TIME, PRICE } from '../config'
import { demand, maxCrowd, maxItems, maxKinds, spawnDelay } from './demand'
import type { Checkout, Customer, CustomerCarryMode, HatKind, Shelf, ShoppingLine, Station, Vec2 } from '../types'
import { activeDoors, dist, doorOutside, inRect, shelfSlotPos, stationDirection, stationPoint, walkPath, type World } from '../world'
import { CHARACTER_SCALE } from '../sizes'

/** Space one customer takes in a line (behind the one ahead), by what they carry: carts are long. */
function lineGap(customer: Customer | undefined) {
  return (customer?.carryMode === 'cart' ? 1.6 : 0.95) * CHARACTER_SCALE
}

/** Customer-only headwear: workers never wear any of these. */
const CUSTOMER_HEADS: HatKind[] = ['beanie', 'bob', 'bun', 'afro', 'bucket']

/** Headwear + color for a customer. Derived from id and body color (no extra rand draws, seeds stay stable). */
function headLook(id: number, color: number): { hat: HatKind; hatColor: string } {
  const hat = CUSTOMER_HEADS[(id + color * 2) % CUSTOMER_HEADS.length]
  const palette = hat === 'beanie' || hat === 'bucket' ? CLOTH_COLORS : HAIR_COLORS
  return { hat, hatColor: palette[(id * 3 + color) % palette.length] }
}

function shelves(w: World) {
  return w.stations.filter((station): station is Shelf => station.type === 'shelf' && station.bornAt <= w.time)
}

function checkouts(w: World) {
  return w.stations.filter((station): station is Checkout => station.type === 'checkout' && station.bornAt <= w.time)
}

/**
 * Standing spots of a line: straight out from `start` along `out`, one gap per person.
 * When furniture or a wall is in the way the line turns 90 degrees toward the free side,
 * so it stays tidy in a compact store instead of cutting through shelves.
 */
function lineSlots(w: World, start: Vec2, out: Vec2, gaps: number[]): Vec2[] {
  const slots = [start]
  let dir = out
  const clear = (p: Vec2) => w.grid.isFreeAt(p) && slots.every((s) => dist(s, p) > 0.4)
  const step = (from: Vec2, d: Vec2, gap: number) => ({ x: from.x + d.x * gap, z: from.z + d.z * gap })
  for (let i = 1; i < gaps.length; i++) {
    const prev = slots[slots.length - 1]
    let next = step(prev, dir, gaps[i])
    if (!clear(next)) {
      // turn toward the side with more room (checked a few people ahead)
      const room = (d: Vec2) => {
        let n = 0
        for (let k = 1; k <= 4 && clear(step(prev, d, gaps[i] * k)); k++) n++
        return n
      }
      const sides = [{ x: -dir.z, z: dir.x }, { x: dir.z, z: -dir.x }].map((d) => ({ d, n: room(d) })).sort((a, b) => b.n - a.n)
      if (sides[0].n > 0) {
        dir = sides[0].d
        next = step(prev, dir, gaps[i])
      }
    }
    slots.push(next)
  }
  return slots
}

/** Direction the line grows in, away from the station front (local +z). */
function lineOut(station: Station): Vec2 {
  return stationDirection(station, 0, 1)
}

function customerById(w: World, id: number) {
  return w.customers.find((candidate) => candidate.id === id)
}

function checkoutSlots(w: World, check: Checkout, extra?: Customer): Vec2[] {
  const people = check.queue.map((id) => customerById(w, id))
  if (extra) people.push(extra)
  return lineSlots(w, check.queueStart, lineOut(check), people.map(lineGap))
}

/** Customers shopping at a shelf, in line order (first to arrive first). */
function shelfLine(w: World, shelf: Shelf): Customer[] {
  return w.customers
    .filter((customer) => activeLine(customer)?.shelfId === shelf.id && (customer.state === 'toShelf' || customer.state === 'waitStock'))
    .sort((a, b) => (a.queuedAt ?? 0) - (b.queuedAt ?? 0) || a.id - b.id)
}

function shelfSlots(w: World, shelf: Shelf, line = shelfLine(w, shelf)): Vec2[] {
  return lineSlots(w, shelf.customerSpot, lineOut(shelf), line.map(lineGap))
}

/** Stand still in a line: the head looks at the station, everyone else at the back of the one ahead. */
function faceInLine(customer: Customer, slots: Vec2[], index: number, out: Vec2) {
  const ahead = index > 0 ? slots[index - 1] : { x: slots[0].x - out.x, z: slots[0].z - out.z }
  customer.facing = Math.atan2(ahead.x - customer.pos.x, ahead.z - customer.pos.z)
}

/** Walks to the line spot if it moved (someone ahead left), then faces forward. */
function keepInLine(customer: Customer, slots: Vec2[], index: number, out: Vec2) {
  const slot = slots[index]
  if (dist(customer.pos, slot) > 0.05 && !customer.path.length) customer.path = [slot]
  if (!customer.path.length) faceInLine(customer, slots, index, out)
}

function maxCustomers(w: World) {
  return Math.min(maxCrowd(demand(w)), 1 + shelves(w).length * 2)
}

export function activeLine(customer: Customer) {
  return customer.shopping[customer.lineIndex]
}

export function customerCarryMode(total: number): CustomerCarryMode {
  return total <= 2 ? 'hands' : total <= 4 ? 'basket' : 'cart'
}

/** Small, medium or big list, scaled to the current demand (1-2 items early, up to 8 later). */
function desiredTotal(w: World, max: number) {
  const roll = w.rand()
  const [lo, hi] = roll < 0.35 ? [1, Math.min(2, max)] : roll < 0.7 ? [Math.ceil(max * 0.4), Math.ceil(max * 0.6)] : [Math.ceil(max * 0.6), max]
  return lo + Math.floor(w.rand() * (hi - lo + 1))
}

function shoppingList(w: World, all: Shelf[], forced?: Shelf): ShoppingLine[] {
  if (forced) {
    const requested = 1 + Math.floor(w.rand() * 3)
    return [{ kind: forced.kind, shelfId: forced.id, requested, collected: 0, status: 'active' }]
  }

  const byKind = [...new Map(all.map((shelf) => [shelf.kind, shelf])).values()]
  const d = demand(w)
  const total = desiredTotal(w, maxItems(d))
  const kinds = maxKinds(d)
  const distinct = Math.min(byKind.length, kinds, total, 1 + Math.floor(w.rand() * kinds))
  const chosen: Shelf[] = []
  const pool = [...byKind]
  while (chosen.length < distinct && pool.length) chosen.push(pool.splice(Math.floor(w.rand() * pool.length), 1)[0])

  const amounts = Array.from({ length: chosen.length }, () => 1)
  for (let left = total - chosen.length; left > 0; left--) amounts[Math.floor(w.rand() * amounts.length)]++
  return chosen.map((shelf, index) => ({
    kind: shelf.kind,
    shelfId: shelf.id,
    requested: amounts[index],
    collected: 0,
    status: index === 0 ? 'active' : 'pending',
  }))
}


function goToLine(w: World, customer: Customer) {
  const line = activeLine(customer)
  const shelf = shelves(w).find((candidate) => candidate.id === line?.shelfId)
  if (!line || !shelf) return false
  line.status = 'active'
  customer.state = 'toShelf'
  customer.queuedAt = w.time
  const order = shelfLine(w, shelf)
  customer.path = w.grid.findPath(customer.pos, shelfSlots(w, shelf, order)[order.indexOf(customer)])
  customer.patience = PATIENCE
  customer.takeTimer = 0
  return true
}

/** Where a new customer appears: outside a random open door (or the level's spawn point). */
function entryPoint(w: World): Vec2 {
  const doors = activeDoors(w)
  if (!doors.length) return { ...(w.level.spawnPoint ?? w.level.playerStart) }
  return doorOutside(w.level, doors[Math.floor(w.rand() * doors.length)])
}

/** Where a customer leaves: outside the closest open door (or the level's exit point). */
function exitPoint(w: World, from: Vec2): Vec2 {
  const doors = activeDoors(w).map((door) => doorOutside(w.level, door))
  if (!doors.length) return w.level.exitPoint ?? w.level.playerStart
  return doors.reduce((best, p) => (dist(p, from) < dist(best, from) ? p : best), doors[0])
}

function leave(w: World, customer: Customer) {
  customer.state = 'leaving'
  customer.path = w.grid.findPath(customer.pos, exitPoint(w, customer.pos))
}

function joinQueue(w: World, customer: Customer) {
  const all = checkouts(w)
  if (!all.length) return leave(w, customer)
  const check = all.reduce((best, candidate) => (candidate.queue.length < best.queue.length ? candidate : best), all[0])
  const slots = checkoutSlots(w, check, customer)
  check.queue.push(customer.id)
  customer.checkoutId = check.id
  customer.state = 'toQueue'
  customer.path = w.grid.findPath(customer.pos, slots[slots.length - 1])
}

function advanceShopping(w: World, customer: Customer, skipped = false) {
  const line = activeLine(customer)
  if (line) line.status = skipped ? 'skipped' : 'done'
  customer.lineIndex++
  if (goToLine(w, customer)) return
  if (customer.items.length) joinQueue(w, customer)
  else {
    leave(w, customer)
    w.events.push({ type: 'float', text: '¡Sin stock!', pos: [customer.pos.x, 2.4, customer.pos.z] })
  }
}

export function spawnCustomer(w: World, shelfId?: string): Customer | null {
  const all = shelves(w)
  const forced = shelfId ? all.find((shelf) => shelf.id === shelfId) : undefined
  if (!all.length || (shelfId && !forced)) return null
  const shopping = shoppingList(w, all, forced)
  const total = shopping.reduce((sum, line) => sum + line.requested, 0)
  const id = w.nextCustomerId++
  const color = Math.floor(w.rand() * 6)
  const customer: Customer = {
    id,
    pos: entryPoint(w),
    facing: Math.PI / 2,
    moving: true,
    color,
    ...headLook(id, color),
    shopping,
    lineIndex: 0,
    items: [],
    carryMode: customerCarryMode(total),
    state: 'toShelf',
    path: [],
    checkoutId: null,
    takeTimer: 0,
    patience: PATIENCE,
  }
  w.customers.push(customer)
  goToLine(w, customer)
  w.version++
  return customer
}

/** Checkout is attended when it has a cashier or the player stands behind it. */
export function attended(w: World, checkout: Checkout) {
  return checkout.cashier || inRect(w.player.pos, checkout.zone)
}

export function updateCustomers(w: World, dt: number) {
  w.spawnTimer -= dt
  if (w.spawnTimer <= 0) {
    w.spawnTimer = spawnDelay(demand(w), w.rand())
    if (w.customers.length < maxCustomers(w)) spawnCustomer(w)
  }

  for (const customer of w.customers) {
    walkPath(customer, CUSTOMER_SPEED, dt)
    if (customer.state === 'toShelf' && !customer.path.length) customer.state = 'waitStock'

    if (customer.state === 'waitStock') {
      const line = activeLine(customer)
      const shelf = shelves(w).find((candidate) => candidate.id === line?.shelfId)
      // one at a time: only the first in line takes, the rest wait their turn (patience paused)
      const order = shelf ? shelfLine(w, shelf) : []
      const index = order.indexOf(customer)
      if (shelf && index >= 0) keepInLine(customer, shelfSlots(w, shelf, order), index, lineOut(shelf))
      if (index > 0 || customer.path.length) continue
      customer.takeTimer -= dt
      if (shelf && line && customer.takeTimer <= 0 && shelf.stock > 0) {
        shelf.stock--
        line.collected++
        customer.items.push({ id: customer.id * 100 + customer.items.length, kind: line.kind })
        customer.takeTimer = CUSTOMER_TAKE_TIME
        customer.patience = PATIENCE
        w.events.push({ type: 'fly', kind: line.kind, from: shelfSlotPos(w, shelf, shelf.stock), to: { type: 'customer', id: customer.id } })
      }
      customer.patience -= dt
      if (line && line.collected >= line.requested) advanceShopping(w, customer)
      else if (!line || customer.patience <= 0) advanceShopping(w, customer, true)
    }

    if (customer.state === 'toQueue' && !customer.path.length) customer.state = 'inQueue'
  }

  for (const check of checkouts(w)) {
    const slots = checkoutSlots(w, check)
    check.queue.forEach((id, index) => {
      const customer = customerById(w, id)
      if (!customer || customer.state !== 'inQueue') return
      keepInLine(customer, slots, index, lineOut(check))
    })
    const head = w.customers.find((customer) => customer.id === check.queue[0])
    if (head && head.state === 'inQueue' && !head.path.length && attended(w, check)) {
      check.payTimer += dt
      if (check.payTimer >= PAY_TIME + head.items.length * PAY_PER_ITEM) {
        check.payTimer = 0
        const amount = head.items.reduce((sum, item) => sum + PRICE[item.kind], 0)
        check.cash += amount
        w.earned += amount
        const money = stationPoint(check, 0.9, 0)
        w.events.push({ type: 'fly', kind: 'money', from: [head.pos.x, 1.2 * CHARACTER_SCALE, head.pos.z], to: { type: 'point', p: [money.x, 0.9, money.z] } })
        w.events.push({ type: 'float', text: `+$${amount}`, pos: [check.pos.x, 2.2, check.pos.z] })
        w.events.push({ type: 'sale', amount, pos: check.pos })
        check.queue.shift()
        leave(w, head)
      }
    } else check.payTimer = 0
  }

  const before = w.customers.length
  w.customers = w.customers.filter((customer) => !(customer.state === 'leaving' && !customer.path.length))
  if (w.customers.length !== before) w.version++
}

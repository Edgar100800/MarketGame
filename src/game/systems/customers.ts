import { CLOTH_COLORS, HAIR_COLORS } from '../../materials/palette'
import {
  CUSTOMER_MAX_ITEMS,
  CUSTOMER_MAX_KINDS,
  CUSTOMER_SPEED,
  CUSTOMER_TAKE_TIME,
  LATE_SPAWN_MAX,
  LATE_SPAWN_MIN,
  PATIENCE,
  PAY_PER_ITEM,
  PAY_TIME,
  PRICE,
  SPAWN_MAX,
  SPAWN_MIN,
} from '../config'
import type { Checkout, Customer, CustomerCarryMode, HatKind, Shelf, ShoppingLine, Vec2 } from '../types'
import { activeDoors, dist, doorOutside, inRect, shelfSlotPos, stationDirection, stationPoint, walkPath, type World } from '../world'

const QUEUE_GAP = 0.9

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

function queueSlot(check: Checkout, index: number): Vec2 {
  const gap = stationDirection(check, index * QUEUE_GAP, 0)
  return { x: check.queueStart.x + gap.x, z: check.queueStart.z + gap.z }
}

function maxCustomers(w: World) {
  return Math.min(12, 1 + shelves(w).length * 2)
}

export function activeLine(customer: Customer) {
  return customer.shopping[customer.lineIndex]
}

export function customerCarryMode(total: number): CustomerCarryMode {
  return total <= 2 ? 'hands' : total <= 4 ? 'basket' : 'cart'
}

function desiredTotal(w: World) {
  const roll = w.rand()
  if (roll < 0.35) return 1 + Math.floor(w.rand() * 2)
  if (roll < 0.7) return 3 + Math.floor(w.rand() * 2)
  return 5 + Math.floor(w.rand() * (CUSTOMER_MAX_ITEMS - 4))
}

function shoppingList(w: World, all: Shelf[], forced?: Shelf): ShoppingLine[] {
  if (forced) {
    const requested = 1 + Math.floor(w.rand() * 3)
    return [{ kind: forced.kind, shelfId: forced.id, requested, collected: 0, status: 'active' }]
  }

  const byKind = [...new Map(all.map((shelf) => [shelf.kind, shelf])).values()]
  const total = desiredTotal(w)
  const distinct = Math.min(byKind.length, CUSTOMER_MAX_KINDS, total, 1 + Math.floor(w.rand() * CUSTOMER_MAX_KINDS))
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

function shelfSpot(w: World, shelf: Shelf, customerId: number) {
  const busy = w.customers.filter((customer) => customer.id !== customerId && activeLine(customer)?.shelfId === shelf.id && (customer.state === 'toShelf' || customer.state === 'waitStock')).length
  const spread = stationDirection(shelf, (busy % 3 - 1) * 0.6, Math.floor(busy / 3) * 0.5)
  return { x: shelf.customerSpot.x + spread.x, z: shelf.customerSpot.z + spread.z }
}

function goToLine(w: World, customer: Customer) {
  const line = activeLine(customer)
  const shelf = shelves(w).find((candidate) => candidate.id === line?.shelfId)
  if (!line || !shelf) return false
  line.status = 'active'
  customer.state = 'toShelf'
  customer.path = w.grid.findPath(customer.pos, shelfSpot(w, shelf, customer.id))
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
  check.queue.push(customer.id)
  customer.checkoutId = check.id
  customer.state = 'toQueue'
  customer.path = w.grid.findPath(customer.pos, queueSlot(check, check.queue.length - 1))
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
    const late = w.stations.some((station) => station.id === 'checkout2')
    const min = late ? LATE_SPAWN_MIN : SPAWN_MIN
    const max = late ? LATE_SPAWN_MAX : SPAWN_MAX
    w.spawnTimer = min + w.rand() * (max - min)
    if (w.customers.length < maxCustomers(w)) spawnCustomer(w)
  }

  for (const customer of w.customers) {
    walkPath(customer, CUSTOMER_SPEED, dt)
    if (customer.state === 'toShelf' && !customer.path.length) customer.state = 'waitStock'

    if (customer.state === 'waitStock') {
      const line = activeLine(customer)
      const shelf = shelves(w).find((candidate) => candidate.id === line?.shelfId)
      customer.takeTimer -= dt
      if (shelf) customer.facing = Math.atan2(shelf.pos.x - customer.pos.x, shelf.pos.z - customer.pos.z)
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
    check.queue.forEach((id, index) => {
      const customer = w.customers.find((candidate) => candidate.id === id)
      if (!customer || customer.state !== 'inQueue') return
      const slot = queueSlot(check, index)
      if (dist(customer.pos, slot) > 0.05 && !customer.path.length) customer.path = [slot]
      if (!customer.path.length) customer.facing = Math.atan2(check.pos.x - customer.pos.x, check.pos.z - customer.pos.z)
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
        w.events.push({ type: 'fly', kind: 'money', from: [head.pos.x, 1.2, head.pos.z], to: { type: 'point', p: [money.x, 0.9, money.z] } })
        w.events.push({ type: 'float', text: `+$${amount}`, pos: [check.pos.x, 2.2, check.pos.z] })
        check.queue.shift()
        leave(w, head)
      }
    } else check.payTimer = 0
  }

  const before = w.customers.length
  w.customers = w.customers.filter((customer) => !(customer.state === 'leaving' && !customer.path.length))
  if (w.customers.length !== before) w.version++
}

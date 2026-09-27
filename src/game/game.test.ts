import { describe, expect, test } from 'bun:test'
import { LEVEL1 } from './level1'
import { activeDoors, applyUnlock, buildStation, colliders, createWorld, dist, shelfSlotPos, trashZone, unlockAll, type World } from './world'
import { tick } from './loop'
import { runMachines } from './systems/production'
import { customerCarryMode, spawnCustomer } from './systems/customers'
import { autopilot } from './systems/autopilot'
import { objective } from './systems/objective'
import { fridgeSlots, shelfSlots, SPACING, type SlotKind } from './layout'
import { pushItem, setStack } from './stack'
import { restoreWorld, snapshotWorld } from './save'
import { buyUpgrade } from './upgrades'
import { applyLayout, layoutOf, stationRelations, unlockTiers, useEditor, type LayoutFile } from './editor'
import { PADS, SLOT_SIZE, STATION_SCALE as S } from './sizes'
import { PRICE } from './config'
import { migrateUnlocks } from './state'
import type { Checkout, Machine, Producer, Shelf, Vec2 } from './types'

const idle = { x: 0, y: 0 }
const station = <T,>(w: World, id: string) => w.stations.find((s) => s.id === id) as T

function standAt(w: World, p: Vec2, seconds: number) {
  w.player.pos = { ...p }
  for (let t = 0; t < seconds; t += 1 / 60) tick(w, idle, 1 / 60)
}

describe('player transfers', () => {
  test('harvests tomatoes up to capacity and restocks the shelf', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    w.spawnTimer = 999
    const planter = station<Producer>(w, 'planter1')
    const shelf = station<Shelf>(w, 'shelfTomato')

    standAt(w, planter.zone, 1)
    expect(w.player.stack.every((item) => item.kind === 'tomato')).toBe(true)
    expect(w.player.stack).toHaveLength(w.player.cap)

    standAt(w, shelf.zone, 1)
    expect(shelf.stock).toBe(4)
    expect(w.player.stack).toHaveLength(0)
  })
})

describe('machines', () => {
  test('canner turns 1 tomato into 1 can after its cook time', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const m = station<Machine>(w, 'canner')
    m.input.tomato = 4
    runMachines(w, 0.01)
    expect(m.running).toBe(true)
    expect(m.input.tomato).toBe(3)
    for (let t = 0; t < m.recipe.time + 0.1; t += 0.1) runMachines(w, 0.1)
    expect(m.output).toBeGreaterThanOrEqual(1)
  })

  test('oven needs every ingredient', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const oven = station<Machine>(w, 'oven')
    oven.input.flour = 3
    runMachines(w, 0.01)
    expect(oven.running).toBe(false)
    oven.input.egg = 1
    runMachines(w, 0.01)
    expect(oven.running).toBe(true)
  })

  test('pauses when the output tray is full', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const m = station<Machine>(w, 'canner')
    m.output = m.outputCap
    m.input.tomato = 10
    runMachines(w, 1)
    expect(m.running).toBe(false)
    expect(m.input.tomato).toBe(10)
  })
})

describe('customers', () => {
  test('buy, queue, pay when the player attends the checkout, and leave', () => {
    const w = createWorld(LEVEL1, { seed: 3 })
    w.spawnTimer = 999
    const shelf = station<Shelf>(w, 'shelfTomato')
    const checkout = station<Checkout>(w, 'checkout1')
    shelf.stock = 10
    const c = spawnCustomer(w, 'shelfTomato')!
    const requested = c.shopping[0].requested
    // walk and shop while the player waits behind the counter
    w.player.pos = { x: checkout.zone.x, z: checkout.zone.z }
    for (let t = 0; t < 40 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers.length).toBe(0)
    expect(w.earned).toBe(PRICE.tomato * requested)
    expect(w.money).toBe(PRICE.tomato * requested) // collected from the counter
  })

  test('customers line up one behind another, facing forward, at shelves and at the checkout', () => {
    const w = createWorld(LEVEL1, { seed: 3 })
    w.spawnTimer = 999
    const shelf = station<Shelf>(w, 'shelfTomato')
    const checkout = station<Checkout>(w, 'checkout1')
    shelf.stock = 0
    const group = [0, 1, 2].map(() => spawnCustomer(w, 'shelfTomato')!)
    for (let t = 0; t < 15; t += 1 / 30) tick(w, idle, 1 / 30)
    // empty shelf: a straight line out from the shelf front, everyone looking toward the shelf
    const xs = group.map((c) => c.pos.x)
    const zs = group.map((c) => c.pos.z)
    for (const x of xs) expect(x).toBeCloseTo(shelf.customerSpot.x, 1)
    expect(zs[0]).toBeCloseTo(shelf.customerSpot.z, 1)
    expect(zs[1]).toBeGreaterThan(zs[0])
    expect(zs[2]).toBeGreaterThan(zs[1])
    for (const c of group) expect(Math.abs(Math.abs(c.facing) - Math.PI)).toBeLessThan(0.05)
    // only the first in line has been waiting with patience running out
    expect(group[1].patience).toBeGreaterThan(group[0].patience)

    // stock arrives; with nobody at the counter they queue for the checkout in a line
    shelf.stock = 12
    for (let t = 0; t < 20; t += 1 / 30) tick(w, idle, 1 / 30)
    const queue = checkout.queue.map((id) => w.customers.find((c) => c.id === id)!)
    expect(queue.length).toBe(3)
    for (const c of queue) {
      expect(c.state).toBe('inQueue')
      expect(c.pos.x).toBeCloseTo(checkout.queueStart.x, 1)
      expect(Math.abs(Math.abs(c.facing) - Math.PI)).toBeLessThan(0.05)
    }
    expect(queue[1].pos.z).toBeGreaterThan(queue[0].pos.z)
    expect(queue[2].pos.z).toBeGreaterThan(queue[1].pos.z)
  })

  test('carry mode follows hands, basket and cart thresholds', () => {
    expect(customerCarryMode(1)).toBe('hands')
    expect(customerCarryMode(2)).toBe('hands')
    expect(customerCarryMode(3)).toBe('basket')
    expect(customerCarryMode(4)).toBe('basket')
    expect(customerCarryMode(5)).toBe('cart')
    expect(customerCarryMode(8)).toBe('cart')
  })

  test('shops at multiple shelves and pays for the mixed inventory', () => {
    const w = createWorld(LEVEL1, { seed: 2, unlocked: ['planter2', 'eggs', 'cashier'] })
    w.spawnTimer = 999
    station<Shelf>(w, 'shelfTomato').stock = 5
    station<Shelf>(w, 'shelfEgg').stock = 5
    const customer = spawnCustomer(w, 'shelfTomato')!
    customer.shopping = [
      { kind: 'tomato', shelfId: 'shelfTomato', requested: 2, collected: 0, status: 'active' },
      { kind: 'egg', shelfId: 'shelfEgg', requested: 2, collected: 0, status: 'pending' },
    ]
    customer.carryMode = 'basket'
    for (let t = 0; t < 60 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers).toHaveLength(0)
    expect(customer.items.map((item) => item.kind)).toEqual(['tomato', 'tomato', 'egg', 'egg'])
    expect(w.earned).toBe(PRICE.tomato * 2 + PRICE.egg * 2)
  })

  test('skips an empty line and continues shopping', () => {
    const w = createWorld(LEVEL1, { seed: 2, unlocked: ['planter2', 'eggs', 'cashier'] })
    w.spawnTimer = 999
    station<Shelf>(w, 'shelfTomato').stock = 0
    station<Shelf>(w, 'shelfEgg').stock = 2
    const customer = spawnCustomer(w, 'shelfTomato')!
    customer.shopping = [
      { kind: 'tomato', shelfId: 'shelfTomato', requested: 1, collected: 0, status: 'active' },
      { kind: 'egg', shelfId: 'shelfEgg', requested: 1, collected: 0, status: 'pending' },
    ]
    for (let t = 0; t < 60 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(customer.shopping[0].status).toBe('skipped')
    expect(customer.shopping[1].status).toBe('done')
    expect(w.earned).toBe(PRICE.egg)
  })

  test('generated lists stay within eight items and three product kinds', () => {
    const w = createWorld(LEVEL1, { seed: 8 })
    unlockAll(w)
    w.spawnTimer = 999
    for (let i = 0; i < 20; i++) {
      const customer = spawnCustomer(w)!
      const total = customer.shopping.reduce((sum, line) => sum + line.requested, 0)
      expect(total).toBeGreaterThanOrEqual(1)
      expect(total).toBeLessThanOrEqual(8)
      expect(customer.shopping.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('second checkout', () => {
  const checkoutUnlocks = ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'checkout2']

  test('is mandatory after milk and reveals bakery plus its optional cashier', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: checkoutUnlocks })
    expect(station<Checkout>(w, 'checkout2')).toBeDefined()
    expect(w.visibleZones).toEqual(expect.arrayContaining(['bakery', 'cashier2']))
  })

  test('customers reserve the shortest of two queues', () => {
    const w = createWorld(LEVEL1, { seed: 2, unlocked: checkoutUnlocks })
    w.spawnTimer = 999
    station<Shelf>(w, 'shelfTomato').stock = 8
    const first = spawnCustomer(w, 'shelfTomato')!
    const second = spawnCustomer(w, 'shelfTomato')!
    first.shopping[0].requested = 1
    second.shopping[0].requested = 1
    for (let t = 0; t < 40 && (!first.checkoutId || !second.checkoutId); t += 1 / 30) tick(w, idle, 1 / 30)
    expect(new Set([first.checkoutId, second.checkoutId])).toEqual(new Set(['checkout1', 'checkout2']))
  })

  test('second cashier only attends checkout2 and enables faster traffic', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: [...checkoutUnlocks, 'cashier2'] })
    expect(station<Checkout>(w, 'checkout1').cashier).toBe(false)
    expect(station<Checkout>(w, 'checkout2').cashier).toBe(true)
    w.spawnTimer = 0
    tick(w, idle, 1 / 30)
    expect(w.spawnTimer).toBeLessThanOrEqual(4.5)
  })
})

describe('unlocks', () => {
  test('paying a buy zone drains money and reveals the next one', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 100 })
    w.spawnTimer = 999
    standAt(w, LEVEL1.unlocks[0].zone, 4)
    expect(w.unlocked).toContain('planter2')
    expect(w.money).toBe(80) // both plants bought at $10 each
    expect(w.units.planter2).toBe(2)
    expect(w.visibleZones).toEqual(['cashier', 'eggs'])
    expect(w.stations.some((s) => s.id === 'planter2')).toBe(true)
  })

  test('area unlock opens the grid and the wall moves', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    for (const id of ['planter2', 'eggs', 'canner']) applyUnlock(w, id)
    const target = { x: 9, z: -1 }
    const blockedPath = w.grid.findPath({ x: -4, z: 0 }, target)
    applyUnlock(w, 'areaA1')
    const openPath = w.grid.findPath({ x: -4, z: 0 }, target)
    expect(openPath.length).toBeLessThanOrEqual(blockedPath.length)
    expect(w.areas.has('A1')).toBe(true)
  })

  test('saved unlocks replay in order', () => {
    const w = createWorld(LEVEL1, { unlocked: ['planter2', 'eggs', 'canner'] })
    expect(w.unlocked).toEqual(['planter2', 'eggs', 'canner'])
    // hen2 and strawberry travel alongside canner in the reveal chain
    expect(w.visibleZones).toEqual(['cashier', 'hen2', 'strawberry', 'farmer'])
  })
})

describe('trash and patience', () => {
  test('trash bin empties the player stack', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    w.spawnTimer = 999
    setStack(w.player, 'tomato', 4)
    standAt(w, trashZone(LEVEL1.trash[0]), 1)
    expect(w.player.stack).toHaveLength(0)
    expect(w.events.some((event) => event.type === 'trash')).toBe(true)
  })

  test('customer leaves an empty shelf after running out of patience', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    w.spawnTimer = 999
    spawnCustomer(w, 'shelfTomato')
    for (let t = 0; t < 40 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers.length).toBe(0)
    expect(w.earned).toBe(0)
  })
})

describe('autopilot', () => {
  test('bot following the tutorial finishes the whole level', () => {
    const w = createWorld(LEVEL1, { seed: 11 })
    const input = { x: 0, y: 0 }
    // the branch costs $500 on top of every unlock, so the run needs extra time
    for (let t = 0; t < 4200 && !w.completed; t += 1 / 30) {
      autopilot(w, input)
      tick(w, input, 1 / 30)
    }
    expect(w.completed).toBe(true)
    // Optional repeat purchases can remain after the final branch; mandatory unlocks must be complete.
    const mandatory = LEVEL1.unlocks.filter((unlock) => unlock.id !== 'wheatPlants').map((unlock) => unlock.id)
    expect(w.unlocked).toEqual(expect.arrayContaining(mandatory))
  })

  test('bot following the tutorial unlocks the first zones', () => {
    const w = createWorld(LEVEL1, { seed: 7 })
    const input = { x: 0, y: 0 }
    const chainUnlocked = () => w.unlocked.filter((id) => id !== 'cashier').length
    for (let t = 0; t < 400 && chainUnlocked() < 3; t += 1 / 30) {
      autopilot(w, input)
      tick(w, input, 1 / 30)
    }
    // cashier is optional and can jump ahead when money comes in fast: check the chain only
    const chain = w.unlocked.filter((id) => id !== 'cashier')
    // after the hens the bot buys whichever of the revealed zones it can pay first
    expect(chain.slice(0, 2)).toEqual(['planter2', 'eggs'])
    expect(['canner', 'hen2', 'strawberry']).toContain(chain[2])
  })
})

describe('shelf filling', () => {
  test('each restocked item flies to the next free slot, bottom-front first', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    w.spawnTimer = 999
    const shelf = station<Shelf>(w, 'shelfTomato')
    setStack(w.player, 'tomato', 3)
    w.player.pos = { x: shelf.zone.x, z: shelf.zone.z }
    const targets: number[][] = []
    for (let t = 0; t < 1; t += 1 / 60) {
      tick(w, idle, 1 / 60)
      for (const e of w.events.splice(0)) if (e.type === 'fly' && e.to.type === 'point') targets.push(e.to.p)
    }
    expect(shelf.stock).toBe(3)
    expect(targets.length).toBe(3)
    // left to right on the same (bottom, front) row
    expect(targets[0][0]).toBeLessThan(targets[1][0])
    expect(targets[1][0]).toBeLessThan(targets[2][0])
    expect(new Set(targets.map((p) => p[1])).size).toBe(1)
  })

  test('a full shelf uses every slot exactly once', () => {
    const slots = shelfSlots(12, 2)
    expect(slots.length).toBe(12)
    expect(new Set(slots.map((p) => p.join())).size).toBe(12)
  })
})

describe('station rotation', () => {
  test('rotates shelf geometry and product slots in quarter turns', () => {
    const shelf = buildStation({ type: 'shelf', id: 'rotated', model: 'shelf', kind: 'tomato', pos: { x: 2, z: 3 }, turn: 1, cap: 12 }, 0) as Shelf
    expect(shelf.collider!.w).toBeCloseTo(1.2 * S)
    expect(shelf.collider!.d).toBeCloseTo(2.1 * S)
    expect(shelf.customerSpot.x).toBeCloseTo(2 + 1.25 * S)
    expect(shelf.customerSpot.z).toBeCloseTo(3)

    const w = createWorld({ ...LEVEL1, start: [] })
    const first = shelfSlotPos(w, shelf, 0)
    const second = shelfSlotPos(w, shelf, 1)
    expect(first[2]).toBeGreaterThan(second[2])
  })

  test('rotates machine input and output zones together', () => {
    const machine = buildStation(
      { type: 'machine', id: 'rotated', model: 'canner', pos: { x: 0, z: 0 }, turn: 2, recipe: { in: { tomato: 1 }, out: 'tomatoCan', n: 1, time: 1 }, inputCap: 2, outputCap: 2 },
      0,
    ) as Machine
    expect(machine.inZone.x).toBeCloseTo(0.95 * S)
    expect(machine.outZone.x).toBeCloseTo(-0.95 * S)
    expect(machine.pad.z).toBeCloseTo(-0.55 * S)
  })
})

describe('hens need food', () => {
  test('no eggs without tomatoes; each egg eats one tomato', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    w.spawnTimer = 999
    applyUnlock(w, 'planter2')
    applyUnlock(w, 'eggs')
    const nest = station<Producer>(w, 'nest1')
    nest.stock = 0
    for (let t = 0; t < 20; t += 0.1) tick(w, idle, 0.1)
    expect(nest.stock).toBe(0)

    // player drops 3 tomatoes in the nest
    setStack(w.player, 'tomato', 3)
    standAt(w, nest.zone, 0.5)
    expect(nest.feed!.stock + nest.stock).toBe(3)
    w.player.pos = { x: 0, z: 0 }
    for (let t = 0; t < 20; t += 0.1) tick(w, idle, 0.1)
    expect(nest.stock).toBe(3)
    expect(nest.feed!.stock).toBe(0)
  })

  test('second hen: buying hen2 spawns a nest next to nest1 and it lays the same way', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'hen2'] })
    const nest1 = station<Producer>(w, 'nest1')
    const nest2 = station<Producer>(w, 'nest2')
    // side by side: nest pads are 3.6 wide, these two share an edge
    expect(Math.abs(nest2.pos.x - nest1.pos.x)).toBeLessThanOrEqual(3.6)
    // a fresh hen starts empty but lays as soon as it is fed
    expect(nest2.stock).toBe(0)
    nest2.feed!.stock = 4
    for (let t = 0; t < 4; t += 0.1) tick(w, idle, 0.1)
    expect(nest2.stock).toBeGreaterThan(0)
  })
})

describe('milk production', () => {
  const milkUnlocks = ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow']

  test('a cow needs wheat and consumes one unit for each milk', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: milkUnlocks })
    w.spawnTimer = 999
    for (const worker of w.workers) worker.paused = true
    const cow = station<Producer>(w, 'cow1')
    for (let t = 0; t < 10; t += 0.1) tick(w, idle, 0.1)
    expect(cow.stock).toBe(0)

    cow.feed!.stock = 3
    for (let t = 0; t < 13; t += 0.1) tick(w, idle, 0.1)
    expect(cow.stock).toBe(3)
    expect(cow.feed!.stock).toBe(0)
  })

  test('milk can be collected and placed into the fridge', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: [...milkUnlocks] })
    w.spawnTimer = 999
    const cow = station<Producer>(w, 'cow1')
    const fridge = station<Shelf>(w, 'shelfMilk')
    cow.stock = 2
    standAt(w, cow.zone, 0.4)
    expect(w.player.stack.map((item) => item.kind)).toEqual(['milk', 'milk'])
    standAt(w, fridge.zone, 0.4)
    expect(fridge.stock).toBe(2)
    expect(w.player.stack).toHaveLength(0)
  })

  test('customers buy milk at its configured price', () => {
    const w = createWorld(LEVEL1, { seed: 3, unlocked: [...milkUnlocks, 'cashier'] })
    w.spawnTimer = 999
    const fridge = station<Shelf>(w, 'shelfMilk')
    fridge.stock = 3
    const customer = spawnCustomer(w, 'shelfMilk')!
    customer.shopping[0].requested = 1
    for (let t = 0; t < 40 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers).toHaveLength(0)
    expect(w.earned).toBe(PRICE.milk)
  })

  test('the fridge exposes twelve unique visual slots', () => {
    const slots = fridgeSlots(12)
    expect(slots).toHaveLength(12)
    expect(new Set(slots.map((slot) => slot.join())).size).toBe(12)
  })
})

describe('dairy premium', () => {
  test('cheesePress turns 1 milk into 1 cheese after its cook time', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const m = station<Machine>(w, 'cheesePress')
    m.input.milk = 4
    runMachines(w, 0.01)
    expect(m.running).toBe(true)
    expect(m.input.milk).toBe(3)
    for (let t = 0; t < m.recipe.time + 0.1; t += 0.1) runMachines(w, 0.1)
    expect(m.output).toBeGreaterThanOrEqual(1)
  })

  test('mixer needs every ingredient: flour, milk and egg', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const mixer = station<Machine>(w, 'mixer')
    mixer.input.flour = 1
    mixer.input.milk = 1
    runMachines(w, 0.01)
    expect(mixer.running).toBe(false)
    mixer.input.egg = 1
    runMachines(w, 0.01)
    expect(mixer.running).toBe(true)
  })

  test('customers buy cheese at its configured price', () => {
    const w = createWorld(LEVEL1, { seed: 3, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'cheesePress', 'cashier'] })
    w.spawnTimer = 999
    const shelf = station<Shelf>(w, 'shelfCheese')
    shelf.stock = 2
    const customer = spawnCustomer(w, 'shelfCheese')!
    customer.shopping[0].requested = 2
    for (let t = 0; t < 40 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers).toHaveLength(0)
    expect(w.earned).toBe(2 * PRICE.cheese)
  })
})

describe('farm pack', () => {
  test('crop producers share the standard pad size', () => {
    const w = createWorld(LEVEL1, { unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'strawberry', 'beehive', 'appleTree'] })
    const sizes = ['planter1', 'patch1', 'tree1'].map((id) => {
      const pad = station<Producer>(w, id).pad
      return { w: Math.round(pad.w * 10), d: Math.round(pad.d * 10) }
    })
    expect(sizes[0]).toEqual({ w: Math.round(PADS.crop.w * S * 10), d: Math.round(PADS.crop.d * S * 10) })
    expect(sizes[1]).toEqual(sizes[0])
    expect(sizes[2]).toEqual(sizes[0])
  })

  test('the beehive makes honey on its own, no feed needed', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'strawberry', 'beehive'] })
    w.spawnTimer = 999
    for (const worker of w.workers) worker.paused = true
    const hive = station<Producer>(w, 'hive1')
    expect(hive.feed).toBeNull()
    expect(hive.stock).toBe(0)
    for (let t = 0; t < hive.baseRegrow + 0.5; t += 0.1) tick(w, idle, 0.1)
    expect(hive.stock).toBeGreaterThan(0)
  })

  test('jamPot needs strawberry and honey together', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const pot = station<Machine>(w, 'jamPot')
    pot.input.strawberry = 2
    runMachines(w, 0.01)
    expect(pot.running).toBe(false)
    pot.input.honey = 1
    runMachines(w, 0.01)
    expect(pot.running).toBe(true)
    for (let t = 0; t < pot.recipe.time + 0.1; t += 0.1) runMachines(w, 0.1)
    expect(pot.output).toBeGreaterThanOrEqual(1)
  })

  test('customers buy jam at its configured price', () => {
    const w = createWorld(LEVEL1, { seed: 3, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'strawberry', 'beehive', 'jamPot', 'cashier'] })
    w.spawnTimer = 999
    const shelf = station<Shelf>(w, 'shelfJam')
    shelf.stock = 2
    const customer = spawnCustomer(w, 'shelfJam')!
    customer.shopping[0].requested = 2
    for (let t = 0; t < 40 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers).toHaveLength(0)
    expect(w.earned).toBe(2 * PRICE.jam)
  })
})

describe('cafeteria annex', () => {
  const annexUnlocks = ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'cheesePress', 'areaA2', 'mixer', 'pizzaOven', 'cashier']

  test('pizzaOven needs flour, tomato and cheese together', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    const oven = station<Machine>(w, 'pizzaOven')
    oven.input.flour = 2
    oven.input.tomato = 1
    runMachines(w, 0.01)
    expect(oven.running).toBe(false)
    oven.input.cheese = 1
    runMachines(w, 0.01)
    expect(oven.running).toBe(true)
    for (let t = 0; t < oven.recipe.time + 0.1; t += 0.1) runMachines(w, 0.1)
    expect(oven.output).toBeGreaterThanOrEqual(1)
  })

  test('cakes and pizzas sell inside the annex at their configured price', () => {
    const w = createWorld(LEVEL1, { seed: 3, unlocked: annexUnlocks })
    w.spawnTimer = 999
    const cakeShelf = station<Shelf>(w, 'shelfCake')
    const pizzaShelf = station<Shelf>(w, 'shelfPizza')
    // both shelves live inside the annex floor
    const annex = LEVEL1.areas.find((a) => a.id === 'A2')!.rect
    for (const shelf of [cakeShelf, pizzaShelf]) {
      expect(Math.abs(shelf.pos.x - annex.x)).toBeLessThanOrEqual(annex.w / 2)
      expect(Math.abs(shelf.pos.z - annex.z)).toBeLessThanOrEqual(annex.d / 2)
    }
    cakeShelf.stock = 1
    pizzaShelf.stock = 1
    const cakeCustomer = spawnCustomer(w, 'shelfCake')!
    cakeCustomer.shopping[0].requested = 1
    const pizzaCustomer = spawnCustomer(w, 'shelfPizza')!
    pizzaCustomer.shopping[0].requested = 1
    for (let t = 0; t < 60 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers).toHaveLength(0)
    expect(w.earned).toBe(PRICE.cake + PRICE.pizza)
  })

  test('the annex chain hides mixer and pizzaOven until the annex is bought', () => {
    const w = createWorld(LEVEL1, { unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'cheesePress'] })
    expect(w.visibleZones).not.toContain('mixer')
    expect(w.visibleZones).not.toContain('pizzaOven')
    applyUnlock(w, 'areaA2')
    expect(w.visibleZones).toContain('mixer')
    expect(w.visibleZones).toContain('pizzaOven')
    expect(w.areas.has('A2')).toBe(true)
  })
})

describe('editor tiers', () => {
  test('starting reveals are wave 1 and their reveals are wave 2', () => {
    const tiers = unlockTiers(LEVEL1)
    for (const id of LEVEL1.startReveals) expect(tiers[id]).toBe(1)
    expect(tiers.eggs).toBe(2)
    // farmer is revealed by canner, so it sits exactly one wave deeper
    expect(tiers.farmer).toBe(tiers.canner + 1)
  })

  test('annex machines land one wave after the annex, and every zone gets a tier', () => {
    const tiers = unlockTiers(LEVEL1)
    expect(tiers.mixer).toBe(tiers.areaA2 + 1)
    expect(tiers.pizzaOven).toBe(tiers.areaA2 + 1)
    expect(tiers.wheatPlants).toBeGreaterThan(0)
    for (const unlock of LEVEL1.unlocks) expect(tiers[unlock.id]).toBeGreaterThan(0)
  })
})

describe('standard sizes', () => {
  test('every station family builds with its standard pad', () => {
    const w = createWorld(LEVEL1, { unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'cheesePress', 'strawberry', 'beehive', 'appleTree'] })
    const padOf = (id: string) => {
      const { w: pw, d } = station<Producer>(w, id).pad
      return `${Math.round(pw * 10)}x${Math.round(d * 10)}`
    }
    expect(padOf('planter1')).toBe(`${Math.round(PADS.crop.w * S * 10)}x${Math.round(PADS.crop.d * S * 10)}`)
    expect(padOf('patch1')).toBe(padOf('planter1'))
    expect(padOf('tree1')).toBe(padOf('planter1'))
    expect(padOf('nest1')).toBe(`${Math.round(PADS.coop.w * S * 10)}x${Math.round(PADS.coop.d * S * 10)}`)
    expect(padOf('cow1')).toBe(`${Math.round(PADS.barn.w * S * 10)}x${Math.round(PADS.barn.d * S * 10)}`)
    expect(padOf('plot1')).toBe(padOf('cow1'))
    const shelfPad = station<Shelf>(w, 'shelfTomato').pad
    const cratePad = station<Shelf>(w, 'shelfHoney').pad
    const fridgePad = station<Shelf>(w, 'shelfMilk').pad
    for (const pad of [cratePad, fridgePad]) {
      expect(Math.round(pad.w * 10)).toBe(Math.round(PADS.shelf.w * S * 10))
      expect(Math.round(pad.d * 10)).toBe(Math.round(PADS.shelf.d * S * 10))
    }
    expect(station<Machine>(w, 'canner').pad.w).toBeCloseTo(PADS.machine.w * S)
    expect(station<Checkout>(w, 'checkout1').pad.w).toBeCloseTo(PADS.checkout.w * S)
  })

  test('product spacing only uses the three standard tiers', () => {
    const tiers = Object.values(SLOT_SIZE)
    for (const kind of Object.keys(SPACING) as SlotKind[]) expect(tiers).toContain(SPACING[kind])
  })
})

describe('editor areas', () => {
  test('area edits persist through the layout roundtrip', () => {
    useEditor.getState().reset()
    useEditor.getState().move({ type: 'area', id: 'A1' }, { x: 21.3, z: -0.3 }, true)
    useEditor.getState().resizeArea('A1', 'w', 0.5)
    const saved = layoutOf(useEditor.getState().level)
    const restored = applyLayout(LEVEL1, JSON.parse(JSON.stringify(saved)) as LayoutFile)
    const area = restored.areas.find((candidate) => candidate.id === 'A1')!
    expect(area.rect.x).toBe(21.5)
    expect(area.rect.z).toBe(-0.5)
    expect(area.rect.w).toBe(12.5)
    expect(area.rect.d).toBe(11.5)
  })

  test('trash bins move and persist through the layout roundtrip', () => {
    useEditor.getState().reset()
    useEditor.getState().move({ type: 'trash', id: 'bin2' }, { x: 5.4, z: 3.7 }, true)
    const saved = layoutOf(useEditor.getState().level)
    const restored = applyLayout(LEVEL1, JSON.parse(JSON.stringify(saved)) as LayoutFile)
    const bin = restored.trash.find((candidate) => candidate.id === 'bin2')!
    expect(bin.pos.x).toBe(5.5)
    expect(bin.pos.z).toBe(3.5)
    // the throwing zone follows the bin
    expect(trashZone(bin).x).toBe(5.5)
    expect(trashZone(bin).z).toBeCloseTo(3.5 + 0.45 * S)
  })

  test('every purchasable area has an unlock and vice versa', () => {
    for (const unlock of LEVEL1.unlocks) {
      if (!unlock.area) continue
      expect(LEVEL1.areas.some((area) => area.id === unlock.area)).toBe(true)
    }
    for (const area of LEVEL1.areas) {
      if (LEVEL1.startAreas.includes(area.id)) continue
      expect(LEVEL1.unlocks.filter((unlock) => unlock.area === area.id)).toHaveLength(1)
    }
  })

  test('resizing never shrinks an area below one tile', () => {
    useEditor.getState().reset()
    for (let i = 0; i < 40; i += 1) useEditor.getState().resizeArea('A3', 'd', -0.5)
    expect(useEditor.getState().level.areas.find((candidate) => candidate.id === 'A3')!.rect.d).toBe(1)
  })
})

describe('editor relations', () => {
  test('a machine reports its providers and its purchase zone', () => {
    const { providers, zones, isStart } = stationRelations(LEVEL1, 'mill')
    expect(isStart).toBe(false)
    expect(zones.map((zone) => zone.id)).toEqual(['wheat'])
    expect(providers).toEqual([{ id: 'plot1', kind: 'wheat' }])
  })

  test('a pizza oven collects every ingredient source across the store', () => {
    const ids = stationRelations(LEVEL1, 'pizzaOven').providers.map((provider) => provider.id)
    expect(ids).toEqual(expect.arrayContaining(['mill', 'planter1', 'planter2', 'cheesePress']))
  })

  test('starting stations have no zone and producers consume nothing', () => {
    const shelf = stationRelations(LEVEL1, 'shelfTomato')
    expect(shelf.isStart).toBe(true)
    expect(shelf.zones).toHaveLength(0)
    expect(shelf.providers.map((provider) => provider.id)).toEqual(['planter1', 'planter2'])
    expect(stationRelations(LEVEL1, 'planter1').providers).toHaveLength(0)
  })
})

describe('save snapshots', () => {
  const unlocks = ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver']

  test('restores the live situation and therefore the same guide arrow', () => {
    const w = createWorld(LEVEL1, { seed: 3, money: 47, unlocked: unlocks })
    w.spawnTimer = 8.5
    w.player.pos = { x: -4.2, z: -2.1 }
    w.player.facing = 0.7
    setStack(w.player, 'tomato', 2)

    const planter = station<Producer>(w, 'planter1')
    planter.stock = 1
    planter.timer = 1.25
    const shelf = station<Shelf>(w, 'shelfTomato')
    shelf.stock = 4
    const canner = station<Machine>(w, 'canner')
    canner.input.tomato = 2
    canner.output = 1
    canner.running = true
    canner.progress = 0.45

    const customer = spawnCustomer(w, 'shelfTomato')!
    customer.state = 'inQueue'
    customer.path = []
    customer.checkoutId = 'checkout1'
    const checkout = station<Checkout>(w, 'checkout1')
    checkout.queue = [customer.id]
    checkout.payTimer = 0.6

    const worker = w.workers.find((candidate) => candidate.id === 'farmer')!
    worker.pos = { x: -7, z: 5 }
    worker.path = [{ x: -8, z: 6 }]
    worker.route = { kind: 'tomato', from: 'planter1', fromSlot: 'stock', to: 'nest1', toSlot: 'feed' }
    worker.state = 'toSource'
    const zone = w.visibleZones[0]
    w.zonePaid[zone] = 17

    const guideBefore = objective(w)
    const saved = JSON.parse(JSON.stringify(snapshotWorld(w)))
    const restored = createWorld(LEVEL1, { seed: 3, money: w.money, unlocked: unlocks })
    expect(restoreWorld(restored, saved)).toBe(true)

    expect(restored.player).toEqual(w.player)
    expect(station<Producer>(restored, 'planter1').stock).toBe(1)
    expect(station<Producer>(restored, 'planter1').timer).toBe(1.25)
    expect(station<Shelf>(restored, 'shelfTomato').stock).toBe(4)
    expect(station<Machine>(restored, 'canner').progress).toBe(0.45)
    expect(station<Checkout>(restored, 'checkout1').queue).toEqual([customer.id])
    expect(restored.customers).toEqual(w.customers)
    expect(restored.workers.find((candidate) => candidate.id === 'farmer')?.route).toEqual(worker.route)
    expect(restored.zonePaid[zone]).toBe(17)
    expect(objective(restored)).toEqual(guideBefore)
  })

  test('continues item ids after restore and safely ignores old saves without a runtime snapshot', () => {
    const w = createWorld(LEVEL1, { seed: 4 })
    setStack(w.player, 'tomato', 2)
    const saved = snapshotWorld(w)
    const maxSavedId = Math.max(...w.player.stack.map((item) => item.id))
    const restored = createWorld(LEVEL1, { seed: 4 })
    expect(restoreWorld(restored, saved)).toBe(true)
    expect(pushItem(restored.player, 'egg').id).toBeGreaterThan(maxSavedId)

    const legacy = createWorld(LEVEL1, { seed: 5 })
    const before = objective(legacy)
    expect(restoreWorld(legacy, { money: 10, unlocked: [] })).toBe(false)
    expect(objective(legacy)).toEqual(before)
  })
})

describe('workers', () => {
  test('farmer carries tomatoes from the planter to the hungry hen', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer'] })
    w.spawnTimer = 999
    const nest = station<Producer>(w, 'nest1')
    w.player.pos = { x: 0, z: 0 }
    for (let t = 0; t < 30 && nest.feed!.stock < 3; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(nest.feed!.stock).toBeGreaterThanOrEqual(3)
  })

  test('farmer feeds wheat to the cow', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow'] })
    w.spawnTimer = 999
    for (const nest of w.stations.filter((s): s is Producer => s.type === 'producer' && s.model === 'nest')) nest.feed!.stock = nest.feed!.cap
    const cow = station<Producer>(w, 'cow1')
    for (let t = 0; t < 40 && cow.feed!.stock === 0; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(cow.feed!.stock).toBeGreaterThan(0)
  })

  test('shelver carries milk from the cow to a waiting customer', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver', 'wheat', 'cow'] })
    w.spawnTimer = 999
    w.workers.find((worker) => worker.id === 'farmer')!.paused = true
    const cow = station<Producer>(w, 'cow1')
    cow.stock = 4
    const customer = spawnCustomer(w, 'shelfMilk')!
    customer.shopping[0].requested = 2
    for (let t = 0; t < 60 && customer.shopping[0].collected < 2; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(customer.shopping[0].collected).toBe(2)
    expect(cow.stock).toBe(2)
  })

  test('shelver restocks the tomato shelf up to what the customer wants', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver'] })
    w.spawnTimer = 999
    w.workers.find((x) => x.id === 'farmer')!.paused = true
    const c = spawnCustomer(w, 'shelfTomato')!
    c.shopping[0].requested = 3
    w.player.pos = { x: 0, z: 0 }
    for (let t = 0; t < 40 && c.shopping[0].collected < 3; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(c.shopping[0].collected).toBe(3)
  })

  test('shelver serves the exact demand first, then covers the shelf with what is left', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver'] })
    w.spawnTimer = 999
    for (const id of ['farmer']) w.workers.find((x) => x.id === id)!.paused = true
    const canner = station<Machine>(w, 'canner')
    canner.output = 5
    const shelf = station<Shelf>(w, 'shelfCan')
    const c = spawnCustomer(w, 'shelfCan')!
    c.shopping[0].requested = 2
    w.player.pos = { x: 0, z: 0 }
    // first trip: exactly the customer's demand, not one more
    for (let t = 0; t < 60 && c.shopping[0].collected < 2; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(c.shopping[0].collected).toBe(2)
    expect(canner.output).toBe(3)
    // nobody else wants cans: coverage kicks in and the shelf fills up to the produced stock
    for (let t = 0; t < 60 && shelf.stock < 3; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(shelf.stock).toBe(3)
    expect(canner.output).toBe(0)
  })

  test('an empty shelf jumps the queue: it gets covered before a partly filled one', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver', 'wheat', 'cow'] })
    w.spawnTimer = 999
    w.workers.find((x) => x.id === 'farmer')!.paused = true
    const shelfCan = station<Shelf>(w, 'shelfCan')
    const shelfEgg = station<Shelf>(w, 'shelfEgg')
    station<Machine>(w, 'canner').output = 3
    station<Producer>(w, 'nest1').stock = 3
    shelfCan.stock = 1
    let eggsFirst = false
    for (let t = 0; t < 45 && !eggsFirst; t += 1 / 30) {
      tick(w, idle, 1 / 30)
      if (shelfEgg.stock > 0) eggsFirst = shelfCan.stock === 1
    }
    expect(eggsFirst).toBe(true)
  })

  test('paused workers stay still', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer'], paused: ['farmer'] })
    const f = w.workers[0]
    const before = { ...f.pos }
    for (let t = 0; t < 5; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(f.pos).toEqual(before)
  })

  test('a worker stuck with a stack for 4s walks to a bin and dumps it', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver'] })
    w.spawnTimer = 999
    w.workers.find((x) => x.id === 'farmer')!.paused = true
    // the egg shelf is full: the shelver has nowhere to place its eggs
    const shelf = station<Shelf>(w, 'shelfEgg')
    shelf.stock = shelf.cap
    const wk = w.workers.find((x) => x.id === 'shelver')!
    wk.carry = 'egg'
    wk.count = 2
    const trashed = () => w.events.some((event) => event.type === 'trash')
    for (let t = 0; t < 15 && !trashed(); t += 1 / 30) tick(w, idle, 1 / 30)
    expect(trashed()).toBe(true)
    expect(wk.count).toBe(0)
    expect(wk.carry).toBe(null)
    expect(wk.state).toBe('idle')
  })

  test('a worker camps at a dry source and loads once items appear', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'shelver', 'wheat', 'cow', 'checkout2', 'bakery', 'chef'] })
    w.spawnTimer = 999
    for (const id of ['farmer', 'shelver']) w.workers.find((x) => x.id === id)!.paused = true
    const chef = w.workers.find((x) => x.id === 'chef')!
    const canner = station<Machine>(w, 'canner')
    const planter1 = station<Producer>(w, 'planter1')
    const planter2 = station<Producer>(w, 'planter2')
    // only the canner has room: fill every other machine input to the brim
    // (and their outputs, or they keep processing and open input room again)
    const mill = station<Machine>(w, 'mill')
    const oven = station<Machine>(w, 'oven')
    mill.input.wheat = mill.inputCap
    mill.output = mill.outputCap
    oven.input.flour = oven.inputCap
    oven.input.egg = oven.inputCap
    oven.output = oven.outputCap
    // freeze regrowth so the sources stay truly dry while the chef walks over
    planter1.stock = 0
    planter2.stock = 0
    planter1.regrow = 9999
    planter2.regrow = 9999
    let camped = false
    for (let t = 0; t < 20 && !camped; t += 1 / 30) {
      tick(w, idle, 1 / 30)
      if (chef.state === 'waiting') camped = dist(chef.pos, planter1.pos) < 3
    }
    expect(camped).toBe(true)
    // items show up: the chef loads them and feeds the canner without leaving the spot
    planter1.stock = 2
    let fed = false
    for (let t = 0; t < 20 && !fed; t += 1 / 30) {
      tick(w, idle, 1 / 30)
      if ((canner.input.tomato ?? 0) > 0) fed = true
    }
    expect(fed).toBe(true)
  })

  test('two chefs claim different kitchen tasks', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    w.spawnTimer = 999
    for (const worker of w.workers) if (worker.role !== 'chef') worker.paused = true
    for (let t = 0; t < 1; t += 1 / 30) tick(w, idle, 1 / 30)
    const chefs = w.workers.filter((worker) => worker.role === 'chef')
    expect(chefs).toHaveLength(3)
    expect(chefs.every((worker) => worker.route !== null)).toBe(true)
    expect(new Set(chefs.map((worker) => `${worker.route!.kind}:${worker.route!.to}:${worker.route!.toSlot}`)).size).toBe(3)
  })

  test('two shelvers claim different delivery tasks', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    unlockAll(w)
    w.spawnTimer = 999
    for (const worker of w.workers) if (worker.role !== 'shelver') worker.paused = true
    for (let t = 0; t < 1; t += 1 / 30) tick(w, idle, 1 / 30)
    const shelvers = w.workers.filter((worker) => worker.role === 'shelver')
    expect(shelvers).toHaveLength(3)
    expect(shelvers.every((worker) => worker.route !== null)).toBe(true)
    expect(new Set(shelvers.map((worker) => `${worker.route!.kind}:${worker.route!.to}:${worker.route!.toSlot}`)).size).toBe(3)
  })
})

describe('upgrades', () => {
  test('buying player stack raises capacity and costs money', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 100 })
    expect(w.player.cap).toBe(4)
    expect(buyUpgrade(w, 'player.stack')).toBe(true)
    expect(w.player.cap).toBe(6)
    expect(w.money).toBe(60)
  })

  test('machine speed upgrade shortens the recipe; max level stops buying', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 100000 })
    unlockAll(w)
    const m = station<Machine>(w, 'canner')
    const t0 = m.recipe.time
    expect(buyUpgrade(w, 'm:canner.speed')).toBe(true)
    expect(m.recipe.time).toBeLessThan(t0)
    for (let i = 0; i < 3; i++) buyUpgrade(w, 'm:canner.speed')
    expect(buyUpgrade(w, 'm:canner.speed')).toBe(false)
  })

  test('not enough money: nothing happens', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 5 })
    expect(buyUpgrade(w, 'player.stack')).toBe(false)
    expect(w.money).toBe(5)
  })

  test('cow upgrades do not change chicken production', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 1000, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow'] })
    const cow = station<Producer>(w, 'cow1')
    const hen = station<Producer>(w, 'nest1')
    const cowTime = cow.regrow
    const henTime = hen.regrow
    expect(buyUpgrade(w, 'a:cow.speed')).toBe(true)
    expect(cow.regrow).toBeLessThan(cowTime)
    expect(hen.regrow).toBe(henTime)
  })
})

describe('cashier hire spot', () => {
  test('staff hires happen at the office: standing on the farmer zone hires the farmer', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 200, unlocked: ['planter2', 'eggs', 'canner'] })
    w.spawnTimer = 999
    expect(w.areas.has('A3')).toBe(true) // the office is built from the start
    const spot = LEVEL1.unlocks.find((u) => u.id === 'farmer')!.zone
    standAt(w, spot, 6)
    expect(w.unlocked).toContain('farmer')
    expect(w.workers.some((worker) => worker.id === 'farmer')).toBe(true)
    expect(w.money).toBe(110)
  })

  test('all staff hire zones line up inside the office floor', () => {
    const inOffice = (id: string) => {
      const z = LEVEL1.unlocks.find((u) => u.id === id)!.zone
      return z.x >= -15.7 && z.x <= -10.3 && z.z >= -6.7 && z.z <= 0.2
    }
    for (const id of ['farmer', 'shelver', 'chef', 'farmer2', 'shelver2', 'chef2', 'farmer3', 'shelver3', 'chef3']) expect(inOffice(id)).toBe(true)
  })

  test('simultaneous hire boxes stay apart and each third hire replaces its second hire pad', () => {
    const spots = ['farmer', 'shelver', 'chef', 'farmer2', 'shelver2', 'chef2'].map((id) => LEVEL1.unlocks.find((u) => u.id === id)!.zone)
    for (let i = 0; i < spots.length; i++)
      for (let j = i + 1; j < spots.length; j++) expect(Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z)).toBeGreaterThanOrEqual(1.79)
    for (const role of ['farmer', 'shelver', 'chef']) {
      const second = LEVEL1.unlocks.find((unlock) => unlock.id === `${role}2`)!.zone
      const third = LEVEL1.unlocks.find((unlock) => unlock.id === `${role}3`)!.zone
      expect(third).toEqual(second)
    }
  })

  test('hiring a second worker reveals the third at double the regular price', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 1500, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'areaA2'] })
    expect(w.visibleZones).not.toContain('farmer3')
    expect(w.visibleZones).not.toContain('shelver3')
    expect(w.visibleZones).not.toContain('chef3')
    applyUnlock(w, 'farmer2', false)
    applyUnlock(w, 'shelver2', false)
    applyUnlock(w, 'chef2', false)
    expect(w.visibleZones).toEqual(expect.arrayContaining(['farmer3', 'shelver3', 'chef3']))
    expect(LEVEL1.unlocks.find((u) => u.id === 'farmer3')!.price).toBe(2 * LEVEL1.unlocks.find((u) => u.id === 'farmer')!.price)
    expect(LEVEL1.unlocks.find((u) => u.id === 'shelver3')!.price).toBe(2 * LEVEL1.unlocks.find((u) => u.id === 'shelver')!.price)
    expect(LEVEL1.unlocks.find((u) => u.id === 'chef3')!.price).toBe(2 * LEVEL1.unlocks.find((u) => u.id === 'chef')!.price)
  })

  test('paying at the reused second-hire pads hires the third farmer, shelver and chef', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 2500, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'cheesePress', 'areaA2', 'farmer2', 'shelver2', 'chef2'] })
    w.spawnTimer = 999
    const spot = (id: string) => LEVEL1.unlocks.find((u) => u.id === id)!.zone
    standAt(w, spot('farmer3'), 8)
    standAt(w, spot('shelver3'), 12)
    standAt(w, spot('chef3'), 22)
    expect(w.workers.find((x) => x.id === 'farmer3')!.role).toBe('farmer')
    expect(w.workers.find((x) => x.id === 'shelver3')!.role).toBe('shelver')
    expect(w.workers.find((x) => x.id === 'chef3')!.role).toBe('chef')
    expect(w.visibleZones).not.toContain('chef3')
  })

  test('the office is enclosed with walls and its door opens to the farm', () => {
    const w = createWorld(LEVEL1, { seed: 1 })
    const walls = colliders(w)
    expect(walls.some((r) => r.x === -16 && Math.abs(r.z + 3.25) < 0.01 && r.w === 0.5)).toBe(true) // west wall
    expect(walls.some((r) => r.x === -10 && Math.abs(r.z + 3.25) < 0.01 && r.w === 0.5)).toBe(true) // east wall, solid
    expect(walls.some((r) => Math.abs(r.x + 15) < 0.01 && r.z === 0.5)).toBe(true) // south wall, west segment
    expect(walls.some((r) => Math.abs(r.x + 11) < 0.01 && r.z === 0.5)).toBe(true) // south wall, east segment
    // the doorway itself (south side, facing the farm) stays free
    expect(walls.some((r) => Math.abs(r.z - 0.5) < 0.26 && Math.abs(r.x + 13) < 0.9)).toBe(false)
    // and there is a real path from the farm to a hire spot through it
    const path = w.grid.findPath({ x: -8.5, z: 5 }, { x: -11.6, z: -2.8 })
    expect(path.length).toBeGreaterThan(1)
    // the path is string-pulled: check where the leg that crosses the south wall (z = 0.5) passes
    const [a, b] = path.slice(1).map((p, i) => [path[i], p]).find(([a, b]) => (a.z - 0.5) * (b.z - 0.5) <= 0)!
    const xAtWall = a.x + ((b.x - a.x) * (0.5 - a.z)) / (b.z - a.z || 1)
    expect(Math.abs(xAtWall + 13)).toBeLessThanOrEqual(0.8)
  })

  test('opening the cafeteria annex reveals the second staff hires', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 1500, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1'] })
    expect(w.visibleZones).not.toContain('farmer2')
    applyUnlock(w, 'areaA2', false)
    expect(w.visibleZones).toEqual(expect.arrayContaining(['mixer', 'pizzaOven', 'farmer2', 'shelver2', 'chef2']))
  })

  test('paying at the new office boxes hires a second farmer, shelver and chef', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 1500, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1', 'wheat', 'cow', 'cheesePress', 'areaA2'] })
    w.spawnTimer = 999
    const spot = (id: string) => LEVEL1.unlocks.find((u) => u.id === id)!.zone
    standAt(w, spot('farmer2'), 8)
    standAt(w, spot('shelver2'), 12)
    standAt(w, spot('chef2'), 22)
    expect(w.workers.find((x) => x.id === 'farmer2')!.role).toBe('farmer')
    expect(w.workers.find((x) => x.id === 'shelver2')!.role).toBe('shelver')
    expect(w.workers.find((x) => x.id === 'chef2')!.role).toBe('chef')
    expect(w.visibleZones).not.toContain('chef2')
  })

  test('is available at the checkout from the start; standing on it hires the cashier', () => {
    const w = createWorld(LEVEL1, { seed: 1, money: 200 })
    w.spawnTimer = 999
    expect(w.visibleZones).toContain('cashier')
    const spot = LEVEL1.unlocks.find((u) => u.id === 'cashier')!.zone
    standAt(w, spot, 6)
    const checkout = station<Checkout>(w, 'checkout1')
    expect(checkout.cashier).toBe(true)
    expect(w.money).toBe(50)
    expect(w.visibleZones).not.toContain('cashier')
  })

  test('cashier serves customers without the player', () => {
    const w = createWorld(LEVEL1, { seed: 3, unlocked: ['cashier'] })
    w.spawnTimer = 999
    station<Shelf>(w, 'shelfTomato').stock = 10
    spawnCustomer(w, 'shelfTomato')
    w.player.pos = { x: -3, z: 8 } // far from the checkout
    for (let t = 0; t < 40 && w.customers.length; t += 1 / 30) tick(w, idle, 1 / 30)
    expect(w.customers.length).toBe(0)
    expect(station<Checkout>(w, 'checkout1').cash).toBeGreaterThan(0)
  })
})

describe('checkout pickup', () => {
  const pickupDeltas = (w: World, frames: number) => {
    const deltas: number[] = []
    let last = w.money
    for (let t = 0; t < frames / 120; t += 1 / 120) {
      tick(w, idle, 1 / 120)
      if (w.money > last) {
        deltas.push(w.money - last)
        last = w.money
      }
    }
    return deltas
  }

  test('the streak pays 5, 5, 10, 15, 25, 40... as it accelerates', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['cashier'] })
    w.spawnTimer = 999
    const checkout = station<Checkout>(w, 'checkout1')
    checkout.cash = 400
    w.player.pos = { ...checkout.zone }
    const deltas = pickupDeltas(w, 120)
    expect(deltas.slice(0, 6)).toEqual([5, 5, 10, 15, 25, 40])
    expect(deltas.length).toBeGreaterThan(6)
  })

  test('leaving the counter restarts the curve at 5', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['cashier'] })
    w.spawnTimer = 999
    const checkout = station<Checkout>(w, 'checkout1')
    checkout.cash = 99999
    w.player.pos = { ...checkout.zone }
    pickupDeltas(w, 60)
    expect(w.player.moneyStreak).toBeGreaterThan(3)
    w.player.pos = { x: -3, z: 8 } // walk away
    tick(w, idle, 1 / 30)
    expect(w.player.moneyStreak).toBe(0)
    w.player.pos = { ...checkout.zone }
    expect(pickupDeltas(w, 4)).toEqual([5])
  })

  test('never collects more than the cash on the counter', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['cashier'] })
    w.spawnTimer = 999
    const checkout = station<Checkout>(w, 'checkout1')
    checkout.cash = 7
    w.player.pos = { ...checkout.zone }
    pickupDeltas(w, 60)
    expect(w.money).toBe(7)
    expect(checkout.cash).toBe(0)
  })
})

describe('mixed stack', () => {
  test('carries tomatoes and eggs together; each place takes only its kind', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs'] })
    w.spawnTimer = 999
    const nest = station<Producer>(w, 'nest1')
    const planter = station<Producer>(w, 'planter1')
    const tomatoShelf = station<Shelf>(w, 'shelfTomato')
    nest.stock = 2
    nest.feed!.stock = 0

    standAt(w, nest.zone, 0.5) // 2 eggs
    standAt(w, planter.zone, 0.5) // + 2 tomatoes (cap 4)
    expect(w.player.stack.map((i) => i.kind)).toEqual(['egg', 'egg', 'tomato', 'tomato'])

    standAt(w, tomatoShelf.zone, 1)
    expect(tomatoShelf.stock).toBe(2)
    expect(w.player.stack.map((i) => i.kind)).toEqual(['egg', 'egg'])
  })

  test('items leave from the middle and the rest keep their order', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs'] })
    w.spawnTimer = 999
    const nest = station<Producer>(w, 'nest1')
    nest.stock = 0
    setStack(w.player, 'egg', 1)
    const p = w.player
    // egg, tomato, egg -> hen eats the tomato in the middle
    p.stack.push({ id: 900, kind: 'tomato' }, { id: 901, kind: 'egg' })
    standAt(w, nest.zone, 0.3)
    expect(nest.feed!.stock).toBe(1)
    expect(p.stack.map((i) => i.kind)).toEqual(['egg', 'egg'])
    expect(p.stack[1].id).toBe(901)
  })
})

describe('expand or hire', () => {
  test('after the farmer, "expand store" and "hire shelver" are offered together, in any order', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer'] })
    expect(w.visibleZones).toEqual(expect.arrayContaining(['areaA1', 'shelver']))
    // hiring first keeps the expansion available
    applyUnlock(w, 'shelver', false)
    expect(w.visibleZones).toContain('areaA1')
    expect(w.workers.some((x) => x.role === 'shelver')).toBe(true)
    applyUnlock(w, 'areaA1', false)
    expect(w.visibleZones).toContain('wheat')
  })
})

describe('layout sanity', () => {
  type Box = { x: number; z: number; w: number; d: number }
  const overlap = (a: Box, b: Box) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.01 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.01
  const inside = (p: Vec2, r: Box) => Math.abs(p.x - r.x) <= r.w / 2 && Math.abs(p.z - r.z) <= r.d / 2
  const defs = [...LEVEL1.start.map((def) => ({ def, unlock: null as string | null })), ...LEVEL1.unlocks.flatMap((u) => u.spawns.map((def) => ({ def, unlock: u.id as string | null })))]

  // unlock ids that must be bought before (or together with) each unlock
  const parents = new Map<string, string>()
  for (const u of LEVEL1.unlocks) for (const r of u.reveals) parents.set(r, u.id)
  const ancestors = (id: string | null) => {
    const out = new Set<string>()
    for (let cur = id; cur; cur = parents.get(cur) ?? null) out.add(cur)
    return out
  }
  const openAreas = (bought: Set<string>) => new Set([...LEVEL1.startAreas, ...LEVEL1.unlocks.filter((u) => u.area && bought.has(u.id)).map((u) => u.area!)])

  test('no two station pads overlap', () => {
    const pads = defs.map(({ def }) => ({ id: def.id, pad: buildStation(def, 0).pad as Box }))
    for (let i = 0; i < pads.length; i++)
      for (let j = i + 1; j < pads.length; j++) expect(`${pads[i].id}/${pads[j].id}:${overlap(pads[i].pad, pads[j].pad)}`).toBe(`${pads[i].id}/${pads[j].id}:false`)
  })

  test('trash zones never overlap a station pad and stay inside the map', () => {
    for (const bin of LEVEL1.trash) {
      const zone = trashZone(bin)
      expect(inside(bin.pos, LEVEL1.bounds)).toBe(true)
      for (const { def } of defs) expect(`${bin.id}/${def.id}:${overlap(zone, buildStation(def, 0).pad as Box)}`).toBe(`${bin.id}/${def.id}:false`)
    }
  })

  test('stations and buy zones never land in an area that is still locked', () => {
    for (const { def, unlock } of defs) {
      const open = openAreas(ancestors(unlock))
      for (const area of LEVEL1.areas) if (inside(def.pos, area.rect)) expect(`${def.id} in ${area.id}:${open.has(area.id)}`).toBe(`${def.id} in ${area.id}:true`)
    }
    for (const u of LEVEL1.unlocks) {
      // the zone is visible once the parent is bought, before this unlock itself
      const open = openAreas(ancestors(parents.get(u.id) ?? null))
      for (const area of LEVEL1.areas) if (inside(u.zone, area.rect)) expect(`${u.id} zone in ${area.id}:${open.has(area.id)}`).toBe(`${u.id} zone in ${area.id}:true`)
    }
  })

  test('everything fits inside the level bounds', () => {
    for (const { def } of defs) expect(`${def.id}:${inside(def.pos, LEVEL1.bounds)}`).toBe(`${def.id}:true`)
    for (const u of LEVEL1.unlocks) expect(`${u.id}:${inside(u.zone, LEVEL1.bounds)}`).toBe(`${u.id}:true`)
  })
})

describe('customer doors', () => {
  const doorGapFree = (w: World, x: number) => !colliders(w).some((r) => Math.abs(r.z - LEVEL1.wallZ) < 0.01 && Math.abs(r.x - x) < r.w / 2)

  test('the second door only opens once the store is expanded', () => {
    const locked = createWorld(LEVEL1, { seed: 1 })
    expect(doorGapFree(locked, -8.5)).toBe(true)
    expect(activeDoors(locked).map((d) => d.id)).toEqual(['door1'])
    const open = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1'] })
    expect(activeDoors(open).map((d) => d.id)).toEqual(['door1', 'door2'])
    expect(doorGapFree(open, 5)).toBe(true)
    // the rest of A1's back wall stays solid
    expect(doorGapFree(open, 10)).toBe(false)
  })

  test('customers appear on the street outside an open door', () => {
    const w = createWorld(LEVEL1, { seed: 1, unlocked: ['planter2', 'eggs', 'canner', 'farmer', 'areaA1'] })
    w.spawnTimer = 999
    for (let i = 0; i < 8; i++) {
      const c = spawnCustomer(w, 'shelfTomato')!
      expect(c.pos.z).toBe(LEVEL1.wallZ - 1.5)
      expect([-8.5, 5]).toContain(c.pos.x)
    }
  })

  test('old saves with the removed milkFridge unlock still load', () => {
    const ids = migrateUnlocks(['planter2', 'eggs', 'cow', 'milkFridge'], LEVEL1)!
    expect(ids).toEqual(['planter2', 'eggs', 'cow'])
    expect(() => createWorld(LEVEL1, { seed: 1, unlocked: ids })).not.toThrow()
  })
})

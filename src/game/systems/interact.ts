import { BUY_INTERVAL, BUY_STEPS, MONEY_FIB_CAP, MONEY_INTERVAL, MONEY_INTERVAL_DECAY, MONEY_MIN_INTERVAL, TRANSFER_INTERVAL } from '../config'
import { PADS } from '../sizes'
import type { ItemKind, Vec2, Vec3 } from '../types'
import { pushItem, removeItem, stackHas, stackKinds, stackRoom } from '../stack'
import { activeTrash, applyUnlock, groundY, inRect, shelfSlotPos, stationPoint, trashZone, unlockDef, type World } from '../world'
import { CHARACTER_SCALE } from '../sizes'

const at = (p: Vec2, y = 1): Vec3 => [p.x, y, p.z]

/** Fibonacci F1=1, F2=1, F3=2... for the checkout pickup streak. */
function fib(n: number): number {
  let a = 1
  let b = 1
  for (let i = 1; i < n; i += 1) [a, b] = [b, a + b]
  return a
}

/** Height of stack slot `i` above the ground under the player (flight start points). */
function slotY(w: World, i: number) {
  return groundY(w, w.player.pos.x, w.player.pos.z) + (0.85 + i * 0.26) * CHARACTER_SCALE
}

function give(w: World, kind: ItemKind, from: Vec3) {
  pushItem(w.player, kind)
  w.events.push({ type: 'fly', kind, from, to: { type: 'player' } })
}

/** Removes the topmost item of `kind` from the stack (top item when omitted) and throws it to `to`. */
function take(w: World, to: Vec3, kind?: ItemKind): ItemKind {
  const p = w.player
  const k = kind ?? p.stack[p.stack.length - 1].kind
  const i = removeItem(p, k)
  w.events.push({ type: 'fly', kind: k, from: [p.pos.x, slotY(w, i), p.pos.z], to: { type: 'point', p: to } })
  return k
}

/**
 * One item transfer when the player stands on a zone. Returns true if something moved.
 * The stack can mix kinds: each place only takes the kinds it accepts, from wherever they are in the stack.
 */
function transferOnce(w: World): boolean {
  const p = w.player
  for (const s of w.stations) {
    if (s.type === 'producer' && inRect(p.pos, s.zone)) {
      // feed the animal first when carrying its food
      if (s.feed && stackHas(p, s.feed.kind) && s.feed.stock < s.feed.cap) {
        take(w, at(s.pos, 0.4), s.feed.kind)
        s.feed.stock++
        return true
      }
      if (s.stock > 0 && stackRoom(p) > 0) {
        s.stock--
        give(w, s.kind, at(s.pos, 0.8))
        return true
      }
    } else if (s.type === 'shelf' && inRect(p.pos, s.zone)) {
      if (stackHas(p, s.kind) && s.stock < s.cap) {
        // aim at the exact free slot so the shelf fills up visibly, item by item
        take(w, shelfSlotPos(w, s, s.stock), s.kind)
        s.stock++
        return true
      }
    } else if (s.type === 'machine') {
      if (inRect(p.pos, s.inZone)) {
        const k = stackKinds(p).find((k) => s.recipe.in[k] !== undefined && (s.input[k] ?? 0) < s.inputCap)
        if (k) {
          const target = stationPoint(s, -0.95, 0)
          take(w, [target.x, 0.9, target.z], k)
          s.input[k] = (s.input[k] ?? 0) + 1
          return true
        }
      } else if (inRect(p.pos, s.outZone) && s.output > 0 && stackRoom(p) > 0) {
        s.output--
        const target = stationPoint(s, 0.95, 0)
        give(w, s.recipe.out, [target.x, 0.9, target.z])
        return true
      }
    }
  }
  if (p.stack.length) {
    const bin = activeTrash(w).find((t) => inRect(p.pos, trashZone(t)))
    if (bin) {
      take(w, [bin.pos.x, 0.9, bin.pos.z])
      w.events.push({ type: 'trash', pos: bin.pos })
      return true
    }
  }
  return false
}

export function interact(w: World, dt: number) {
  const p = w.player
  p.transferTimer -= dt
  p.moneyTimer -= dt
  p.payTimer -= dt

  if (p.transferTimer <= 0 && transferOnce(w)) p.transferTimer = TRANSFER_INTERVAL

  // pick up cash from the counter while standing at the checkout, accelerating Fibonacci-style
  let atCheckout = false
  for (const s of w.stations) {
    if (s.type !== 'checkout' || !inRect(p.pos, s.zone)) continue
    atCheckout = true
    while (p.moneyTimer <= 0 && s.cash > 0) {
      const amount = Math.min(5 * fib(Math.min(p.moneyStreak, MONEY_FIB_CAP) + 1), s.cash)
      s.cash -= amount
      w.money += amount
      const money = stationPoint(s, 0.9, 0)
      w.events.push({ type: 'fly', kind: 'money', from: [money.x, 1, money.z], to: { type: 'player' } })
      p.moneyTimer += Math.max(MONEY_MIN_INTERVAL, MONEY_INTERVAL * Math.pow(MONEY_INTERVAL_DECAY, p.moneyStreak))
      p.moneyStreak += 1
    }
  }
  // leaving the counter restarts the curve
  if (!atCheckout) p.moneyStreak = 0

  // pay into buy zones
  for (const id of w.visibleZones) {
    const def = unlockDef(w, id)
    if (!inRect(p.pos, { x: def.zone.x, z: def.zone.z, w: PADS.buy.w, d: PADS.buy.d })) continue
    if (p.moving) continue // must stand still, like the original
    while (p.payTimer <= 0 && w.money > 0 && w.zonePaid[id] < def.price) {
      const step = Math.min(Math.ceil(def.price / BUY_STEPS), def.price - w.zonePaid[id], w.money)
      w.money -= step
      w.zonePaid[id] += step
      w.events.push({ type: 'fly', kind: 'money', from: [p.pos.x, 1.2 * CHARACTER_SCALE, p.pos.z], to: { type: 'point', p: [def.zone.x, 0.1, def.zone.z] } })
      w.events.push({ type: 'pay', progress: w.zonePaid[id] / def.price, pos: def.zone })
      p.payTimer += BUY_INTERVAL
    }
    if (w.zonePaid[id] >= def.price) {
      applyUnlock(w, id)
      break
    }
  }
  if (p.payTimer < 0) p.payTimer = 0
  if (p.moneyTimer < 0) p.moneyTimer = 0
}

import { NAME } from '../config'
import { stackHas, stackKinds, stackRoom } from '../stack'
import type { Checkout, ItemKind, Machine, Objective, Producer, Shelf } from '../types'
import { activeTrash, approach, inRect, trashZone, unlockDef, type World } from '../world'
import { hasIngredients } from './production'

/** Tutorial hint: what the player should do next, and where the arrow points. */
export function objective(w: World): Objective {
  const p = w.player
  const checkouts = w.stations.filter((s): s is Checkout => s.type === 'checkout')

  if (w.completed) return { text: '¡Nivel completado!', target: null }

  // walk to the front edge of the pad (its center is often inside the furniture)
  const at = (r: { x: number; z: number; w: number; d: number }) => approach(r)
  const animal = (s: Producer) => (s.model === 'cow' ? 'la vaca' : 'la gallina')

  // customers waiting to pay come first (sticky: stays until the queue is empty)
  const unattended = checkouts.filter((checkout) => !checkout.cashier && checkout.queue.length > 0).sort((a, b) => b.queue.length - a.queue.length)[0]
  if (unattended) return { text: 'Atiende la caja', target: unattended.spot }

  const visible = w.visibleZones.map((id) => unlockDef(w, id))
  const canAfford = (u: (typeof visible)[number]) => w.money + (w.zonePaid[u.id] ?? 0) >= u.price

  // a purchase the player is committed to beats the checkout run — money is
  // safe on the counter, but the walk to the zone is wasted if we yank away.
  // Stays only while the wallet can still close the deal.
  const sticky = w.stickyBuy ? visible.find((u) => u.id === w.stickyBuy) : undefined
  if (sticky && canAfford(sticky)) return { text: `Desbloquea: ${sticky.label}`, target: w.grid.freePointNear(sticky.zone) }
  w.stickyBuy = null

  // with a cashier the money still piles up on the counter: collect it once there's a good amount
  const money = checkouts.filter((checkout) => checkout.cash > 0 && (!checkout.cashier || checkout.cash >= 30)).sort((a, b) => b.cash - a.cash)[0]
  if (money) return { text: 'Recoge el dinero', target: money.spot }

  // buy zone the player can afford: progression beats routine factory work.
  // The final branch waits: buying it completes the level, so every other
  // progression unlock goes first.
  const finalId = w.level.finalUnlock
  const progression = visible.filter((u) => !u.units && u.id !== finalId)
  const affordable = progression.find(canAfford) ?? visible.find((u) => !u.units && canAfford(u)) ?? visible.find(canAfford)
  if (affordable) {
    w.stickyBuy = affordable.id
    return { text: `Desbloquea: ${affordable.label}`, target: w.grid.freePointNear(affordable.zone) }
  }

  // stay on the current zone while items can still move (don't leave a job half done)
  const room = stackRoom(p) > 0
  const inBin = activeTrash(w).map(trashZone).find((z) => inRect(p.pos, z))
  if (inBin && p.stack.length) return { text: 'Tira lo que llevas', target: at(inBin) }
  for (const s of w.stations) {
    if (s.type === 'producer' && s.feed && inRect(p.pos, s.zone) && stackHas(p, s.feed.kind) && s.feed.stock < s.feed.cap)
      return { text: `Alimenta a ${animal(s)}`, target: at(s.zone) }
    if (s.type === 'producer' && inRect(p.pos, s.zone) && s.stock > 0 && room) return { text: `Cosecha ${NAME[s.kind]}`, target: at(s.zone) }
    if (s.type === 'shelf' && inRect(p.pos, s.zone) && stackHas(p, s.kind) && s.stock < s.cap) return { text: `Pon ${NAME[s.kind]} en el estante`, target: at(s.zone) }
    if (s.type === 'machine') {
      const k = stackKinds(p).find((k) => s.recipe.in[k] !== undefined && (s.input[k] ?? 0) < s.inputCap)
      if (inRect(p.pos, s.inZone) && k) return { text: `Lleva ${NAME[k]} a la máquina`, target: at(s.inZone) }
      if (inRect(p.pos, s.outZone) && s.output > 0 && room) return { text: `Recoge ${NAME[s.recipe.out]}`, target: at(s.outZone) }
    }
  }

  // carrying something: take each kind where it belongs (topmost kind first)
  const destination = (k: ItemKind): Objective | null => {
    const fedProducer = w.stations.find((s): s is Producer => s.type === 'producer' && s.feed?.kind === k)
    const shelf = w.stations.find((s): s is Shelf => s.type === 'shelf' && s.kind === k && s.stock < s.cap)
    const machine = w.stations.find((s): s is Machine => s.type === 'machine' && s.recipe.in[k] !== undefined && (s.input[k] ?? 0) < s.inputCap)
    const feedAnimal = { text: fedProducer ? `Alimenta a ${animal(fedProducer)} con ${NAME[k]}` : `Lleva ${NAME[k]} al comedero`, target: fedProducer ? at(fedProducer.zone) : null }
    if (fedProducer && fedProducer.feed!.stock < 2) return feedAnimal
    if (machine && (!shelf || (machine.input[k] ?? 0) < 2)) return { text: `Lleva ${NAME[k]} a la máquina`, target: at(machine.inZone) }
    if (shelf) return { text: `Pon ${NAME[k]} en el estante`, target: at(shelf.zone) }
    if (fedProducer && fedProducer.feed!.stock < fedProducer.feed!.cap) return feedAnimal
    if (machine) return { text: `Lleva ${NAME[k]} a la máquina`, target: at(machine.inZone) }
    return null
  }
  if (p.stack.length) {
    for (const k of stackKinds(p)) {
      const d = destination(k)
      if (d) return d
    }
    // nowhere to put anything: throw it away so the hands are free again
    const bin = activeTrash(w).map(trashZone).sort((a, b) => Math.hypot(a.x - p.pos.x, a.z - p.pos.z) - Math.hypot(b.x - p.pos.x, b.z - p.pos.z))[0]
    return { text: 'Estante lleno: tira el resto al tacho', target: at(bin) }
  }

  // machine output ready
  for (const s of w.stations)
    if (s.type === 'machine' && s.output > 0 && room) return { text: `Recoge ${NAME[s.recipe.out]}`, target: at(s.outZone) }

  // empty shelf: harvest what it needs
  const empty = w.stations.find((s): s is Shelf => s.type === 'shelf' && s.stock < 3)
  if (empty && !p.stack.length) {
    const src = w.stations.find((s) => (s.type === 'producer' && s.kind === empty.kind) || (s.type === 'machine' && s.recipe.out === empty.kind))
    if (src?.type === 'producer' && src.feed && src.stock === 0) {
      // The animal is hungry: bring its food first.
      const food = w.stations.find((s): s is Producer => s.type === 'producer' && s.kind === src.feed!.kind && s.stock > 0)
      if (src.feed.stock === 0 && food) return { text: `Cosecha ${NAME[food.kind]} para ${animal(src)}`, target: at(food.zone) }
    } else if (src?.type === 'producer') return { text: `Cosecha ${NAME[src.kind]}`, target: at(src.zone) }
    if (src?.type === 'machine') {
      const missing = Object.keys(src.recipe.in).find((k) => (src.input[k as keyof typeof src.input] ?? 0) < (src.recipe.in[k as keyof typeof src.recipe.in] ?? 0))
      const prod = missing && w.stations.find((s) => s.type === 'producer' && s.kind === missing)
      if (!hasIngredients(src) && prod && prod.type === 'producer') return { text: `Cosecha ${NAME[prod.kind]}`, target: at(prod.zone) }
    }
  }

  const next = w.visibleZones[0]
  if (next) return { text: `Junta $${unlockDef(w, next).price} para: ${unlockDef(w, next).label}`, target: null }
  return { text: 'Abre la nueva sucursal para completar el nivel', target: null }
}

import type { ItemKind, ProductKind } from './types'

// All balance numbers in one place.

export const PLAYER_SPEED = 5.2
export const PLAYER_RADIUS = 0.35
export const PLAYER_CAP = 4

export const WORKER_SPEED = 2.4
export const WORKER_CAP = 3
/** Capacity ladder: every capacity upgrade walks these steps, 8 is the absolute max. */
export const CAP_TIERS = [4, 6, 8]
/** An empty shelf counts this much more in a worker's route scoring: cover it before anything else. */
export const EMPTY_SHELF_PRIORITY = 2
/** Seconds between items for workers loading / unloading. */
export const WORKER_TRANSFER = 0.18
/** Seconds a worker stays stuck with a full stack before dumping it in the trash. */
export const WORKER_STUCK_TIME = 4

export const CUSTOMER_SPEED = 2.6
/** Seconds between two items moving in a transfer (harvest, restock...). */
export const TRANSFER_INTERVAL = 0.12
export const MONEY_INTERVAL = 0.05
/** Checkout pickup accelerates Fibonacci-style: streak n pays 5*fib(n) every MONEY_INTERVAL*DECAY^n. */
export const MONEY_FIB_CAP = 9
export const MONEY_INTERVAL_DECAY = 0.9
export const MONEY_MIN_INTERVAL = 0.01
/** Seconds between payment steps when draining money into a buy zone. */
export const BUY_INTERVAL = 0.12
/** Buy zones are paid in up to this many steps (smaller prices take fewer, cheaper steps). */
export const BUY_STEPS = 40
export const PAY_TIME = 0.7
export const CUSTOMER_TAKE_TIME = 0.35
/** Seconds a customer waits at an empty shelf before paying what they have (or leaving). */
export const PATIENCE = 18
export const SPAWN_MIN = 4
export const SPAWN_MAX = 7
export const LATE_SPAWN_MIN = 2.5
export const LATE_SPAWN_MAX = 4.5
export const CUSTOMER_MAX_ITEMS = 8
export const CUSTOMER_MAX_KINDS = 3
export const PAY_PER_ITEM = 0.12

/** Dev multiplier: x10 so progression can be seen fast. Set to 1 for real balance. */
export const PRICE_MULT = 10

export const PRICE: Record<ItemKind, number> = Object.fromEntries(
  Object.entries({
    tomato: 2,
    egg: 3,
    wheat: 0,
    tomatoCan: 6,
    flour: 0,
    bread: 12,
    milk: 8,
    cheese: 14,
    cake: 20,
    strawberry: 3,
    honey: 5,
    apple: 4,
    jam: 16,
    pizza: 24,
  }).map(([kind, value]) => [kind, value * PRICE_MULT]),
) as Record<ItemKind, number>

export const ICON: Record<ItemKind, ProductKind> = {
  tomato: 'tomato',
  egg: 'egg',
  wheat: 'wheat',
  tomatoCan: 'tomatoCan',
  flour: 'flour',
  bread: 'bread',
  milk: 'milk',
  cheese: 'cheese',
  cake: 'cake',
  strawberry: 'strawberry',
  honey: 'honey',
  apple: 'apple',
  jam: 'jam',
  pizza: 'pizza',
}

export const NAME: Record<ItemKind, string> = {
  tomato: 'tomates',
  egg: 'huevos',
  wheat: 'trigo',
  tomatoCan: 'latas de tomate',
  flour: 'harina',
  bread: 'pan',
  milk: 'leche',
  cheese: 'queso',
  cake: 'pastel',
  strawberry: 'fresas',
  honey: 'miel',
  apple: 'manzanas',
  jam: 'mermelada',
  pizza: 'pizzas',
}

export const ROLE_NAME: Record<'shelver' | 'chef' | 'farmer', string> = {
  shelver: 'Reponedor',
  chef: 'Chef',
  farmer: 'Granjero',
}

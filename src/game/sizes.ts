/**
 * Standard footprints — the single source of truth for station sizes.
 * The game (world.ts, interact.ts) and the editor read from here, so a new
 * station picks a standard instead of inventing new numbers.
 */
export const PADS = {
  /** Crop producers: planter, strawberryPatch, appleTree. */
  crop: { w: 3.4, d: 3.0 },
  /** Small coops: nest, beehive. */
  coop: { w: 3.6, d: 2.6 },
  /** Big animals and fields: cow, plot. */
  barn: { w: 4.3, d: 3.4 },
  /** Every shelf variant (stepped shelf, crate, fridge). */
  shelf: { w: 2.9, d: 2.4 },
  /** Machines (full pad; input/output halves derive from it). */
  machine: { w: 3.8, d: 2.5 },
  /** Checkout counter. */
  checkout: { w: 3.0, d: 2.1 },
  /** Trash bin throw-away zone. */
  bin: { w: 1.7, d: 2.0 },
  /** Buy zone where the player pays for an unlock. */
  buy: { w: 1.8, d: 1.8 },
} as const

/** Solid rectangles, mostly fractions of the pads they belong to. */
export const COLLIDERS = {
  crop: { w: 2.6, d: 0.7 },
  cow: { w: 3.4, d: 1.8 },
  shelfLow: 0.9,
  shelfTall: 1.2,
  machine: { w: 2.9, d: 0.95 },
  checkout: { w: 2.7, d: 0.9 },
  bin: { w: 0.8, d: 0.7 },
} as const

/** Slot spacing tiers for products on shelves. */
export const SLOT_SIZE = { S: 0.26, M: 0.32, L: 0.42 } as const
export type SlotTier = keyof typeof SLOT_SIZE

import { SLOT_SIZE, type SlotTier } from './sizes'
import type { ShelfModel, Vec3 } from './types'

// Where each item sits on a shelf or crate, shared by the logic (flying items aim at
// the exact slot) and the models (items fill the slots in the same order).

export type SlotKind = 'tomato' | 'egg' | 'bread' | 'wheat' | 'can' | 'milk' | 'money' | 'tomatoCan' | 'flour' | 'cheese' | 'cake' | 'strawberry' | 'honey' | 'apple' | 'jam' | 'pizza' | 'juice' | 'butter' | 'iceCream' | 'ketchup' | 'pancakes'

/** Every product picks one of the three standard spacing tiers instead of a magic number. */
const SLOT_TIER: Record<SlotKind, SlotTier> = {
  tomato: 'M',
  egg: 'S',
  bread: 'L',
  wheat: 'M',
  can: 'S',
  milk: 'S',
  money: 'L',
  tomatoCan: 'S',
  flour: 'M',
  cheese: 'M',
  cake: 'L',
  strawberry: 'M',
  honey: 'M',
  apple: 'M',
  jam: 'M',
  pizza: 'L',
  juice: 'S',
  butter: 'M',
  iceCream: 'S',
  ketchup: 'S',
  pancakes: 'L',
}

/** Footprint of one item, used as spacing in crates and legacy shelves. */
export const SPACING: Record<SlotKind, number> = Object.fromEntries(
  (Object.keys(SLOT_TIER) as SlotKind[]).map((kind) => [kind, SLOT_SIZE[SLOT_TIER[kind]]]),
) as Record<SlotKind, number>

export const SHELF_WIDTH = 1.9
/** Stepped shelf: each tier is higher and further back, so the camera sees every item. */
export const SHELF_STEP_Y = 0.36

export function shelfGeometry(tiers: number) {
  const rows = tiers <= 2 ? 2 : 1
  const stepZ = tiers > 1 ? Math.min(0.5, 1.0 / (tiers - 1)) : 0
  const tierDepth = rows === 2 ? 0.6 : 0.4
  /** z center of each tier's plank; the front edge of the bottom tier is at +0.35 */
  const tierZ = (t: number) => 0.35 - tierDepth / 2 - t * stepZ
  return { rows, stepZ, tierDepth, tierZ }
}

/**
 * Shelf slots, in fill order: bottom (front) tier first, front row before back row, left to right.
 * `cap` slots are spread evenly so a full shelf looks full.
 */
export function shelfSlots(cap: number, tiers: number, width = SHELF_WIDTH): Vec3[] {
  const { rows, tierZ } = shelfGeometry(tiers)
  const perRow = Math.max(1, Math.ceil(cap / (tiers * rows)))
  const gap = (width - 0.3) / perRow
  const out: Vec3[] = []
  for (let t = 0; t < tiers; t++) {
    const zc = tierZ(t)
    const rowZ = rows === 2 ? [zc + 0.13, zc - 0.13] : [zc]
    for (const z of rowZ)
      for (let i = 0; i < perRow && out.length < cap; i++) out.push([(i - (perRow - 1) / 2) * gap, 0.1 + t * SHELF_STEP_Y, z])
  }
  return out
}

/** Crate slots: grid on top, filled front row first. */
export function crateSlots(cap: number, kind: SlotKind, cols = 4): Vec3[] {
  const rows = Math.ceil(cap / cols)
  const s = SPACING[kind]
  const out: Vec3[] = []
  for (let r = rows - 1; r >= 0; r--)
    for (let c = 0; c < cols && out.length < cap; c++) out.push([(c - (cols - 1) / 2) * s, kind === 'egg' ? 0.3 : 0.46, (r - (rows - 1) / 2) * s])
  return out
}

/** Four cartons per row behind the fridge doors, filled bottom-up. */
export function fridgeSlots(cap: number): Vec3[] {
  const xs = [-0.52, -0.28, 0.28, 0.52]
  return Array.from({ length: Math.min(cap, 12) }, (_, i) => [xs[i % 4], 0.25 + Math.floor(i / 4) * 0.6, 0.43])
}

export function slotsFor(model: ShelfModel, kind: SlotKind, cap: number, tiers: number): Vec3[] {
  if (model === 'crate') return crateSlots(cap, kind)
  if (model === 'fridge') return fridgeSlots(cap)
  return shelfSlots(cap, tiers)
}

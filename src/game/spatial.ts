import type { QuarterTurn, Rect, Vec2 } from './types'

export const LAYOUT_CELL = 0.5

export function snap(value: number) {
  return Math.round(value / LAYOUT_CELL) * LAYOUT_CELL
}

export function rotateOffset(offset: Vec2, turn: QuarterTurn): Vec2 {
  switch (turn) {
    case 1:
      return { x: offset.z, z: -offset.x }
    case 2:
      return { x: -offset.x, z: -offset.z }
    case 3:
      return { x: -offset.z, z: offset.x }
    default:
      return { ...offset }
  }
}

export function localPoint(origin: Vec2, offset: Vec2, turn: QuarterTurn): Vec2 {
  const p = rotateOffset(offset, turn)
  return { x: origin.x + p.x, z: origin.z + p.z }
}

/** Converts a station-local rectangle into a world-space AABB. */
export function localRect(origin: Vec2, rect: Rect, turn: QuarterTurn): Rect {
  const p = localPoint(origin, rect, turn)
  return { x: p.x, z: p.z, w: turn % 2 ? rect.d : rect.w, d: turn % 2 ? rect.w : rect.d }
}

export function turnRadians(turn: QuarterTurn) {
  return turn * (Math.PI / 2)
}

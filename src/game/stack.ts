import type { ItemKind, Player, StackItem } from './types'

// The player's stack can mix item kinds (eggs on top of tomatoes...).
// Items are kept bottom -> top; each has a stable id so the view can animate
// items sliding down when one from the middle is removed.

let nextId = 1

export const stackSize = (p: Player) => p.stack.length
export const stackRoom = (p: Player) => p.cap - p.stack.length
export const stackHas = (p: Player, kind: ItemKind) => p.stack.some((i) => i.kind === kind)
export const stackCount = (p: Player, kind: ItemKind) => p.stack.filter((i) => i.kind === kind).length

/** Distinct kinds in the stack, topmost first (the order the player "sees" them). */
export function stackKinds(p: Player): ItemKind[] {
  const out: ItemKind[] = []
  for (let i = p.stack.length - 1; i >= 0; i--) if (!out.includes(p.stack[i].kind)) out.push(p.stack[i].kind)
  return out
}

export function pushItem(p: Player, kind: ItemKind): StackItem {
  const item = { id: nextId++, kind }
  p.stack.push(item)
  return item
}

/** Removes the topmost item of `kind` (or the top item when kind is omitted). Returns its index, or -1. */
export function removeItem(p: Player, kind?: ItemKind): number {
  let i = p.stack.length - 1
  if (kind) while (i >= 0 && p.stack[i].kind !== kind) i--
  if (i < 0) return -1
  p.stack.splice(i, 1)
  return i
}

/** Test helper: replaces the stack with `n` items of `kind`. */
export function setStack(p: Player, kind: ItemKind | null, n = 0) {
  p.stack = []
  if (kind) for (let i = 0; i < n; i++) pushItem(p, kind)
}

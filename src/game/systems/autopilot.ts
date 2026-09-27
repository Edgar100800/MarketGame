import type { Input } from '../types'
import { dist, inRect, unlockDef, type World } from '../world'
import { PADS } from '../sizes'
import { CAMERA_YAW } from './movement'
import { objective } from './objective'

/**
 * Demo / test bot (`?autoplay=1`): walks along a grid path to the tutorial objective
 * and stands still on it. Writes screen-space input exactly like the joystick.
 */
export function autopilot(w: World, input: Input) {
  input.x = 0
  input.y = 0
  // inside a buy zone we can afford: hold still so the payment goes through
  const paying = w.visibleZones.some((id) => {
    const def = unlockDef(w, id)
    return w.money + (w.zonePaid[id] ?? 0) >= def.price && inRect(w.player.pos, { x: def.zone.x, z: def.zone.z, w: PADS.buy.w, d: PADS.buy.d })
  })
  if (paying) return
  const target = objective(w).target
  // stop radius a bit over half a buy zone: targets flush against walls jitter
  // between two grid paths and would otherwise never settle on 0.25
  if (!target || dist(w.player.pos, target) < 0.45) return
  const path = w.grid.findPath(w.player.pos, target)
  const next = path[0] ?? target
  const dx = next.x - w.player.pos.x
  const dz = next.z - w.player.pos.z
  const len = Math.hypot(dx, dz) || 1
  // invert the camera rotation used in movePlayer
  const s = Math.sin(CAMERA_YAW)
  const c = Math.cos(CAMERA_YAW)
  const scale = Math.min(1, len / 0.4) / len
  input.x = (dx * c - dz * s) * scale
  input.y = (-dx * s - dz * c) * scale
}

import { PLAYER_RADIUS, PLAYER_SPEED } from '../config'
import type { Input, Rect } from '../types'
import { colliders, type World } from '../world'

/** Camera yaw used to turn screen-space input into world directions. */
export const CAMERA_YAW = (18 * Math.PI) / 180

function pushOut(p: { x: number; z: number }, r: Rect, rad: number) {
  const hx = r.w / 2 + rad
  const hz = r.d / 2 + rad
  const dx = p.x - r.x
  const dz = p.z - r.z
  if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) return
  const ox = hx - Math.abs(dx)
  const oz = hz - Math.abs(dz)
  if (ox < oz) p.x += Math.sign(dx || 1) * ox
  else p.z += Math.sign(dz || 1) * oz
}

export function movePlayer(w: World, input: Input, dt: number) {
  const p = w.player
  let ix = input.x
  let iy = input.y
  const len = Math.hypot(ix, iy)
  if (len > 1) {
    ix /= len
    iy /= len
  }
  p.moving = len > 0.1
  if (!p.moving) return
  // screen up = away from camera, screen right = camera right
  const s = Math.sin(CAMERA_YAW)
  const c = Math.cos(CAMERA_YAW)
  const vx = ix * c - iy * s
  const vz = -ix * s - iy * c
  p.pos.x += vx * PLAYER_SPEED * dt
  p.pos.z += vz * PLAYER_SPEED * dt
  p.facing = Math.atan2(vx, vz)
  for (const r of colliders(w)) pushOut(p.pos, r, PLAYER_RADIUS)
  const b = w.level.bounds
  p.pos.x = Math.min(b.x + b.w / 2 - 0.5, Math.max(b.x - b.w / 2 + 0.5, p.pos.x))
  p.pos.z = Math.min(b.z + b.d / 2 - 0.5, Math.max(b.z - b.d / 2 + 0.5, p.pos.z))
}

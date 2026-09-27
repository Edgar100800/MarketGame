import type { Input } from './types'
import type { World } from './world'
import { movePlayer } from './systems/movement'
import { interact } from './systems/interact'
import { growProducers, runMachines } from './systems/production'
import { updateCustomers } from './systems/customers'
import { updateWorkers } from './systems/workers'

/** Advances the whole simulation by dt seconds. Pure: only mutates the world. */
export function tick(w: World, input: Input, dt: number) {
  w.time += dt
  movePlayer(w, input, dt)
  interact(w, dt)
  growProducers(w, dt)
  runMachines(w, dt)
  updateWorkers(w, dt)
  updateCustomers(w, dt)
  // the level ends the moment the final unlock (the next branch, outside the door) is bought
  if (!w.completed && w.level.finalUnlock !== undefined && w.unlocked.includes(w.level.finalUnlock)) {
    w.completed = true
    w.version++
  }
}

import { LEVEL1 } from '../src/game/level1'
import { createWorld, unlockDef } from '../src/game/world'
import { tick } from '../src/game/loop'
import { autopilot } from '../src/game/systems/autopilot'
import { objective } from '../src/game/systems/objective'

const w = createWorld(LEVEL1, { seed: 11 })
const input = { x: 0, y: 0 }
let frame = 0
for (let t = 0; t < 620 && !w.completed; t += 1 / 30) {
  autopilot(w, input)
  tick(w, input, 1 / 30)
  frame++
  if (frame % 30 === 0 && t > 600) {
    const o = objective(w)
    const def = unlockDef(w, 'farmer3')
    console.log(
      `t=${t.toFixed(0)} "${o.text}" target=${o.target ? `${o.target.x.toFixed(2)},${o.target.z.toFixed(2)}` : '-'} pos=${w.player.pos.x.toFixed(2)},${w.player.pos.z.toFixed(2)} $${w.money.toFixed(0)} farmer3.price=${def.price} paid=${w.zonePaid['farmer3'] ?? 0}`,
    )
  }
}

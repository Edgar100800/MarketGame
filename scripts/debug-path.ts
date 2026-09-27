import { LEVEL1 } from '../src/game/level1'
import { createWorld } from '../src/game/world'

const w = createWorld(LEVEL1, { seed: 11 })
const g = w.grid
console.log('reverse:', g.findPath({ x: -5, z: 7.2 }, { x: -5, z: 10.4 }).map((p) => `${p.x},${p.z}`).join(' -> ') || '(empty)')
console.log('cells around target (x -7..-3.5, z 8.5..6):')
for (let z = 8.5; z >= 6; z -= 0.5) {
  let row = `z=${z.toFixed(1)} `
  for (let x = -7; x <= -3.5; x += 0.5) {
    const c = Math.floor((x + 16) / 0.5)
    const r = Math.floor((z + 8) / 0.5)
    row += g.isFree(c, r) ? '.' : '#'
  }
  console.log(row)
}
console.log('cell of (-5,7.2):', Math.floor((-5 + 16) / 0.5), Math.floor((7.2 + 8) / 0.5))
console.log('isFree(22,30):', g.isFree(22, 30), '| isFree(21,30):', g.isFree(21, 30), '| isFree(23,30):', g.isFree(23, 30))

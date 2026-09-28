import type { DecoDef } from '../game/types'
import { turnRadians } from '../game/spatial'
import { floorY } from './StationView'
import { BakeryCase, Chair, CoffeeCorner, Desk, FlowerStand, FloorMat } from '../models/Store'
import { Bench, FlowerPatch, Rock, StreetLamp, Tree } from '../models/Deco'
import { Pill } from '../models/Labels'
import { Rigid } from '../models/Rigid'

const MODELS = {
  tree: Tree,
  flowerPatch: FlowerPatch,
  rock: Rock,
  streetLamp: StreetLamp,
  bench: Bench,
  bakeryCase: BakeryCase,
  flowerStand: FlowerStand,
  coffeeCorner: CoffeeCorner,
  desk: Desk,
  chair: Chair,
  mat: FloorMat,
}

/** Renders a deco def at its level position, standing on the floor or the grass. */
export function DecoView({ def }: { def: DecoDef }) {
  const Model = MODELS[def.model]
  return (
    <group position={[def.pos.x, floorY(def.pos.x, def.pos.z), def.pos.z]} rotation={[0, turnRadians(def.turn ?? 0), 0]}>
      <Rigid>
        <Model />
      </Rigid>
      {def.label && <Pill text={def.label} position={[0, 2.1, 0]} />}
    </group>
  )
}

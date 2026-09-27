import { useState } from 'react'
import { C, WORKER_COLOR } from '../materials/palette'
import { AppleTree, Beehive, CowPen, CropPlot, Nest, Planter, StrawberryPatch } from '../models/Farm'
import { Checkout as CheckoutModel, Crate, Fridge, Shelf as ShelfModel } from '../models/Store'
import { MachineStation } from '../models/Machines'
import { Character } from '../models/Character'
import { Pill } from '../models/Labels'
import { ICON } from '../game/config'
import { useGame, world } from '../game/state'
import { groundY } from '../game/world'
import type { Checkout, ItemKind, Machine, Producer, QuarterTurn, Shelf, Station } from '../game/types'
import { PopIn } from './PopIn'
import { ZonePad } from './ZonePad'
import { SHELF_WIDTH } from '../game/layout'
import { localPoint, turnRadians } from '../game/spatial'

/** Height of the floor at a point: store areas are a raised slab. */
export function floorY(x: number, z: number) {
  return groundY(world, x, z)
}

function useSig(id: string) {
  return useGame((s) => s.sigs[id])
}

function ProducerView({ s }: { s: Producer }) {
  useSig(s.id)
  const y = floorY(s.pos.x, s.pos.z)
  return (
    <>
      <group position={[s.pos.x, y, s.pos.z]} rotation={[0, turnRadians(s.turn), 0]}>
        <PopIn bornAt={s.bornAt}>
          {s.model === 'planter' && <Planter stock={s.stock} plants={s.plants} />}
          {s.model === 'nest' && <Nest eggs={s.stock} feed={s.feed?.stock} />}
          {s.model === 'plot' && <CropPlot cols={Math.min(4, s.plants)} rows={Math.ceil(s.plants / 4)} grown={s.stock} />}
          {s.model === 'cow' && <CowPen milk={s.stock} feed={s.feed?.stock} />}
          {s.model === 'strawberryPatch' && <StrawberryPatch plants={s.plants} stock={s.stock} />}
          {s.model === 'beehive' && <Beehive />}
          {s.model === 'appleTree' && <AppleTree ripe={s.stock} />}
        </PopIn>
      </group>
      <ZonePad rect={s.pad} />
      <Pill icon={ICON[s.kind]} text={s.stock >= s.max ? 'MAX' : `${s.stock}/${s.max}`} position={[s.pos.x, y + 1.7, s.pos.z]} />
      {s.feed && (
        // Food bar turns into a warning when the feeder is empty.
        <Pill icon={ICON[s.feed.kind]} text={s.feed.stock === 0 ? `¡Hambre! 0/${s.feed.cap}` : `${s.feed.stock}/${s.feed.cap}`} position={[s.pos.x + 1.1, y + 1.2, s.pos.z - 0.4]} />
      )}
    </>
  )
}

function ShelfView({ s }: { s: Shelf }) {
  useSig(s.id)
  const y = floorY(s.pos.x, s.pos.z)
  return (
    <>
      <group position={[s.pos.x, y, s.pos.z]} rotation={[0, turnRadians(s.turn), 0]}>
        <PopIn bornAt={s.bornAt}>
          {s.model === 'crate' ? (
            <Crate product={s.kind} cardboard count={s.stock} pad={false} />
          ) : s.model === 'fridge' ? (
            <Fridge count={s.stock} cap={s.cap} pad={false} />
          ) : (
            <ShelfModel product={s.kind} tiers={s.tiers} width={SHELF_WIDTH} count={s.stock} cap={s.cap} pad={false} />
          )}
        </PopIn>
      </group>
      <ZonePad rect={s.pad} />
      <Pill icon={ICON[s.kind]} text={s.stock >= s.cap ? 'MAX' : `${s.stock}/${s.cap}`} position={[s.pos.x + 1.1, y + 1.9, s.pos.z]} />
    </>
  )
}

function MachineView({ s }: { s: Machine }) {
  useSig(s.id)
  const y = floorY(s.pos.x, s.pos.z)
  const inputs = (Object.keys(s.recipe.in) as ItemKind[]).map((k) => ({ kind: k, count: s.input[k] ?? 0 }))
  return (
    <>
      <group position={[s.pos.x, y, s.pos.z]} rotation={[0, turnRadians(s.turn), 0]}>
        <PopIn bornAt={s.bornAt}>
          <MachineStation
            model={s.model}
            inputs={inputs}
            outputKind={s.recipe.out}
            output={s.output}
            working={s.running}
            getProgress={() => (s.running ? s.progress : 0)}
            pad={false}
          />
        </PopIn>
      </group>
      {/* one pad: left half drops ingredients, right half collects the product */}
      <ZonePad rect={s.pad} zones={[s.inZone, s.outZone]} />
      {inputs.map((inp, i) => (
        <Pill key={inp.kind} icon={ICON[inp.kind]} text={`${inp.count}/${s.inputCap}`} position={[s.inZone.x - 0.2, y + 1.3 + i * 0.35, s.pos.z]} />
      ))}
      <Pill icon={ICON[s.recipe.out]} text={s.output >= s.outputCap ? 'MAX' : `${s.output}/${s.outputCap}`} position={[s.outZone.x + 0.2, y + 1.3, s.pos.z]} />
    </>
  )
}

function Cashier({ x, y, z, turn }: { x: number; y: number; z: number; turn: QuarterTurn }) {
  const [bornAt] = useState(() => world.time)
  return (
    // face the same way as the counter; the outer group holds the rotation
    // (PopIn animates rotation.y and would reset it)
    <group position={[x, y, z]} rotation={[0, turnRadians(turn), 0]}>
      <PopIn bornAt={bornAt}>
        {/* pink staff like everyone else: visor + bow tie set the cashier apart */}
        <Character color={WORKER_COLOR} hat="visor" hatColor={C.wallStripe} tie />
      </PopIn>
    </group>
  )
}

function CheckoutView({ s }: { s: Checkout }) {
  useSig(s.id)
  const y = floorY(s.pos.x, s.pos.z)
  return (
    <>
      <group position={[s.pos.x, y, s.pos.z]} rotation={[0, turnRadians(s.turn), 0]}>
        <PopIn bornAt={s.bornAt}>
          {/* no cap on bills: the taller the pile, the stronger the sense of profit */}
          <CheckoutModel bills={Math.ceil(s.cash / 5)} pad={false} />
        </PopIn>
      </group>
      <ZonePad rect={s.pad} />
      {s.cashier && <Cashier x={s.spot.x} y={y} z={s.spot.z} turn={s.turn} />}
      {s.cash > 0 && (() => {
        const p = localPoint(s.pos, { x: 0.9, z: 0 }, s.turn)
        return <Pill icon="money" text={`$${s.cash}`} position={[p.x, y + 1.9, p.z]} />
      })()}
    </>
  )
}

export function StationView({ s }: { s: Station }) {
  switch (s.type) {
    case 'producer':
      return <ProducerView s={s} />
    case 'shelf':
      return <ShelfView s={s} />
    case 'machine':
      return <MachineView s={s} />
    case 'checkout':
      return <CheckoutView s={s} />
  }
}

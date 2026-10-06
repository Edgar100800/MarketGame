import { useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { C } from '../materials/palette'
import { toon } from '../materials/toon'
import { Ball, Box, Cyl, LINE_FINE, LINE_MID, Pad, Part, RBox } from './parts'
import { Product, type ProductKind } from './Products'
import type { MachineModel } from '../game/types'

type GroupProps = ThreeElements['group']

const BRICK = '#C8553D'
const STONE = '#A7AFB5'
const GLOW = '#FFB347'

/** Shakes its children while `working` is true. */
function Shaker({ working, children }: { working: boolean; children: React.ReactNode }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.x = working ? Math.sin(t * 60) * 0.02 : 0
    ref.current.scale.y = working ? 1 + Math.sin(t * 18) * 0.04 : 1
  })
  return <group ref={ref}>{children}</group>
}

function Canner({ working }: { working: boolean }) {
  const roller = useRef<Group>(null)
  useFrame((_, dt) => {
    if (roller.current && working) roller.current.rotation.x += dt * 8
  })
  return (
    <Shaker working={working}>
      <RBox size={[0.75, 0.75, 0.65]} radius={0.08} color={C.lightGray} position={[0, 0.375, 0]} />
      <Cyl r={0.3} rTop={0.18} h={0.35} color={C.tomato} position={[0, 0.92, 0]} />
      <Cyl r={0.2} h={0.06} color={C.white} position={[0, 1.1, 0]} />
      <Box size={[0.45, 0.25, 0.02]} color={C.screen} position={[0, 0.45, 0.33]} outline={false} />
      <group ref={roller} position={[0, 0.2, 0.36]}>
        <Cyl r={0.08} h={0.6} color={C.dark} rotation={[0, 0, Math.PI / 2]} />
      </group>
    </Shaker>
  )
}

function Mill({ working }: { working: boolean }) {
  const stone = useRef<Group>(null)
  useFrame((_, dt) => {
    if (stone.current && working) stone.current.rotation.y += dt * 4
  })
  return (
    <group>
      <RBox size={[0.9, 0.35, 0.8]} radius={0.05} color={C.woodDark} position={[0, 0.175, 0]} />
      <Cyl r={0.38} h={0.2} color={STONE} position={[0, 0.45, 0]} />
      <group ref={stone} position={[0, 0.66, 0]}>
        <Cyl r={0.38} h={0.2} color={STONE} />
        <Box size={[0.1, 0.1, 0.5]} color={C.wood} position={[0, 0.14, 0.2]} />
      </group>
      <Cyl r={0.28} rTop={0.4} h={0.35} color={C.woodLight} position={[0, 1.0, 0]} />
      <Box size={[0.2, 0.08, 0.3]} color={C.cream} position={[0.35, 0.4, 0.3]} outline={false} />
    </group>
  )
}

function Oven({ working }: { working: boolean }) {
  const glow = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (glow.current) glow.current.visible = working && Math.sin(clock.elapsedTime * 10) > -0.6
  })
  return (
    <Shaker working={working}>
      <RBox size={[0.95, 0.9, 0.7]} radius={0.12} color={BRICK} position={[0, 0.45, 0]} />
      <RBox size={[0.6, 0.4, 0.04]} radius={0.02} color={C.dark} position={[0, 0.45, 0.35]} />
      <mesh ref={glow} position={[0, 0.45, 0.375]} material={toon(GLOW)}>
        <planeGeometry args={[0.46, 0.28]} />
      </mesh>
      <Cyl r={0.12} h={0.4} color={BRICK} position={[0.25, 1.05, -0.15]} />
    </Shaker>
  )
}

/** Cheese press: wooden tub with a screw press that lowers while working. */
function CheesePress({ working }: { working: boolean }) {
  const press = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (press.current) press.current.position.y = 0.85 + (working ? Math.sin(clock.elapsedTime * 3) * 0.08 : 0.05)
  })
  return (
    <group>
      <Cyl r={0.42} h={0.55} color={C.wood} position={[0, 0.275, 0]} />
      <Cyl r={0.43} h={0.06} color={C.woodDark} position={[0, 0.58, 0]} />
      <Cyl r={0.36} h={0.02} color={C.cream} position={[0, 0.56, 0]} outline={false} />
      <Box size={[0.9, 0.08, 0.12]} color={C.woodDark} position={[0, 1.15, 0]} />
      <Box size={[0.08, 1.15, 0.08]} color={C.woodDark} position={[0, 0.575, 0.36]} />
      <group ref={press} position={[0, 0.85, 0]}>
        <Cyl r={0.05} h={0.5} color={C.gray} />
        <Cyl r={0.22} h={0.07} color={C.woodLight} position={[0, -0.28, 0]} />
      </group>
    </group>
  )
}

/** Mixer: stand mixer with a spinning whisk in a bowl. */
function Mixer({ working }: { working: boolean }) {
  const whisk = useRef<Group>(null)
  useFrame((_, dt) => {
    if (whisk.current && working) whisk.current.rotation.y += dt * 10
  })
  return (
    <Shaker working={working}>
      <RBox size={[0.8, 0.65, 0.7]} radius={0.1} color={C.lightGray} position={[0, 0.325, 0]} />
      <Box size={[0.2, 0.55, 0.2]} color={C.gray} position={[-0.3, 0.9, 0]} />
      <Box size={[0.55, 0.18, 0.24]} color={C.gray} position={[-0.05, 1.2, 0]} />
      <Cyl r={0.28} rTop={0.34} h={0.3} color={C.white} position={[0.12, 0.82, 0]} />
      <group ref={whisk} position={[0.12, 1.15, 0]}>
        <Cyl r={0.03} h={0.35} color={C.lightGray} position={[0, -0.1, 0]} />
        <Ball r={0.09} color={C.lightGray} position={[0, -0.33, 0]} scale={[1, 1.6, 1]} />
      </group>
    </Shaker>
  )
}

/** Jam pot: cauldron on a brick stove, lid rattles and steam puffs while working. */
function JamPot({ working }: { working: boolean }) {
  const lid = useRef<Group>(null)
  const steam = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (lid.current) lid.current.position.y = working ? 1.06 + Math.sin(t * 14) * 0.04 : 1.06
    if (steam.current) steam.current.visible = working && Math.sin(t * 6) > 0
  })
  return (
    <group>
      <RBox size={[0.9, 0.5, 0.8]} radius={0.08} color={BRICK} position={[0, 0.25, 0]} />
      <Box size={[0.5, 0.12, 0.06]} color={C.dark} position={[0, 0.22, 0.41]} outline={false} />
      <mesh ref={steam} position={[0, 1.5, 0]} material={toon(C.white, 0.5)}>
        <sphereGeometry args={[0.16, 10, 8]} />
      </mesh>
      <Cyl r={0.42} h={0.5} color={C.gray} position={[0, 0.78, 0]} />
      <Cyl r={0.36} h={0.04} color={C.jam} position={[0, 1.0, 0]} outline={false} />
      <group ref={lid} position={[0, 1.06, 0]}>
        <Cyl r={0.44} h={0.06} color={C.woodDark} />
        <Ball r={0.06} color={C.woodDark} position={[0, 0.06, 0]} />
      </group>
    </group>
  )
}

/** Pizza oven: stone dome with a wide mouth, flame flicker and a wood pile on the side. */
function PizzaOven({ working }: { working: boolean }) {
  const flame = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (flame.current) {
      flame.current.visible = working && Math.sin(clock.elapsedTime * 12) > -0.5
      flame.current.scale.y = 0.8 + Math.sin(clock.elapsedTime * 17) * 0.25
    }
  })
  return (
    <group>
      <RBox size={[1.0, 0.35, 0.9]} radius={0.06} color={BRICK} position={[0, 0.175, 0]} />
      <mesh position={[0, 0.7, -0.05]} material={toon(STONE)}>
        <sphereGeometry args={[0.48, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Box size={[0.62, 0.5, 0.05]} color={C.dark} position={[0, 0.42, 0.36]} />
      <mesh ref={flame} position={[0, 0.35, 0.32]} material={toon(GLOW)}>
        <coneGeometry args={[0.12, 0.3, 6]} />
      </mesh>
      <Cyl r={0.1} h={0.5} color={BRICK} position={[0.32, 0.95, -0.2]} />
      {[-0.08, 0.04, 0.16].map((x, i) => (
        <Cyl key={i} r={0.05} h={0.4} color={C.wood} rotation={[0, 0, Math.PI / 2]} position={[x - 0.55, 0.12 + i * 0.09, 0.5]} outline={false} />
      ))}
    </group>
  )
}

/** Juicer: glass tank with spinning blades, apple in the hopper and a bottle under the spout. */
function Juicer({ working }: { working: boolean }) {
  const blades = useRef<Group>(null)
  const juice = useRef<Group>(null)
  useFrame(({ clock }, dt) => {
    if (blades.current && working) blades.current.rotation.y += dt * 14
    if (juice.current) juice.current.scale.y = working ? 0.75 + Math.sin(clock.elapsedTime * 9) * 0.15 : 0.6
  })
  return (
    <Shaker working={working}>
      <RBox size={[0.75, 0.45, 0.6]} radius={0.08} color={C.leaf} position={[0, 0.225, 0]} />
      <Box size={[0.3, 0.12, 0.02]} color={C.screen} position={[0.15, 0.3, 0.31]} outline={false} />
      <group ref={juice} position={[0, 0.47, 0]}>
        <Cyl r={0.24} h={0.4} color={C.juice} position={[0, 0.2, 0]} outline={false} />
      </group>
      <group ref={blades} position={[0, 0.62, 0]}>
        <Box size={[0.4, 0.03, 0.06]} color={C.lightGray} outline={false} />
        <Box size={[0.06, 0.03, 0.4]} color={C.lightGray} outline={false} />
      </group>
      <Cyl r={0.28} h={0.5} color={C.glass} opacity={0.45} position={[0, 0.7, 0]} line={LINE_MID} />
      <Cyl r={0.3} h={0.06} color={C.leafDark} position={[0, 0.98, 0]} />
      <Cyl r={0.12} rTop={0.16} h={0.18} color={C.lightGray} position={[0, 1.1, 0]} />
      <Product kind="apple" position={[0, 1.12, 0]} scale={0.8} />
      <Box size={[0.08, 0.06, 0.18]} color={C.lightGray} position={[-0.18, 0.5, 0.36]} />
      <Product kind="juice" position={[-0.18, 0.0, 0.42]} scale={0.75} />
    </Shaker>
  )
}

/** Butter churn: banded wooden barrel with a plunger that pumps up and down. */
function ButterChurn({ working }: { working: boolean }) {
  const dasher = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (dasher.current) dasher.current.position.y = working ? 0.98 + Math.sin(clock.elapsedTime * 7) * 0.1 : 0.94
  })
  return (
    <group>
      <Cyl r={0.3} rTop={0.24} h={0.7} color={C.woodLight} position={[0, 0.35, 0]} />
      {[0.12, 0.56].map((y) => (
        <Cyl key={y} r={0.3 - y * 0.08} h={0.06} color={C.gray} position={[0, y, 0]} line={LINE_FINE} />
      ))}
      <Cyl r={0.27} h={0.06} color={C.wood} position={[0, 0.72, 0]} />
      <group ref={dasher} position={[0, 0.94, 0]}>
        <Cyl r={0.035} h={0.5} color={C.wood} />
        <Box size={[0.32, 0.06, 0.06]} color={C.woodDark} position={[0, 0.25, 0]} />
      </group>
      <RBox size={[0.32, 0.04, 0.24]} radius={0.015} color={C.white} position={[0.12, 0.02, 0.38]} />
      <Product kind="butter" position={[0.12, 0.04, 0.38]} scale={0.7} />
    </group>
  )
}

/** Soft-serve machine: chrome cabinet, pink lid, two pull levers and a swirl that grows in the cone. */
function IceCreamMachine({ working }: { working: boolean }) {
  const swirl = useRef<Group>(null)
  const lever = useRef<Group>(null)
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (swirl.current) {
      if (working) swirl.current.rotation.y += dt * 6
      swirl.current.scale.setScalar(working ? 0.6 + ((t * 0.8) % 1) * 0.5 : 1)
    }
    if (lever.current) lever.current.rotation.x = working ? -0.6 : 0
  })
  return (
    <Shaker working={working}>
      <RBox size={[0.8, 1.0, 0.55]} radius={0.08} color={C.chrome} position={[0, 0.5, -0.05]} />
      <RBox size={[0.82, 0.18, 0.57]} radius={0.06} color={C.pink} position={[0, 1.05, -0.05]} />
      <Ball r={0.13} color={C.iceCream} position={[-0.18, 1.18, -0.05]} scale={[1, 0.7, 1]} />
      <Ball r={0.13} color={C.cream} position={[0.18, 1.18, -0.05]} scale={[1, 0.7, 1]} />
      <Box size={[0.6, 0.18, 0.12]} color={C.lightGray} position={[0, 0.78, 0.26]} />
      <group ref={lever} position={[-0.15, 0.86, 0.3]}>
        <Box size={[0.05, 0.22, 0.05]} color={C.dark} position={[0, 0.11, 0]} line={LINE_FINE} />
        <Ball r={0.05} color={C.iceCream} position={[0, 0.24, 0]} />
      </group>
      <group position={[0.15, 0.86, 0.3]}>
        <Box size={[0.05, 0.22, 0.05]} color={C.dark} position={[0, 0.11, 0]} line={LINE_FINE} />
        <Ball r={0.05} color={C.cream} position={[0, 0.24, 0]} />
      </group>
      <Box size={[0.5, 0.04, 0.2]} color={C.gray} position={[0, 0.2, 0.32]} />
      <group position={[-0.15, 0.22, 0.32]}>
        <Part color={C.cone} position={[0, 0.1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.08, 0.2, 10]} />
        </Part>
        <group ref={swirl} position={[0, 0.2, 0]}>
          <Ball r={0.09} color={C.iceCream} position={[0, 0.04, 0]} scale={[1, 0.7, 1]} />
          <Cyl r={0.06} rTop={0.01} h={0.12} color={C.iceCream} position={[0, 0.13, 0]} outline={false} />
        </group>
      </group>
      <Box size={[0.32, 0.14, 0.02]} color={C.screen} position={[0, 0.5, 0.23]} outline={false} />
    </Shaker>
  )
}

/** Ketchup bottler: tomato tank on legs feeding a nozzle over a short conveyor of bottles. */
function KetchupBottler({ working }: { working: boolean }) {
  const belt = useRef<Group>(null)
  const drop = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (belt.current) belt.current.position.x = working ? ((t * 0.3) % 0.3) - 0.15 : 0
    if (drop.current) {
      drop.current.visible = working
      drop.current.position.y = 0.5 - ((t * 2.5) % 1) * 0.14
    }
  })
  return (
    <group>
      {[-0.22, 0.22].map((x) => (
        <Box key={x} size={[0.06, 0.8, 0.06]} color={C.gray} position={[x, 0.4, -0.15]} line={LINE_MID} />
      ))}
      <Cyl r={0.3} h={0.42} color={C.ketchup} position={[0, 1.0, -0.15]} />
      <Cyl r={0.31} h={0.06} color={C.lightGray} position={[0, 1.23, -0.15]} />
      <Ball r={0.11} color={C.tomato} position={[0, 1.02, 0.12]} scale={[1, 0.85, 0.4]} />
      <Cyl r={0.05} rTop={0.015} h={0.06} seg={5} color={C.leafDark} position={[0, 1.12, 0.14]} outline={false} />
      <Cyl r={0.035} h={0.3} color={C.lightGray} position={[0, 0.68, 0.08]} rotation={[0.6, 0, 0]} />
      <Cyl r={0.06} rTop={0.03} h={0.1} color={C.gray} position={[0, 0.55, 0.18]} />
      <mesh ref={drop} position={[0, 0.5, 0.18]} material={toon(C.ketchup)}>
        <sphereGeometry args={[0.03, 8, 6]} />
      </mesh>
      <RBox size={[0.9, 0.12, 0.3]} radius={0.04} color={C.dark} position={[0, 0.06, 0.18]} />
      <Box size={[0.86, 0.02, 0.26]} color={C.gray} position={[0, 0.125, 0.18]} outline={false} />
      <group ref={belt} position={[0, 0.13, 0.18]}>
        {[-0.3, 0, 0.3].map((x) => (
          <Product key={x} kind="ketchup" position={[x, 0, 0]} scale={0.7} />
        ))}
      </group>
    </group>
  )
}

/** Griddle: flat-top stove with pancakes, one flips in the air while working, honey jar on the side. */
function Griddle({ working }: { working: boolean }) {
  const flip = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!flip.current) return
    const k = (clock.elapsedTime * 1.2) % 1
    flip.current.position.y = working ? 0.5 + Math.sin(k * Math.PI) * 0.45 : 0.5
    flip.current.rotation.x = working ? k * Math.PI * 2 : 0
  })
  return (
    <Shaker working={working}>
      <RBox size={[0.9, 0.42, 0.65]} radius={0.06} color={C.lightGray} position={[0, 0.21, 0]} />
      {[-0.25, 0, 0.25].map((x) => (
        <Cyl key={x} r={0.04} h={0.04} color={C.dark} rotation={[Math.PI / 2, 0, 0]} position={[x, 0.2, 0.33]} line={LINE_FINE} />
      ))}
      <Box size={[0.94, 0.06, 0.68]} color={C.dark} position={[0, 0.45, 0]} />
      {[-0.22, 0.18].map((x) => (
        <Cyl key={x} r={0.13} h={0.035} color={C.pancake} position={[x, 0.495, -0.08]} />
      ))}
      <group ref={flip} position={[0, 0.5, 0.15]}>
        <Cyl r={0.13} h={0.035} color={C.pancake} />
      </group>
      <Box size={[0.94, 0.3, 0.16]} color={C.gray} position={[0, 0.6, -0.27]} />
      <Product kind="pancakes" position={[0.3, 0.75, -0.27]} scale={0.6} />
      <Product kind="honey" position={[-0.32, 0.75, -0.27]} scale={0.6} />
    </Shaker>
  )
}

const MODELS: Record<MachineModel, (p: { working: boolean }) => React.JSX.Element> = {
  canner: Canner,
  mill: Mill,
  oven: Oven,
  cheesePress: CheesePress,
  mixer: Mixer,
  jamPot: JamPot,
  pizzaOven: PizzaOven,
  juicer: Juicer,
  butterChurn: ButterChurn,
  iceCreamMachine: IceCreamMachine,
  ketchupBottler: KetchupBottler,
  griddle: Griddle,
}

/** Ring of segments above a machine, filled with `getProgress()` every frame. */
export function ProgressRing({ getProgress, ...props }: GroupProps & { getProgress: () => number }) {
  const SEG = 16
  const refs = useRef<(Mesh | null)[]>([])
  useFrame(() => {
    const p = getProgress()
    refs.current.forEach((m, i) => {
      if (m) m.visible = p > 0 && i < Math.ceil(p * SEG)
    })
  })
  return (
    <group {...props}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={toon(C.dark, 0.5)}>
        <ringGeometry args={[0.22, 0.36, 24]} />
      </mesh>
      {Array.from({ length: SEG }, (_, i) => {
        const a = Math.PI / 2 - (i / SEG) * Math.PI * 2
        return (
          <mesh
            key={i}
            ref={(m) => {
              refs.current[i] = m
            }}
            position={[Math.cos(a) * 0.29, 0.01, -Math.sin(a) * 0.29]}
            rotation={[-Math.PI / 2, 0, a]}
            material={toon(C.money)}
          >
            <planeGeometry args={[0.12, 0.1]} />
          </mesh>
        )
      })}
    </group>
  )
}

/** Items laid out in a grid on a tray (up to cols x rows visible). */
function TrayItems({ kind, count, cols = 4, rows = 2, gap = 0.24 }: { kind: ProductKind; count: number; cols?: number; rows?: number; gap?: number }) {
  const n = Math.min(count, cols * rows)
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <Product
          key={i}
          kind={kind}
          scale={0.8}
          position={[((i % cols) - (cols - 1) / 2) * gap, 0, (Math.floor(i / cols) - (rows - 1) / 2) * gap]}
        />
      ))}
    </>
  )
}

export type MachineInput = { kind: ProductKind; count: number }

/**
 * Processing table: input tray (left) -> appliance (center) -> output tray (right).
 * Faces +z. `getProgress` feeds the ring every frame without re-rendering.
 */
export function MachineStation({
  model,
  inputs,
  outputKind,
  output,
  working,
  getProgress,
  pad = true,
  ...props
}: GroupProps & {
  model: MachineModel
  inputs: MachineInput[]
  outputKind: ProductKind
  output: number
  working: boolean
  getProgress: () => number
  pad?: boolean
}) {
  const Appliance = MODELS[model]
  const rowsPerInput = inputs.length > 1 ? 1 : 2
  return (
    <group {...props}>
      {pad && <Pad w={3.6} d={1.8} />}
      <RBox size={[2.8, 0.55, 0.95]} radius={0.06} color={C.counter} position={[0, 0.275, 0]} />
      {/* input tray */}
      <Box size={[0.95, 0.06, 0.75]} color={C.orange} position={[-0.95, 0.58, 0]} />
      {inputs.map((inp, i) => (
        <group key={inp.kind} position={[-0.95, 0.61, inputs.length > 1 ? (i - 0.5) * 0.36 : 0]}>
          <TrayItems kind={inp.kind} count={inp.count} rows={rowsPerInput} />
        </group>
      ))}
      {/* appliance */}
      <group position={[0, 0.55, -0.05]}>
        <Appliance working={working} />
      </group>
      <ProgressRing getProgress={getProgress} position={[0, 2.0, 0]} />
      {/* output tray */}
      <Box size={[0.95, 0.06, 0.75]} color={C.lightGray} position={[0.95, 0.58, 0]} />
      <group position={[0.95, 0.61, 0]}>
        <TrayItems kind={outputKind} count={output} />
      </group>
    </group>
  )
}

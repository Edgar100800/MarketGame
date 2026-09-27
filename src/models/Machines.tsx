import { useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { C } from '../materials/palette'
import { toon } from '../materials/toon'
import { Ball, Box, Cyl, Pad, RBox } from './parts'
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

const MODELS: Record<MachineModel, (p: { working: boolean }) => React.JSX.Element> = {
  canner: Canner,
  mill: Mill,
  oven: Oven,
  cheesePress: CheesePress,
  mixer: Mixer,
  jamPot: JamPot,
  pizzaOven: PizzaOven,
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

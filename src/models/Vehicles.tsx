import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, type Group } from 'three'
import { C } from '../materials/palette'
import { toon } from '../materials/toon'
import { Ball, Box, Capsule, Cyl, LINE_BOLD, LINE_FINE, LINE_MID, RBox } from './parts'

type GroupProps = ThreeElements['group']

// Drive-up orders: cars and motorbikes park outside, wait with a timer and leave with a to-go order.
// Every vehicle faces +z, sits on y = 0 and is sized against the chibi characters (~1.4 tall).

/** Wheel that spins while `driving`. Axis along x. */
function Wheel({ r, w, driving, ...props }: GroupProps & { r: number; w: number; driving: boolean }) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current && driving) ref.current.rotation.x += dt * (4 / r)
  })
  return (
    <group {...props}>
      <group ref={ref}>
        <Cyl r={r} h={w} color={C.dark} rotation={[0, 0, Math.PI / 2]} line={LINE_MID} />
        <Cyl r={r * 0.5} h={w + 0.02} color={C.lightGray} rotation={[0, 0, Math.PI / 2]} outline={false} />
        <Box size={[w + 0.03, r * 0.9, r * 0.18]} color={C.gray} outline={false} />
      </group>
    </group>
  )
}

/** Suspension bob: the body bounces softly while driving and settles when parked. */
function useBob(driving: boolean, amount = 0.025, speed = 16) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const target = driving ? Math.sin(clock.elapsedTime * speed) * amount : 0
    ref.current.position.y += (target - ref.current.position.y) * 0.3
  })
  return ref
}

/** Chibi head seen through the windshield or under a helmet: body color, no face, like the customers. */
function DriverHead({ color, hair, ...props }: GroupProps & { color: string; hair?: string }) {
  return (
    <group {...props}>
      <Ball r={0.24} color={color} line={LINE_BOLD} />
      {hair && <Ball r={0.25} color={hair} position={[0, 0.06, -0.03]} scale={[1, 0.75, 1]} line={LINE_FINE} />}
    </group>
  )
}

// Hatch hinge angles: closed it slopes down to the bumper, open it swings up and back.
const HATCH_CLOSED = 0.55
const HATCH_OPEN = 2.5

export type CarProps = GroupProps & {
  color: string
  /** Driver head color (customer body color). */
  driver?: string
  hair?: string
  driving?: boolean
  /** Rear hatch lifted: the order is being loaded. */
  trunkOpen?: boolean
  /** Whatever sits in the trunk (usually a CarryStack of the delivered items). */
  cargo?: ReactNode
  /** Blinking hazard lights while it waits for its order. */
  waiting?: boolean
}

/**
 * Chunky hatchback: tall rounded body, big glass cabin, cartoon-sized wheels.
 * The hatch hinges at the roof's back edge and swings up when `trunkOpen`.
 */
export function Car({ color, driver = '#F5D64A', hair, driving = false, trunkOpen = false, cargo, waiting = false, ...props }: CarProps) {
  const body = useBob(driving)
  const hatch = useRef<Group>(null)
  const lights = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (hatch.current) hatch.current.rotation.x += ((trunkOpen ? HATCH_OPEN : HATCH_CLOSED) - hatch.current.rotation.x) * 0.15
    if (lights.current) lights.current.visible = waiting && Math.sin(clock.elapsedTime * 7) > 0
  })
  return (
    <group {...props}>
      {[-0.85, 0.75].map((z) =>
        [-0.66, 0.66].map((x) => <Wheel key={`${x}:${z}`} r={0.27} w={0.22} driving={driving} position={[x, 0.27, z]} />),
      )}
      <group ref={body}>
        {/* chassis + bumpers */}
        <RBox size={[1.4, 0.5, 2.5]} radius={0.2} color={color} position={[0, 0.5, 0]} line={LINE_BOLD} />
        <RBox size={[1.32, 0.14, 0.16]} radius={0.06} color={C.lightGray} position={[0, 0.34, 1.25]} />
        <RBox size={[1.32, 0.14, 0.16]} radius={0.06} color={C.lightGray} position={[0, 0.34, -1.25]} />
        {/* hood stripe, headlights, grille */}
        <Box size={[0.3, 0.02, 0.9]} color={C.white} position={[0, 0.755, 0.75]} outline={false} />
        {[-0.45, 0.45].map((x) => (
          <Ball key={x} r={0.11} color={C.yellow} position={[x, 0.58, 1.22]} scale={[1, 1, 0.5]} />
        ))}
        <Box size={[0.5, 0.1, 0.02]} color={C.dark} position={[0, 0.5, 1.255]} outline={false} />
        {/* taillights */}
        {[-0.52, 0.52].map((x) => (
          <Box key={x} size={[0.22, 0.12, 0.04]} color={C.tomato} position={[x, 0.58, -1.25]} line={LINE_FINE} />
        ))}
        {/* cabin: roof on four pillars with see-through glass, so the driver shows */}
        {[-0.56, 0.56].map((x) =>
          [-0.84, 0.3].map((z) => <Box key={`${x}:${z}`} size={[0.1, 0.55, 0.1]} color={color} position={[x, 1.02, z]} line={LINE_MID} />),
        )}
        <RBox size={[1.1, 0.5, 1.2]} radius={0.1} color={C.fridgeGlass} opacity={0.35} position={[0, 1.02, -0.27]} outline={false} />
        <RBox size={[1.26, 0.12, 1.36]} radius={0.06} color={color} position={[0, 1.33, -0.27]} line={LINE_BOLD} />
        <RBox size={[1.0, 0.04, 1.1]} radius={0.02} color={C.white} position={[0, 1.4, -0.27]} outline={false} />
        <DriverHead color={driver} hair={hair} position={[-0.26, 1.0, -0.05]} />
        {/* trunk floor + cargo, then the hatch on top */}
        <Box size={[1.1, 0.04, 0.55]} color={C.dark} position={[0, 0.77, -0.95]} outline={false} />
        <group position={[0, 0.78, -0.95]}>{cargo}</group>
        <group ref={hatch} position={[0, 1.3, -0.92]} rotation={[HATCH_CLOSED, 0, 0]}>
          <RBox size={[1.2, 0.62, 0.08]} radius={0.04} color={color} position={[0, -0.31, 0]} />
          <Box size={[0.9, 0.28, 0.02]} color={C.fridgeGlass} position={[0, -0.24, -0.045]} outline={false} />
        </group>
        {/* hazard lights */}
        <group ref={lights} visible={false}>
          {[-0.52, 0.52].map((x) => (
            <Ball key={x} r={0.09} color={C.orange} position={[x, 0.74, -1.22]} outline={false} />
          ))}
          {[-0.62, 0.62].map((x) => (
            <Ball key={x} r={0.07} color={C.orange} position={[x, 0.6, 1.15]} outline={false} />
          ))}
        </group>
      </group>
    </group>
  )
}

export type MotorbikeProps = GroupProps & {
  color: string
  /** Rider jacket / head color. */
  rider?: string
  helmet?: string
  driving?: boolean
  /** Delivery box lid open (order being loaded). */
  boxOpen?: boolean
  cargo?: ReactNode
  waiting?: boolean
}

/** Delivery scooter with a rider and a big insulated box on the back. Smaller orders, faster timer. */
export function Motorbike({ color, rider = '#5ED36B', helmet = C.white, driving = false, boxOpen = false, cargo, waiting = false, ...props }: MotorbikeProps) {
  const body = useBob(driving, 0.02, 20)
  const lid = useRef<Group>(null)
  const light = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (lid.current) lid.current.rotation.x += ((boxOpen ? -1.7 : 0) - lid.current.rotation.x) * 0.15
    if (light.current) light.current.visible = !waiting || Math.sin(clock.elapsedTime * 7) > 0
  })
  return (
    <group {...props}>
      <Wheel r={0.22} w={0.14} driving={driving} position={[0, 0.22, 0.6]} />
      <Wheel r={0.22} w={0.14} driving={driving} position={[0, 0.22, -0.55]} />
      <group ref={body}>
        {/* frame: floorboard, rear body, front shield and fork */}
        <RBox size={[0.36, 0.12, 0.7]} radius={0.05} color={C.dark} position={[0, 0.3, 0.05]} />
        <RBox size={[0.42, 0.34, 0.6]} radius={0.15} color={color} position={[0, 0.5, -0.38]} line={LINE_BOLD} />
        <RBox size={[0.4, 0.6, 0.16]} radius={0.08} color={color} position={[0, 0.66, 0.48]} rotation={[-0.25, 0, 0]} line={LINE_BOLD} />
        <Cyl r={0.035} h={0.55} color={C.gray} position={[0, 0.42, 0.62]} rotation={[-0.3, 0, 0]} line={LINE_FINE} />
        {/* handlebar, headlight, mirrors */}
        <Box size={[0.6, 0.05, 0.05]} color={C.dark} position={[0, 0.98, 0.42]} line={LINE_FINE} />
        <group ref={light}>
          <Ball r={0.08} color={C.yellow} position={[0, 0.86, 0.6]} scale={[1, 1, 0.6]} />
        </group>
        {[-0.28, 0.28].map((x) => (
          <Ball key={x} r={0.04} color={C.lightGray} position={[x, 1.1, 0.4]} line={LINE_FINE} />
        ))}
        {/* seat */}
        <RBox size={[0.34, 0.08, 0.42]} radius={0.04} color={C.dark} position={[0, 0.7, -0.3]} />
        {/* rider: sitting torso, arms to the handlebar, helmeted head */}
        <Capsule r={0.17} len={0.18} color={rider} position={[0, 0.98, -0.22]} rotation={[0.25, 0, 0]} line={LINE_BOLD} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Capsule r={0.06} len={0.38} color={rider} position={[s * 0.2, 1.0, 0.08]} rotation={[1.25, 0, 0]} line={LINE_MID} />
            <Capsule r={0.075} len={0.28} color={C.dark} position={[s * 0.13, 0.62, 0.0]} rotation={[1.2, 0, 0]} line={LINE_MID} />
          </group>
        ))}
        <group position={[0, 1.38, -0.18]}>
          <DriverHead color={rider} />
          <Ball r={0.27} color={helmet} position={[0, 0.04, -0.02]} scale={[1, 0.92, 1]} line={LINE_BOLD} />
          <Box size={[0.36, 0.14, 0.04]} color={C.screen} position={[0, 0.0, 0.24]} rotation={[-0.15, 0, 0]} line={LINE_FINE} />
        </group>
        {/* delivery box: rack, box, lid hinged at the back, cargo inside */}
        <Box size={[0.46, 0.04, 0.46]} color={C.gray} position={[0, 0.78, -0.62]} line={LINE_FINE} />
        <RBox size={[0.6, 0.48, 0.56]} radius={0.06} color={C.tomato} position={[0, 1.04, -0.66]} line={LINE_BOLD} />
        <Box size={[0.62, 0.1, 0.4]} color={C.white} position={[0, 1.04, -0.66]} outline={false} />
        <group position={[0, 1.28, -0.66]}>{boxOpen && cargo}</group>
        <group ref={lid} position={[0, 1.3, -0.94]}>
          <RBox size={[0.62, 0.06, 0.58]} radius={0.03} color={C.tomato} position={[0, 0, 0.28]} />
        </group>
      </group>
    </group>
  )
}

// Flat "P" sign drawn once on a canvas, same flat-ink look as the shelf icons.
let signTexture: CanvasTexture | null = null
function parkingSign() {
  if (signTexture) return signTexture
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')!
  g.fillStyle = C.wallStripe
  g.strokeStyle = C.outline
  g.lineWidth = 10
  g.beginPath()
  g.roundRect(8, 8, 112, 112, 18)
  g.fill()
  g.stroke()
  g.fillStyle = C.white
  g.font = 'bold 96px "Lilita One", system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineWidth = 8
  g.strokeText('P', 64, 70)
  g.fillText('P', 64, 70)
  signTexture = new CanvasTexture(canvas)
  signTexture.colorSpace = SRGBColorSpace
  return signTexture
}

/** Blue "P" sign on a pole. Faces +z. */
export function ParkingSign(props: GroupProps) {
  const map = useMemo(() => parkingSign(), [])
  return (
    <group {...props}>
      <Cyl r={0.12} h={0.06} color={C.gray} position={[0, 0.03, 0]} />
      <Cyl r={0.04} h={1.7} color={C.lightGray} position={[0, 0.85, 0]} line={LINE_MID} />
      <RBox size={[0.6, 0.6, 0.06]} radius={0.04} color={C.wallStripe} position={[0, 1.85, 0]} />
      <mesh position={[0, 1.85, 0.032]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshBasicMaterial map={map} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

/** Orange traffic cone with a white band. */
export function TrafficCone(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.4, 0.05, 0.4]} radius={0.02} color={C.orange} position={[0, 0.025, 0]} />
      <Cyl r={0.15} rTop={0.03} h={0.5} color={C.orange} position={[0, 0.3, 0]} />
      <Cyl r={0.105} rTop={0.075} h={0.1} color={C.white} position={[0, 0.3, 0]} outline={false} />
    </group>
  )
}

/**
 * One parking bay: asphalt, white side lines, yellow wheel stop at the back and a hand-off mark
 * at the side where the player drops the order (`dropSide` = +1 right, -1 left, 0 none).
 * Sized for a Car; a Motorbike fits with room to spare.
 */
export function ParkingSpot({ w = 2.4, d = 3.6, dropSide = 1, ...props }: GroupProps & { w?: number; d?: number; dropSide?: 1 | -1 | 0 }) {
  return (
    <group {...props}>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={toon(C.asphalt)}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * (w - 0.12)) / 2, 0.046, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.1, d]} />
          <meshBasicMaterial color={C.white} toneMapped={false} />
        </mesh>
      ))}
      <RBox size={[Math.min(1.2, w * 0.5), 0.1, 0.18]} radius={0.04} color={C.yellow} position={[0, 0.09, -d / 2 + 0.25]} />
      <Box size={[0.3, 0.102, 0.182]} color={C.dark} position={[0, 0.09, -d / 2 + 0.25]} outline={false} />
      {dropSide !== 0 && <DropMark position={[dropSide * (w / 2 + 0.75), 0, -0.5]} />}
    </group>
  )
}

/** Dashed hand-off square with a bag icon, where the player stands to load the order. */
export function DropMark(props: GroupProps) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.04)
  })
  const S = 1.2
  const dashes = 4
  return (
    <group {...props}>
      <group ref={ref}>
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={toon(C.zone)}>
          <planeGeometry args={[S, S]} />
        </mesh>
        {[0, 1, 2, 3].map((side) =>
          Array.from({ length: dashes }, (_, i) => {
            const t = ((i + 0.5) / dashes - 0.5) * S
            const horizontal = side < 2
            const edge = (side % 2 ? 1 : -1) * (S / 2 - 0.05)
            return (
              <mesh key={`${side}:${i}`} position={[horizontal ? t : edge, 0.046, horizontal ? edge : t]} rotation={[-Math.PI / 2, 0, horizontal ? 0 : Math.PI / 2]}>
                <planeGeometry args={[0.16, 0.07]} />
                <meshBasicMaterial color={C.white} toneMapped={false} />
              </mesh>
            )
          }),
        )}
        <ToGoBag position={[0, 0.02, 0]} scale={0.9} />
      </group>
    </group>
  )
}

/** Paper to-go bag with handles: what the player hands to drivers (also the order icon). */
export function ToGoBag(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.36, 0.38, 0.24]} radius={0.04} color={C.cardboard} position={[0, 0.19, 0]} />
      <Box size={[0.37, 0.04, 0.25]} color={C.woodLight} position={[0, 0.36, 0]} outline={false} />
      <Ball r={0.06} color={C.money} position={[0, 0.2, 0.125]} scale={[1, 1, 0.2]} outline={false} />
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.42, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.05, 0.012, 6, 12, Math.PI]} />
          <meshBasicMaterial color={C.outline} />
        </mesh>
      ))}
    </group>
  )
}

/** Painted arrow on the asphalt, showing the drive lane direction (+z). */
export function LaneArrow(props: GroupProps) {
  return (
    <group {...props}>
      <mesh position={[0, 0.046, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.18, 0.7]} />
        <meshBasicMaterial color={C.white} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.046, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.3, 3, -Math.PI / 2]} />
        <meshBasicMaterial color={C.white} toneMapped={false} />
      </mesh>
    </group>
  )
}

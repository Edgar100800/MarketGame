import { useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, type Group, type Mesh } from 'three'
import { C } from '../materials/palette'
import { toon } from '../materials/toon'
import { Character, HEAD_R } from './Character'
import { Ball, Box, Cyl, LINE_BOLD, LINE_FINE, LINE_MID, Part, RBox } from './parts'
import { Money } from './Products'

type GroupProps = ThreeElements['group']

// Robbery event: a thief sneaks in, grabs the checkout cash and runs; the player chases with a net.
// Same chibi rig as everyone else, told apart by the striped shirt, black mask and the money sack.

const THIEF_BODY = '#8A8F9C'
const THIEF_SHIRT = '#2B2D33'
const SACK = '#D8B07A'
const ALARM = '#FF3B30'
const ROPE = toon(C.outline)

// "$" stamp for the sack, drawn once like the shelf icons.
let dollarTexture: CanvasTexture | null = null
function dollar() {
  if (dollarTexture) return dollarTexture
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const g = canvas.getContext('2d')!
  g.font = 'bold 110px "Lilita One", system-ui, sans-serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.lineWidth = 14
  g.strokeStyle = C.outline
  g.fillStyle = C.moneyDark
  g.strokeText('$', 64, 70)
  g.fillText('$', 64, 70)
  dollarTexture = new CanvasTexture(canvas)
  dollarTexture.colorSpace = SRGBColorSpace
  return dollarTexture
}

/** Burlap money sack with a "$" stamp and a bill sticking out of the knot. `fill` 0..1 grows it. */
export function MoneySack({ fill = 1, ...props }: GroupProps & { fill?: number }) {
  const map = useMemo(() => dollar(), [])
  const k = 0.6 + 0.4 * fill
  return (
    <group {...props}>
      <group scale={k}>
        <Ball r={0.26} color={SACK} position={[0, 0.24, 0]} scale={[1, 0.95, 0.9]} line={LINE_BOLD} />
        <Cyl r={0.07} rTop={0.11} h={0.1} color={SACK} position={[0, 0.5, 0]} line={LINE_MID} />
        <Part color={C.woodDark} position={[0, 0.47, 0]} rotation={[Math.PI / 2, 0, 0]} line={LINE_FINE}>
          <torusGeometry args={[0.075, 0.022, 6, 14]} />
        </Part>
        <Box size={[0.16, 0.12, 0.02]} color={C.money} position={[0.03, 0.6, 0]} rotation={[0, 0, 0.3]} line={LINE_FINE} />
        <mesh position={[0, 0.24, 0.236]}>
          <planeGeometry args={[0.26, 0.26]} />
          <meshBasicMaterial map={map} transparent alphaTest={0.05} toneMapped={false} />
        </mesh>
      </group>
    </group>
  )
}

/** Black domino mask around the head with two white eye holes (the only face in the game). */
function RobberMask() {
  // sits just under the beanie cuff so the eye holes show
  return (
    <group position={[0, -0.07, 0]}>
      <Part color={C.outline} line={LINE_FINE}>
        <cylinderGeometry args={[HEAD_R + 0.012, HEAD_R + 0.012, 0.12, 28, 1, true]} />
      </Part>
      {[-1, 1].map((s) => (
        <Ball key={s} r={0.045} color={C.white} position={[s * 0.1, 0, HEAD_R - 0.005]} scale={[1, 0.8, 0.5]} outline={false} />
      ))}
      {/* knot tails at the back */}
      {[-1, 1].map((s) => (
        <Box key={s} size={[0.05, 0.14, 0.02]} color={C.outline} position={[s * 0.05, -0.08, -HEAD_R - 0.02]} rotation={[0.3, 0, s * 0.5]} outline={false} />
      ))}
    </group>
  )
}

/** White horizontal stripes over the dark shirt (torso capsule r 0.24, straight part y 0.18..0.34). */
function ShirtStripes() {
  return (
    <group>
      {[0.14, 0.26, 0.38].map((y) => (
        <Cyl key={y} r={y > 0.34 ? 0.235 : 0.246} h={0.045} color={C.white} position={[0, y, 0]} outline={false} />
      ))}
    </group>
  )
}

/**
 * The thief: gray chibi in a striped shirt, black beanie and mask, money sack on the back.
 * `running` uses a faster stride; `sneaking` crouches a bit and walks slowly.
 */
export function Thief({ running = false, sneaking = false, loot = 1, pose, ...props }: GroupProps & { running?: boolean; sneaking?: boolean; loot?: number; pose?: number }) {
  return (
    <group {...props}>
      <group scale={sneaking ? [1.05, 0.88, 1.05] : 1} rotation={[sneaking ? 0.2 : 0, 0, 0]}>
        <Character
          color={THIEF_BODY}
          top={THIEF_SHIRT}
          hat="beanie"
          hatColor={THIEF_SHIRT}
          walking={running || sneaking}
          pace={running ? 1.6 : sneaking ? 0.5 : 1}
          pose={pose}
          face={<RobberMask />}
          wear={
            <>
              <ShirtStripes />
              {loot > 0 && <MoneySack fill={loot} position={[0, 0.02, -0.3]} rotation={[-0.2, 0, 0]} />}
            </>
          }
        />
      </group>
    </group>
  )
}

/** Butterfly net for the chase: wooden pole, metal hoop and a see-through mesh bag. Pole along +y from the grip. */
export function CatchNet(props: GroupProps) {
  const R = 0.26
  return (
    <group {...props}>
      <Cyl r={0.03} h={0.95} color={C.wood} position={[0, 0.4, 0]} line={LINE_MID} />
      <Cyl r={0.04} h={0.2} color={C.tomato} position={[0, -0.02, 0]} line={LINE_FINE} />
      <group position={[0, 0.88 + R, 0]}>
        <Part color={C.lightGray} line={LINE_FINE}>
          <torusGeometry args={[R, 0.025, 8, 28]} />
        </Part>
        {/* bag hangs behind the hoop: translucent fill + rope rings */}
        <group position={[0, -0.06, -0.24]} rotation={[-Math.PI / 2 - 0.25, 0, 0]}>
          <mesh material={toon(C.white, 0.35)}>
            <coneGeometry args={[R, 0.5, 14, 1, true]} />
          </mesh>
          {[0.33, 0.6, 0.85].map((k) => (
            <mesh key={k} position={[0, 0.25 - k * 0.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={ROPE}>
              <torusGeometry args={[R * (k + 0.02), 0.008, 4, 20]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  )
}

/** Rope grid over a dome of radius `r`: meridians and parallels, like a real net (a wireframe shows triangles). */
function NetRopes({ r }: { r: number }) {
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`m${i}`} rotation={[0, (i / 6) * Math.PI, 0]} material={ROPE}>
          <torusGeometry args={[r, 0.008, 4, 32, Math.PI]} />
        </mesh>
      ))}
      {[0.3, 0.6, 0.85].map((k) => (
        <mesh key={`p${k}`} position={[0, Math.sin(k * (Math.PI / 2)) * r, 0]} rotation={[Math.PI / 2, 0, 0]} material={ROPE}>
          <torusGeometry args={[Math.cos(k * (Math.PI / 2)) * r, 0.008, 4, 32]} />
        </mesh>
      ))}
    </group>
  )
}

/** Ring of spinning cartoon stars over a dizzy head. */
export function DizzyStars(props: GroupProps) {
  const ref = useRef<Group>(null)
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 4
  })
  return (
    <group {...props}>
      <group ref={ref}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2
          return (
            <Part key={i} color={C.yellow} position={[Math.cos(a) * 0.38, Math.sin(a * 2) * 0.05, Math.sin(a) * 0.38]} rotation={[Math.PI / 2, 0, a]} line={LINE_FINE}>
              <cylinderGeometry args={[0.09, 0.09, 0.04, 5]} />
            </Part>
          )
        })}
      </group>
    </group>
  )
}

/**
 * Caught: the thief sits under a thrown net with weights on the edge, dizzy stars overhead
 * and the stolen bills spilled on the floor. `wobble` makes him struggle under the net.
 */
export function CaughtThief({ wobble = true, ...props }: GroupProps & { wobble?: boolean }) {
  const ref = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = wobble ? Math.sin(clock.elapsedTime * 9) * 0.06 : 0
  })
  return (
    <group {...props}>
      <group ref={ref}>
        <group position={[0, -0.32, 0]} scale={[1, 0.95, 1]}>
          <Thief loot={0} />
        </group>
        <DizzyStars position={[0, 1.35, 0]} />
      </group>
      {/* net dome over him */}
      <group position={[0, 0.02, 0]} scale={[1, 1.55, 1]}>
        <mesh material={toon(C.white, 0.25)}>
          <sphereGeometry args={[0.75, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        <NetRopes r={0.75} />
      </group>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return <Ball key={i} r={0.06} color={C.gray} position={[Math.cos(a) * 0.75, 0.06, Math.sin(a) * 0.75]} line={LINE_FINE} />
      })}
      <MoneySack fill={0.5} position={[1.0, 0.2, -0.45]} rotation={[0, 0, 1.3]} />
      {[[0.7, 0.75, 0.4], [1.2, 0.1, -0.5], [-0.9, 0.6, 1.8]].map(([x, z, r], i) => (
        <Money key={i} position={[x, 0, z]} rotation={[0, r, 0]} scale={0.7} />
      ))}
    </group>
  )
}

/** Red rotating beacon for the checkout: blinks and sweeps two light fans while a robbery is on. */
export function AlarmLight({ on = true, ...props }: GroupProps & { on?: boolean }) {
  const fan = useRef<Group>(null)
  const bulb = useRef<Mesh>(null)
  useFrame(({ clock }, dt) => {
    if (fan.current) {
      fan.current.visible = on
      fan.current.rotation.y += dt * 8
    }
    if (bulb.current) bulb.current.material = toon(on && Math.sin(clock.elapsedTime * 16) > 0 ? ALARM : C.tomato)
  })
  return (
    <group {...props}>
      <RBox size={[0.3, 0.08, 0.3]} radius={0.03} color={C.dark} position={[0, 0.04, 0]} />
      <mesh ref={bulb} position={[0, 0.17, 0]} material={toon(C.tomato)}>
        <sphereGeometry args={[0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      <Cyl r={0.125} h={0.1} color={ALARM} opacity={0.6} position={[0, 0.13, 0]} line={LINE_FINE} />
      <group ref={fan} position={[0, 0.18, 0]}>
        {[0, Math.PI].map((a) => (
          <mesh key={a} rotation={[0, a, 0]} position={[Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45]} material={toon(ALARM, 0.3)}>
            <planeGeometry args={[0.35, 0.9]} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** Open cash drawer of a robbed register: empty tray with a couple of loose coins. */
export function EmptyDrawer(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.5, 0.12, 0.36]} radius={0.03} color={C.lightGray} position={[0, 0.06, 0]} />
      <Box size={[0.44, 0.02, 0.3]} color={C.dark} position={[0, 0.115, 0]} outline={false} />
      {[-0.1, 0.1].map((x) => (
        <Box key={x} size={[0.02, 0.05, 0.3]} color={C.gray} position={[x, 0.12, 0]} outline={false} />
      ))}
      <Cyl r={0.035} h={0.015} color={C.yellow} position={[0.16, 0.13, 0.06]} outline={false} />
    </group>
  )
}

import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import { CatmullRomCurve3, Vector3, type Group } from 'three'
import { C } from '../materials/palette'
import { Ball, Capsule, Cyl, LINE_BOLD, LINE_FINE, LINE_MID, Part, RBox, type PartProps } from './parts'
import { Rigid } from './Rigid'

export type { HatKind } from '../game/types'
import type { HatKind } from '../game/types'

type Props = ThreeElements['group'] & {
  color: string
  hat?: HatKind
  hatColor?: string
  /** Necktie on the chest (cashier). */
  tie?: boolean
  /** Sleeveless vest of this color over the torso, open at the front (shelver). */
  vest?: string
  /** Upper-body clothing color: torso and sleeves (hands keep the body color). */
  top?: string
  /** Double-breasted button rows on the chest in this color (chef jacket). */
  buttons?: string
  /** Something held in front of the chest (usually a stack of products). */
  carry?: ReactNode
  /** Large object pushed in front at ground level, such as a shopping cart. */
  push?: ReactNode
  walking?: boolean
  /** Freezes the walk cycle at this phase (radians). For galleries and screenshots. */
  pose?: number
}

// Chibi proportions (feet at y = 0, faces +z): big head, short torso, stubby limbs.
const HIP_Y = 0.46
const HEAD_R = 0.3
const HEAD_Y = 0.82 // relative to the hips
const SHOULDER_Y = 0.44
const SHOULDER_X = 0.27

/**
 * Slice of a sphere shell between polar angles `from`..`to` (0 = top).
 * With `face`, a gap of that width (radians) is left facing +z so the face stays free;
 * a negative `face` keeps only the front slice of that width instead (bangs).
 */
function Shell({ r, from = 0, to, face, ...props }: Omit<PartProps, 'children'> & { r: number; from?: number; to: number; face?: number }) {
  // three.js sphere: phi = PI/2 points to +z (the face)
  let phiStart = 0
  let phiLen = Math.PI * 2
  if (face && face > 0) {
    phiStart = Math.PI / 2 + face / 2
    phiLen = Math.PI * 2 - face
  } else if (face && face < 0) {
    phiStart = Math.PI / 2 + face / 2
    phiLen = -face
  }
  return (
    <Part {...props}>
      <sphereGeometry args={[r, 24, 12, phiStart, phiLen, from, to - from]} />
    </Part>
  )
}

// [x, y, z, r] relative to the afro core
const AFRO_PUFFS: [number, number, number, number][] = [
  ...Array.from({ length: 7 }, (_, i): [number, number, number, number] => {
    // skip the front so the forehead lumps stay above the face
    const a = Math.PI / 2 + 0.5 + (i * (Math.PI * 2 - 1)) / 6
    return [Math.cos(a) * 0.3, -0.02 + (i % 2) * 0.05, Math.sin(a) * 0.3, 0.17]
  }),
  [0, 0.26, 0.02, 0.18],
  [0.14, 0.2, 0.19, 0.14],
  [-0.14, 0.2, 0.19, 0.14],
]

/** Hats sit on the head center; sized for HEAD_R. */
function Hat({ kind, color }: { kind: HatKind; color: string }) {
  if (kind === 'cap')
    return (
      <group position={[0, 0.06, 0]}>
        <Part color={color} scale={[1, 0.85, 1]} line={LINE_BOLD}>
          <sphereGeometry args={[HEAD_R + 0.02, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </Part>
        {/* visor, same color as the dome */}
        <Cyl r={0.22} h={0.035} color={color} position={[0, 0.01, 0.24]} scale={[1, 1, 0.85]} line={LINE_FINE} />
      </group>
    )
  if (kind === 'beanie')
    return (
      <group position={[0, 0.05, 0]} rotation={[-0.12, 0, 0]}>
        {/* knit dome, slightly taller than the skull */}
        <Shell r={HEAD_R + 0.025} to={Math.PI / 2} color={color} scale={[1, 1.1, 1]} line={LINE_BOLD} />
        {/* folded cuff: a fat ring hugging the rim, covers the dome edge */}
        <Part color={C.white} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1.25]} line={LINE_MID}>
          <torusGeometry args={[HEAD_R + 0.01, 0.055, 10, 28]} />
        </Part>
        <Ball r={0.085} color={C.white} position={[0, HEAD_R * 1.1 + 0.06, 0]} line={LINE_FINE} />
      </group>
    )
  if (kind === 'chef')
    return (
      <group position={[0, 0.22, 0]}>
        <Cyl r={0.26} h={0.24} color={C.white} line={LINE_MID} />
        <Ball r={0.29} color={C.white} position={[0, 0.2, 0]} scale={[1, 0.7, 1]} line={LINE_BOLD} />
      </group>
    )
  if (kind === 'straw')
    return (
      <group position={[0, 0.12, 0]}>
        {/* wide flat brim */}
        <Cyl r={0.44} h={0.035} color={color} line={LINE_BOLD} />
        {/* squashed crown */}
        <Part color={color} scale={[1, 0.72, 1]} line={LINE_BOLD}>
          <sphereGeometry args={[0.29, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </Part>
        {/* wood band */}
        <Cyl r={0.295} h={0.07} color={C.woodDark} position={[0, 0.035, 0]} line={LINE_MID} />
      </group>
    )
  if (kind === 'visor')
    return (
      <group position={[0, 0.06, 0]}>
        {/* open head band, no dome */}
        <Part color={color} line={LINE_MID}>
          <sphereGeometry args={[HEAD_R + 0.025, 18, 8, 0, Math.PI * 2, 1.0, 0.45]} />
        </Part>
        {/* flat plate pointing forward */}
        <Cyl r={0.24} h={0.03} color={color} position={[0, -0.03, 0.23]} scale={[1, 1, 0.9]} line={LINE_MID} />
      </group>
    )
  if (kind === 'bob')
    return (
      <group>
        {/* crown down to the brow, then a skirt around the sides and back only (face free) */}
        <Shell r={HEAD_R + 0.04} to={1.2} color={color} line={LINE_BOLD} />
        <Shell r={HEAD_R + 0.045} from={0.9} to={2.05} face={1.9} color={color} line={LINE_BOLD} />
        {/* straight bangs: thin front band a bit proud of the crown */}
        <Shell r={HEAD_R + 0.06} from={0.75} to={1.3} face={-1.7} color={color} line={LINE_FINE} />
      </group>
    )
  if (kind === 'bun')
    return (
      <group>
        {/* slick hair pulled back: crown + nape, then the bun on a band */}
        <Shell r={HEAD_R + 0.03} to={1.15} color={color} line={LINE_BOLD} />
        <Shell r={HEAD_R + 0.032} from={0.9} to={1.85} face={2.6} color={color} line={LINE_BOLD} />
        <group position={[0, 0.25, -0.13]} rotation={[-0.55, 0, 0]}>
          <Part color={C.trash} rotation={[Math.PI / 2, 0, 0]} line={LINE_FINE}>
            <torusGeometry args={[0.085, 0.03, 8, 18]} />
          </Part>
          <Ball r={0.14} color={color} position={[0, 0.1, 0]} line={LINE_BOLD} />
        </group>
      </group>
    )
  if (kind === 'afro')
    return (
      <group position={[0, 0.2, -0.08]}>
        {/* cloud of puffs: big core, a ring of lumps around it and one on top */}
        <Ball r={0.36} color={color} line={LINE_BOLD} />
        {AFRO_PUFFS.map(([x, y, z, r], i) => (
          <Ball key={i} r={r} color={color} position={[x, y, z]} line={LINE_BOLD} />
        ))}
      </group>
    )
  if (kind === 'bucket')
    return (
      <group position={[0, 0.06, 0]} rotation={[-0.08, 0, 0]}>
        {/* droopy brim (short cone), tapered crown sitting on it, soft rounded top */}
        <Cyl r={0.47} rTop={0.34} h={0.07} seg={24} color={color} position={[0, 0, 0]} line={LINE_BOLD} />
        <Cyl r={0.335} rTop={0.27} h={0.2} seg={24} color={color} position={[0, 0.13, 0]} line={LINE_BOLD} />
        <Shell r={0.27} to={Math.PI / 2} color={color} position={[0, 0.23, 0]} scale={[1, 0.42, 1]} line={LINE_MID} />
        {/* darker band over the crown base */}
        <Cyl r={0.34} rTop={0.315} h={0.06} seg={24} color={C.woodDark} position={[0, 0.07, 0]} line={LINE_FINE} />
      </group>
    )
  return null
}

/** Necktie over a white shirt V, centered on the front of the torso. */
function NeckTie({ color = C.yellow }: { color?: string }) {
  return (
    <group position={[0, 0, 0.2]}>
      {/* shirt showing between the lapels */}
      <Ball r={0.12} color={C.white} position={[0, 0.4, 0.01]} scale={[0.85, 1.3, 0.3]} line={LINE_FINE} />
      {/* diamond-section pieces flattened against the chest */}
      <group position={[0, 0, 0.055]} scale={[1, 1, 0.35]}>
        {/* knot, then the blade widening down to a pointed tip */}
        <Cyl r={0.035} rTop={0.055} h={0.06} seg={4} color={color} position={[0, 0.45, 0.02]} rotation={[0, Math.PI / 4, 0]} line={LINE_FINE} />
        <Cyl r={0.08} rTop={0.04} h={0.22} seg={4} color={color} position={[0, 0.31, 0]} rotation={[0, Math.PI / 4, 0]} line={LINE_FINE} />
        <Cyl r={0} rTop={0.08} h={0.07} seg={4} color={color} position={[0, 0.165, 0]} rotation={[0, Math.PI / 4, 0]} line={LINE_FINE} />
      </group>
    </group>
  )
}

/** Two rows of three buttons on the front of the torso, like a chef jacket. */
function ChestButtons({ color }: { color: string }) {
  return (
    <group>
      {[-1, 1].flatMap((side) =>
        [0.4, 0.3, 0.2].map((y) => {
          // sit on the capsule surface: sphere part above y 0.34, straight below
          const ring = y > 0.34 ? Math.sqrt(0.24 ** 2 - (y - 0.34) ** 2) : 0.24
          const x = side * 0.07
          return <Ball key={`${side}${y}`} r={0.022} color={color} position={[x, y, Math.sqrt(ring ** 2 - x ** 2)]} scale={[1, 1, 0.5]} line={LINE_FINE} />
        }),
      )}
    </group>
  )
}

// Vest wraps the torso capsule (r 0.24, straight part y 0.18..0.34) a bit proud of it.
const VEST_R = 0.262
const VEST_GAP = 0.6
const VEST_TOP = 0.75
const VEST_BOTTOM = 2.1

/** Point on the vest's front opening edge: polar angle `th` on the sphere centered at `cy`. */
function vestEdge(side: number, th: number, cy: number) {
  const ring = VEST_R * Math.sin(th) + 0.004
  return new Vector3(side * ring * Math.sin(VEST_GAP / 2), cy + VEST_R * Math.cos(th), ring * Math.cos(VEST_GAP / 2))
}

const lerp = (a: number, b: number, k: number) => a + (b - a) * k

/** White piping along both front edges (shoulder -> straight band -> belly), so the opening reads as a vest. */
const VEST_TRIM = [-1, 1].map((side) => {
  const top = [0, 0.25, 0.5, 0.75, 1].map((k) => vestEdge(side, lerp(VEST_TOP, Math.PI / 2, k), 0.34))
  const low = [0, 0.25, 0.5, 0.75, 1].map((k) => vestEdge(side, lerp(Math.PI / 2, VEST_BOTTOM, k), 0.18))
  return new CatmullRomCurve3([...top, ...low])
})

/** Sleeveless vest open at the front, with white piping and a name badge on the chest. */
function Vest({ color }: { color: string }) {
  const side = [VEST_GAP / 2, Math.PI * 2 - VEST_GAP] as const
  return (
    <group>
      <Shell r={VEST_R} from={VEST_TOP} to={Math.PI / 2} face={VEST_GAP} color={color} position={[0, 0.34, 0]} line={LINE_MID} />
      <Part color={color} position={[0, 0.26, 0]} line={LINE_MID}>
        <cylinderGeometry args={[VEST_R, VEST_R, 0.16, 24, 1, true, ...side]} />
      </Part>
      <Shell r={VEST_R} from={Math.PI / 2} to={VEST_BOTTOM} face={VEST_GAP} color={color} position={[0, 0.18, 0]} line={LINE_MID} />
      {VEST_TRIM.map((curve, i) => (
        <Part key={i} color={C.white} line={LINE_FINE}>
          <tubeGeometry args={[curve, 24, 0.016, 6, false]} />
        </Part>
      ))}
      <RBox size={[0.11, 0.065, 0.02]} radius={0.012} color={C.white} position={[0.15, 0.33, 0.225]} rotation={[0, 0.6, 0]} line={LINE_FINE} />
    </group>
  )
}

type Limb = { root: Group | null; joint: Group | null }

/** Thigh + knee + shin + foot. `side` = -1 left, 1 right. */
function Leg({ side, color, limb }: { side: number; color: string; limb: Limb }) {
  return (
    <group ref={(g) => void (limb.root = g)} position={[side * 0.11, 0, 0]}>
      <Capsule r={0.09} len={0.12} color={color} position={[0, -0.1, 0]} line={LINE_MID} />
      <group ref={(g) => void (limb.joint = g)} position={[0, -0.2, 0]}>
        <Rigid>
          {/* knee cap hides the gap when bending */}
          <Ball r={0.085} color={color} outline={false} />
          <Capsule r={0.082} len={0.1} color={color} position={[0, -0.1, 0]} line={LINE_MID} />
          {/* foot, pointing forward */}
          <Capsule r={0.075} len={0.07} color={color} position={[0, -0.2, 0.04]} rotation={[Math.PI / 2, 0, 0]} line={LINE_FINE} />
        </Rigid>
      </group>
    </group>
  )
}

/** Upper arm + elbow + forearm (sleeve color) + hand (body color). */
function Arm({ side, color, sleeve = color, limb }: { side: number; color: string; sleeve?: string; limb: Limb }) {
  return (
    <group ref={(g) => void (limb.root = g)} position={[side * SHOULDER_X, SHOULDER_Y, 0]}>
      <Rigid>
        <Ball r={0.075} color={sleeve} outline={false} />
        <Capsule r={0.07} len={0.1} color={sleeve} position={[0, -0.09, 0]} line={LINE_MID} />
      </Rigid>
      <group ref={(g) => void (limb.joint = g)} position={[0, -0.19, 0]}>
        <Rigid>
          <Ball r={0.068} color={sleeve} outline={false} />
          <Capsule r={0.066} len={0.08} color={sleeve} position={[0, -0.08, 0]} line={LINE_MID} />
          <Ball r={0.078} color={color} position={[0, -0.18, 0]} line={LINE_FINE} />
        </Rigid>
      </group>
    </group>
  )
}

/**
 * Faceless chibi humanoid used for the player, customers and employees.
 * Procedural walk: hips swing the thighs, knees bend while the leg is lifted,
 * arms swing against the legs with bent elbows, hips bob and the torso twists.
 */
export function Character({ color, hat = 'none', hatColor = C.white, tie = false, vest, top, buttons, carry, push, walking = false, pose, ...props }: Props) {
  const hips = useRef<Group>(null)
  const torso = useRef<Group>(null)
  const legs = useMemo<[Limb, Limb]>(() => [{ root: null, joint: null }, { root: null, joint: null }], [])
  const arms = useMemo<[Limb, Limb]>(() => [{ root: null, joint: null }, { root: null, joint: null }], [])
  const state = useRef({ walk: 0, phase: Math.random() * 10 })

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const st = state.current
    const frozen = pose !== undefined
    // blend idle <-> walk so the pose never snaps
    st.walk += ((frozen || walking ? 1 : 0) - st.walk) * Math.min(1, dt * 10)
    st.phase = frozen ? pose : st.phase + dt * 10 * st.walk
    const w = st.walk
    const f = st.phase
    const t = clock.elapsedTime

    legs.forEach((leg, i) => {
      const ph = f + (i ? Math.PI : 0)
      if (leg.root) leg.root.rotation.x = -Math.sin(ph) * 0.8 * w
      // knee bends while the leg swings forward (foot in the air)
      if (leg.joint) leg.joint.rotation.x = Math.max(0, Math.cos(ph)) * 1.35 * w
    })

    arms.forEach((arm, i) => {
      const side = i ? 1 : -1
      const ph = f + (i ? Math.PI : 0)
      if (!arm.root || !arm.joint) return
       if (push) {
         // Both hands stay on the cart handle while the legs keep walking.
         arm.root.rotation.set(-0.82 + Math.sin(f * 2) * 0.025 * w, 0, -side * 0.08)
         arm.joint.rotation.x = -0.35
       } else if (carry) {
        // holding the stack in front: arms forward, elbows up, small bob
        arm.root.rotation.set(-1.1 + Math.sin(f * 2) * 0.05 * w, 0, -side * 0.15)
        arm.joint.rotation.x = -0.8
      } else {
        // swing opposite to the leg on the same side
        arm.root.rotation.set(Math.sin(ph) * 0.65 * w + (1 - w) * 0.05, 0, -side * (0.14 + 0.03 * Math.sin(t * 2.2)))
        arm.joint.rotation.x = -0.35 - 0.7 * w * Math.max(0, -Math.sin(ph))
      }
    })

    if (hips.current) hips.current.position.y = HIP_Y + Math.abs(Math.sin(f)) * 0.06 * w
    if (torso.current) {
      torso.current.rotation.set(0.08 * w, Math.sin(f) * 0.12 * w, 0)
      // idle breathing
      torso.current.scale.y = 1 + Math.sin(t * 2.2) * 0.015 * (1 - w)
    }
  })

  return (
    <group {...props}>
      <group ref={hips} position={[0, HIP_Y, 0]}>
        <Leg side={-1} color={color} limb={legs[0]} />
        <Leg side={1} color={color} limb={legs[1]} />
        <group ref={torso}>
          <Rigid>
            <Capsule r={0.24} len={0.16} color={top ?? color} position={[0, 0.26, 0]} line={LINE_BOLD} />
            {buttons && <ChestButtons color={buttons} />}
            {tie && <NeckTie />}
            {vest && <Vest color={vest} />}
            <group position={[0, HEAD_Y, 0]}>
              <Ball r={HEAD_R} color={color} line={LINE_BOLD} />
              <Hat kind={hat} color={hatColor} />
            </group>
          </Rigid>
          <Arm side={-1} color={color} sleeve={top} limb={arms[0]} />
          <Arm side={1} color={color} sleeve={top} limb={arms[1]} />
          {carry && <group position={[0, 0.2, 0.42]}>{carry}</group>}
        </group>
      </group>
      {push && <group position={[0, 0, 1.05]}>{push}</group>}
    </group>
  )
}

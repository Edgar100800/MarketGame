import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { C } from '../materials/palette'
import { Ball, Capsule, Cyl, LINE_BOLD, LINE_FINE, LINE_MID, Part } from './parts'

export type HatKind = 'none' | 'cap' | 'beanie' | 'chef' | 'straw' | 'visor'

type Props = ThreeElements['group'] & {
  color: string
  hat?: HatKind
  hatColor?: string
  /** Red bow tie on the chest (cashier). */
  tie?: boolean
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

/** Hats sit on the head center; sized for HEAD_R. */
function Hat({ kind, color }: { kind: HatKind; color: string }) {
  if (kind === 'cap')
    return (
      <group position={[0, 0.06, 0]}>
        <Part color={color} scale={[1, 0.85, 1]} line={LINE_BOLD}>
          <sphereGeometry args={[HEAD_R + 0.02, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </Part>
        {/* visor */}
        <Cyl r={0.22} h={0.035} color={C.wallStripe} position={[0, 0.01, 0.24]} scale={[1, 1, 0.85]} line={LINE_FINE} />
      </group>
    )
  if (kind === 'beanie')
    return (
      <group position={[0, 0.06, 0]}>
        <Part color={color} line={LINE_BOLD}>
          <sphereGeometry args={[HEAD_R + 0.02, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </Part>
        <Cyl r={HEAD_R + 0.025} h={0.09} color={C.white} position={[0, 0.02, 0]} line={LINE_MID} />
        <Ball r={0.08} color={C.white} position={[0, 0.34, 0]} line={LINE_FINE} />
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
  return null
}

/** Red bow tie at chest height, centered on the front of the torso. */
function BowTie() {
  return (
    <group position={[0, 0.3, 0.24]}>
      <Ball r={0.09} color={C.trash} position={[-0.09, 0, 0]} scale={[1.3, 0.75, 0.45]} line={LINE_MID} />
      <Ball r={0.09} color={C.trash} position={[0.09, 0, 0]} scale={[1.3, 0.75, 0.45]} line={LINE_MID} />
      <Ball r={0.045} color={C.trash} line={LINE_FINE} />
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
        {/* knee cap hides the gap when bending */}
        <Ball r={0.085} color={color} outline={false} />
        <Capsule r={0.082} len={0.1} color={color} position={[0, -0.1, 0]} line={LINE_MID} />
        {/* foot, pointing forward */}
        <Capsule r={0.075} len={0.07} color={color} position={[0, -0.2, 0.04]} rotation={[Math.PI / 2, 0, 0]} line={LINE_FINE} />
      </group>
    </group>
  )
}

/** Upper arm + elbow + forearm + hand. */
function Arm({ side, color, limb }: { side: number; color: string; limb: Limb }) {
  return (
    <group ref={(g) => void (limb.root = g)} position={[side * SHOULDER_X, SHOULDER_Y, 0]}>
      <Ball r={0.075} color={color} outline={false} />
      <Capsule r={0.07} len={0.1} color={color} position={[0, -0.09, 0]} line={LINE_MID} />
      <group ref={(g) => void (limb.joint = g)} position={[0, -0.19, 0]}>
        <Ball r={0.068} color={color} outline={false} />
        <Capsule r={0.066} len={0.08} color={color} position={[0, -0.08, 0]} line={LINE_MID} />
        <Ball r={0.078} color={color} position={[0, -0.18, 0]} line={LINE_FINE} />
      </group>
    </group>
  )
}

/**
 * Faceless chibi humanoid used for the player, customers and employees.
 * Procedural walk: hips swing the thighs, knees bend while the leg is lifted,
 * arms swing against the legs with bent elbows, hips bob and the torso twists.
 */
export function Character({ color, hat = 'none', hatColor = C.white, tie = false, carry, push, walking = false, pose, ...props }: Props) {
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
          <Capsule r={0.24} len={0.16} color={color} position={[0, 0.26, 0]} line={LINE_BOLD} />
          {tie && <BowTie />}
          <Arm side={-1} color={color} limb={arms[0]} />
          <Arm side={1} color={color} limb={arms[1]} />
          <group position={[0, HEAD_Y, 0]}>
            <Ball r={HEAD_R} color={color} line={LINE_BOLD} />
            <Hat kind={hat} color={hatColor} />
          </group>
          {carry && <group position={[0, 0.2, 0.42]}>{carry}</group>}
        </group>
      </group>
      {push && <group position={[0, 0, 1.05]}>{push}</group>}
    </group>
  )
}

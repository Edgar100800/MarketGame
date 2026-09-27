import { useRef, type ReactNode } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { world } from '../game/state'

const DURATION = 0.45

/** easeOutBack: overshoots to ~1.1 then settles at 1. */
export function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/**
 * Pops its children in (scale 0 -> 1.1 -> 1, small spin) starting at world time `bornAt + delay`.
 * `bornAt < 0` means "already there" (loaded from save): no animation.
 */
export function PopIn({ bornAt, delay = 0, children, ...props }: ThreeElements['group'] & { bornAt: number; delay?: number; children: ReactNode }) {
  const ref = useRef<Group>(null)
  const done = useRef(bornAt < 0)
  useFrame(() => {
    const g = ref.current
    if (!g || done.current) return
    const t = (world.time - bornAt - delay) / DURATION
    if (t >= 1) {
      g.scale.setScalar(1)
      g.rotation.y = 0
      done.current = true
      return
    }
    const k = t <= 0 ? 0.0001 : easeOutBack(t)
    g.scale.setScalar(Math.max(0.0001, k))
    g.rotation.y = (1 - Math.min(1, Math.max(0, t))) * 0.6
  })
  return (
    <group ref={ref} scale={bornAt < 0 ? 1 : 0.0001} {...props}>
      {children}
    </group>
  )
}

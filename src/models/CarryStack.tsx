import { useEffect, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { PRODUCT_HEIGHT, Product, type ProductKind } from './Products'

export type StackEntry = { id: number | string; kind: ProductKind }

type ItemAnim = { y: number; born: number | null }

/**
 * Animated carried stack (can mix kinds):
 * - new items pop in with a bounce when the thrown item lands,
 * - when an item leaves (even from the middle) the ones above slide down,
 * - every add/remove kicks a spring: the stack squashes and wobbles,
 * - while walking it leans back and sways, higher items more than lower ones.
 */
export function CarryStack({ items, moving = false, ...props }: ThreeElements['group'] & { items: StackEntry[]; moving?: boolean }) {
  const refs = useRef(new Map<StackEntry['id'], Group>())
  const anim = useRef(new Map<StackEntry['id'], ItemAnim>())
  const known = useRef(new Set<StackEntry['id']>())
  const firstRender = useRef(true)
  // springs: lean (forward/back), sway (sideways), squash (vertical)
  const spring = useRef({ lean: 0, leanV: 0, sway: 0, swayV: 0, squash: 0, squashV: 0 })
  const prevLen = useRef(items.length)

  // kick the springs whenever the stack grows or shrinks
  useEffect(() => {
    const d = items.length - prevLen.current
    prevLen.current = items.length
    if (!d) return
    const s = spring.current
    s.squashV += d > 0 ? -2.2 : 2.6 // landing squashes, unloading makes it hop up
    s.swayV += (Math.random() - 0.5) * 3
    s.leanV += d > 0 ? 1.2 : -1.6
  }, [items.length])

  useEffect(() => {
    firstRender.current = false
  }, [])

  useFrame(({ clock }, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 30)
    const t = clock.elapsedTime
    const s = spring.current
    // damped springs (k = stiffness, c = damping)
    const step = (x: number, v: number, target: number, k: number, c: number) => {
      const a = -k * (x - target) - c * v
      v += a * dt
      return [x + v * dt, v]
    }
    const leanTarget = moving ? -0.22 + Math.sin(t * 9) * 0.04 : 0
    ;[s.lean, s.leanV] = step(s.lean, s.leanV, leanTarget, 60, 7)
    ;[s.sway, s.swayV] = step(s.sway, s.swayV, moving ? Math.sin(t * 4.5) * 0.08 : 0, 70, 6)
    ;[s.squash, s.squashV] = step(s.squash, s.squashV, 0, 180, 12)

    let y = 0
    items.forEach((it, i) => {
      const g = refs.current.get(it.id)
      let a = anim.current.get(it.id)
      if (!a) {
        a = { y, born: firstRender.current ? null : t }
        anim.current.set(it.id, a)
      }
      // slide towards the resting height (items above a removed one fall down)
      a.y += (y - a.y) * Math.min(1, dt * 18)
      if (g) {
        const h = a.y * (1 + s.squash * 0.25)
        const bend = Math.pow(a.y, 1.3)
        g.position.set(s.sway * bend, h, s.lean * bend * 0.8)
        g.rotation.set(s.lean * 0.6 * (i / Math.max(1, items.length)), 0, -s.sway * 0.8)
        // pop in when the thrown item arrives (~0.22s after it is added)
        if (a.born !== null) {
          const p = (t - a.born - 0.22) / 0.22
          if (p >= 1) {
            g.scale.setScalar(1)
            a.born = null
          } else {
            const k = p <= 0 ? 0.0001 : 1 + 2.7 * Math.pow(p - 1, 3) + 1.7 * Math.pow(p - 1, 2)
            g.scale.set(Math.max(0.0001, k), Math.max(0.0001, k * (1 - s.squash * 0.3)), Math.max(0.0001, k))
          }
        } else g.scale.set(1, 1 - s.squash * 0.3, 1)
      }
      y += PRODUCT_HEIGHT[it.kind]
    })
    // forget items that left
    for (const id of anim.current.keys())
      if (!items.some((it) => it.id === id)) {
        anim.current.delete(id)
        refs.current.delete(id)
        known.current.delete(id)
      }
  })

  return (
    <group {...props}>
      {items.map((it) => (
        <group
          key={it.id}
          ref={(g) => {
            // React 19 calls inline ref callbacks on every render: only act the first time we see an id
            if (!g) return
            if (!known.current.has(it.id)) {
              known.current.add(it.id)
              // items added after the first render start invisible and pop in
              if (!firstRender.current) g.scale.setScalar(0.0001)
            }
            refs.current.set(it.id, g)
          }}
        >
          <Product kind={it.kind} />
        </group>
      ))}
    </group>
  )
}

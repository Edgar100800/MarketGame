import { useEffect, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { C } from '../materials/palette'
import { Ball, Box, Cyl, ItemPop, Pad, RBox } from './parts'
import { crateSlots, fridgeSlots, SHELF_STEP_Y, SPACING, shelfGeometry, shelfSlots } from '../game/layout'
import { MoneyPile, Product, Bread, Cake, type ProductKind } from './Products'
import { Icon2D } from './Icon2D'
import { Bush } from './Farm'

type GroupProps = ThreeElements['group']

/** True after the first commit: items added later pop in, the initial ones don't. */
function useMounted() {
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
  }, [])
  return mounted
}

/**
 * Wooden display shelf, `tiers` levels, with a sign on top.
 * Shows `count` of `cap` items (defaults: full). New items pop in one by one as the count grows.
 */
export function Shelf({
  product,
  tiers = 3,
  width = 1.8,
  fill = 1,
  count,
  cap,
  pad = true,
  ...props
}: GroupProps & { product: ProductKind; tiers?: number; width?: number; fill?: number; count?: number; cap?: number; pad?: boolean }) {
  const mounted = useMounted()
  const { tierDepth, tierZ } = shelfGeometry(tiers)
  const top = (tiers - 1) * SHELF_STEP_Y + 0.1
  const backZ = tierZ(tiers - 1) - tierDepth / 2
  const frontZ = tierZ(0) + tierDepth / 2
  const slotsTotal = cap ?? tiers * 2 * Math.floor((width - 0.2) / SPACING[product])
  const slots = shelfSlots(slotsTotal, tiers, width)
  const shown = Math.min(count ?? Math.round(fill * slotsTotal), slotsTotal)
  return (
    <group {...props}>
      {pad && <Pad w={width + 0.9} d={frontZ - backZ + 1.1} />}
      {Array.from({ length: tiers }, (_, t) => {
        const y = t * SHELF_STEP_Y
        const z = tierZ(t)
        return (
          <group key={t}>
            {/* step block: plank on top, solid body below, side cheeks */}
            <Box size={[width, y + 0.1, tierDepth]} color={t % 2 ? C.woodDark : C.wood} position={[0, (y + 0.1) / 2, z]} />
            <Box size={[width + 0.02, 0.12, 0.06]} color={C.woodLight} position={[0, y + 0.1, z + tierDepth / 2]} />
            <Box size={[0.08, y + 0.3, tierDepth]} color={C.wood} position={[-width / 2, (y + 0.3) / 2, z]} />
            <Box size={[0.08, y + 0.3, tierDepth]} color={C.wood} position={[width / 2, (y + 0.3) / 2, z]} />
          </group>
        )
      })}
      <Box size={[width, top + 0.5, 0.08]} color={C.woodDark} position={[0, (top + 0.5) / 2, backZ]} />
      {slots.slice(0, shown).map((p, i) => (
        <ItemPop key={i} animate={mounted.current} position={p}>
          <Product kind={product} />
        </ItemPop>
      ))}
      {/* sign board: flat 2D label of the product it sells, tilted towards the camera */}
      <group position={[0, top + 0.75, backZ + 0.05]} rotation={[-0.35, 0, 0]}>
        <RBox size={[0.8, 0.6, 0.08]} radius={0.05} color={C.woodLight} />
        <Box size={[0.66, 0.46, 0.02]} color={C.cream} position={[0, 0, 0.045]} outline={false} />
        <Icon2D kind={product} size={0.46} position={[0, 0, 0.06]} />
      </group>
    </group>
  )
}

/** Low open crate on a pad, like the egg and tomato displays. Items pop in as `count` grows. */
export function Crate({ product, cols = 4, rows = 3, cardboard = false, count, pad = true, ...props }: GroupProps & { product: ProductKind; cols?: number; rows?: number; cardboard?: boolean; count?: number; pad?: boolean }) {
  const mounted = useMounted()
  const s = SPACING[product]
  const w = cols * s + 0.3
  const d = rows * s + 0.3
  const color = cardboard ? C.cardboard : C.wood
  const slots = crateSlots(cols * rows, product, cols)
  const shown = slots.slice(0, Math.min(count ?? slots.length, slots.length))

  if (product === 'egg')
    return (
      <group {...props}>
        {pad && <Pad w={w + 1} d={d + 1} />}

        {/* Open timber crate: the empty egg pockets remain readable as stock disappears. */}
        <RBox size={[w, 0.14, d]} radius={0.035} color={C.woodDark} position={[0, 0.07, 0]} />
        <Box size={[w - 0.16, 0.035, d - 0.16]} color={C.cardboard} position={[0, 0.155, 0]} outline={false} />

        {/* Moulded holders keep every egg in a distinct, visible slot. */}
        {slots.map(([x, , z], i) => (
          <Cyl key={`cup-${i}`} r={0.105} rTop={0.15} h={0.1} seg={10} color={C.cardboard} position={[x, 0.21, z]} line={1.4} />
        ))}

        {/* Low boards and pale top rails create the chunky crate silhouette from the reference. */}
        <Box size={[w, 0.32, 0.11]} color={C.wood} position={[0, 0.24, d / 2 - 0.035]} />
        <Box size={[w, 0.32, 0.11]} color={C.wood} position={[0, 0.24, -d / 2 + 0.035]} />
        <Box size={[0.11, 0.32, d - 0.12]} color={C.wood} position={[-w / 2 + 0.035, 0.24, 0]} />
        <Box size={[0.11, 0.32, d - 0.12]} color={C.wood} position={[w / 2 - 0.035, 0.24, 0]} />
        <Box size={[w + 0.04, 0.06, 0.14]} color={C.woodLight} position={[0, 0.43, d / 2 - 0.035]} />
        <Box size={[w + 0.04, 0.06, 0.14]} color={C.woodLight} position={[0, 0.43, -d / 2 + 0.035]} />
        {Array.from({ length: Math.max(0, rows - 1) }, (_, i) => {
          const z = (i - (rows - 2) / 2) * s
          return <Box key={`divider-${i}`} size={[w - 0.22, 0.045, 0.055]} color={C.woodLight} position={[0, 0.29, z]} outline={false} />
        })}

        {shown.map((p, i) => (
          <ItemPop key={i} animate={mounted.current} position={p}>
            <Product kind="egg" />
          </ItemPop>
        ))}

        {/* Printed product plate, shared with the shelf signage. */}
        <RBox size={[0.38, 0.3, 0.035]} radius={0.025} color={C.cream} position={[0, 0.27, d / 2 + 0.04]} line={1.7} />
        <Icon2D kind="egg" size={0.23} position={[0, 0.27, d / 2 + 0.061]} />
      </group>
    )

  return (
    <group {...props}>
      {pad && <Pad w={w + 1} d={d + 1} />}
      <Box size={[w, 0.5, d]} color={color} position={[0, 0.25, 0]} />
      <Box size={[w - 0.1, 0.02, d - 0.1]} color={C.woodDark} position={[0, 0.5, 0]} outline={false} />
      {shown.map((p, i) => (
        <ItemPop key={i} animate={mounted.current} position={p}>
          <Product kind={product} />
        </ItemPop>
      ))}
      {cardboard && <Box size={[w, 0.35, 0.04]} color={C.cardboard} position={[0, 0.62, -d / 2 - 0.12]} rotation={[-0.6, 0, 0]} />}
      {/* small 2D label stuck on the front of the crate */}
      <Icon2D kind={product} size={0.34} position={[0, 0.27, d / 2 + 0.02]} />
    </group>
  )
}

/** Mint table with products and an appliance, like the bakery / snack stations. */
export function DisplayTable({ product, ...props }: GroupProps & { product: ProductKind }) {
  return (
    <group {...props}>
      <Pad w={3} d={1.8} />
      <RBox size={[2.2, 0.55, 0.9]} radius={0.06} color={C.counter} position={[0, 0.28, 0]} />
      {Array.from({ length: 6 }, (_, i) => (
        <Product key={i} kind={product} position={[-0.25 + (i % 3) * 0.36, 0.56, -0.18 + Math.floor(i / 3) * 0.36]} />
      ))}
      <Microwave position={[-0.65, 0.56, 0]} />
    </group>
  )
}

export function Microwave(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.6, 0.4, 0.45]} radius={0.04} color={C.dark} position={[0, 0.2, 0]} />
      <Box size={[0.36, 0.26, 0.02]} color={C.screen} position={[-0.06, 0.2, 0.23]} outline={false} />
      <Box size={[0.08, 0.26, 0.02]} color={C.lightGray} position={[0.21, 0.2, 0.23]} outline={false} />
    </group>
  )
}

export function Register(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[0.55, 0.14, 0.4]} radius={0.03} color={C.lightGray} position={[0, 0.07, 0]} />
      <group position={[0, 0.4, -0.05]} rotation={[-0.25, 0, 0]}>
        <RBox size={[0.6, 0.42, 0.08]} radius={0.03} color={C.gray} />
        <Box size={[0.5, 0.32, 0.02]} color={C.screen} position={[0, 0, 0.045]} outline={false} />
      </group>
      <Box size={[0.08, 0.2, 0.06]} color={C.gray} position={[0, 0.2, -0.08]} outline={false} />
    </group>
  )
}

/** Checkout: mint counter, register, card terminal and cash pile. */
export function Checkout({ cash = true, bills, pad = true, ...props }: GroupProps & { cash?: boolean; bills?: number; pad?: boolean }) {
  return (
    <group {...props}>
      {pad && <Pad w={3.4} d={2.2} />}
      <RBox size={[2.6, 0.8, 0.8]} radius={0.08} color={C.counter} position={[0, 0.4, 0]} />
      <Register position={[-0.5, 0.8, 0]} />
      <group position={[0.3, 0.8, 0.1]}>
        <RBox size={[0.18, 0.26, 0.1]} radius={0.03} color={C.dark} position={[0, 0.13, 0]} />
        <Box size={[0.12, 0.08, 0.02]} color={C.money} position={[0, 0.19, 0.05]} outline={false} />
      </group>
      {bills !== undefined ? (
        bills > 0 && <MoneyPile cols={2} rows={2} layers={Math.ceil(bills / 4)} position={[0.85, 0.8, 0]} />
      ) : (
        cash && <MoneyPile cols={2} rows={2} layers={3} position={[0.85, 0.8, 0]} />
      )}
    </group>
  )
}

/** Blue glass-door fridge whose cartons mirror the shelf's runtime stock. */
export function Fridge({ count = 12, cap = 12, pad = true, ...props }: GroupProps & { count?: number; cap?: number; pad?: boolean }) {
  const w = 1.6
  const h = 2.2
  const mounted = useMounted()
  const slots = fridgeSlots(cap).slice(0, count)
  return (
    <group {...props}>
      {pad && <Pad w={w + 0.8} d={1.6} />}
      <RBox size={[w, h, 0.8]} radius={0.06} color={C.fridge} position={[0, h / 2, 0]} />
      {[0, 1].map((col) =>
        [0, 1, 2].map((row) => {
          const x = (col - 0.5) * (w / 2)
          const y = 0.45 + row * 0.6
          return (
            <group key={`${col}-${row}`} position={[x, y, 0.41]}>
              <Box size={[w / 2 - 0.16, 0.5, 0.02]} color={C.fridgeGlass} outline={false} />
            </group>
          )
        }),
      )}
      {slots.map((position, i) => (
        <ItemPop key={i} animate={mounted.current} position={position}>
          <Product kind="milk" scale={0.8} />
        </ItemPop>
      ))}
      <Box size={[0.04, h - 0.2, 0.03]} color={C.dark} position={[0, h / 2, 0.42]} outline={false} />
    </group>
  )
}

/**
 * Compact store bin with a hinged lid. `useCount` increments whenever an item
 * is thrown away so the lid and body can acknowledge the action.
 */
export function TrashBin({ useCount = 0, ...props }: GroupProps & { useCount?: number }) {
  const body = useRef<Group>(null)
  const lid = useRef<Group>(null)
  const elapsed = useRef(Number.POSITIVE_INFINITY)
  const reduceMotion = useRef(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => {
      reduceMotion.current = preference.matches
    }
    update()
    preference.addEventListener('change', update)
    return () => preference.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (useCount > 0) elapsed.current = 0
  }, [useCount])

  useFrame((_, delta) => {
    const bin = body.current
    const binLid = lid.current
    if (!bin || !binLid || elapsed.current > 0.68) return

    elapsed.current += delta
    const progress = Math.min(1, elapsed.current / 0.68)
    const lidLift = Math.sin(progress * Math.PI)
    const reduced = reduceMotion.current
    binLid.rotation.x = -0.12 - lidLift * (reduced ? 0.22 : 0.82)

    if (reduced) return
    const impact = progress > 0.34 ? Math.sin(((progress - 0.34) / 0.66) * Math.PI * 3) * (1 - progress) : 0
    bin.scale.set(1 + impact * 0.025, 1 - impact * 0.04, 1 + impact * 0.025)
    bin.rotation.z = impact * 0.025

    if (progress === 1) {
      bin.scale.setScalar(1)
      bin.rotation.z = 0
      binLid.rotation.x = -0.12
    }
  })

  return (
    <group {...props}>
      <group ref={body}>
        {/* Red shell with a broad white front, matching the reference silhouette. */}
        <RBox size={[0.72, 0.72, 0.58]} radius={0.08} color={C.trash} position={[0, 0.36, 0]} />
        <RBox size={[0.54, 0.49, 0.035]} radius={0.025} color={C.cream} position={[0, 0.39, 0.301]} line={2} />
        <Box size={[0.54, 0.09, 0.025]} color={C.white} position={[0, 0.63, 0.32]} outline={false} />
        <Box size={[0.54, 0.08, 0.025]} color={C.trash} position={[0, 0.13, 0.32]} outline={false} />

        {/* Small, readable waste-bin pictogram on the front panel. */}
        <RBox size={[0.2, 0.18, 0.025]} radius={0.018} color={C.dark} position={[0, 0.36, 0.33]} outline={false} />
        <Box size={[0.25, 0.04, 0.027]} color={C.dark} position={[0, 0.475, 0.332]} outline={false} />
        <Box size={[0.1, 0.025, 0.028]} color={C.dark} position={[0, 0.51, 0.333]} outline={false} />
        <Box size={[0.025, 0.11, 0.012]} color={C.white} position={[-0.045, 0.36, 0.347]} outline={false} />
        <Box size={[0.025, 0.11, 0.012]} color={C.white} position={[0.045, 0.36, 0.347]} outline={false} />

        {/* Rear hinge and inset black lid; pivot sits at the back edge. */}
        <Cyl r={0.045} h={0.56} seg={12} color={C.dark} position={[0, 0.78, -0.25]} rotation={[0, 0, Math.PI / 2]} />
        <group ref={lid} position={[0, 0.79, -0.27]} rotation={[-0.12, 0, 0]}>
          <RBox size={[0.8, 0.1, 0.65]} radius={0.045} color={C.white} position={[0, 0, 0.27]} />
          <RBox size={[0.64, 0.035, 0.47]} radius={0.025} color={C.screen} position={[0, 0.061, 0.28]} line={2} />
        </group>
      </group>
    </group>
  )
}

/** Office desk with a monitor, keyboard and potted plant. */
export function Desk(props: GroupProps) {
  return (
    <group {...props}>
      <Box size={[2.4, 0.1, 0.9]} color={C.wood} position={[0, 0.75, 0]} />
      <Box size={[0.1, 0.7, 0.8]} color={C.woodDark} position={[-1.1, 0.35, 0]} />
      <Box size={[0.1, 0.7, 0.8]} color={C.woodDark} position={[1.1, 0.35, 0]} />
      <group position={[0, 0.8, -0.15]}>
        <Box size={[0.8, 0.5, 0.06]} color={C.dark} position={[0, 0.4, 0]} />
        <Box size={[0.08, 0.2, 0.08]} color={C.dark} position={[0, 0.1, 0]} />
        <Box size={[0.6, 0.03, 0.2]} color={C.lightGray} position={[0, 0.02, 0.35]} />
      </group>
      <group position={[0.9, 0.8, 0]}>
        <Cyl r={0.12} h={0.2} rTop={0.15} color={C.cardboard} position={[0, 0.1, 0]} />
        <Bush scale={0.35} position={[0, 0.15, 0]} />
      </group>
    </group>
  )
}

/** Simple wooden chair, seat facing +z. */
export function Chair(props: GroupProps) {
  return (
    <group {...props}>
      <Box size={[0.55, 0.06, 0.5]} color={C.wood} position={[0, 0.45, 0]} />
      <Box size={[0.55, 0.55, 0.06]} color={C.wood} position={[0, 0.73, -0.22]} />
      <Box size={[0.06, 0.45, 0.06]} color={C.woodDark} position={[-0.22, 0.22, -0.19]} />
      <Box size={[0.06, 0.45, 0.06]} color={C.woodDark} position={[0.22, 0.22, -0.19]} />
      <Box size={[0.06, 0.45, 0.06]} color={C.woodDark} position={[-0.22, 0.22, 0.19]} />
      <Box size={[0.06, 0.45, 0.06]} color={C.woodDark} position={[0.22, 0.22, 0.19]} />
    </group>
  )
}

/** Store wall with a blue stripe on top and glass windows on the front face. */
export function Wall({ length, height = 2.2, windows = [], ...props }: GroupProps & { length: number; height?: number; windows?: [number, number][] }) {
  return (
    <group {...props}>
      <Box size={[length, height, 0.3]} color={C.wall} position={[0, height / 2, 0]} />
      <Box size={[length + 0.02, 0.25, 0.32]} color={C.wallStripe} position={[0, height - 0.12, 0]} />
      {windows.map(([x, w], i) => (
        <Box key={i} size={[w, height * 0.55, 0.05]} color={C.glass} position={[x, height * 0.48, 0.16]} />
      ))}
    </group>
  )
}

/** Red and white striped awning, sloping out from a wall. */
export function Awning({ length = 3, stripes = 8, ...props }: GroupProps & { length?: number; stripes?: number }) {
  const sw = length / stripes
  return (
    <group {...props}>
      <group rotation={[0.5, 0, 0]}>
        {Array.from({ length: stripes }, (_, i) => (
          <Box key={i} size={[sw, 0.05, 1.1]} color={i % 2 ? C.white : C.trash} position={[-length / 2 + sw * (i + 0.5), 0, 0.55]} outline={i === 0 || i === stripes - 1} />
        ))}
      </group>
    </group>
  )
}

/** Orange floor mat, used at entrances and along walls. */
export function FloorMat({ w = 2.4, d = 0.9, ...props }: GroupProps & { w?: number; d?: number }) {
  return (
    <group {...props}>
      <Box size={[w, 0.03, d]} color={C.mat} position={[0, 0.015, 0]} outline={false} />
    </group>
  )
}

/** Gray square on the floor where the player pays to unlock something. */
export function BuyZone(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[1.8, 0.06, 1.8]} radius={0.03} color={C.zone} position={[0, 0.03, 0]} outline={false} opacity={0.9} />
      <Box size={[1.5, 0.02, 0.06]} color={C.white} position={[0, 0.07, -0.72]} outline={false} />
      <Box size={[1.5, 0.02, 0.06]} color={C.white} position={[0, 0.07, 0.72]} outline={false} />
      <Box size={[0.06, 0.02, 1.5]} color={C.white} position={[-0.72, 0.07, 0]} outline={false} />
      <Box size={[0.06, 0.02, 1.5]} color={C.white} position={[0.72, 0.07, 0]} outline={false} />
    </group>
  )
}

/** Glass bakery display: wooden base, curved glass top and bread + cake inside. */
export function BakeryCase(props: GroupProps) {
  return (
    <group {...props}>
      <RBox size={[1.5, 0.55, 0.75]} radius={0.06} color={C.wood} position={[0, 0.275, 0]} />
      <Box size={[0.04, 0.85, 0.7]} color={C.woodDark} position={[-0.73, 1.0, 0]} />
      <Box size={[0.04, 0.85, 0.7]} color={C.woodDark} position={[0.73, 1.0, 0]} />
      <Box size={[1.5, 0.04, 0.7]} color={C.woodDark} position={[0, 1.44, 0]} />
      <Box size={[1.42, 0.8, 0.04]} color={C.fridgeGlass} position={[0, 1.0, 0.36]} outline={false} />
      <Box size={[1.42, 0.04, 0.62]} color={C.fridgeGlass} position={[0, 1.42, 0]} outline={false} />
      <Box size={[1.36, 0.03, 0.62]} color={C.woodLight} position={[0, 0.72, 0]} outline={false} />
      <Bread position={[-0.4, 0.76, 0]} scale={0.9} />
      <Bread position={[-0.05, 0.76, 0]} rotation={[0, 0.5, 0]} scale={0.9} />
      <Cake position={[0.42, 0.74, 0]} scale={0.95} />
    </group>
  )
}

/** Street flower stall: striped awning, crates of flowers and a bucket row. */
export function FlowerStand(props: GroupProps) {
  const flowers: [number, string][] = [
    [-0.55, C.pink],
    [-0.28, C.yellow],
    [0, C.strawberry],
    [0.28, C.white],
    [0.55, C.pink],
  ]
  return (
    <group {...props}>
      <RBox size={[1.9, 0.85, 0.8]} radius={0.05} color={C.wood} position={[0, 0.425, 0]} />
      <Box size={[2.1, 0.06, 0.95]} color={C.woodDark} position={[0, 0.88, 0]} />
      <Box size={[0.08, 2.1, 0.08]} color={C.woodDark} position={[-0.95, 1.05, -0.3]} />
      <Box size={[0.08, 2.1, 0.08]} color={C.woodDark} position={[0.95, 1.05, -0.3]} />
      <group position={[0, 2.05, -0.2]}>
        {Array.from({ length: 6 }, (_, i) => (
          <Box key={i} size={[0.36, 0.05, 1]} color={i % 2 ? C.white : C.strawberry} position={[-0.9 + i * 0.36, 0, 0]} outline={false} />
        ))}
      </group>
      {flowers.map(([x, color], i) => (
        <group key={i} position={[x, 0.91, 0.1]}>
          <Cyl r={0.11} h={0.18} color={C.lightGray} />
          <Cyl r={0.015} h={0.2} color={C.leafDark} position={[0, 0.18, 0]} outline={false} />
          <Ball r={0.09} color={color} position={[0, 0.32, 0]} />
        </group>
      ))}
    </group>
  )
}

/** Coffee corner: small table, two stools and a home coffee machine. */
export function CoffeeCorner(props: GroupProps) {
  return (
    <group {...props}>
      <Cyl r={0.5} h={0.06} color={C.wood} position={[0, 0.72, 0]} />
      <Cyl r={0.07} h={0.72} color={C.woodDark} position={[0, 0.36, 0]} />
      <Cyl r={0.28} h={0.04} color={C.woodDark} position={[0, 0.02, 0]} />
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.05, 0, 0]}>
          <Cyl r={0.26} h={0.06} color={C.wood} position={[0, 0.45, 0]} />
          <Cyl r={0.05} h={0.45} color={C.woodDark} position={[0, 0.22, 0]} />
          <Cyl r={0.2} h={0.04} color={C.woodDark} position={[0, 0.02, 0]} />
        </group>
      ))}
      <group position={[0, 0.75, -0.05]}>
        <RBox size={[0.4, 0.35, 0.3]} radius={0.05} color={C.dark} position={[0, 0.18, 0]} />
        <Box size={[0.22, 0.08, 0.02]} color={C.screen} position={[0, 0.22, 0.16]} outline={false} />
        <Cyl r={0.05} h={0.09} color={C.white} position={[0, 0.05, 0.14]} />
      </group>
      <Cyl r={0.09} h={0.04} color={C.strawberry} position={[0.25, 0.77, 0.1]} outline={false} />
    </group>
  )
}

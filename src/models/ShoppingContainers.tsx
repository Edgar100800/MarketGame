import { useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import type { Group } from 'three'
import { C } from '../materials/palette'
import type { CustomerItem } from '../game/types'
import { Box, Cyl, ItemPop, RBox } from './parts'
import { Product } from './Products'
import { Rigid } from './Rigid'

type GroupProps = ThreeElements['group']

function BasketItems({ items, cart = false }: { items: CustomerItem[]; cart?: boolean }) {
  const cols = cart ? 4 : 2
  const gapX = cart ? 0.22 : 0.24
  const gapZ = cart ? 0.26 : 0.24
  return items.map((item, index) => (
    <ItemPop
      key={item.id}
      animate
      position={[(index % cols - (cols - 1) / 2) * gapX, cart ? 0.64 : 0.25, (Math.floor(index / cols) - 0.5) * gapZ]}
    >
      <Product kind={item.kind} scale={cart ? 0.68 : 0.72} />
    </ItemPop>
  ))
}

/** Four-item hand basket with a raised handle and open slatted sides. */
export function ShoppingBasket({ items, ...props }: GroupProps & { items: CustomerItem[] }) {
  return (
    <group {...props}>
      <Rigid>
      {/* Rounded base and open slats keep products visible from every angle. */}
      <RBox size={[0.76, 0.12, 0.56]} radius={0.055} color={C.orange} position={[0, 0.02, 0]} />
      {[-1, 1].map((side) => (
        <group key={`side-${side}`} position={[side * 0.37, 0.22, 0]}>
          <Box size={[0.055, 0.42, 0.58]} color={C.orange} />
          {[-0.2, 0, 0.2].map((z) => <Box key={z} size={[0.075, 0.05, 0.08]} color={C.cream} position={[-side * 0.005, 0, z]} outline={false} />)}
        </group>
      ))}
      {[-1, 1].map((front) => (
        <group key={`rim-${front}`} position={[0, 0.22, front * 0.27]}>
          <Box size={[0.76, 0.065, 0.065]} color={C.orange} />
          {[-0.24, 0, 0.24].map((x) => <Box key={x} size={[0.045, 0.34, 0.045]} color={C.orange} position={[x, -0.07, 0]} />)}
        </group>
      ))}
      {/* Hinged handle: dark grip, orange arms. */}
      <Box size={[0.055, 0.62, 0.055]} color={C.orange} position={[-0.3, 0.42, 0]} rotation={[0, 0, -0.34]} />
      <Box size={[0.055, 0.62, 0.055]} color={C.orange} position={[0.3, 0.42, 0]} rotation={[0, 0, 0.34]} />
      <RBox size={[0.42, 0.075, 0.075]} radius={0.03} color={C.dark} position={[0, 0.69, 0]} />
      </Rigid>
      <BasketItems items={items} />
    </group>
  )
}

/** Eight-item shopping cart. It is visual only and follows the customer's transform. */
export function ShoppingCart({ items, moving, ...props }: GroupProps & { items: CustomerItem[]; moving?: boolean }) {
  const wheels = useRef<(Group | null)[]>([])
  const frame = useRef<Group>(null)
  useFrame(({ clock }, dt) => {
    if (moving) for (const wheel of wheels.current) if (wheel) wheel.rotation.x -= dt * 9
    if (frame.current) frame.current.rotation.z = moving ? Math.sin(clock.elapsedTime * 12) * 0.008 : 0
  })
  return (
    <group {...props}>
      <group ref={frame}>
        <Rigid>
        {/* Dark chassis floats over the wheels and carries the mint basket. */}
        <Box size={[0.88, 0.07, 0.62]} color={C.dark} position={[0, 0.34, 0.03]} />

        {/* Wide shallow basket: floor, full rim and wire walls read as wire mesh from every angle. */}
        <RBox size={[0.98, 0.09, 0.68]} radius={0.04} color={C.counter} position={[0, 0.52, 0.05]} />
        <Box size={[1.06, 0.08, 0.08]} color={C.wallStripe} position={[0, 0.92, -0.25]} />
        <Box size={[1.06, 0.08, 0.08]} color={C.wallStripe} position={[0, 0.92, 0.35]} />
        <Box size={[0.08, 0.08, 0.68]} color={C.wallStripe} position={[-0.49, 0.92, 0.05]} />
        <Box size={[0.08, 0.08, 0.68]} color={C.wallStripe} position={[0.49, 0.92, 0.05]} />
        {[-1, 1].map((side) => (
          <group key={`cart-side-${side}`} position={[side * 0.485, 0.71, 0.05]}>
            <Box size={[0.05, 0.36, 0.6]} color={C.counter} />
            {[-0.21, -0.07, 0.07, 0.21].map((z) => <Box key={z} size={[0.075, 0.05, 0.05]} color={C.cream} position={[-side * 0.005, 0, z]} outline={false} />)}
          </group>
        ))}
        {[-1, 1].map((front) => (
          <group key={`cart-end-${front}`} position={[0, 0.71, 0.05 + front * 0.3]}>
            {[-0.36, -0.12, 0.12, 0.36].map((x) => <Box key={x} size={[0.045, 0.36, 0.045]} color={C.counter} position={[x, 0, 0]} />)}
          </group>
        ))}

        {/* Fold-out child seat raised behind the basket, tilted like the real flap. */}
        <RBox size={[0.78, 0.3, 0.06]} radius={0.025} color={C.wallStripe} position={[0, 0.82, -0.37]} rotation={[-0.16, 0, 0]} />

        {/* Short rear posts meet the orange push handle right at their tops. */}
        <Box size={[0.06, 0.62, 0.06]} color={C.dark} position={[-0.4, 0.76, -0.4]} rotation={[-0.38, 0, 0]} />
        <Box size={[0.06, 0.62, 0.06]} color={C.dark} position={[0.4, 0.76, -0.4]} rotation={[-0.38, 0, 0]} />
        <RBox size={[0.9, 0.1, 0.1]} radius={0.04} color={C.orange} position={[0, 1.06, -0.52]} />
        <Box size={[0.42, 0.035, 0.115]} color={C.cream} position={[0, 1.06, -0.525]} outline={false} />

        {/* Lower rack gives empty cart useful detail. */}
        <Box size={[0.66, 0.05, 0.46]} color={C.gray} position={[0, 0.35, 0.03]} />
        {[-0.2, 0, 0.2].map((x) => <Box key={x} size={[0.035, 0.04, 0.46]} color={C.lightGray} position={[x, 0.38, 0.03]} />)}
        </Rigid>
        <BasketItems items={items} cart />
      </group>

      <group>
        {/* Small trolley wheels: bigger fixed rears, slimmer swivel fronts. */}
        {[-1, 1].flatMap((x) =>
          [-1, 1].map((z, zi) => {
            const index = (x === -1 ? 0 : 2) + zi
            const rear = z === -1
            const r = rear ? 0.12 : 0.1
            return (
            <group key={`${x}:${z}`} position={[x * 0.4, r, rear ? -0.24 : 0.28]}>
              <Box size={[0.06, 0.14, 0.06]} color={C.gray} position={[0, 0.1, 0]} />
              <group ref={(group) => { wheels.current[index] = group }}>
                <Cyl r={r} h={0.09} seg={12} color={C.dark} rotation={[0, 0, Math.PI / 2]} />
                <Cyl r={r * 0.38} h={0.095} seg={10} color={C.lightGray} rotation={[0, 0, Math.PI / 2]} />
              </group>
            </group>
          )}),
        )}
      </group>
    </group>
  )
}

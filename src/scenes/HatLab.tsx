import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { C, CUSTOMER_COLORS } from '../materials/palette'
import { Lighting } from './Lighting'
import { Character, type HatKind } from '../models/Character'
import { SafeHtml } from '../models/Labels'

const HATS: [HatKind, string][] = [
  ['beanie', '#4AA8FF'],
  ['bob', '#5C3A21'],
  ['bun', '#2B2B2B'],
  ['afro', '#3B2414'],
  ['bucket', '#F2C14E'],
  ['cap', '#E8453C'],
]

/** `?view=chars&hats=1&angle=90`: every headwear side by side, close on the heads, turned by `angle` degrees. */
export function HatLab() {
  const angle = Number(new URLSearchParams(location.search).get('angle') ?? 0) || 0
  return (
    <>
      <PerspectiveCamera makeDefault fov={22} position={[0, 2.6, 11]} />
      <OrbitControls target={[0, 1.15, 0]} />
      <color attach="background" args={[C.grass]} />
      <Lighting size={12} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshToonMaterial color={C.floor} />
      </mesh>
      {HATS.map(([hat, color], i) => (
        <group key={hat} position={[-3.75 + i * 1.5, 0, 0]}>
          <group rotation={[0, (angle * Math.PI) / 180, 0]}>
            <Character color={CUSTOMER_COLORS[i % CUSTOMER_COLORS.length]} hat={hat} hatColor={color} pose={0} />
          </group>
          <SafeHtml position={[0, 0.5, 0.5]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
            <div className="tag">{hat}</div>
          </SafeHtml>
        </group>
      ))}
    </>
  )
}

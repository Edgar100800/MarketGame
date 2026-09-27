import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { C, CUSTOMER_COLORS } from '../materials/palette'
import { Lighting } from './Lighting'
import { Character } from '../models/Character'
import { CarryStack } from '../models/CarryStack'
import { SafeHtml } from '../models/Labels'

const tag = (text: string) => (
  <SafeHtml position={[0, -0.25, 0.6]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
    <div className="tag">{text}</div>
  </SafeHtml>
)

/** Close-up of the characters: frozen walk phases (side view) and live animations. */
export function CharacterLab() {
  return (
    <>
      <PerspectiveCamera makeDefault fov={28} position={[0, 3.2, 13]} />
      <OrbitControls target={[0, 0.8, 0]} />
      <color attach="background" args={[C.grass]} />
      <Lighting size={10} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshToonMaterial color={C.floor} />
      </mesh>

      {/* back row: walk cycle frozen at 4 phases, side view */}
      {[0, 0.5, 1, 1.5].map((k, i) => (
        <group key={k} position={[-3.3 + i * 2.2, 0, -1.5]}>
          <Character color={C.player} pose={k * Math.PI} rotation={[0, Math.PI / 2, 0]} />
          {tag(`Caminar ${k * 180}°`)}
        </group>
      ))}

      {/* front row: live animations */}
      <group position={[-4.4, 0, 1.6]}>
        <Character color={C.player} />
        {tag('Jugador quieto')}
      </group>
      <group position={[-2.2, 0, 1.6]} rotation={[0, 0.5, 0]}>
        <Character color={C.player} walking />
        {tag('Jugador camina')}
      </group>
      <group position={[0, 0, 1.6]} rotation={[0, 0.5, 0]}>
        <Character color={C.player} walking carry={<CarryStack moving items={(['tomato', 'egg', 'tomato'] as const).map((kind, id) => ({ id, kind }))} />} />
        {tag('Cargando')}
      </group>
      <group position={[2.2, 0, 1.6]} rotation={[0, -0.5, 0]}>
        <Character color={CUSTOMER_COLORS[0]} hat="cap" walking />
        {tag('Cliente')}
      </group>
      <group position={[4.4, 0, 1.6]} rotation={[0, -0.3, 0]}>
        <Character color={CUSTOMER_COLORS[1]} hat="beanie" hatColor="#4AA8FF" />
        {tag('Cliente gorro')}
      </group>
    </>
  )
}

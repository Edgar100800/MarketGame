import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Object3D, Vector3, type DirectionalLight } from 'three'

const SUN = new Vector3(12, 30, 16)
const MAP_SIZE = 2048
const ray = new Vector3()
const focus = new Vector3()

/**
 * Bright, soft lighting: strong sky fill so shadows stay light, one sun for the toon ramp.
 * `follow`: the shadow box (half-size `size`) tracks the ground point the camera looks at, so only
 * casters near the view are drawn into the shadow map. `shadowHz` caps how often the map is redrawn.
 */
export function Lighting({ size = 30, follow = false, shadowHz = 30 }: { size?: number; follow?: boolean; shadowHz?: number }) {
  const light = useRef<DirectionalLight>(null)
  const target = useMemo(() => new Object3D(), [])
  const gl = useThree((s) => s.gl)
  const since = useRef(Infinity)

  useEffect(() => {
    gl.shadowMap.autoUpdate = false
    gl.shadowMap.needsUpdate = true
    return () => {
      gl.shadowMap.autoUpdate = true
    }
  }, [gl])

  useFrame(({ camera }, dt) => {
    const sun = light.current
    if (!sun) return
    since.current += dt
    if (since.current < 1 / shadowHz) return
    since.current = 0
    if (follow) {
      // where the view ray meets the ground, snapped to shadow texels so edges don't shimmer
      camera.getWorldDirection(ray)
      const t = ray.y < -0.01 ? -camera.position.y / ray.y : 0
      const texel = (size * 2) / MAP_SIZE
      focus.copy(camera.position).addScaledVector(ray, t)
      focus.set(Math.round(focus.x / texel) * texel, 0, Math.round(focus.z / texel) * texel)
      target.position.copy(focus)
      sun.position.copy(focus).add(SUN)
      target.updateMatrixWorld()
    }
    gl.shadowMap.needsUpdate = true
  })

  return (
    <>
      <hemisphereLight args={['#ffffff', '#e8d9b0', 1.9]} />
      <primitive object={target} />
      <directionalLight
        ref={light}
        target={target}
        position={SUN.toArray()}
        intensity={1.7}
        castShadow
        shadow-mapSize={[MAP_SIZE, MAP_SIZE]}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
        shadow-camera-left={-size}
        shadow-camera-right={size}
        shadow-camera-top={size}
        shadow-camera-bottom={-size}
        shadow-camera-near={1}
        shadow-camera-far={100}
      />
    </>
  )
}

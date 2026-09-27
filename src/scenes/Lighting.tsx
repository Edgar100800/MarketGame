/** Bright, soft lighting: strong sky fill so shadows stay light, one sun for the toon ramp. */
export function Lighting({ size = 30 }: { size?: number }) {
  return (
    <>
      <hemisphereLight args={['#ffffff', '#e8d9b0', 1.9]} />
      <directionalLight
        position={[12, 30, 16]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[4096, 4096]}
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

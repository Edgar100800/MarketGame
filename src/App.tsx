import { useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { NoToneMapping, SRGBColorSpace } from 'three'
import { Level1 } from './scenes/Level1'
import { Hud, Joystick } from './components/Hud'
import { debug, saveNow } from './game/state'

export default function App() {
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') saveNow()
    }
    window.addEventListener('pagehide', saveNow)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', saveNow)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])
  return (
    <>
      <Canvas
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace, preserveDrawingBuffer: debug.shot }}
      >
        <Level1 />
      </Canvas>
      {!debug.shot && <Joystick />}
      {!debug.shot && <Hud />}
    </>
  )
}

import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { NoToneMapping, SRGBColorSpace } from 'three'
import { ModelGallery } from './scenes/ModelGallery'
import { TestLevel } from './scenes/TestLevel'
import { Level1 } from './scenes/Level1'
import { CharacterLab } from './scenes/CharacterLab'
import { Hud, Joystick } from './components/Hud'
import { useGame } from './game/state'
import { reloadLevel } from './game/state'
import { useEditor } from './game/editor'
import { LevelEditorControls } from './components/LevelEditorControls'

type View = 'play' | 'level' | 'models' | 'chars'

function initialView(): View {
  const v = new URLSearchParams(location.search).get('view')
  return v === 'models' || v === 'level' || v === 'chars' ? v : 'play'
}

const TABS: [View, string][] = [
  ['play', 'Jugar'],
  ['level', 'Nivel de prueba'],
  ['models', 'Modelos'],
  ['chars', 'Personajes'],
]

export default function App() {
  const [view, setView] = useState<View>(initialView)
  const run = useGame((s) => s.run)
  const editing = useEditor((s) => s.enabled)
  const setEditing = useEditor((s) => s.setEnabled)
  const closeEditor = () => {
    setEditing(false)
    reloadLevel()
  }
  return (
    <>
      <Canvas
        key={`${view}-${run}`}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: NoToneMapping, outputColorSpace: SRGBColorSpace, preserveDrawingBuffer: true }}
      >
        {view === 'play' && <Level1 editing={editing} />}
        {view === 'level' && <TestLevel />}
        {view === 'models' && <ModelGallery />}
        {view === 'chars' && <CharacterLab />}
      </Canvas>
      {view === 'play' && !editing && (
        <>
          <Joystick />
          <Hud />
        </>
      )}
      {view === 'play' && import.meta.env.DEV && !editing && (
        <button className="level-editor-open" onClick={() => setEditing(true)}>Editar nivel</button>
      )}
      {view === 'play' && editing && <LevelEditorControls onExit={closeEditor} />}
      <nav className="tabs">
        {TABS.map(([v, label]) => (
          <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
            {label}
          </button>
        ))}
      </nav>
    </>
  )
}

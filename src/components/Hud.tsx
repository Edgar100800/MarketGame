import { useEffect, useRef, useState } from 'react'
import { debug, input, restart, useGame } from '../game/state'
import { ProductIcon } from '../models/Icon2D'
import { UpgradesPanel } from './UpgradesPanel'
import { getVolume, isMuted, outputLevel, previewSound, setMuted, setVolume, uiClick } from '../audio/sfx'

type MoneyFloat = { id: number; text: string; loss: boolean }

/** Money counter that eases towards the real value, pulses and floats "+$X" / "-$X" on changes. */
function MoneyCounter() {
  const money = useGame((s) => s.money)
  const [shown, setShown] = useState(money)
  const [pulsing, setPulsing] = useState(false)
  const [floats, setFloats] = useState<MoneyFloat[]>([])
  const prev = useRef(money)
  const pending = useRef(0)
  const pendingLoss = useRef(0)
  const nextId = useRef(0)

  // roll towards the real value with exponential ease-out
  useEffect(() => {
    if (shown === money) return
    const id = requestAnimationFrame(() => {
      const diff = money - shown
      setShown(shown + Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) * 0.1)))
    })
    return () => cancelAnimationFrame(id)
  }, [money, shown])

  // gains pulse the number and pile up into a single "+$X" floater
  useEffect(() => {
    const gain = money - prev.current
    prev.current = money
    if (gain > 0) {
      setPulsing(true)
      pending.current += gain
    } else if (gain < 0) {
      pendingLoss.current -= gain
    } else return
    const id = setTimeout(() => {
      const amount = pending.current
      const lost = pendingLoss.current
      pending.current = 0
      pendingLoss.current = 0
      const batch: MoneyFloat[] = []
      if (amount > 0) batch.push({ id: nextId.current++, text: `+$${amount}`, loss: false })
      if (lost > 0) batch.push({ id: nextId.current++, text: `-$${lost}`, loss: true })
      if (!batch.length) return
      setFloats((fs) => [...fs, ...batch])
      const keys = batch.map((f) => f.id)
      setTimeout(() => setFloats((fs) => fs.filter((f) => !keys.includes(f.id))), 1100)
    }, 300)
    return () => clearTimeout(id)
  }, [money])

  return (
    <div className="hud-money">
      <ProductIcon kind="money" className="hud-money-icon" />
      <span className={pulsing ? 'hud-money-value pulse' : 'hud-money-value'} onAnimationEnd={() => setPulsing(false)}>
        {shown}
      </span>
      {floats.map((f) => (
        <span key={f.id} className={f.loss ? 'hud-money-float loss' : 'hud-money-float'}>
          {f.text}
        </span>
      ))}
    </div>
  )
}

const SPEAKER = 'M4 9h4l5-4v14l-5-4H4z'

function SpeakerIcon({ muted, volume }: { muted: boolean; volume: number }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d={SPEAKER} fill="currentColor" />
      {muted || volume === 0 ? (
        <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      ) : (
        <path d={volume < 0.5 ? 'M16 8.5a5 5 0 0 1 0 7' : 'M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      )}
    </svg>
  )
}

const METER_BARS = 12

function loudnessLabel(muted: boolean, volume: number) {
  if (muted || volume === 0) return 'Silencio'
  if (volume < 0.35) return 'Suave'
  if (volume < 0.7) return 'Media'
  if (volume < 0.9) return 'Fuerte'
  return 'Máxima'
}

/** Live output meter: bars follow the peak of the final mix and fall back slowly. */
function LevelMeter() {
  const [lit, setLit] = useState(0)
  useEffect(() => {
    let raf = 0
    let shown = 0
    const frame = () => {
      shown = Math.max(outputLevel(), shown * 0.9)
      const bars = Math.round(Math.sqrt(shown) * METER_BARS)
      setLit((prev) => (prev === bars ? prev : bars))
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="snd-meter" aria-hidden="true">
      {Array.from({ length: METER_BARS }, (_, i) => (
        <span key={i} className={i < lit ? `on ${i >= METER_BARS - 2 ? 'hot' : i >= METER_BARS - 5 ? 'warm' : ''}` : ''} style={{ height: `${35 + (i / (METER_BARS - 1)) * 65}%` }} />
      ))}
    </div>
  )
}

/** Speaker button that opens the sound panel: mute, volume slider with a sample sound and a live level meter. */
function SoundControl() {
  const [open, setOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted)
  const [volume, setVolumeState] = useState(getVolume)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])

  const changeVolume = (v: number) => {
    setVolume(v)
    setVolumeState(v)
    setMutedState(isMuted())
    previewSound()
  }

  return (
    <div ref={box}>
      <button
        className={muted ? 'hud-sound off' : 'hud-sound'}
        title="Sonido"
        onClick={() => {
          uiClick()
          setOpen(!open)
        }}
      >
        <SpeakerIcon muted={muted} volume={volume} />
      </button>
      {open && (
        <div className="snd-panel">
          <div className="snd-head">
            <span>Sonido</span>
            <span className="snd-label">{loudnessLabel(muted, volume)}</span>
          </div>
          <div className="snd-row">
            <button
              className={muted ? 'snd-mute off' : 'snd-mute'}
              title={muted ? 'Activar sonido' : 'Silenciar'}
              onClick={() => {
                setMuted(!muted)
                setMutedState(!muted)
                if (muted) previewSound()
              }}
            >
              <SpeakerIcon muted={muted} volume={volume} />
            </button>
            <input
              className="snd-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(volume * 100)}
              style={{ '--fill': `${muted ? 0 : volume * 100}%` } as React.CSSProperties}
              onChange={(e) => changeVolume(Number(e.target.value) / 100)}
              onPointerUp={previewSound}
              aria-label="Volumen"
            />
            <span className="snd-pct">{muted ? 0 : Math.round(volume * 100)}%</span>
          </div>
          <LevelMeter />
          <div className="snd-hint">Mueve la barra para escuchar cómo suena</div>
        </div>
      )}
    </div>
  )
}

export function Hud() {
  const objective = useGame((s) => s.objective.text)
  const completed = useGame((s) => s.completed)
  const [upgrades, setUpgrades] = useState(debug.upgrades)
  return (
    <>
      <MoneyCounter />
      <SoundControl />
      <button
        className="hud-upgrades"
        onClick={() => {
          uiClick()
          setUpgrades(true)
        }}
      >
        Mejoras
      </button>
      {upgrades && <UpgradesPanel onClose={() => setUpgrades(false)} />}
      <div className="hud-objective">{objective}</div>
      <button className="hud-reset" onClick={restart}>
        Reiniciar
      </button>
      {completed && (
        <div className="hud-complete">
          <div className="hud-complete-card">
            <div className="hud-complete-title">¡Nivel 1 completado!</div>
            <button onClick={restart}>Jugar de nuevo</button>
          </div>
        </div>
      )}
    </>
  )
}

const KEYS: Record<string, [number, number]> = {
  KeyW: [0, 1],
  ArrowUp: [0, 1],
  KeyS: [0, -1],
  ArrowDown: [0, -1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
}

const RADIUS = 60

/** Floating joystick: touch/click anywhere to place it, drag to move. Also WASD / arrows. */
export function Joystick() {
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null)
  const pressed = useRef(new Set<string>())

  useEffect(() => {
    const apply = () => {
      let x = 0
      let y = 0
      for (const k of pressed.current) {
        x += KEYS[k][0]
        y += KEYS[k][1]
      }
      input.x = x
      input.y = y
    }
    const down = (e: KeyboardEvent) => {
      if (!KEYS[e.code]) return
      pressed.current.add(e.code)
      apply()
    }
    const up = (e: KeyboardEvent) => {
      pressed.current.delete(e.code)
      apply()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      input.x = 0
      input.y = 0
    }
  }, [])

  const move = (e: React.PointerEvent) => {
    if (!stick) return
    let dx = e.clientX - stick.x
    let dy = e.clientY - stick.y
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    input.x = dx / RADIUS
    input.y = -dy / RADIUS
    setStick({ ...stick, dx, dy })
  }
  const end = () => {
    setStick(null)
    input.x = 0
    input.y = 0
  }

  return (
    <div
      className="joy-layer"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        setStick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 })
      }}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {stick && (
        <div className="joy-base" style={{ left: stick.x, top: stick.y }}>
          <div className="joy-knob" style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
        </div>
      )}
    </div>
  )
}

import { useMemo } from 'react'
import type { ThreeElements } from '@react-three/fiber'
import { CanvasTexture, SRGBColorSpace, type Texture } from 'three'
import { C } from '../materials/palette'
import type { ProductKind } from './Products'

// Flat 2D icons (cartoon style, thick black ink) drawn once on a canvas and used as textures.
// Used on shelf signs so the sign reads like a printed label, not a 3D object.

const SIZE = 128
const INK = C.outline
const LINE = 9

type Draw = (g: CanvasRenderingContext2D) => void

function blob(g: CanvasRenderingContext2D, fill: string, path: () => void) {
  g.beginPath()
  path()
  g.fillStyle = fill
  g.fill()
  g.lineWidth = LINE
  g.strokeStyle = INK
  g.lineJoin = 'round'
  g.stroke()
}

function leaf(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  blob(g, C.leaf, () => {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2
      const rr = i % 2 ? r * 0.45 : r
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.7)
    }
    g.closePath()
  })
}

function shine(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  g.beginPath()
  g.ellipse(x, y, w, h, -0.6, 0, Math.PI * 2)
  g.fillStyle = 'rgba(255,255,255,0.7)'
  g.fill()
}

const DRAW: Record<ProductKind, Draw> = {
  tomato: (g) => {
    blob(g, C.tomato, () => g.ellipse(64, 72, 44, 38, 0, 0, Math.PI * 2))
    shine(g, 46, 58, 10, 6)
    leaf(g, 64, 38, 20)
  },
  egg: (g) => {
    blob(g, C.egg, () => g.ellipse(64, 68, 34, 44, 0, 0, Math.PI * 2))
    shine(g, 50, 50, 8, 12)
  },
  bread: (g) => {
    blob(g, C.bread, () => g.roundRect(18, 40, 92, 58, 28))
    g.lineWidth = 6
    g.strokeStyle = C.breadTop
    for (const x of [44, 64, 84]) {
      g.beginPath()
      g.moveTo(x - 8, 52)
      g.lineTo(x + 6, 70)
      g.stroke()
    }
  },
  wheat: (g) => {
    g.lineWidth = 7
    g.strokeStyle = INK
    g.beginPath()
    g.moveTo(64, 112)
    g.lineTo(64, 40)
    g.stroke()
    for (let i = 0; i < 4; i++)
      for (const side of [-1, 1])
        blob(g, C.wheat, () => g.ellipse(64 + side * 13, 36 + i * 17, 9, 14, side * 0.5, 0, Math.PI * 2))
    blob(g, C.wheat, () => g.ellipse(64, 24, 9, 14, 0, 0, Math.PI * 2))
  },
  tomatoCan: (g) => {
    blob(g, C.tomato, () => g.roundRect(30, 26, 68, 84, 10))
    blob(g, C.white, () => g.rect(30, 50, 68, 34))
    blob(g, C.tomato, () => g.arc(64, 67, 11, 0, Math.PI * 2))
    blob(g, C.lightGray, () => g.ellipse(64, 26, 34, 9, 0, 0, Math.PI * 2))
  },
  flour: (g) => {
    blob(g, C.cream, () => {
      g.moveTo(34, 40)
      g.quadraticCurveTo(20, 110, 40, 112)
      g.lineTo(88, 112)
      g.quadraticCurveTo(108, 110, 94, 40)
      g.closePath()
    })
    blob(g, C.cream, () => g.ellipse(64, 34, 20, 10, 0, 0, Math.PI * 2))
    blob(g, C.wheat, () => g.ellipse(64, 80, 14, 18, 0, 0, Math.PI * 2))
  },
  can: (g) => {
    blob(g, C.can, () => g.roundRect(34, 26, 60, 84, 10))
    blob(g, C.lightGray, () => g.ellipse(64, 26, 30, 8, 0, 0, Math.PI * 2))
  },
  milk: (g) => {
    blob(g, C.white, () => {
      g.moveTo(36, 44)
      g.lineTo(64, 18)
      g.lineTo(92, 44)
      g.lineTo(92, 112)
      g.lineTo(36, 112)
      g.closePath()
    })
    blob(g, C.milkBand, () => g.rect(36, 64, 56, 26))
  },
  cheese: (g) => {
    blob(g, C.cheese, () => {
      g.moveTo(24, 92)
      g.lineTo(104, 92)
      g.lineTo(86, 38)
      g.closePath()
    })
    for (const [x, y, r] of [[53, 75, 7], [78, 64, 6], [80, 84, 5]] as const) blob(g, C.cheeseRind, () => g.arc(x, y, r, 0, Math.PI * 2))
  },
  cake: (g) => {
    blob(g, C.bread, () => g.roundRect(24, 52, 80, 52, 12))
    blob(g, C.cream, () => g.roundRect(22, 45, 84, 18, 9))
    blob(g, C.bread, () => g.roundRect(32, 28, 64, 28, 10))
    blob(g, C.cream, () => g.roundRect(30, 22, 68, 14, 7))
    blob(g, C.tomato, () => g.arc(64, 18, 8, 0, Math.PI * 2))
  },
  money: (g) => {
    blob(g, C.money, () => g.roundRect(14, 36, 100, 58, 8))
    blob(g, C.moneyDark, () => g.arc(64, 65, 15, 0, Math.PI * 2))
  },
  strawberry: (g) => {
    blob(g, C.strawberry, () => {
      g.moveTo(30, 52)
      g.quadraticCurveTo(26, 100, 64, 112)
      g.quadraticCurveTo(102, 100, 98, 52)
      g.quadraticCurveTo(64, 38, 30, 52)
      g.closePath()
    })
    for (const [x, y] of [[48, 68], [66, 60], [80, 74], [58, 88], [76, 92]] as const) blob(g, C.egg, () => g.arc(x, y, 3.5, 0, Math.PI * 2))
    leaf(g, 64, 42, 18)
  },
  honey: (g) => {
    blob(g, C.honey, () => g.roundRect(34, 34, 60, 80, 14))
    blob(g, C.cream, () => g.rect(34, 60, 60, 28))
    blob(g, C.wood, () => g.roundRect(30, 22, 68, 18, 8))
  },
  apple: (g) => {
    blob(g, C.tomato, () => g.ellipse(64, 72, 42, 38, 0, 0, Math.PI * 2))
    shine(g, 46, 58, 10, 6)
    g.lineWidth = 7
    g.strokeStyle = INK
    g.beginPath()
    g.moveTo(64, 36)
    g.quadraticCurveTo(66, 24, 74, 18)
    g.stroke()
    leaf(g, 82, 28, 14)
  },
  jam: (g) => {
    blob(g, C.jam, () => g.roundRect(32, 36, 64, 78, 12))
    blob(g, C.white, () => g.rect(32, 62, 64, 26))
    blob(g, C.strawberry, () => {
      g.beginPath()
      g.ellipse(64, 28, 34, 12, 0, 0, Math.PI * 2)
      g.closePath()
    })
  },
  pizza: (g) => {
    blob(g, C.bread, () => g.arc(64, 66, 48, 0, Math.PI * 2))
    blob(g, C.tomato, () => g.arc(64, 66, 38, 0, Math.PI * 2))
    blob(g, C.cheese, () => g.arc(64, 66, 30, 0, Math.PI * 2))
    for (const [x, y] of [[50, 56], [76, 60], [58, 78], [78, 80]] as const) blob(g, C.jam, () => g.arc(x, y, 7, 0, Math.PI * 2))
    for (const [x, y] of [[64, 48], [44, 70]] as const) blob(g, C.leafDark, () => g.ellipse(x, y, 5, 3, 0.6, 0, Math.PI * 2))
  },
  juice: (g) => {
    blob(g, C.juice, () => {
      g.moveTo(52, 16)
      g.lineTo(76, 16)
      g.lineTo(76, 34)
      g.quadraticCurveTo(96, 40, 96, 58)
      g.lineTo(96, 112)
      g.lineTo(32, 112)
      g.lineTo(32, 58)
      g.quadraticCurveTo(32, 40, 52, 34)
      g.closePath()
    })
    blob(g, C.leaf, () => g.roundRect(48, 8, 32, 14, 5))
    blob(g, C.white, () => g.rect(32, 64, 64, 30))
    blob(g, C.tomato, () => g.arc(64, 79, 9, 0, Math.PI * 2))
    shine(g, 44, 52, 5, 9)
  },
  butter: (g) => {
    blob(g, C.cream, () => g.roundRect(14, 50, 76, 48, 8))
    blob(g, C.butter, () => g.roundRect(80, 46, 34, 52, 8))
    blob(g, C.milkBand, () => g.rect(30, 64, 40, 18))
  },
  iceCream: (g) => {
    blob(g, C.cone, () => {
      g.moveTo(36, 62)
      g.lineTo(92, 62)
      g.lineTo(64, 120)
      g.closePath()
    })
    g.lineWidth = 4
    g.strokeStyle = C.bread
    for (const x of [50, 64, 78]) {
      g.beginPath()
      g.moveTo(x, 68)
      g.lineTo(x - 8, 82)
      g.stroke()
    }
    blob(g, C.iceCream, () => g.arc(64, 54, 30, Math.PI * 0.95, Math.PI * 2.05))
    blob(g, C.cream, () => g.ellipse(64, 30, 18, 13, 0, 0, Math.PI * 2))
    blob(g, C.strawberry, () => g.arc(64, 14, 7, 0, Math.PI * 2))
  },
  ketchup: (g) => {
    blob(g, C.white, () => {
      g.moveTo(58, 6)
      g.lineTo(70, 6)
      g.lineTo(76, 28)
      g.lineTo(52, 28)
      g.closePath()
    })
    blob(g, C.white, () => g.roundRect(42, 24, 44, 14, 5))
    blob(g, C.ketchup, () => g.roundRect(34, 36, 60, 78, 18))
    blob(g, C.white, () => g.rect(34, 62, 60, 28))
    blob(g, C.tomato, () => g.arc(64, 76, 9, 0, Math.PI * 2))
  },
  pancakes: (g) => {
    blob(g, C.white, () => g.ellipse(64, 100, 54, 14, 0, 0, Math.PI * 2))
    for (const y of [86, 70, 54]) blob(g, C.pancake, () => g.roundRect(22, y - 10, 84, 20, 10))
    blob(g, C.honey, () => {
      g.moveTo(30, 42)
      g.lineTo(98, 42)
      g.lineTo(98, 56)
      g.quadraticCurveTo(92, 72, 86, 56)
      g.lineTo(42, 56)
      g.quadraticCurveTo(36, 66, 30, 56)
      g.closePath()
    })
    blob(g, C.butter, () => g.roundRect(52, 28, 24, 16, 4))
  },
}

const cache = new Map<ProductKind, Texture>()
const canvases = new Map<ProductKind, HTMLCanvasElement>()

function iconCanvas(kind: ProductKind) {
  let canvas = canvases.get(kind)
  if (!canvas) {
    canvas = document.createElement('canvas')
    canvas.width = SIZE
    canvas.height = SIZE
    DRAW[kind](canvas.getContext('2d')!)
    canvases.set(kind, canvas)
  }
  return canvas
}

/** Data URL for DOM labels; it is generated from the exact same drawing used in 3D. */
export function iconDataUrl(kind: ProductKind) {
  return iconCanvas(kind).toDataURL('image/png')
}

export function ProductIcon({ kind, className }: { kind: ProductKind; className?: string }) {
  return <img className={className} src={iconDataUrl(kind)} alt="" aria-hidden="true" />
}

export function iconTexture(kind: ProductKind): Texture {
  let tex = cache.get(kind)
  if (!tex) {
    tex = new CanvasTexture(iconCanvas(kind))
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 4
    cache.set(kind, tex)
  }
  return tex
}

/** Flat, unlit 2D icon on a plane (faces +z). */
export function Icon2D({ kind, size = 0.5, ...props }: ThreeElements['group'] & { kind: ProductKind; size?: number }) {
  const map = useMemo(() => iconTexture(kind), [kind])
  return (
    <group {...props}>
      <mesh>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={map} transparent alphaTest={0.05} toneMapped={false} />
      </mesh>
    </group>
  )
}

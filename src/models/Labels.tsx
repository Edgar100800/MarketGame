import type { ComponentProps } from 'react'
import { Html } from '@react-three/drei'
import { useThree, type ThreeElements } from '@react-three/fiber'
import type { ProductKind } from '../game/types'
import { ProductIcon } from './Icon2D'

type GroupProps = ThreeElements['group']

/**
 * drei <Html> recreates its DOM root when the canvas gets connected to events,
 * and labels that never re-render stay empty. Mount it only once connected.
 */
export function SafeHtml(props: ComponentProps<typeof Html>) {
  const connected = useThree((s) => s.events.connected)
  return connected ? <Html {...props} /> : null
}

export const ICON = {
  tomato: 'tomato',
  egg: 'egg',
  bread: 'bread',
  wheat: 'wheat',
  milk: 'milk',
  can: 'tomatoCan',
  money: 'money',
} as const

/** Dark translucent pill with an icon and a counter ("4/8", "MAX"). */
export function Pill({ icon, text, ...props }: GroupProps & { icon?: ProductKind; text: string }) {
  return (
    <group {...props}>
      <SafeHtml center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="pill">
          {icon && <ProductIcon kind={icon} className="label-product-icon pill-icon" />}
          <span>{text}</span>
        </div>
      </SafeHtml>
    </group>
  )
}

/** White thought bubble above a customer, showing what they want. */
export function Bubble({ icon, text, ...props }: GroupProps & { icon?: ProductKind; text?: string }) {
  return (
    <group {...props}>
      <SafeHtml center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="bubble">
          {icon && <ProductIcon kind={icon} className="label-product-icon bubble-icon" />}
          {text && <span className="bubble-text">{text}</span>}
        </div>
      </SafeHtml>
    </group>
  )
}

/** Unlock label drawn over a BuyZone: icon, name (or level) and price. */
export function PriceTag({ icon, level, label, price, ...props }: GroupProps & { icon: ProductKind; level?: number; label?: string; price: number }) {
  return (
    <group {...props}>
      <SafeHtml center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="price">
          <ProductIcon kind={icon} className="label-product-icon price-icon" />
          <span className="price-level">{label ?? `LEVEL ${level}`}</span>
          <span className="price-cost">
            <ProductIcon kind="money" className="label-product-icon price-money-icon" /> {price}
          </span>
        </div>
      </SafeHtml>
    </group>
  )
}

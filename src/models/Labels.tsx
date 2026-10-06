import type { ComponentProps } from 'react'
import { Html } from '@react-three/drei'
import { useThree, type ThreeElements } from '@react-three/fiber'
import type { ProductKind } from '../game/types'
import { ProductIcon } from './Icon2D'
import { debug } from '../game/state'

type GroupProps = ThreeElements['group']

/**
 * drei <Html> recreates its DOM root when the canvas gets connected to events,
 * and labels that never re-render stay empty. Mount it only once connected.
 */
export function SafeHtml(props: ComponentProps<typeof Html>) {
  const connected = useThree((s) => s.events.connected)
  return connected && !debug.shotClean ? <Html {...props} /> : null
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
  // promo capture: counters clutter the footage (bubbles and money pops stay)
  if (debug.record) return null
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

/** White thought bubble above a customer: current want + one dot per list item. */
export function Bubble({ icon, text, dots, ...props }: GroupProps & { icon?: ProductKind; text?: string; dots?: { done: number; total: number } }) {
  return (
    <group {...props}>
      <SafeHtml center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="bubble">
          {icon && <ProductIcon kind={icon} className="label-product-icon bubble-icon" />}
          {text && <span className="bubble-text">{text}</span>}
          {dots && dots.total > 1 && (
            <span className="bubble-dots">
              {Array.from({ length: dots.total }, (_, i) => (
                <i key={i} className={i < dots.done ? 'dot done' : i === dots.done ? 'dot now' : 'dot'} />
              ))}
            </span>
          )}
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

export type OrderLine = { kind: ProductKind; done: number; total: number }

/**
 * Drive-up order card over a parked car or motorbike: countdown ring, one row per product
 * (icon + loaded/asked) and the reward. The ring goes green -> yellow -> red and shakes near zero.
 */
export function OrderTag({ lines, timeLeft, timeTotal, reward, ...props }: GroupProps & { lines: OrderLine[]; timeLeft: number; timeTotal: number; reward: number }) {
  const f = Math.max(0, Math.min(1, timeLeft / timeTotal))
  const color = f > 0.5 ? '#86db55' : f > 0.25 ? '#ffd23f' : '#e8352b'
  const complete = lines.every((l) => l.done >= l.total)
  return (
    <group {...props}>
      <SafeHtml center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className={complete ? 'order done' : f <= 0.25 ? 'order hurry' : 'order'}>
          <div className="order-timer" style={{ background: `conic-gradient(${color} ${f * 360}deg, #d9dde0 0deg)` }}>
            <span>{Math.ceil(timeLeft)}</span>
          </div>
          <div className="order-lines">
            {lines.map((l) => (
              <span key={l.kind} className={l.done >= l.total ? 'order-line ok' : 'order-line'}>
                <ProductIcon kind={l.kind} className="label-product-icon order-icon" />
                {l.done}/{l.total}
              </span>
            ))}
          </div>
          <span className="order-reward">
            <ProductIcon kind="money" className="label-product-icon order-money" />
            {reward}
          </span>
        </div>
      </SafeHtml>
    </group>
  )
}

/** Red alarm bubble over a thief: "!" badge, text and the cash he is carrying away. */
export function AlertTag({ text = '¡LADRÓN!', loot, ...props }: GroupProps & { text?: string; loot?: number }) {
  return (
    <group {...props}>
      <SafeHtml center zIndexRange={[11, 0]} style={{ pointerEvents: 'none' }}>
        <div className="alert">
          <span className="alert-bang">!</span>
          <span>{text}</span>
          {loot !== undefined && (
            <span className="alert-loot">
              <ProductIcon kind="money" className="label-product-icon order-money" />-{loot}
            </span>
          )}
        </div>
      </SafeHtml>
    </group>
  )
}

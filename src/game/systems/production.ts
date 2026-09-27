import type { Machine } from '../types'
import type { World } from '../world'

export function growProducers(w: World, dt: number) {
  for (const s of w.stations) {
    if (s.type !== 'producer' || s.stock >= s.max) continue
    // animals only produce while they have food; each item eats one
    if (s.feed && s.feed.stock <= 0) continue
    s.timer += dt
    if (s.timer >= s.regrow) {
      s.timer = 0
      s.stock++
      if (s.feed) s.feed.stock--
    }
  }
}

export function hasIngredients(m: Machine) {
  return Object.entries(m.recipe.in).every(([k, n]) => (m.input[k as keyof typeof m.input] ?? 0) >= (n ?? 0))
}

/** Input tray -> cook for `recipe.time` -> output tray. Pauses when the output is full. */
export function runMachines(w: World, dt: number) {
  for (const m of w.stations) {
    if (m.type !== 'machine') continue
    if (!m.running) {
      if (hasIngredients(m) && m.output + m.recipe.n <= m.outputCap) {
        for (const [k, n] of Object.entries(m.recipe.in)) m.input[k as keyof typeof m.input]! -= n ?? 0
        m.running = true
        m.progress = 0
      }
      continue
    }
    m.progress += dt / m.recipe.time
    if (m.progress >= 1) {
      m.output += m.recipe.n
      m.running = false
      m.progress = 0
    }
  }
}

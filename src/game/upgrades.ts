import { CAP_TIERS, ROLE_NAME, WORKER_SPEED } from './config'
import type { ItemKind, ProductKind, WorkerRole } from './types'
import type { World } from './world'

// Upgrades: data-driven rows for the panel + one function that applies every level.
// Levels start at 0 (shown as "Nv.1") and go up to each stat's own max.

export const MAX_LEVEL = 4

/** Capacity paths: the player starts on the ladder, workers join it with their first upgrade. */
const PLAYER_TIERS = [4, 6, 8]
const WORKER_TIERS = [3, 4, 6, 8]
/** Highest level of each worker stat (capacity ladder, speed). */
export const WORKER_STACK_MAX = WORKER_TIERS.length - 1
export const WORKER_SPEED_MAX = MAX_LEVEL

export interface UpgradeStat {
  key: string
  label: string
  level: number
  /** null when maxed */
  cost: number | null
}

export interface UpgradeRow {
  id: string
  title: string
  icon: ProductKind
  /** Item icons this row handles (left column in the panel). */
  items: ItemKind[]
  stats: UpgradeStat[]
  /** Worker id when the row can be paused. */
  workerId?: string
  paused?: boolean
}

export type UpgradeTab = 'workers' | 'machines' | 'animals'

const ROLE_ITEMS: Record<WorkerRole, ItemKind[]> = {
  shelver: ['egg', 'tomatoCan', 'tomato', 'bread', 'milk'],
  chef: ['tomato', 'wheat', 'flour', 'egg'],
  farmer: ['tomato', 'wheat'],
}

const ROLE_ICON: Record<WorkerRole, ProductKind> = { shelver: 'tomatoCan', chef: 'bread', farmer: 'tomato' }

const MACHINE_TITLE: Record<string, string> = { canner: 'Enlatadora', mill: 'Molino', oven: 'Horno' }

export function level(w: World, key: string) {
  return w.upgrades[key] ?? 0
}

function stat(w: World, key: string, label: string, base: number, max = MAX_LEVEL): UpgradeStat {
  const lvl = level(w, key)
  return { key, label, level: lvl, cost: lvl >= max ? null : Math.round(base * Math.pow(1.7, lvl)) }
}

/** Machine rows: capacity tops out at the last ladder step. */
function capStat(w: World, key: string, label: string, base: number): UpgradeStat {
  return stat(w, key, label, base, CAP_TIERS.length - 1)
}

/** Rows shown in the upgrades panel for a tab. */
export function upgradeRows(w: World, tab: UpgradeTab): UpgradeRow[] {
  if (tab === 'workers') {
    const rows: UpgradeRow[] = [{ id: 'player', title: 'Jugador', icon: 'money', items: [], stats: [stat(w, 'player.stack', 'Carga', 40, PLAYER_TIERS.length - 1)] }]
    for (const wk of w.workers)
      rows.push({
        id: wk.id,
        title: ROLE_NAME[wk.role],
        icon: ROLE_ICON[wk.role],
        items: ROLE_ITEMS[wk.role],
        stats: [stat(w, `w:${wk.id}.stack`, 'Carga', 60, WORKER_STACK_MAX), stat(w, `w:${wk.id}.speed`, 'Velocidad', 70, WORKER_SPEED_MAX)],
        workerId: wk.id,
        paused: wk.paused,
      })
    return rows
  }
  if (tab === 'machines')
    return w.stations.flatMap((m) =>
      m.type === 'machine'
        ? [
            {
              id: m.id,
              title: MACHINE_TITLE[m.model] ?? m.model,
              icon: m.recipe.out,
              items: [...(Object.keys(m.recipe.in) as ItemKind[]), m.recipe.out],
              stats: [stat(w, `m:${m.id}.speed`, 'Velocidad', 80), capStat(w, `m:${m.id}.cap`, 'Capacidad', 60)],
            },
          ]
        : [],
    )
  const rows: UpgradeRow[] = []
  if (w.stations.some((s) => s.type === 'producer' && s.model === 'nest'))
    rows.push({
      id: 'chicken',
      title: 'Gallinas',
      icon: 'egg',
      items: ['tomato', 'egg'],
      stats: [stat(w, 'a:chicken.speed', 'Puesta', 50), capStat(w, 'a:chicken.feed', 'Comedero', 40)],
    })
  if (w.stations.some((s) => s.type === 'producer' && s.model === 'cow'))
    rows.push({
      id: 'cow',
      title: 'Vacas',
      icon: 'milk',
      items: ['wheat', 'milk'],
      stats: [stat(w, 'a:cow.speed', 'Ordeño', 70), capStat(w, 'a:cow.feed', 'Comedero', 55)],
    })
  rows.push({ id: 'plants', title: 'Cultivos', icon: 'tomato', items: ['tomato', 'wheat'], stats: [stat(w, 'a:plants.speed', 'Crecimiento', 45)] })
  return rows
}

/** Nth step of a capacity ladder, clamped at the top (8 stays 8). */
function capAt(tiers: number[], lvl: number) {
  return tiers[Math.min(lvl, tiers.length - 1)]
}

/** Recomputes every upgraded value from the base values. Call after load, unlock or purchase. */
export function applyUpgrades(w: World) {
  w.player.cap = capAt(PLAYER_TIERS, level(w, 'player.stack'))
  for (const wk of w.workers) {
    wk.cap = capAt(WORKER_TIERS, level(w, `w:${wk.id}.stack`))
    wk.speed = WORKER_SPEED * (1 + 0.3 * level(w, `w:${wk.id}.speed`))
  }
  for (const s of w.stations) {
    if (s.type === 'machine') {
      s.recipe.time = s.base.time * Math.pow(0.75, level(w, `m:${s.id}.speed`))
      const cap = capAt(CAP_TIERS, level(w, `m:${s.id}.cap`))
      s.inputCap = cap
      s.outputCap = cap
    }
    if (s.type === 'producer') {
      const animal = s.model === 'cow' ? 'cow' : 'chicken'
      const key = s.feed ? `a:${animal}.speed` : 'a:plants.speed'
      s.regrow = s.baseRegrow * Math.pow(0.75, level(w, key))
      if (s.feed) s.feed.cap = capAt(CAP_TIERS, level(w, `a:${animal}.feed`))
    }
  }
}

/** Buys one level if affordable. Returns true on success. */
export function buyUpgrade(w: World, key: string): boolean {
  const all = (['workers', 'machines', 'animals'] as UpgradeTab[]).flatMap((t) => upgradeRows(w, t).flatMap((r) => r.stats))
  const s = all.find((x) => x.key === key)
  if (!s || s.cost === null || w.money < s.cost) return false
  w.money -= s.cost
  w.upgrades[key] = level(w, key) + 1
  applyUpgrades(w)
  w.events.push({ type: 'upgrade' })
  w.version++
  return true
}

export function togglePause(w: World, workerId: string) {
  const wk = w.workers.find((x) => x.id === workerId)
  if (!wk) return
  wk.paused = !wk.paused
  w.version++
}

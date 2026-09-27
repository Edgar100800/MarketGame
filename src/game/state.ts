import { create } from 'zustand'
import { createWorld, unlockAll, type World } from './world'
import { editedLevel } from './editor'
import { objective } from './systems/objective'
import { autopilot } from './systems/autopilot'
import { tick } from './loop'
import { restoreWorld, snapshotWorld, type RuntimeSnapshot } from './save'
import type { GameEvent, Input, LevelDef, Objective } from './types'

// Bridge between the pure simulation and React.
// - `world` is mutated every frame by the loop (read it directly inside useFrame).
// - `useGame` holds small derived values; components select only what they draw,
//   so a shelf re-renders only when its own stock signature changes.

const SAVE_KEY = 'minimart.level1'

interface Save {
  version?: 2
  money: number
  earned: number
  unlocked: string[]
  units?: Record<string, number>
  upgrades?: Record<string, number>
  paused?: string[]
  runtime?: RuntimeSnapshot
}

function params() {
  try {
    return new URLSearchParams(location.search)
  } catch {
    return new URLSearchParams()
  }
}

function loadSave(): Save | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    return raw ? (JSON.parse(raw) as Save) : null
  } catch {
    return null
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* storage unavailable */
  }
}

function writeSave(w: World, includeRuntime = true) {
  try {
    const s: Save = {
      version: 2,
      money: w.money,
      earned: w.earned,
      unlocked: w.unlocked,
      units: w.units,
      upgrades: w.upgrades,
      paused: w.workers.filter((x) => x.paused).map((x) => x.id),
      ...(includeRuntime ? { runtime: snapshotWorld(w) } : {}),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable */
  }
}

/** Drops unlock ids the level no longer has (e.g. milkFridge, merged into cow) so old saves still load. */
export function migrateUnlocks(unlocked: string[] | undefined, level: LevelDef) {
  if (!unlocked) return undefined
  const known = new Set(level.unlocks.map((unlock) => unlock.id))
  return [...new Set(unlocked.filter((id) => known.has(id)))]
}

/** Debug flags: ?money=999 ?fast=5 ?unlock=all|id1,id2 ?reset=1 ?autoplay=1 ?sim=300 (pre-simulate N seconds with the bot) ?upgrades (open the panel) */
export const debug = (() => {
  const p = params()
  return {
    money: p.has('money') ? Number(p.get('money')) : undefined,
    speed: p.has('fast') ? Number(p.get('fast')) || 5 : 1,
    unlockAll: p.get('unlock') === 'all',
    /** ?unlock=planter2,eggs,canner : start with these unlocks (in chain order) */
    unlockList: p.get('unlock') && p.get('unlock') !== 'all' ? p.get('unlock')!.split(',') : null,
    reset: p.has('reset'),
    autoplay: p.has('autoplay'),
    sim: Number(p.get('sim')) || 0,
    upgrades: p.has('upgrades'),
  }
})()

function makeWorld(restoreRuntime = true): World {
  if (debug.reset) clearSave()
  const save = debug.reset ? null : loadSave()
  const level = editedLevel()
  const w = createWorld(level, {
    money: debug.money ?? save?.money ?? 0,
    earned: save?.earned ?? 0,
    unlocked: debug.unlockList ?? migrateUnlocks(save?.unlocked, level),
    units: save?.units,
    upgrades: save?.upgrades,
    paused: save?.paused,
  })
  const debugOverridesProgress = debug.money !== undefined || debug.unlockAll || debug.unlockList !== null
  if (restoreRuntime && !debugOverridesProgress) restoreWorld(w, save?.runtime)
  if (debug.unlockAll) unlockAll(w)
  if (debug.sim) {
    const bot = { x: 0, y: 0 }
    for (let t = 0; t < debug.sim; t += 1 / 30) {
      autopilot(w, bot)
      tick(w, bot, 1 / 30)
    }
    w.events.length = 0
  }
  return w
}

export let world: World = makeWorld()
export const input: Input = { x: 0, y: 0 }

interface GameUI {
  /** Incremented on restart, used as React key to remount the level. */
  run: number
  money: number
  version: number
  completed: boolean
  objective: Objective
  /** Per-entity signature strings (stock counts, states) used as render keys. */
  sigs: Record<string, string>
}

export const useGame = create<GameUI>(() => ({
  run: 0,
  money: world.money,
  version: world.version,
  completed: world.completed,
  objective: objective(world),
  sigs: {},
}))

export function restart() {
  clearSave()
  world = makeWorld()
  useGame.setState((s) => ({ run: s.run + 1, money: world.money, version: world.version, completed: false, objective: objective(world), sigs: {} }))
}

/** Rebuilds the simulation after leaving the level editor without deleting progress. */
export function reloadLevel() {
  // The editor may move walls and stations, invalidating saved paths and positions.
  writeSave(world, false)
  world = makeWorld(false)
  useGame.setState((s) => ({ run: s.run + 1, money: world.money, version: world.version, completed: world.completed, objective: objective(world), sigs: {} }))
}

/** Flushes the latest runtime snapshot when the browser hides or closes the page. */
export function saveNow() {
  writeSave(world)
}

function signatures(w: World): Record<string, string> {
  const s: Record<string, string> = {}
  for (const st of w.stations) {
    if (st.type === 'producer') s[st.id] = `${st.stock}|${st.plants}|${st.feed?.stock}|${st.feed?.cap}`
    else if (st.type === 'shelf') s[st.id] = `${st.stock}`
    else if (st.type === 'machine') s[st.id] = `${JSON.stringify(st.input)}|${st.output}|${st.running}`
    else s[st.id] = `${Math.ceil(st.cash / 5)}|${st.cashier}|${st.queue.length}`
  }
  for (const c of w.customers) s[`c${c.id}`] = `${c.state}|${c.lineIndex}|${c.items.map((item) => `${item.id}:${item.kind}`).join(',')}|${c.carryMode}|${c.moving}`
  for (const wk of w.workers) s[`w:${wk.id}`] = `${wk.carry}|${wk.count}|${wk.moving}|${wk.paused}`
  for (const id of w.visibleZones) s[`z:${id}`] = `${w.zonePaid[id]}`
  const p = w.player
  s.player = `${p.stack.map((i) => i.id).join(',')}|${p.moving}|${p.cap}`
  return s
}

// Event listeners (flying items, floating texts, unlock bursts).
type Listener = (e: GameEvent) => void
const listeners = new Set<Listener>()
export function onGameEvent(l: Listener) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

let saveTimer = 0
/** Called once per frame after `tick`. */
export function sync(w: World, dt: number) {
  const events = w.events.splice(0)
  for (const e of events) for (const l of listeners) l(e)

  const prev = useGame.getState()
  const next = signatures(w)
  const changed = Object.keys(next).length !== Object.keys(prev.sigs).length || Object.keys(next).some((k) => next[k] !== prev.sigs[k])
  const obj = objective(w)
  const objChanged = obj.text !== prev.objective.text || obj.target?.x !== prev.objective.target?.x || obj.target?.z !== prev.objective.target?.z
  if (changed || objChanged || prev.money !== w.money || prev.version !== w.version || prev.completed !== w.completed)
    useGame.setState({
      money: w.money,
      version: w.version,
      completed: w.completed,
      ...(changed ? { sigs: next } : {}),
      ...(objChanged ? { objective: obj } : {}),
    })

  saveTimer += dt
  if (saveTimer > 2) {
    saveTimer = 0
    writeSave(w)
  }
}

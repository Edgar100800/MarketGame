import { create } from 'zustand'
import { createWorld, unlockAll, type World } from './world'
import { editedLevel } from './editor'
import { objective } from './systems/objective'
import { autopilot } from './systems/autopilot'
import { tick } from './loop'
import type { GameEvent, Input, Objective } from './types'

// Bridge between the pure simulation and React.
// - `world` is mutated every frame by the loop (read it directly inside useFrame).
// - `useGame` holds small derived values; components select only what they draw,
//   so a shelf re-renders only when its own stock signature changes.

const SAVE_KEY = 'minimart.level1'

interface Save {
  money: number
  earned: number
  unlocked: string[]
  units?: Record<string, number>
  upgrades?: Record<string, number>
  paused?: string[]
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

function writeSave(w: World) {
  try {
    const s: Save = {
      money: w.money,
      earned: w.earned,
      unlocked: w.unlocked,
      units: w.units,
      upgrades: w.upgrades,
      paused: w.workers.filter((x) => x.paused).map((x) => x.id),
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable */
  }
}

/** Inserts mandatory stations added to the progression after a save was created. */
function migrateUnlocks(unlocked: string[] | undefined) {
  if (!unlocked) return undefined
  const out: string[] = []
  const add = (id: string) => {
    if (!out.includes(id)) out.push(id)
  }
  for (const id of unlocked) {
    if (id === 'bakery' || id === 'chef' || id === 'branch') {
      add('cow')
      add('milkFridge')
      add('checkout2')
    }
    add(id)
  }
  return out
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

function makeWorld(): World {
  if (debug.reset) clearSave()
  const save = debug.reset ? null : loadSave()
  const w = createWorld(editedLevel(), {
    money: debug.money ?? save?.money ?? 0,
    earned: save?.earned ?? 0,
    unlocked: debug.unlockList ?? migrateUnlocks(save?.unlocked),
    units: save?.units,
    upgrades: save?.upgrades,
    paused: save?.paused,
  })
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
  writeSave(world)
  world = makeWorld()
  useGame.setState((s) => ({ run: s.run + 1, money: world.money, version: world.version, completed: world.completed, objective: objective(world), sigs: {} }))
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

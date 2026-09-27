import { create } from 'zustand'
import { LEVEL1 } from './level1'
import { LEVEL1_V1 } from './level1.v1'
import bakedLayout from './level1.layout.json'
import bakedLayoutV1 from './level1.v1.layout.json'
import { snap } from './spatial'
import type { AreaDef, DecoDef, ItemKind, LevelDef, QuarterTurn, StationDef, TrashDef, Vec2 } from './types'

// ?layout=v1 plays the original layout; each layout keeps its own editor edits
const LEGACY_LAYOUT = (() => {
  try {
    return new URLSearchParams(location.search).get('layout') === 'v1'
  } catch {
    return false
  }
})()
const BASE_LEVEL = LEGACY_LAYOUT ? LEVEL1_V1 : LEVEL1
const EDITOR_KEY = LEGACY_LAYOUT ? 'minimart.editor.level.v1' : 'minimart.editor.level.v2'
/** Map edited in the browser and shipped as the default layout. */
const DEFAULT_LEVEL = applyLayout(BASE_LEVEL, (LEGACY_LAYOUT ? bakedLayoutV1 : bakedLayout) as unknown as LayoutFile)

// purchase-wave palette, cycles for deeper waves
export const TIER_COLORS = ['#4caf50', '#f4c430', '#ff8a3d', '#e53935', '#ab47bc', '#2f9de0']

export interface LayoutFile {
  version: 1
  stations: Record<string, { pos: Vec2; turn: QuarterTurn }>
  zones: Record<string, Vec2>
  deco?: Record<string, { pos: Vec2; turn: QuarterTurn }>
  areas?: Record<string, { x: number; z: number; w: number; d: number }>
  trash?: Record<string, Vec2>
}

function cloneLevel(level: LevelDef): LevelDef {
  return JSON.parse(JSON.stringify(level)) as LevelDef
}

export function stationDefs(level: LevelDef) {
  return [...level.start, ...level.unlocks.flatMap((unlock) => unlock.spawns)]
}

export function layoutOf(level: LevelDef): LayoutFile {
  return {
    version: 1,
    stations: Object.fromEntries(stationDefs(level).map((station) => [station.id, { pos: { ...station.pos }, turn: station.turn ?? 0 }])),
    zones: Object.fromEntries(level.unlocks.map((unlock) => [unlock.id, { ...unlock.zone }])),
    deco: Object.fromEntries((level.deco ?? []).map((piece) => [piece.id, { pos: { ...piece.pos }, turn: piece.turn ?? 0 }])),
    areas: Object.fromEntries(level.areas.map((area) => [area.id, { ...area.rect }])),
    trash: Object.fromEntries(level.trash.map((bin) => [bin.id, { ...bin.pos }])),
  }
}

export function applyLayout(base: LevelDef, layout: LayoutFile): LevelDef {
  const level = cloneLevel(base)
  for (const station of stationDefs(level)) {
    const saved = layout.stations[station.id]
    if (saved) {
      station.pos = { ...saved.pos }
      station.turn = saved.turn
    }
  }
  for (const unlock of level.unlocks) if (layout.zones[unlock.id]) unlock.zone = { ...layout.zones[unlock.id] }
  for (const piece of level.deco ?? []) {
    const saved = layout.deco?.[piece.id]
    if (saved) {
      piece.pos = { ...saved.pos }
      piece.turn = saved.turn
    }
  }
  for (const area of level.areas) {
    const saved = layout.areas?.[area.id]
    if (saved) area.rect = { ...saved }
  }
  for (const bin of level.trash) {
    const saved = layout.trash?.[bin.id]
    if (saved) bin.pos = { ...saved }
  }
  return level
}

function loadLevel() {
  try {
    const raw = localStorage.getItem(EDITOR_KEY)
    return raw ? applyLayout(BASE_LEVEL, JSON.parse(raw) as LayoutFile) : cloneLevel(DEFAULT_LEVEL)
  } catch {
    return cloneLevel(DEFAULT_LEVEL)
  }
}

function persist(level: LevelDef) {
  try {
    localStorage.setItem(EDITOR_KEY, JSON.stringify(layoutOf(level)))
  } catch {
    /* storage unavailable */
  }
}

function updateStation(level: LevelDef, id: string, update: (station: StationDef) => void) {
  const station = stationDefs(level).find((candidate) => candidate.id === id)
  if (station) update(station)
}

function updateDeco(level: LevelDef, id: string, update: (piece: DecoDef) => void) {
  const piece = (level.deco ?? []).find((candidate) => candidate.id === id)
  if (piece) update(piece)
}

function updateArea(level: LevelDef, id: string, update: (area: AreaDef) => void) {
  const area = level.areas.find((candidate) => candidate.id === id)
  if (area) update(area)
}

function updateTrash(level: LevelDef, id: string, update: (bin: TrashDef) => void) {
  const bin = level.trash.find((candidate) => candidate.id === id)
  if (bin) update(bin)
}

export type EditorSelection = { type: 'station' | 'zone' | 'deco' | 'area' | 'trash'; id: string }

interface EditorState {
  enabled: boolean
  gridVisible: boolean
  levelsVisible: boolean
  tierFilter: number | null
  selected: EditorSelection | null
  level: LevelDef
  history: LevelDef[]
  setEnabled: (enabled: boolean) => void
  toggleGrid: () => void
  toggleLevels: () => void
  setTierFilter: (tier: number | null) => void
  select: (selected: EditorSelection | null) => void
  move: (selected: EditorSelection, pos: Vec2, commit?: boolean) => void
  rotate: (step: -1 | 1) => void
  resizeArea: (id: string, dim: 'w' | 'd', delta: 0.5 | -0.5) => void
  undo: () => void
  reset: () => void
}

export const useEditor = create<EditorState>((set, get) => ({
  enabled: false,
  gridVisible: true,
  levelsVisible: false,
  tierFilter: null,
  selected: null,
  level: loadLevel(),
  history: [],
  setEnabled: (enabled) => set({ enabled, selected: null, levelsVisible: false, tierFilter: null }),
  toggleGrid: () => set((state) => ({ gridVisible: !state.gridVisible })),
  toggleLevels: () => set((state) => ({ levelsVisible: !state.levelsVisible, tierFilter: null })),
  setTierFilter: (tier) => set((state) => ({ tierFilter: state.tierFilter === tier ? null : tier })),
  select: (selected) => set({ selected }),
  move: (selected, pos, commit = false) => {
    const previous = get().level
    const level = cloneLevel(previous)
    const snapped = { x: snap(pos.x), z: snap(pos.z) }
    if (selected.type === 'station') updateStation(level, selected.id, (station) => (station.pos = snapped))
    else if (selected.type === 'deco') updateDeco(level, selected.id, (piece) => (piece.pos = snapped))
    else if (selected.type === 'trash') updateTrash(level, selected.id, (bin) => (bin.pos = snapped))
    else if (selected.type === 'area') updateArea(level, selected.id, (area) => (area.rect = { ...area.rect, x: snapped.x, z: snapped.z }))
    else {
      const zone = level.unlocks.find((unlock) => unlock.id === selected.id)
      if (zone) zone.zone = snapped
    }
    persist(level)
    set((state) => ({ level, history: commit ? [...state.history.slice(-29), previous] : state.history }))
  },
  rotate: (step) => {
    const { selected, level: previous } = get()
    if (selected?.type !== 'station' && selected?.type !== 'deco' && selected?.type !== 'area') return
    const level = cloneLevel(previous)
    if (selected.type === 'area')
      updateArea(level, selected.id, (area) => {
        // swapping footprint instead of spinning in place
        const { w, d } = area.rect
        area.rect.w = d
        area.rect.d = w
      })
    else if (selected.type === 'station')
      updateStation(level, selected.id, (station) => {
        station.turn = (((station.turn ?? 0) + step + 4) % 4) as QuarterTurn
      })
    else
      updateDeco(level, selected.id, (piece) => {
        piece.turn = (((piece.turn ?? 0) + step + 4) % 4) as QuarterTurn
      })
    persist(level)
    set((state) => ({ level, history: [...state.history.slice(-29), previous] }))
  },
  resizeArea: (id, dim, delta) => {
    const previous = get().level
    const level = cloneLevel(previous)
    updateArea(level, id, (area) => {
      // shrink/grow around the center, never below one tile
      const size = Math.max(1, area.rect[dim] + delta)
      area.rect[dim] = size
    })
    persist(level)
    set((state) => ({ level, history: [...state.history.slice(-29), previous] }))
  },
  undo: () => {
    const history = get().history
    const level = history.at(-1)
    if (!level) return
    persist(level)
    set({ level, history: history.slice(0, -1) })
  },
  reset: () => {
    const previous = get().level
    const level = cloneLevel(DEFAULT_LEVEL)
    persist(level)
    set((state) => ({ level, history: [...state.history.slice(-29), previous], selected: null }))
  },
}))

export function editedLevel() {
  return useEditor.getState().level
}

/**
 * Purchase wave of every unlock: 1 = visible from the start, and each next wave
 * is whatever the previous wave reveals. Zones reachable through several paths
 * take the earliest wave.
 */
export function unlockTiers(level: LevelDef): Record<string, number> {
  const tiers: Record<string, number> = {}
  let frontier = level.startReveals.filter((id) => level.unlocks.some((unlock) => unlock.id === id))
  for (const id of frontier) tiers[id] = 1
  let tier = 1
  while (frontier.length) {
    tier += 1
    const next: string[] = []
    for (const id of frontier) {
      const unlock = level.unlocks.find((candidate) => candidate.id === id)
      for (const revealed of unlock?.reveals ?? []) {
        if (!level.unlocks.some((candidate) => candidate.id === revealed)) continue
        if (tiers[revealed]) continue
        tiers[revealed] = tier
        next.push(revealed)
      }
    }
    frontier = next
  }
  return tiers
}

/** Kinds a station consumes: what a shelf sells, what a machine takes in, what an animal eats. */
function consumedKinds(station: StationDef): ItemKind[] {
  if (station.type === 'shelf') return [station.kind]
  if (station.type === 'machine') return Object.keys(station.recipe.in) as ItemKind[]
  if (station.type === 'producer') return station.feed ? [station.feed.kind] : []
  return []
}

/**
 * Editor relationships for a station: which stations provide the items it consumes,
 * and which purchase zones spawn it (or grow it, for per-unit producers).
 */
export function stationRelations(level: LevelDef, id: string): {
  providers: { id: string; kind: ItemKind }[]
  zones: { id: string; label: string; price: number; zone: Vec2 }[]
  isStart: boolean
} {
  const all = stationDefs(level)
  const station = all.find((candidate) => candidate.id === id)
  const providers: { id: string; kind: ItemKind }[] = []
  if (station) {
    for (const kind of consumedKinds(station)) {
      for (const source of all) {
        if (source.id === id) continue
        const provides = (source.type === 'producer' && source.kind === kind) || (source.type === 'machine' && source.recipe.out === kind)
        if (provides && !providers.some((p) => p.id === source.id)) providers.push({ id: source.id, kind })
      }
    }
  }
  const zones = level.unlocks
    .filter((unlock) => unlock.spawns.some((spawn) => spawn.id === id) || unlock.grows === id)
    .map((unlock) => ({ id: unlock.id, label: unlock.label, price: unlock.price, zone: unlock.zone }))
  return { providers, zones, isStart: level.start.some((spawn) => spawn.id === id) }
}

export function exportLevelLayout() {
  const data = JSON.stringify(layoutOf(useEditor.getState().level), null, 2)
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'level1-layout.json'
  link.click()
  URL.revokeObjectURL(url)
}

import type { Rect, Vec2 } from './types'

/** Walkability grid + A* for customers. Rebuilt whenever stations or areas change. */
export class Grid {
  readonly cols: number
  readonly rows: number
  readonly x0: number
  readonly z0: number
  readonly blocked: Uint8Array
  readonly cell: number

  constructor(bounds: Rect, obstacles: Rect[], cell: number, pad: number) {
    this.cell = cell
    this.x0 = bounds.x - bounds.w / 2
    this.z0 = bounds.z - bounds.d / 2
    this.cols = Math.ceil(bounds.w / cell)
    this.rows = Math.ceil(bounds.d / cell)
    this.blocked = new Uint8Array(this.cols * this.rows)
    for (const o of obstacles) {
      const c0 = Math.max(0, Math.floor((o.x - o.w / 2 - pad - this.x0) / cell))
      const c1 = Math.min(this.cols - 1, Math.floor((o.x + o.w / 2 + pad - this.x0) / cell))
      const r0 = Math.max(0, Math.floor((o.z - o.d / 2 - pad - this.z0) / cell))
      const r1 = Math.min(this.rows - 1, Math.floor((o.z + o.d / 2 + pad - this.z0) / cell))
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) this.blocked[r * this.cols + c] = 1
    }
  }

  private toCell(p: Vec2): [number, number] {
    const c = Math.min(this.cols - 1, Math.max(0, Math.floor((p.x - this.x0) / this.cell)))
    const r = Math.min(this.rows - 1, Math.max(0, Math.floor((p.z - this.z0) / this.cell)))
    return [c, r]
  }

  private center(c: number, r: number): Vec2 {
    return { x: this.x0 + (c + 0.5) * this.cell, z: this.z0 + (r + 0.5) * this.cell }
  }

  /** True when a world point falls on a walkable cell. */
  isFreeAt(p: Vec2) {
    const c = Math.floor((p.x - this.x0) / this.cell)
    const r = Math.floor((p.z - this.z0) / this.cell)
    return this.isFree(c, r)
  }

  isFree(c: number, r: number) {
    return c >= 0 && r >= 0 && c < this.cols && r < this.rows && !this.blocked[r * this.cols + c]
  }

  /** Nearest standable point to p: the center of the closest free cell (payment spots can sit on furniture). */
  freePointNear(p: Vec2): Vec2 {
    const [c, r] = this.nearestFree(...this.toCell(p))
    return this.center(c, r)
  }

  /** Nearest free cell to a point (targets can sit next to furniture). */
  private nearestFree(c: number, r: number): [number, number] {
    if (this.isFree(c, r)) return [c, r]
    for (let rad = 1; rad < 12; rad++)
      for (let dr = -rad; dr <= rad; dr++)
        for (let dc = -rad; dc <= rad; dc++)
          if (Math.max(Math.abs(dc), Math.abs(dr)) === rad && this.isFree(c + dc, r + dr)) return [c + dc, r + dr]
    return [c, r]
  }

  private lineFree(a: Vec2, b: Vec2) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (this.cell * 0.5))
    for (let i = 1; i < steps; i++) {
      const t = i / steps
      const [c, r] = this.toCell({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t })
      if (!this.isFree(c, r)) return false
    }
    return true
  }

  /** 8-direction A* with line-of-sight smoothing. Returns waypoints (excluding start). */
  findPath(from: Vec2, to: Vec2): Vec2[] {
    const [sc, sr] = this.nearestFree(...this.toCell(from))
    const [tc, tr] = this.nearestFree(...this.toCell(to))
    const n = this.cols * this.rows
    const g = new Float32Array(n).fill(Infinity)
    const parent = new Int32Array(n).fill(-1)
    const closed = new Uint8Array(n)
    const open: number[] = []
    const f = new Float32Array(n).fill(Infinity)
    const start = sr * this.cols + sc
    const goal = tr * this.cols + tc
    const h = (c: number, r: number) => {
      const dx = Math.abs(c - tc)
      const dz = Math.abs(r - tr)
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz)
    }
    g[start] = 0
    f[start] = h(sc, sr)
    open.push(start)
    while (open.length) {
      let bi = 0
      for (let i = 1; i < open.length; i++) if (f[open[i]] < f[open[bi]]) bi = i
      const cur = open[bi]
      open[bi] = open[open.length - 1]
      open.pop()
      if (cur === goal) break
      if (closed[cur]) continue
      closed[cur] = 1
      const cc = cur % this.cols
      const cr = (cur - cc) / this.cols
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          if (!dc && !dr) continue
          const nc = cc + dc
          const nr = cr + dr
          if (!this.isFree(nc, nr)) continue
          if (dc && dr && (!this.isFree(cc + dc, cr) || !this.isFree(cc, cr + dr))) continue
          const ni = nr * this.cols + nc
          const cost = g[cur] + (dc && dr ? 1.414 : 1)
          if (cost < g[ni]) {
            g[ni] = cost
            parent[ni] = cur
            f[ni] = cost + h(nc, nr)
            open.push(ni)
          }
        }
    }
    if (parent[goal] === -1 && goal !== start) return [to]
    const cells: Vec2[] = []
    for (let i = goal; i !== -1 && i !== start; i = parent[i]) cells.push(this.center(i % this.cols, Math.floor(i / this.cols)))
    cells.reverse()
    cells.push(to)
    // string pulling
    const out: Vec2[] = []
    let anchor = from
    for (let i = 0; i < cells.length; i++) {
      const next = cells[i + 1]
      if (next && this.lineFree(anchor, next)) continue
      out.push(cells[i])
      anchor = cells[i]
    }
    return out
  }
}

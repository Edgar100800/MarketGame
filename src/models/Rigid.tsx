import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { Group, Matrix4, Mesh, type Object3D, type BufferGeometry, type Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { debug } from '../game/state'

type Built = { key: string; users: number; meshes: { geometry: BufferGeometry; material: Material; cast: boolean; hook: Mesh['onBeforeRender'] }[] }

// Merged results by content signature: every identical cart, basket or head shares one set of buffers.
// Unused results linger (most recent IDLE_KEEP) so a customer walking back in or a money pile
// toggling between two heights doesn't rebuild; older ones are freed from the GPU.
const cache = new Map<string, Built>()
const idle = new Set<string>()
const IDLE_KEEP = 64

function acquire(key: string, make: () => Built) {
  let built = cache.get(key)
  if (!built) cache.set(key, (built = make()))
  built.users++
  idle.delete(key)
  return built
}

function release(built: Built) {
  if (--built.users > 0) return
  idle.add(built.key)
  if (idle.size <= IDLE_KEEP) return
  const oldest = idle.values().next().value as string
  idle.delete(oldest)
  const stale = cache.get(oldest)
  cache.delete(oldest)
  for (const m of stale?.meshes ?? []) m.geometry.dispose()
}
const rel = new Matrix4()

/**
 * Transform from `root` space to `mesh`, chaining local matrices. Never inverts the world matrix:
 * actors pop in from scale ~0, where that inverse would be garbage.
 */
function relative(root: Object3D, mesh: Object3D) {
  mesh.updateMatrix()
  rel.copy(mesh.matrix)
  for (let o = mesh.parent; o && o !== root; o = o.parent) {
    o.updateMatrix()
    rel.premultiply(o.matrix)
  }
  return rel
}

/** Only plain toon parts and their ink hulls merge; textured or custom meshes stay as they are. */
function mergeable(m: Mesh) {
  const material = m.material as Material
  return !Array.isArray(m.material) && (material.type === 'MeshToonMaterial' || material.userData.ink === true)
}

/** Mark a group `userData.dynamic` (e.g. items that pop in) and Rigid leaves its whole subtree alone. */
function sources(root: Object3D, found: Mesh[] = []) {
  for (const o of root.children) {
    if (o.userData.dynamic) continue
    if ((o as Mesh).isMesh && mergeable(o as Mesh)) found.push(o as Mesh)
    sources(o, found)
  }
  return found
}

function signature(root: Group, meshes: Mesh[]) {
  return meshes
    .map((m) => {
      const matrix = relative(root, m)
      return `${m.geometry.uuid}:${(m.material as Material).uuid}:${m.castShadow ? 1 : 0}:${matrix.elements.map((e) => e.toFixed(4)).join(',')}`
    })
    .join('|')
}

function build(root: Group, meshes: Mesh[], key: string): Built {
  const byMaterial = new Map<Material, { parts: BufferGeometry[]; cast: boolean; hook: Mesh['onBeforeRender'] }>()
  for (const m of meshes) {
    const material = m.material as Material
    const geometry = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone()
    for (const name of Object.keys(geometry.attributes)) if (name !== 'position' && name !== 'normal') geometry.deleteAttribute(name)
    geometry.morphAttributes = {}
    geometry.applyMatrix4(relative(root, m))
    const entry = byMaterial.get(material) ?? { parts: [], cast: false, hook: m.onBeforeRender }
    entry.parts.push(geometry)
    entry.cast ||= m.castShadow
    byMaterial.set(material, entry)
  }
  const built: Built = { key, users: 0, meshes: [] }
  for (const [material, { parts, cast, hook }] of byMaterial) {
    const geometry = parts.length === 1 ? parts[0] : mergeGeometries(parts)
    if (parts.length > 1) for (const part of parts) part.dispose()
    geometry.computeBoundingSphere()
    built.meshes.push({ geometry, material, cast, hook })
  }
  return built
}

/**
 * Bakes a static sub-assembly (no animation, no per-frame changes inside) into one mesh per material,
 * outlines included. Same draw result, a fraction of the draw calls. The merged source meshes stay
 * mounted but hidden (other meshes, e.g. textured icons, keep drawing), and the bake is redone
 * whenever their geometry, material or layout changes.
 */
export function Rigid({ children }: { children: ReactNode }) {
  const outer = useRef<Group>(null)
  const source = useRef<Group>(null)
  const baked = useRef<{ built: Built; group: Group } | null>(null)

  // no deps: re-checks after every render of the owner, rebuilds only when the signature changes
  useLayoutEffect(() => {
    const root = outer.current
    const src = source.current
    if (!root || !src) return
    const meshes = sources(src)
    const key = signature(root, meshes)
    for (const m of meshes) m.visible = false
    if (baked.current?.built.key === key) return
    if (baked.current) {
      root.remove(baked.current.group)
      release(baked.current.built)
    }
    const built = acquire(key, () => build(root, meshes, key))
    const group = new Group()
    for (const { geometry, material, cast, hook } of built.meshes) {
      const mesh = new Mesh(geometry, material)
      mesh.castShadow = cast
      mesh.receiveShadow = true
      mesh.onBeforeRender = hook
      group.add(mesh)
    }
    root.add(group)
    baked.current = { built, group }
  })

  useEffect(
    () => () => {
      if (!baked.current) return
      outer.current?.remove(baked.current.group)
      release(baked.current.built)
      baked.current = null
    },
    [],
  )

  if (debug.noRigid) return <group>{children}</group>
  return (
    // dynamic: an enclosing Rigid skips this subtree, which bakes (and re-bakes) itself
    <group ref={outer} userData={{ dynamic: true }}>
      <group ref={source}>{children}</group>
    </group>
  )
}

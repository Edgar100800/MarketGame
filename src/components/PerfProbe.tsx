import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/** `?perf`: draw calls, triangles, meshes and FPS in a corner (also on window.__perf for headless runs). */
export function PerfProbe() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const acc = useRef({ frames: 0, time: 0, calls: 0, triangles: 0 })
  useFrame((_, dt) => {
    const a = acc.current
    // gl.info holds the previous frame; average it, since shadow redraws only land on some frames
    a.frames++
    a.time += dt
    a.calls += gl.info.render.calls
    a.triangles += gl.info.render.triangles
    if (a.time < 0.5) return
    let meshes = 0
    const kinds: Record<string, number> = {}
    scene.traverseVisible((o) => {
      const m = o as unknown as { isMesh?: boolean; castShadow: boolean; material: { type: string }; geometry: { type: string } }
      if (!m.isMesh) return
      meshes++
      const k = `${m.material.type}/${m.geometry.type}${m.castShadow ? '/cast' : ''}`
      kinds[k] = (kinds[k] ?? 0) + 1
    })
    ;(window as unknown as { __kinds: typeof kinds }).__kinds = kinds
    const stats = {
      fps: Math.round(a.frames / a.time),
      calls: Math.round(a.calls / a.frames),
      triangles: Math.round(a.triangles / a.frames),
      meshes,
      geometries: gl.info.memory.geometries,
      dom: document.querySelectorAll('canvas ~ div *, #root > div > div > div').length,
      dpr: gl.getPixelRatio(),
    }
    ;(window as unknown as { __perf: typeof stats }).__perf = stats
    let el = document.getElementById('perf')
    if (!el) {
      el = document.createElement('pre')
      el.id = 'perf'
      el.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99;margin:0;padding:6px 8px;font:12px monospace;color:#fff;background:#000a;border-radius:6px;pointer-events:none'
      document.body.appendChild(el)
    }
    el.dataset.kinds = JSON.stringify(kinds)
    el.textContent = Object.entries(stats).map(([k, v]) => `${k} ${v}`).join('\n')
    a.frames = 0
    a.time = 0
    a.calls = 0
    a.triangles = 0
  })
  return null
}

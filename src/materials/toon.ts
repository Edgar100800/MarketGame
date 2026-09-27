import { DataTexture, MeshToonMaterial, NearestFilter, RedFormat } from 'three'

// 3-step ramp with light shadows: close to flat 2D color, with just enough volume to read as 3D.
const gradientMap = new DataTexture(new Uint8Array([185, 230, 255]), 3, 1, RedFormat)
gradientMap.minFilter = NearestFilter
gradientMap.magFilter = NearestFilter
gradientMap.generateMipmaps = false
gradientMap.needsUpdate = true

const cache = new Map<string, MeshToonMaterial>()

/** Shared toon material per color (and opacity), so the whole scene reuses a few materials. */
export function toon(color: string, opacity = 1): MeshToonMaterial {
  const key = `${color}:${opacity}`
  let material = cache.get(key)
  if (!material) {
    material = new MeshToonMaterial({ color, gradientMap })
    if (opacity < 1) {
      material.transparent = true
      material.opacity = opacity
      material.depthWrite = false
    }
    cache.set(key, material)
  }
  return material
}

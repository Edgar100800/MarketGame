import { Color, Mesh, ShaderMaterial, BackSide, Vector2, type BufferGeometry, type WebGLRenderer } from 'three'
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { C } from './palette'

// Screen-space ink outline (the inverted-hull trick drei's <Outlines> uses), but shared:
// one creased hull per source geometry and one material per line width, instead of one of each per part.

/** Drawing-buffer size and pixel ratio, shared by every ink material. */
const size = { value: new Vector2(1, 1) }
const ratio = { value: 1 }
let lastFrame = -1

function syncViewport(renderer: WebGLRenderer) {
  const frame = renderer.info.render.frame
  if (frame === lastFrame) return
  lastFrame = frame
  renderer.getDrawingBufferSize(size.value)
  ratio.value = renderer.getPixelRatio()
}

const materials = new Map<number, ShaderMaterial>()
function inkMaterial(line: number) {
  let material = materials.get(line)
  if (!material) {
    material = new ShaderMaterial({
      side: BackSide,
      uniforms: { color: { value: new Color(C.outline) }, thickness: { value: line }, size, ratio },
      vertexShader: /* glsl */ `
        uniform float thickness;
        uniform float ratio;
        uniform vec2 size;
        void main() {
          vec4 clipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          vec4 clipNormal = projectionMatrix * modelViewMatrix * vec4(normal, 0.0);
          clipPosition.xy += normalize(clipNormal.xy) * thickness * ratio / size * clipPosition.w * 2.0;
          gl_Position = clipPosition;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 color;
        void main() {
          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }`,
    })
    material.userData.ink = true
    materials.set(line, material)
  }
  return material
}

// Smooth (creased at 180deg) normals so the hull inflates without cracks at hard edges.
const hulls = new WeakMap<BufferGeometry, BufferGeometry>()
function hull(geometry: BufferGeometry) {
  let result = hulls.get(geometry)
  if (!result) hulls.set(geometry, (result = toCreasedNormals(geometry, Math.PI)))
  return result
}

/** Outline mesh for a part; add it as a child of the part's mesh. `line` is in CSS pixels. */
export function inkMesh(geometry: BufferGeometry, line: number) {
  const mesh = new Mesh(hull(geometry), inkMaterial(line))
  mesh.onBeforeRender = (renderer) => syncViewport(renderer)
  return mesh
}

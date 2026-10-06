import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/** Public files that should not be precached (share art only crawlers fetch). */
const SKIP_PUBLIC = new Set(['share-preview.png'])

function publicFiles(dir: string, prefix = ''): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return publicFiles(path, `${prefix}${name}/`)
    return SKIP_PUBLIC.has(name) ? [] : [`${prefix}${name}`]
  })
}

/** Emits sw.js with every built file precached, versioned by their combined hash so old caches get dropped. */
function pwa(): Plugin {
  return {
    name: 'pwa-service-worker',
    apply: 'build',
    generateBundle(_, bundle) {
      const files = ['./', ...Object.keys(bundle).filter((f) => !f.endsWith('.map') && f !== 'index.html'), ...publicFiles('public')]
      const version = createHash('sha256').update(files.join('\n')).digest('hex').slice(0, 10)
      const source = readFileSync('pwa/sw.js', 'utf8')
        .replace('__VERSION__', JSON.stringify(version))
        .replace('__PRECACHE__', JSON.stringify(files.map((f) => (f === './' ? f : `./${f}`))))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/MarketGame/' : '/',
  plugins: [react(), pwa()],
})

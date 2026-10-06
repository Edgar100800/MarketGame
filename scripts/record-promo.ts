// Captures the `?record` game view frame by frame through the Chrome DevTools Protocol.
// usage: bun scripts/record-promo.ts <out-dir> [frames] [url]   (a `vertical` param in the url records 9:16)
// Needs the dev server running (bun run dev --port 5199). Frames land as out-dir/f0001.jpg ...
import { mkdirSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

const out = process.argv[2] ?? 'promo-frames'
const frames = Number(process.argv[3] ?? 360)
const url = process.argv[4] ?? 'http://localhost:5199/?reset&unlock=all&sim=300&fill&autoplay&record'
const PORT = 9333
mkdirSync(out, { recursive: true })

const chrome = spawn('google-chrome-stable', [
  '--headless=new',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  `--remote-debugging-port=${PORT}`,
  '--user-data-dir=/tmp/record-promo-profile',
  'about:blank',
])

async function target(): Promise<string> {
  for (let i = 0; i < 50; i++) {
    try {
      const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[]
      const page = list.find((t) => t.type === 'page')
      if (page) return page.webSocketDebuggerUrl
    } catch {
      /* chrome still starting */
    }
    await Bun.sleep(200)
  }
  throw new Error('chrome did not start')
}

const ws = new WebSocket(await target())
await new Promise((r) => ws.addEventListener('open', r, { once: true }))
let nextId = 0
const pending = new Map<number, (v: any) => void>()
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(String(e.data))
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)!(msg)
    pending.delete(msg.id)
  }
})
function send(method: string, params: object = {}): Promise<any> {
  const id = ++nextId
  ws.send(JSON.stringify({ id, method, params }))
  return new Promise((r) => pending.set(id, r)).then((m: any) => {
    if (m.error) throw new Error(`${method}: ${m.error.message}`)
    return m.result
  })
}
const evaluate = async (expression: string) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value

// 1280x720 CSS at 1.5x = 1920x1080 video (720x1280 -> 1080x1920 when vertical)
const vertical = new URL(url).searchParams.has('vertical')
await send('Emulation.setDeviceMetricsOverride', { width: vertical ? 720 : 1280, height: vertical ? 1280 : 720, deviceScaleFactor: 1.5, mobile: false })
await send('Page.navigate', { url })
for (let i = 0; !(await evaluate('window.__recordReady === true')); i++) {
  if (i > 600) throw new Error('page never became ready')
  await Bun.sleep(100)
}
// let fonts, labels and the first bakes settle
await evaluate('document.fonts.ready.then(() => true)')

const started = Date.now()
for (let f = 1; f <= frames; f++) {
  // step, then give React and drei's Html labels two tasks to commit before the screenshot
  await evaluate('new Promise((r) => { window.__step(); setTimeout(() => setTimeout(r, 0), 0) })')
  const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 94 })
  writeFileSync(`${out}/f${String(f).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'))
  if (f % 30 === 0) console.log(`frame ${f}/${frames} (${((Date.now() - started) / f).toFixed(0)} ms/frame)`)
}
ws.close()
chrome.kill()
console.log(`done: ${frames} frames in ${out}`)

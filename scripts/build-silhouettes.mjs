// Collects tools/silhouettes/lib/<object-id>.svg (one <path d> in a viewBox) into public/data/silhouettes.json.
// Each entry: { w, h, d } — the game sizes the measured axis exactly and lets the other follow the aspect.
// tools/silhouettes/aspects.json may pin the TRUE aspect ([width_m, height_m]) for ids where both real
// dimensions are known; generated silhouettes tend to be drawn a little too tall, and the renderer
// stretches the path (preserveAspectRatio="none"), so correcting w/h here fixes the proportions.
import fs from 'node:fs'
import path from 'node:path'

const lib = path.resolve('tools/silhouettes/lib')
const aspectsFile = path.resolve('tools/silhouettes/aspects.json')
const out = path.resolve('public/data/silhouettes.json')
const aspects = fs.existsSync(aspectsFile) ? JSON.parse(fs.readFileSync(aspectsFile, 'utf8')) : {}
const manifest = {}
let fixed = 0
if (fs.existsSync(lib)) {
  for (const f of fs.readdirSync(lib).filter(f => f.endsWith('.svg'))) {
    const id = f.replace(/\.svg$/, '')
    const svg = fs.readFileSync(path.join(lib, f), 'utf8')
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
    const d = /<path[^>]* d="([^"]+)"/.exec(svg)
    if (!vb || !d) { console.warn('skip (no viewBox/path):', f); continue }
    let w = +vb[1], h = +vb[2]
    const real = aspects[id]
    if (Array.isArray(real) && real.length === 2 && real[0] > 0 && real[1] > 0) {
      const target = real[0] / real[1]
      const drawn = w / h
      if (Math.abs(Math.log(target / drawn)) > 0.02) fixed++
      w = +(h * target).toFixed(1)
    }
    manifest[id] = { w, h, d: d[1] }
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(manifest))
console.log(`silhouettes.json: ${Object.keys(manifest).length} shapes (${fixed} aspect-corrected), ${(fs.statSync(out).size / 1024).toFixed(1)} KB`)

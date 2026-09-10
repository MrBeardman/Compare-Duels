// Collects tools/silhouettes/lib/<object-id>.svg (one <path d> in a viewBox) into public/data/silhouettes.json.
// Each entry: { w, h, d } — the game sizes the measured axis exactly and lets the other follow the aspect.
import fs from 'node:fs'
import path from 'node:path'

const lib = path.resolve('tools/silhouettes/lib')
const out = path.resolve('public/data/silhouettes.json')
const manifest = {}
if (fs.existsSync(lib)) {
  for (const f of fs.readdirSync(lib).filter(f => f.endsWith('.svg'))) {
    const svg = fs.readFileSync(path.join(lib, f), 'utf8')
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg)
    const d = /<path[^>]* d="([^"]+)"/.exec(svg)
    if (!vb || !d) { console.warn('skip (no viewBox/path):', f); continue }
    manifest[f.replace(/\.svg$/, '')] = { w: +vb[1], h: +vb[2], d: d[1] }
  }
}
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(manifest))
console.log(`silhouettes.json: ${Object.keys(manifest).length} shapes, ${(fs.statSync(out).size / 1024).toFixed(1)} KB`)

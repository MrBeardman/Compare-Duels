// Builds public/data/pool.json from data/curated.csv (later: + Wikidata pulls).
import fs from 'node:fs'
import path from 'node:path'

const src = path.resolve('data/curated.csv')
const out = path.resolve('public/data/pool.json')

const CATEGORY_MAP = {
  // curated subcategory → game category
  mammal: 'animals', 'marine mammal': 'animals', bird: 'animals', reptile: 'animals', amphibian: 'animals',
  fish: 'animals', invertebrate: 'animals', insect: 'animals', arachnid: 'animals', dinosaur: 'animals',
  vehicles: 'vehicles', space: 'space', nature: 'landmarks', construction: 'landmarks', street: 'landmarks',
}
// Silhouette axis: which way the measured dimension runs on screen.
const WIDTH_DIMS = /wingspan|length|width|arm span|leg span|disc width|carapace|bell diameter|diameter|edge|total length|head-body|body length|shell length/i

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  const head = lines.shift().split(',')
  return lines.map(l => {
    const cells = []; let cur = '', q = false
    for (const ch of l) {
      if (ch === '"') q = !q
      else if (ch === ',' && !q) { cells.push(cur); cur = '' }
      else cur += ch
    }
    cells.push(cur)
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']))
  })
}

const rows = parseCSV(fs.readFileSync(src, 'utf8'))
const pool = rows.map(r => {
  const category = r.category === 'animals' ? 'animals' : (CATEGORY_MAP[r.subcategory] ?? 'objects')
  const dim = r.dimension
  const axis = /height|standing|shoulder|withers|hump|rim height/i.test(dim) && !/length/i.test(dim) ? 'height' : (WIDTH_DIMS.test(dim) ? 'width' : 'height')
  return {
    id: r.id, name: r.name, category, subcategory: r.subcategory, dimension: dim, axis,
    size_m: Number(r.size_m), tier: Number(r.tier), note: r.note || undefined,
  }
}).filter(o => o.size_m > 0)

fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(pool))
const byCat = pool.reduce((m, o) => (m[o.category] = (m[o.category] || 0) + 1, m), {})
console.log(`pool.json: ${pool.length} objects`, byCat, `${(fs.statSync(out).size / 1024).toFixed(1)} KB`)

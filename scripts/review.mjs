import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('shots', { recursive: true })

const port = 4185
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', shell: true })
await new Promise(r => setTimeout(r, 2000))
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 390, height: 844 } })
p.setDefaultTimeout(5000)
const errors = []
p.on('pageerror', e => errors.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::/.test(m.text())) errors.push(m.text()) })
const cats = ['Animals', 'Vehicles', 'Landmarks', 'Space', 'Everyday', 'All']
let shot = 0
for (const cat of cats) {
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  if (cat !== 'All') await p.getByRole('button', { name: cat, exact: true }).click()
  await p.getByRole('button', { name: 'PLAY', exact: true }).click(); await p.waitForTimeout(250)
  const gotit = p.getByRole('button', { name: 'Got it' }); if (await gotit.count()) await gotit.click()
  for (let r = 0; r < 15; r++) {
    const hasReal = await p.evaluate(() => [...document.querySelectorAll('.grid-map svg path')].some(x => (x.getAttribute('d') || '').length > 300))
    if (hasReal) { await p.screenshot({ path: `shots/rev-${shot++}-${cat}.png` }); console.log('shot', cat, r); break }
    const lockIn = p.getByRole('button', { name: 'LOCK IN' })
    if (!(await lockIn.count())) break
    await lockIn.click(); await p.waitForTimeout(150)
    const btn = p.getByRole('button', { name: /NEXT|SEE RESULTS/ })
    if (!(await btn.count())) break
    const label = await btn.innerText()
    await btn.click(); await p.waitForTimeout(150)
    if (/SEE RESULTS/.test(label)) {
      const again = p.getByRole('button', { name: 'PLAY AGAIN' })
      if (await again.count()) { await again.click(); await p.waitForTimeout(200) }
    }
  }
}
await b.close(); srv.kill()
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1) }
console.log('ok', shot, 'shots')

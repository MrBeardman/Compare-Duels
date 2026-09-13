import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
mkdirSync('shots', { recursive: true })
const shot = (n) => ({ path: `shots/${n}` })
const port = 4183
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore', shell: true })
await new Promise(r => setTimeout(r, 2000))
const b = await chromium.launch()
const errors = []
const mkPage = async (name) => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const p = await ctx.newPage()
  p.setDefaultTimeout(8000)
  p.on('pageerror', e => errors.push(`[${name}] ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|net::/.test(m.text())) errors.push(`[${name}] ${m.text()}`) })
  return { ctx, p }
}
try {
  const a = await mkPage('A-home')
  await a.p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
  await a.p.screenshot(shot('e2e-1-home.png'))
  await a.p.getByRole('button', { name: /Switch to dark mode/ }).click()
  await a.p.waitForTimeout(150)
  await a.p.screenshot(shot('e2e-2-home-dark.png'))
  await a.p.getByRole('button', { name: /Switch to light mode/ }).click()
  await a.p.getByRole('button', { name: 'PLAY', exact: true }).click()
  await a.p.waitForTimeout(300)
  const gotit = a.p.getByRole('button', { name: 'Got it' }); if (await gotit.count()) await gotit.click()
  const grid = await a.p.locator('.grid-map').boundingBox()
  for (let i = 0; i < 10; i++) {
    await a.p.mouse.move(grid.x + grid.width * 0.5, grid.y + grid.height * 0.5)
    await a.p.mouse.wheel(0, 3000); await a.p.waitForTimeout(100)
    await a.p.getByRole('button', { name: 'LOCK IN' }).click(); await a.p.waitForTimeout(200)
    const btn = a.p.getByRole('button', { name: /NEXT|SEE RESULTS/ })
    const label = await btn.innerText(); await btn.click(); await a.p.waitForTimeout(200)
    if (/SEE RESULTS/.test(label)) break
  }
  await a.p.screenshot(shot('e2e-3-summary.png'))
  await a.p.getByRole('button', { name: 'Challenge a friend' }).click()
  const link = await a.p.evaluate(() => navigator.clipboard.readText())
  console.log('ghost link:', link)
  await a.p.getByRole('button', { name: 'Home' }).click(); await a.p.waitForTimeout(200)
  await a.p.getByRole('button', { name: 'Stats', exact: false }).click(); await a.p.waitForTimeout(200)
  await a.p.screenshot(shot('e2e-4-stats.png'))
  await a.p.getByRole('button', { name: '‹ Back' }).click()
  await a.p.getByRole('button', { name: 'Ladder', exact: false }).click(); await a.p.waitForTimeout(200)
  await a.p.screenshot(shot('e2e-5-ladder.png'))
  await a.ctx.close()
  const bctx = await mkPage('B')
  await bctx.p.goto(link, { waitUntil: 'networkidle' })
  await bctx.p.screenshot(shot('e2e-6-b-home-challenged.png'))
  await bctx.p.getByRole('button', { name: "You've been challenged" }).click()
  await bctx.p.waitForTimeout(300)
  await bctx.p.screenshot(shot('e2e-7-b-ghost-round.png'))
  for (let i = 0; i < 6; i++) {
    const lockIn = bctx.p.getByRole('button', { name: 'LOCK IN' })
    if (!(await lockIn.count())) break
    await lockIn.click(); await bctx.p.waitForTimeout(200)
    const btn = bctx.p.getByRole('button', { name: /NEXT|SEE RESULTS/ })
    if (!(await btn.count())) break
    await btn.click(); await bctx.p.waitForTimeout(200)
  }
  await bctx.p.screenshot(shot('e2e-8-b-duel-result.png'))
  await bctx.ctx.close()
} finally { await b.close(); srv.kill() }
if (errors.length) { console.error('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1) }
console.log('no console errors')

// Headless walkthrough: home → play → reveal → summary, at phone portrait and desktop. Fails on console errors.
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const port = 4179
const srv = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'ignore' })
await new Promise(r => setTimeout(r, 2500))
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' })
const errors = []
try {
  for (const [name, vp, mobile] of [['mobile', { width: 390, height: 844 }, true], ['desktop', { width: 1280, height: 800 }, false]]) {
    const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile })
    const p = await ctx.newPage()
    p.on('pageerror', e => errors.push(`[${name}] ${e.message}`))
    p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_TUNNEL|net::/.test(m.text())) errors.push(`[${name}] ${m.text()}`) })
    await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' })
    await p.screenshot({ path: `shots/${name}-1-home.png` })
    await p.getByRole('button', { name: 'PLAY', exact: true }).click()
    await p.waitForTimeout(300)
    await p.screenshot({ path: `shots/${name}-2-hint.png` })
    await p.getByRole('button', { name: 'Got it' }).click()
    await p.waitForTimeout(200)
    // drag the target bigger
    const grid = await p.locator('.grid-map').boundingBox()
    await p.mouse.move(grid.x + grid.width * 0.68, grid.y + grid.height * 0.6)
    await p.mouse.down(); await p.mouse.move(grid.x + grid.width * 0.68, grid.y + grid.height * 0.35, { steps: 8 }); await p.mouse.up()
    await p.screenshot({ path: `shots/${name}-3-round.png` })
    await p.getByRole('button', { name: 'LOCK IN' }).click()
    await p.waitForTimeout(300)
    await p.screenshot({ path: `shots/${name}-4-reveal.png` })
    // play until over by making bad guesses (wheel to extreme)
    for (let i = 0; i < 8; i++) {
      const btn = p.getByRole('button', { name: /NEXT|SEE RESULTS/ })
      const label = await btn.innerText()
      await btn.click(); await p.waitForTimeout(200)
      if (/SEE RESULTS/.test(label)) break
      await p.mouse.move(grid.x + grid.width * 0.5, grid.y + grid.height * 0.5)
      await p.mouse.wheel(0, 3000); await p.waitForTimeout(100)
      await p.getByRole('button', { name: 'LOCK IN' }).click(); await p.waitForTimeout(200)
    }
    await p.screenshot({ path: `shots/${name}-5-summary.png` })
    console.log(name, 'ok')
    await ctx.close()
  }
} finally {
  await b.close(); srv.kill()
}
if (errors.length) { console.error('CONSOLE ERRORS:\n' + errors.join('\n')); process.exit(1) }
console.log('no console errors')

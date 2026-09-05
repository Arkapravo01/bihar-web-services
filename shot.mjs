import { chromium } from 'playwright'
const url = process.argv[2]
const out = process.argv[3]
const theme = process.argv[4] ?? 'light'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.addInitScript((t) => { try { localStorage.setItem('bws-theme', t) } catch {} }, theme)
await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(2500)
await page.screenshot({ path: out, fullPage: true })
console.log('saved ' + out)
if (errors.length) { console.log('--- console errors:'); errors.slice(0, 12).forEach((e) => console.log('  ' + e)) }
else console.log('no console errors')
await browser.close()

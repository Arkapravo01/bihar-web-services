import { createRequire } from 'module'
const require = createRequire('file:///C:/Users/ArkapravoChakrabarti/AppData/Local/npm-cache/_npx/705bc6b22212b352/')
const { chromium } = require('playwright')

const [url, out, theme = 'light'] = process.argv.slice(2)
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
await page.addInitScript((t) => { try { localStorage.setItem('bws-theme', t) } catch {} }, theme)
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3000)
await page.screenshot({ path: out, fullPage: true })
console.log('saved ' + out)
console.log(errors.length ? 'console errors:\n  ' + errors.slice(0, 10).join('\n  ') : 'no console errors')
await browser.close()

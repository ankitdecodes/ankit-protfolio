// Prints resume/resume.html to public/resume.pdf with a local Chrome/Chromium.
// Usage: npm run resume   (needs `npm i -D playwright-core` once, or CHROME_PATH set)
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const { chromium } = await import('playwright-core').catch(() => {
  console.error('Install the printer first: npm i -D playwright-core')
  process.exit(1)
})
const candidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium', '/snap/bin/chromium'].filter(Boolean)
const executablePath = candidates.find((p) => existsSync(p))
if (!executablePath) {
  console.error('No Chrome/Chromium found; set CHROME_PATH')
  process.exit(1)
}
const src = fileURLToPath(new URL('../resume/resume.html', import.meta.url))
const out = fileURLToPath(new URL('../public/resume.pdf', import.meta.url))
const browser = await chromium.launch({ executablePath, args: ['--allow-file-access-from-files'] })
const page = await browser.newPage()
await page.goto(`file://${src}`, { waitUntil: 'networkidle' })
await page.evaluate(() => document.fonts.ready)
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true })
await browser.close()
console.log(`Wrote ${out}`)

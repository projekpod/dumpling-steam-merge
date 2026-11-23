import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

const output = new URL('../docs/rilis/screenshots/', import.meta.url)
await mkdir(output, { recursive: true })
const server = await preview({ preview: { host: '127.0.0.1', port: 4196, strictPort: true } })
try {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  try {
    const now = 1_800_000_000_000
    const page = await browser.newPage({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, locale: 'en-US' })
    await page.clock.setFixedTime(now)
    await page.addInitScript(time => {
      if (localStorage.getItem('kebun-mochi:board')) return
      const board = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 2, 1, 3, 0, 4, 0, 2, ...Array(10).fill(0)]
      const variants = board.map((level, i) => level && i >= 12 ? ['glitter', 'gold', 'rainbow', 'normal'][i % 4] : 'normal')
      const lineup = { board, variants, discovered: Array(12).fill(1), highest: 12 }
      localStorage.setItem('kebun-mochi:board', JSON.stringify({
        ...lineup, version: 7, area: 'kebun', otherAreas: { pantai: lineup, salju: lineup },
        coins: 1480, settledAt: time, freeCharges: 2, freeAt: time, onboarding: 'done',
        eggActiveMs: 0, squishedAt: [],
        levels: { saver: 0, capacity: 12, free: 0, special: 0, bonus: 0, squish: 0 },
      }))
    }, now)
    await page.goto('http://127.0.0.1:4196/')
    await page.locator('#field canvas').waitFor()
    for (const [area, name] of [['kebun', 'garden'], ['pantai', 'beach'], ['salju', 'snow']]) {
      if (area !== 'kebun') {
        await page.locator('#area').click()
        await page.locator(`[data-area-option="${area}"]`).click()
        await page.locator('#area-curtain').waitFor({ state: 'hidden' })
        await page.locator('#area').blur()
      }
      await page.locator(`.game[data-area="${area}"]`).waitFor()
      await page.locator('#area-landscape').evaluate(image => image.decode())
      await page.screenshot({ path: fileURLToPath(new URL(`gameplay-area-${name}.png`, output)) })
    }
  } finally {
    await browser.close()
  }
} finally {
  await server.close()
}

import { expect, test, type CDPSession, type Page } from '@playwright/test'

async function dragCell(page: Page, cdp: CDPSession, from: number, to: number) {
  const box = (await page.locator('#field canvas').boundingBox())!
  const center = (column: number) => ({
    x: box.x + box.width * (column + 0.5) / 5,
    y: box.y + box.height / 12,
  })
  const start = center(from)
  const end = center(to)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [end] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test('memainkan dan memuat ulang Kebun dengan sentuhan di subpath Pages', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('./')
  const button = page.getByRole('button', { name: /Ketuk toples/ })
  const count = page.locator('#capacity')
  await expect(count).toHaveText('0 / 20')
  const box = (await button.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  await button.tap()
  await button.tap()
  await expect(count).toHaveText('2 / 20')

  const cdp = await page.context().newCDPSession(page)
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('1 / 20')
  await expect(page.locator('#status')).toContainText('Mochi level 2')

  await page.reload()
  await expect(count).toHaveText('1 / 20')
  await button.tap()
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('2 / 20')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.version).toBe(2)
  expect(save.board.slice(0, 2)).toEqual([1, 2])
  expect(errors).toEqual([])
})

test('mengukur FPS kanvas dengan throttling CPU 4×', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.goto('./')
  const button = page.getByRole('button', { name: /Ketuk toples/ })
  for (let index = 0; index < 8; index++) await button.tap()
  const fps = await page.evaluate(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('#field canvas')!
    const context = canvas.getContext('2d')!
    const clear = context.clearRect
    let frames = 0
    context.clearRect = function (x, y, w, h) {
      frames++
      clear.call(this, x, y, w, h)
    }

    const start = performance.now()
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 2500))
      return frames * 1000 / (performance.now() - start)
    } finally {
      context.clearRect = clear
    }
  })
  console.log(`FPS Chromium (360×640, CPU 4×, 8 mochi): ${fps.toFixed(1)}`)
  expect(fps).toBeGreaterThanOrEqual(30)
})

test('membayar hasil offline, membeli upgrade, dan menyimpan ekonomi', async ({ page }) => {
  const now = 1_800_000_000_000
  await page.clock.setFixedTime(now)
  await page.addInitScript(savedAt => {
    if (localStorage.getItem('kebun-mochi:board')) return
    localStorage.setItem('kebun-mochi:board', JSON.stringify({
      version: 2,
      board: [1, ...Array(29).fill(0)],
      coins: 0,
      settledAt: savedAt,
      lastSpawnAt: null,
      levels: { speed: 0, capacity: 0, bonus: 0 },
    }))
  }, now - 9 * 60 * 60 * 1000)

  await page.goto('./')
  await expect(page.locator('#offline')).toContainText('+28.8K koin')
  await page.getByText('Upgrade kebun', { exact: true }).tap()
  await page.getByRole('button', { name: /Toples cepat/ }).tap()
  await page.getByRole('button', { name: /Kapasitas kebun/ }).tap()
  await page.getByRole('button', { name: /Bonus koin/ }).tap()
  await expect(page.locator('#capacity')).toHaveText('1 / 25')
  await expect(page.locator('#rate')).toHaveText('+1.25 koin/detik')

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  await page.clock.setFixedTime(now + 4_000)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')))
  await expect(page.locator('#offline')).toContainText('+5 koin')
  await page.reload()
  await expect(page.locator('#offline')).toBeHidden()
  await expect(page.locator('#capacity')).toHaveText('1 / 25')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.coins).toBe(28_740)
  expect(save.levels).toEqual({ speed: 1, capacity: 1, bonus: 1 })
})

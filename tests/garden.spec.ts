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
  await expect(count).toHaveText('0 / 30')
  const box = (await button.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  await button.tap()
  await button.tap()
  await expect(count).toHaveText('2 / 30')

  const cdp = await page.context().newCDPSession(page)
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('1 / 30')
  await expect(page.locator('#status')).toContainText('Mochi level 2')

  await page.reload()
  await expect(count).toHaveText('1 / 30')
  await button.tap()
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('2 / 30')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.version).toBe(1)
  expect(save.cells.slice(0, 2)).toEqual([1, 2])
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

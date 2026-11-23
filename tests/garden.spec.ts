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
  await expect(count).toHaveText('0 / 12')
  const box = (await button.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  await button.tap()
  await button.tap()
  await expect(count).toHaveText('2 / 12')

  const cdp = await page.context().newCDPSession(page)
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('1 / 12')
  await expect(page.locator('#status')).toContainText('Mochi level 2')

  await page.reload()
  await expect(count).toHaveText('1 / 12')
  await button.tap()
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('2 / 12')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.version).toBe(3)
  expect(save.board.slice(0, 2)).toEqual([1, 2])
  expect(errors).toEqual([])
})

test('mengukur FPS kanvas dengan throttling CPU 4×', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    const board = Array.from({ length: 30 }, (_, index) => index % 12 + 1)
    localStorage.setItem('kebun-mochi:board', JSON.stringify({ version: 1, cells: board }))
  })
  await page.goto('./')
  await expect(page.locator('#capacity')).toHaveText('30 / 30')
  const button = page.getByRole('button', { name: /Ketuk toples/ })
  const box = (await button.boundingBox())!
  const board = (await page.locator('.board').boundingBox())!
  expect(board.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  const measurement = await page.evaluate(async () => {
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
      const snapshots = new Set<string>()
      for (let sample = 0; sample < 6; sample++) {
        await new Promise<void>(resolve => setTimeout(resolve, 1000))
        snapshots.add(canvas.toDataURL())
      }
      return { fps: frames * 1000 / (performance.now() - start), poses: snapshots.size }
    } finally {
      context.clearRect = clear
    }
  })
  console.log(`FPS Chromium (360×640, CPU 4×, 30 mochi): ${measurement.fps.toFixed(1)}`)
  expect(measurement.poses).toBeGreaterThan(1)
  expect(measurement.fps).toBeGreaterThanOrEqual(30)
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
  await expect(page.locator('#capacity')).toHaveText('1 / 13')
  await page.getByRole('button', { name: /Toples ajaib/ }).tap()
  await expect(page.getByRole('button', { name: /Toples ajaib.*Lv\. 1/ })).toContainText('950 koin')
  await expect(page.locator('#rate')).toHaveText('+1.1 koin/detik')

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  await page.clock.setFixedTime(now + 4_000)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')))
  await expect(page.locator('#offline')).toContainText('+4.4 koin')
  await page.reload()
  await expect(page.locator('#offline')).toBeHidden()
  await expect(page.locator('#capacity')).toHaveText('1 / 13')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.coins).toBeCloseTo(27_979.4)
  expect(save.levels).toEqual({ speed: 1, capacity: 1, bonus: 1, magic: 1 })
})

test('mencatat penemuan pertama dan combo sentuhan', async ({ page }) => {
  await page.clock.setFixedTime(1_800_000_000_000)
  await page.addInitScript(() => {
    if (localStorage.getItem('kebun-mochi:board')) return
    const cells = [1, 1, 1, 1, ...Array(26).fill(0)]
    localStorage.setItem('kebun-mochi:board', JSON.stringify({ version: 1, cells }))
  })
  await page.goto('./')
  await expect(page.locator('#capacity')).toHaveText('4 / 12')
  const cdp = await page.context().newCDPSession(page)
  await dragCell(page, cdp, 0, 1)
  await expect(page.locator('#discovery')).toContainText('Mochi Kuncup')
  await dragCell(page, cdp, 2, 3)
  await expect(page.locator('#status')).toContainText('Combo ×2')
  await dragCell(page, cdp, 1, 3)
  await expect(page.locator('#status')).toContainText('Combo ×3')
  await expect(page.locator('#discovery')).toContainText('Mochi baru!')
  await expect(page.locator('#discovery')).toContainText('Kelopaknya rapi sampai ia mulai menari.')
  await expect(page.locator('#coins')).toHaveText('24 koin')
  await page.reload()
  await expect(page.locator('#coins')).toHaveText('24 koin')
  await expect(page.locator('#discovery')).toBeHidden()
})

test('debug tersedia lewat URL dan pilihan mute bertahan', async ({ page }) => {
  await page.clock.setFixedTime(1_800_000_000_000)
  await page.goto('./')
  await expect(page.getByRole('button', { name: '+1 jam', exact: true })).toHaveCount(0)
  const mute = page.getByRole('button', { name: 'Bisukan suara' })
  await mute.tap()
  await expect(mute).toHaveAttribute('aria-pressed', 'true')
  await page.goto('./?debug=1')
  await expect(mute).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: /Ketuk toples/ }).tap()
  await page.getByRole('button', { name: '+1 jam', exact: true }).tap()
  await expect(page.locator('#coins')).toHaveText('3.6K koin')
  await page.getByRole('button', { name: 'koin ×10', exact: true }).tap()
  await expect(page.locator('#coins')).toHaveText('36K koin')
})

test('mochi tertidur setelah 30 detik dan bangun saat disentuh', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => {
    const sleepingTextures = new WeakSet<HTMLCanvasElement>()
    const { fillText, drawImage } = CanvasRenderingContext2D.prototype
    CanvasRenderingContext2D.prototype.fillText = function (label, x, y, maxWidth) {
      if (label === 'z z z') sleepingTextures.add(this.canvas)
      if (maxWidth === undefined) fillText.call(this, label, x, y)
      else fillText.call(this, label, x, y, maxWidth)
    }
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...coordinates: number[]) {
      if (this.canvas.parentElement?.id === 'field') {
        this.canvas.dataset.sleeping = String(source instanceof HTMLCanvasElement && sleepingTextures.has(source))
      }
      Reflect.apply(drawImage, this, [source, ...coordinates])
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: /Ketuk toples/ }).tap()
  const canvas = page.locator('#field canvas')
  await expect(canvas).toHaveAttribute('data-sleeping', 'false')
  await page.clock.runFor(31_500)
  await expect(canvas).toHaveAttribute('data-sleeping', 'true')
  await canvas.tap({ position: { x: 24, y: 25 } })
  await page.clock.runFor(250)
  await expect(canvas).toHaveAttribute('data-sleeping', 'false')
})

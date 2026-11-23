import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { newGarden, type Garden } from '../src/economy'
import { rarities } from '../src/rarity'
import { encodeGarden } from '../src/storage'

const now = 1_800_000_000_000

async function seedGarden(page: Page, garden: Garden) {
  await page.addInitScript(saved => {
    if (!localStorage.getItem('kebun-mochi:board')) localStorage.setItem('kebun-mochi:board', saved)
  }, encodeGarden(garden))
}

async function rollOnOpen(page: Page, roll: number) {
  await page.locator('#spawn').evaluate((button, roll) => {
    button.addEventListener('click', () => {
      const random = Math.random
      Math.random = () => roll
      window.setTimeout(() => { Math.random = random }, 0)
    }, { capture: true, once: true })
  }, roll)
}

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
  await page.clock.setFixedTime(now)
  await page.goto('./')
  const button = page.getByRole('button', { name: /Buka kukusan/ })
  const count = page.locator('#capacity')
  await expect(count).toHaveText('0 / 12')
  const box = (await button.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  await expect(button).toContainText('8 koin')
  await expect(button).toContainText('Gratis')
  await rollOnOpen(page, 0.5)
  await button.tap()
  await expect(button).toBeDisabled()
  await page.clock.setFixedTime(now + 8000)
  await expect(button).toBeEnabled()
  await rollOnOpen(page, 0.5)
  await button.tap()
  await expect(count).toHaveText('2 / 12')

  const cdp = await page.context().newCDPSession(page)
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('1 / 12')
  await expect(page.locator('#status')).toContainText('Dumpling level 2')

  await page.reload()
  await expect(count).toHaveText('1 / 12')
  await page.clock.setFixedTime(now + 20_000)
  await rollOnOpen(page, 0.5)
  await button.tap()
  await dragCell(page, cdp, 0, 1)
  await expect(count).toHaveText('2 / 12')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.version).toBe(6)
  expect(save.board.slice(0, 2)).toEqual([1, 2])
  expect(errors).toEqual([])
})

test('mengukur FPS kanvas dengan throttling CPU 4×', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const board = Array.from({ length: 30 }, (_, index) => index % 12 + 1)
  const variants = board.map((_, index) => rarities[index % rarities.length])
  await seedGarden(page, { ...newGarden(Date.now(), board), variants })
  await page.addInitScript(() => {
    const oscillator = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (when) {
      const canvas = document.querySelector('#field canvas')!
      canvas.setAttribute('data-notes', String(Number(canvas.getAttribute('data-notes') ?? 0) + 1))
      oscillator.call(this, when)
    }
  })
  await page.goto('./')
  await expect(page.locator('#capacity')).toHaveText('30 / 30')
  const button = page.getByRole('button', { name: /Buka kukusan/ })
  const box = (await button.boundingBox())!
  const boardBox = (await page.locator('.board').boundingBox())!
  expect(boardBox.y).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(640)
  const field = page.locator('#field canvas')
  await expect(field).not.toHaveAttribute('data-notes', /.+/)
  const bounds = (await field.boundingBox())!
  const first = { x: bounds.x + bounds.width / 10, y: bounds.y + bounds.height / 12 }
  const second = { x: first.x + 32, y: first.y + 10 }
  // Tap the board margin to unlock music without changing the full board.
  await page.touchscreen.tap(boardBox.x + 10, boardBox.y + 8)
  await expect.poll(async () => Number(await field.getAttribute('data-notes'))).toBeGreaterThan(3)
  const before = Number(await field.getAttribute('data-notes'))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [second] })
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
  const duringDrag = Number(await field.getAttribute('data-notes')) - before
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  expect(duringDrag).toBeGreaterThan(0)
  console.log(`FPS Chromium (360×640, CPU 4×, 30 dumpling, musik + seret): ${measurement.fps.toFixed(1)}`)
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
  for (const name of [
    /Kukusan Hemat/, /Kapasitas kebun/, /Kukusan Gratis Lebih Cepat/,
    /Kukusan Istimewa/, /Bonus koin/, /Remas Ajaib/,
  ]) {
    await page.getByRole('button', { name }).tap()
  }
  await expect(page.getByRole('button', { name: /Kukusan Istimewa.*Lv\. 1/ })).toBeVisible()
  await expect(page.locator('#capacity')).toHaveText('1 / 13')
  await expect(page.locator('#rate')).toHaveText('+1.1 koin/detik')

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  await page.clock.setFixedTime(now + 4_000)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')))
  await expect(page.locator('#offline')).toContainText('+4.4 koin')
  await page.reload()
  await expect(page.locator('#offline')).toBeHidden()
  await expect(page.locator('#capacity')).toHaveText('1 / 13')
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))
  expect(save.coins).toBeCloseTo(27_936.4)
  expect(save.levels).toEqual({ saver: 1, capacity: 1, free: 1, special: 1, bonus: 1, squish: 1 })
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
  await expect(page.locator('#discovery')).toContainText('Dumpling Kuncup')
  await dragCell(page, cdp, 2, 3)
  await expect(page.locator('#status')).toContainText('Combo ×2')
  await dragCell(page, cdp, 1, 3)
  await expect(page.locator('#status')).toContainText('Combo ×3')
  await expect(page.locator('#discovery')).toContainText('Dumpling baru!')
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
  await rollOnOpen(page, 0.5)
  await page.getByRole('button', { name: /Buka kukusan/ }).tap()
  await page.getByRole('button', { name: '+1 jam', exact: true }).tap()
  await expect(page.locator('#coins')).toHaveText('3.6K koin')
  await page.getByRole('button', { name: 'koin ×10', exact: true }).tap()
  await expect(page.locator('#coins')).toHaveText('36K koin')
})

test('dumpling tertidur setelah 30 detik dan bangun saat disentuh', async ({ page }) => {
  await page.clock.install()
  await page.addInitScript(() => {
    const sleepingTextures = new WeakSet<HTMLCanvasElement>()
    const { fillText, drawImage, clearRect } = CanvasRenderingContext2D.prototype
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (this.canvas.parentElement?.id === 'field') this.canvas.dataset.sleeping = 'false'
      clearRect.call(this, x, y, w, h)
    }
    CanvasRenderingContext2D.prototype.fillText = function (label, x, y, maxWidth) {
      if (label === 'z z z') sleepingTextures.add(this.canvas)
      if (maxWidth === undefined) fillText.call(this, label, x, y)
      else fillText.call(this, label, x, y, maxWidth)
    }
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...coordinates: number[]) {
      if (this.canvas.parentElement?.id === 'field' &&
        source instanceof HTMLCanvasElement && sleepingTextures.has(source)) this.canvas.dataset.sleeping = 'true'
      Reflect.apply(drawImage, this, [source, ...coordinates])
    }
  })
  await page.goto('./')
  await page.getByRole('button', { name: /Buka kukusan/ }).tap()
  const canvas = page.locator('#field canvas')
  await expect(canvas).toHaveAttribute('data-sleeping', 'false')
  await page.clock.runFor(31_500)
  await expect(canvas).toHaveAttribute('data-sleeping', 'true')
  await canvas.tap({ position: { x: 24, y: 25 } })
  await page.clock.runFor(250)
  await expect(canvas).toHaveAttribute('data-sleeping', 'false')
})

test('membuka kukusan darurat, mengungkap varian, dan menyimpannya di Buku Koleksi Dumpling', async ({ page }) => {
  await page.clock.setFixedTime(now)
  await seedGarden(page, { ...newGarden(now), freeCharges: 0 })
  await page.goto('./')

  const button = page.getByRole('button', { name: /Buka kukusan/ })
  await expect(button).toContainText('Gratis untuk papan kosong')
  await rollOnOpen(page, 0)
  await button.tap()
  await expect(page.locator('#status')).toContainText('Pink Langka')
  await expect(page.locator('#rate')).toHaveText('+10 koin/detik')

  await page.getByText('Info peluang kukusan', { exact: true }).tap()
  await expect(page.locator('#odds-pink')).toHaveText('0,0105%')
  await expect(page.locator('#odds-gold')).toHaveText('0,08%')

  await page.reload()
  await page.getByText('Buku Koleksi Dumpling', { exact: true }).tap()
  await expect(page.locator('#dex li').first()).toContainText('Pink Langka')
  await expect(page.locator('#dex li').first()).toContainText('Dumpling Tunas')
})

test('tekan-tahan memberi koin terbatas dan gerak lebih dari 10 px tetap menggabung', async ({ page }) => {
  await page.clock.install({ time: now })
  const board = [1, 1, ...Array<number>(28).fill(0)]
  await seedGarden(page, newGarden(now, board))
  await page.goto('./')
  await expect(page.locator('#capacity')).toHaveText('2 / 12')
  const cdp = await page.context().newCDPSession(page)
  const box = (await page.locator('#field canvas').boundingBox())!
  const first = { x: box.x + box.width / 10, y: box.y + box.height / 12 }
  const second = { x: box.x + box.width * 3 / 10, y: first.y }
  const readSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('kebun-mochi:board')!))

  for (let attempt = 0; attempt < 4; attempt++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] })
    await page.clock.runFor(650)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  expect((await readSave()).squishedAt).toHaveLength(3)

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [first] })
  await page.clock.runFor(650)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [second] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  expect((await readSave()).board.slice(0, 2)).toEqual([0, 2])
})

test('mode hemat mematikan uap pada frame rate rendah', async ({ page }) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = callback => window.setTimeout(() => callback(performance.now()), 35)
    window.cancelAnimationFrame = id => window.clearTimeout(id)
  })
  await page.goto('./')
  await expect(page.locator('#app')).toHaveClass(/economy-mode/)
  await expect(page.locator('.steam')).toHaveCSS('display', 'none')
})

test('papan penuh tanpa pasangan pulih setelah konfirmasi pemain', async ({ page }) => {
  await page.clock.setFixedTime(now)
  const board = [...Array.from({ length: 12 }, (_, index) => index + 1), ...Array<number>(18).fill(0)]
  await seedGarden(page, newGarden(now, board))
  await page.goto('./')
  const button = page.getByRole('button', { name: /Buka kukusan/ })
  await expect(button).toBeDisabled()
  await page.getByRole('button', { name: 'Kosongkan 1 petak' }).tap()
  await page.getByRole('button', { name: 'Lepaskan dumpling' }).tap()
  await expect(page.locator('#capacity')).toHaveText('11 / 12')
  await expect(button).toBeEnabled()
  await rollOnOpen(page, 0.5)
  await button.tap()
  await expect(page.locator('#capacity')).toHaveText('12 / 12')
  await page.getByText('Buku Koleksi Dumpling', { exact: true }).tap()
  await expect(page.locator('#dex li').first()).toContainText('Dumpling Tunas')
})

test('semua wajah mengikuti seretan, terbangun satu mata, lalu bereaksi pada hasil lepas', async ({ page }) => {
  await page.clock.install({ time: now })
  await seedGarden(page, newGarden(now, [1, 1, 2, 0, 3, ...Array<number>(25).fill(0)]))
  await page.addInitScript(() => {
    const kinds = new WeakMap<HTMLCanvasElement, string>()
    const { clearRect, drawImage, ellipse, lineTo, quadraticCurveTo } = CanvasRenderingContext2D.prototype
    let frame: { pupil: number[]; peek: number; happy: number; sad: number } = { pupil: [], peek: 0, happy: 0, sad: 0 }
    CanvasRenderingContext2D.prototype.ellipse = function (x, y, rx, ry, rotation, start, end, ccw) {
      if (rx === 1.78) kinds.set(this.canvas, 'pupil')
      if (rx === 4.3 && x === 8) kinds.set(this.canvas, 'gaze')
      if (rx === 4.3 && x === 24 && !kinds.has(this.canvas)) kinds.set(this.canvas, 'peek')
      ellipse.call(this, x, y, rx, ry, rotation, start, end, ccw)
    }
    CanvasRenderingContext2D.prototype.lineTo = function (x, y) {
      if (y === 6 && (x === 8 || x === 24)) kinds.set(this.canvas, 'happy')
      lineTo.call(this, x, y)
    }
    CanvasRenderingContext2D.prototype.quadraticCurveTo = function (cx, cy, x, y) {
      if (cx === 16 && y === 15) kinds.set(this.canvas, 'sad')
      quadraticCurveTo.call(this, cx, cy, x, y)
    }
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (this.canvas.parentElement?.id === 'field') {
        this.canvas.dataset.faceFrame = JSON.stringify(frame)
        frame = { pupil: [], peek: 0, happy: 0, sad: 0 }
      }
      clearRect.call(this, x, y, w, h)
    }
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...coordinates: number[]) {
      if (this.canvas.parentElement?.id === 'field' && source instanceof HTMLCanvasElement) {
        const kind = kinds.get(source)
        if (kind === 'pupil') {
          const matrix = this.getTransform()
          frame.pupil.push(matrix.a * (coordinates[0] + 6) + matrix.c * (coordinates[1] + 7) + matrix.e)
        }
        else if (kind === 'peek' || kind === 'happy' || kind === 'sad') frame[kind]++
      }
      Reflect.apply(drawImage, this, [source, ...coordinates])
    }
  })
  await page.goto('./')
  await expect(page.locator('#capacity')).toHaveText('4 / 12')
  await page.clock.runFor(32_000)
  const canvas = page.locator('#field canvas')
  const bounds = (await canvas.boundingBox())!
  const point = (column: number) => ({ x: bounds.x + bounds.width * (column + 0.5) / 5, y: bounds.y + bounds.height / 12 })
  const cdp = await page.context().newCDPSession(page)
  const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', column?: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: column === undefined ? [] : [point(column)] })
  const frame = async () => JSON.parse(await canvas.getAttribute('data-face-frame') ?? '{}') as
    { pupil: number[]; peek: number; happy: number; sad: number }

  await touch('touchStart', 0)
  await page.clock.runFor(50)
  expect((await frame()).peek).toBe(3)
  await page.clock.runFor(200)
  const leftward = await frame()
  expect(leftward.peek).toBe(0)
  expect(leftward.pupil).toHaveLength(6)
  await touch('touchMove', 3)
  await page.clock.runFor(150)
  const rightward = await frame()
  expect(rightward.pupil).toHaveLength(6)
  expect(rightward.pupil[2] - leftward.pupil[2]).toBeGreaterThan(1)
  await touch('touchMove', 2)
  await touch('touchEnd')
  await page.clock.runFor(100)
  expect((await frame()).sad).toBe(4)
  expect((await frame()).pupil).toHaveLength(0)
  await page.clock.runFor(500)

  await touch('touchStart', 0)
  await touch('touchMove', 3)
  await touch('touchEnd')
  await page.clock.runFor(300)
  expect(await frame()).toMatchObject({ pupil: [], sad: 0 })
  await touch('touchStart', 3)
  await touch('touchMove', 1)
  await touch('touchEnd')
  await page.clock.runFor(160)
  await expect(page.locator('#capacity')).toHaveText('3 / 12')
  expect((await frame()).happy).toBe(3)
})

test('volume musik dan efek tersimpan sendiri, musik berhenti saat halaman masuk background', async ({ page }) => {
  await page.addInitScript(() => {
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (at) {
      const { dataset } = document.documentElement
      dataset.notes = String(Number(dataset.notes ?? 0) + 1)
      start.call(this, at)
    }
  })
  const notes = async () => Number(await page.locator('html').getAttribute('data-notes'))
  await page.goto('./')
  await expect(page.locator('#spawn')).toBeEnabled()
  expect(await notes()).toBe(0)
  await page.getByText('Pengaturan audio', { exact: true }).tap()
  await expect.poll(notes).toBeGreaterThan(2)
  for (const [channel, value] of [['music', '30'], ['effects', '65']]) {
    await page.locator(`#volume-${channel}`).fill(value)
  }
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  const paused = await notes()
  await page.waitForTimeout(450)
  expect(await notes()).toBe(paused)
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow')))
  await expect.poll(notes).toBeGreaterThan(paused)
  await page.reload()
  await expect(page.locator('#volume-music')).toHaveValue('30')
  await expect(page.locator('#volume-effects')).toHaveValue('65')
  expect(await notes()).toBe(0)
})

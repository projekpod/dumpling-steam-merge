import { expect, test, type BrowserContext, type Page } from '@playwright/test'

const start = 1_800_000_000_000
const url = 'http://127.0.0.1:4173/kebun-mochi/'
const key = 'kebun-mochi:board'

function captureErrors(page: Page, errors: string[]) {
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      errors.push(`${message.type()}: ${message.text()} [${message.location().url}]`)
    }
  })
}

async function commonMochi(page: Page) {
  await page.locator('#spawn').evaluate(button => {
    button.addEventListener('click', () => {
      const original = Math.random
      Math.random = () => 0.5
      window.setTimeout(() => { Math.random = original }, 0)
    }, { capture: true, once: true })
  })
}

async function gesture(page: Page, context: BrowserContext, mobile: boolean, from: number, to?: number) {
  const board = (await page.locator('#field canvas').boundingBox())!
  const center = (index: number) => ({
    x: board.x + board.width * (index % 5 + 0.5) / 5,
    y: board.y + board.height * (Math.floor(index / 5) + 0.5) / 6,
  })
  const a = center(from)
  const b = to === undefined ? undefined : center(to)
  if (mobile) {
    const cdp = await context.newCDPSession(page)
    try {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] })
      if (b) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] })
      else await page.clock.runFor(610)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    } finally {
      await cdp.detach()
    }
  } else {
    await page.mouse.move(a.x, a.y)
    await page.mouse.down()
    if (b) await page.mouse.move(b.x, b.y, { steps: 3 })
    else await page.clock.runFor(610)
    await page.mouse.up()
  }
}

async function audit(page: Page) {
  return page.evaluate(() => {
    const problems: string[] = []
    if (document.documentElement.scrollWidth > innerWidth + 1) problems.push('horizontal page overflow')
    for (const element of document.querySelectorAll<HTMLElement>('button, summary')) {
      if (!element.checkVisibility({ contentVisibilityAuto: true })) continue
      const closed = element.closest('details:not([open])')
      if (closed && element !== closed.querySelector('summary')) continue
      const { width, height } = element.getBoundingClientRect()
      if (width < 44 || height < 44) {
        problems.push(`${element.textContent?.trim()}: ${width.toFixed(1)}×${height.toFixed(1)}`)
      }
      if (element.scrollWidth > element.clientWidth + 1) problems.push(`clipped: ${element.textContent?.trim()}`)
    }
    for (const row of document.querySelectorAll<HTMLElement>('.top, .wallet, #spawn, .upgrade, .odds > div')) {
      if (!row.checkVisibility({ contentVisibilityAuto: true }) || row.closest('details:not([open])')) continue
      const children = [...row.children].filter(child => child.getBoundingClientRect().width > 0)
      for (let i = 1; i < children.length; i++) {
        const previous = children[i - 1].getBoundingClientRect()
        const current = children[i].getBoundingClientRect()
        if (previous.right > current.left + 1) problems.push(`overlap: ${row.textContent?.trim()}`)
      }
    }
    return problems
  })
}

for (const [width, height] of [[360, 640], [412, 915], [1366, 768]]) {
  test(`QA 30 menit, simpan offline, dan audit bahasa ${width}×${height}`, async ({ browser }) => {
    const mobile = width < 500
    const context = await browser.newContext({ viewport: { width, height }, locale: 'en-US', isMobile: mobile, hasTouch: mobile })
    const errors: string[] = []
    try {
      let page = await context.newPage()
      captureErrors(page, errors)
      await page.addInitScript(() => {
        const clear = CanvasRenderingContext2D.prototype.clearRect
        CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
          if (this.canvas.parentElement?.id === 'field') {
            this.canvas.dataset.qaFrames = String(Number(this.canvas.dataset.qaFrames ?? 0) + 1)
          }
          clear.call(this, x, y, w, h)
        }
      })
      await page.clock.install({ time: start })
      await page.goto(url)
      const opener = page.locator('#spawn')
      const count = page.locator('#capacity')
      await expect(opener).toBeEnabled()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
      const control = (await opener.boundingBox())!
      expect(control.y + control.height).toBeLessThanOrEqual(height)
      const initialAudit = await audit(page)

      await commonMochi(page)
      await opener.click()
      await expect(count).toHaveText('1 / 12')
      await page.clock.fastForward(60_000)
      await commonMochi(page)
      await opener.click()
      await expect(count).toHaveText('2 / 12')
      await gesture(page, context, mobile, 0, 1)
      await expect(count).toHaveText('1 / 12')
      await gesture(page, context, mobile, 1)
      expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).squishedAt.length, key)).toBe(1)
      const upgrade = page.locator('#upgrade-saver')
      await page.locator('summary').first().click()
      const shopAudit = await audit(page)
      await upgrade.click()
      await expect(upgrade).toContainText('Lv. 1')
      await page.locator('details[open] .back').click()

      for (let minute = 2; minute <= 30; minute++) {
        await page.clock.fastForward(60_000)
        if (minute % 5 === 0) {
          const canvas = page.locator('#field canvas')
          const frames = Number(await canvas.getAttribute('data-qa-frames'))
          await commonMochi(page)
          await opener.click()
          await page.clock.runFor(450)
          const frozen = await page.locator('#app').evaluate(element => element.classList.contains('paused'))
          expect(frozen).toBe(false)
          expect(Number(await canvas.getAttribute('data-qa-frames'))).toBeGreaterThan(frames)
        }
      }

      await page.getByText('Steamer odds', { exact: true }).click()
      const oddsAudit = await audit(page)
      await page.locator('details[open] .back').click()
      await page.getByText('Mochidex', { exact: true }).click()
      const dexAudit = await audit(page)
      await page.locator('details[open] .back').click()
      await page.getByRole('button', { name: 'Switch to Indonesian' }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'id')
      const translatedAudit = await audit(page)
      const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
      expect(snapshot.settledAt - start).toBeGreaterThanOrEqual(30 * 60 * 1000)
      await page.close()
      page = await context.newPage()
      captureErrors(page, errors)
      await page.clock.setFixedTime(snapshot.settledAt + 60_000)
      await page.goto(url)
      await expect(page.locator('#offline')).toContainText('koin saat pergi')
      await expect(page.locator('html')).toHaveAttribute('lang', 'id')
      const reopened = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key)
      expect(reopened.board).toEqual(snapshot.board)
      expect(reopened.levels.saver).toBe(1)
      expect(reopened.coins).toBeGreaterThan(snapshot.coins)
      expect([...new Set([...errors, ...initialAudit, ...shopAudit, ...oddsAudit, ...dexAudit, ...translatedAudit])], 'console and layout findings').toEqual([])
    } finally {
      await context.close()
    }
  })
}

for (const variant of ['corrupt', 'old', 'unavailable'] as const) {
  test(`simpan ${variant} tetap bisa dimainkan`, async ({ page }) => {
    const errors: string[] = []
    captureErrors(page, errors)
    await page.clock.setFixedTime(start)
    await page.addInitScript(({ variant, start, key }) => {
      if (variant === 'unavailable') {
        Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Disabled', 'SecurityError') } })
        return
      }
      localStorage.setItem(key, variant === 'corrupt' ? '{"version":5,' : JSON.stringify({
        version: 3, coins: 125, settledAt: start, highest: 2,
        board: [2, ...Array(29).fill(0)], levels: { speed: 1, capacity: 0, magic: 1, bonus: 0 },
      }))
    }, { variant, start, key })
    await page.goto(url)
    const count = page.locator('#capacity')
    await expect(count).toHaveText(variant === 'old' ? '1 / 12' : '0 / 12')
    if (variant === 'old') {
      await expect(page.locator('#coins')).toHaveText('125 koin')
      const version = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).version, key)
      expect(version).toBe(5)
    }
    await commonMochi(page)
    await page.locator('#spawn').click()
    await expect(count).toHaveText(variant === 'old' ? '2 / 12' : '1 / 12')
    if (variant === 'unavailable') {
      await expect(page.locator('#status')).toContainText('Progres belum bisa disimpan')
      await page.getByRole('button', { name: 'Ganti ke Bahasa Inggris' }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    }
    expect(errors).toEqual([])
  })
}

test('font yang gagal dimuat tetap membuka kebun', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*.ttf', route => route.abort())
  await page.goto(url)
  await page.locator('#spawn').click({ timeout: 4000 })
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  expect(errors).toEqual([])
})

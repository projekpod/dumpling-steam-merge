import { expect, test, type Page } from '@playwright/test'
import { newGarden } from '../src/economy'
import { BOARD_KEY, HAPTICS_KEY } from '../src/save-keys'
import { encodeGarden } from '../src/storage'

const pagesUrl = 'http://127.0.0.1:4173/dumpling-steam-merge/'
const publicUrl = 'https://projekpod.github.io/dumpling-steam-merge/'
const analyticsScript = 'https://cloud.umami.is/script.js'
const portals = [
  { name: 'CrazyGames', url: 'http://127.0.0.1:4174/', sdk: 'https://sdk.crazygames.com/crazygames-sdk-v3.js' },
  { name: 'Playgama', url: 'http://127.0.0.1:4175/', sdk: 'https://bridge.playgama.com/v2/stable/playgama-bridge.js' },
]

async function center(page: Page, index: number) {
  const field = (await page.locator('#field canvas').boundingBox())!
  return { x: field.x + field.width * (index % 5 + 0.5) / 5, y: field.y + field.height * (Math.floor(index / 5) + 0.5) / 6 }
}

async function mouseMerge(page: Page, from = 0, to = 1) {
  const a = await center(page, from)
  const b = await center(page, to)
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 4 })
  await page.mouse.up()
}

async function forceRarity(page: Page, rarity: number) {
  await page.locator('#spawn').evaluate((button, rarity) => {
    button.addEventListener('click', () => {
      const random = Math.random
      const rolls = [0.5, rarity]
      Math.random = () => rolls.shift() ?? random()
      setTimeout(() => { Math.random = random }, 0)
    }, { capture: true, once: true })
  }, rarity)
}

test('pemain baru menyelesaikan tiga gestur dengan sentuhan di 360×640 dalam satu menit', async ({ page }) => {
  const started = performance.now()
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'vibrate', { writable: true, value: (ms: number) => {
      document.documentElement.dataset.vibration = String(ms)
      return true
    } })
  })
  await page.goto('./')
  const guide = page.locator('#onboarding-label')
  const skip = page.locator('#onboarding-skip')
  const spawn = page.locator('#spawn')
  const boardHand = page.locator('#onboarding-board')

  await expect(page.locator('#capacity')).toHaveText('0 / 12')
  await expect(guide).toHaveText('Ketuk kukusan')
  await expect(page.locator('#onboarding-steamer b')).toBeVisible()
  await expect(skip).toBeInViewport({ ratio: 1 })
  await expect(spawn).toBeInViewport({ ratio: 1 })
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await spawn.tap()
  await expect(guide).toHaveText('Buka satu lagi')
  await page.reload()
  await expect(guide).toHaveText('Buka satu lagi')
  await expect(skip).toBeVisible()
  await expect(spawn).toBeEnabled({ timeout: 15_000 })
  await spawn.tap()
  await expect(guide).toHaveText('Seret dumpling selevel')
  await expect(boardHand).toHaveAttribute('data-gesture', 'merge')
  await expect(skip).toBeInViewport({ ratio: 1 })

  const cdp = await page.context().newCDPSession(page)
  const a = await center(page, 0)
  const b = await center(page, 1)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(guide).toHaveText('Tahan untuk meremas')
  await expect(boardHand).toHaveAttribute('data-gesture', 'squish')
  await expect(skip).toBeInViewport({ ratio: 1 })
  await expect(page.locator('html')).toHaveAttribute('data-vibration', '25')

  const dumpling = await center(page, 1)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [dumpling] })
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(guide).toHaveText('Tahan untuk meremas')
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [dumpling] })
  await page.waitForTimeout(650)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('#onboarding')).toBeHidden()
  const elapsed = performance.now() - started
  console.log(`Onboarding sentuh 360×640: ${(elapsed / 1000).toFixed(2)} dtk`)
  expect(elapsed).toBeLessThan(60_000)
  await page.reload()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await expect(page.locator('#onboarding')).toBeHidden()
})

test('lewati onboarding bertahan setelah reload dan simpanan v6 bermigrasi tanpa tutorial', async ({ page }) => {
  await page.goto('./')
  await page.locator('#onboarding-skip').tap()
  await page.reload()
  await expect(page.locator('#spawn')).toBeEnabled()
  await expect(page.locator('#onboarding')).toBeHidden()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).onboarding, BOARD_KEY)).toBe('skipped')

  await page.addInitScript(({ key, oldSave }) => {
    localStorage.setItem(key, oldSave)
  }, { key: BOARD_KEY, oldSave: JSON.stringify({ ...newGarden(Date.now()), version: 6, coins: 125 }) })
  await page.reload()
  await expect(page.locator('#coins')).toHaveText('125 koin')
  await expect(page.locator('#onboarding')).toBeHidden()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).onboarding, BOARD_KEY)).toBe('done')
})

test('haptik Android menghormati preferensi tersimpan dan mode hemat', async ({ page }) => {
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw)
    const frame = requestAnimationFrame
    window.requestAnimationFrame = callback => document.documentElement.dataset.slow
      ? window.setTimeout(() => callback(performance.now()), 40) : frame.call(window, callback)
    Object.defineProperty(navigator, 'vibrate', { writable: true, value: () => {
      document.documentElement.dataset.vibrated = 'true'
      return true
    } })
  }, { key: BOARD_KEY, raw: encodeGarden(newGarden(Date.now(), [1, 1, 1, 1, ...Array<number>(26).fill(0)])) })
  await page.goto('./')
  const panel = page.locator('details').filter({ has: page.locator('#haptics') })
  const toggle = page.locator('#haptics')
  await panel.locator('summary').click()
  await expect(toggle).toBeChecked()
  await toggle.uncheck()
  expect(await page.evaluate(key => localStorage.getItem(key), HAPTICS_KEY)).toBe('off')
  await page.reload()
  await panel.locator('summary').click()
  await expect(toggle).not.toBeChecked()
  await panel.locator('.back').click()
  await mouseMerge(page)
  await expect(page.locator('#capacity')).toHaveText('3 / 12')
  await expect(page.locator('html')).not.toHaveAttribute('data-vibrated', 'true')

  await panel.locator('summary').click()
  await toggle.check()
  await panel.locator('.back').click()
  await page.locator('html').evaluate(element => { element.dataset.slow = '1' })
  await expect(page.locator('#app')).toHaveClass(/economy-mode/)
  await mouseMerge(page, 2, 3)
  await expect(page.locator('#capacity')).toHaveText('2 / 12')
  await expect(page.locator('html')).not.toHaveAttribute('data-vibrated', 'true')
})

for (const target of [{ name: 'Pages', url: pagesUrl, sdk: '' }, ...portals]) {
  test(`${target.name} desktop 1366×768 siap kurang dari 20 detik tanpa error console`, async ({ browser }) => {
    const context = await browser.newContext({ locale: 'id-ID', viewport: { width: 1366, height: 768 } })
    try {
      const page = await context.newPage()
      const errors: string[] = []
      const analyticsRequests: string[] = []
      page.on('pageerror', error => errors.push(error.message))
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
      page.on('request', request => { if (request.url().includes('umami.is')) analyticsRequests.push(request.url()) })
      if (target.sdk) await page.route(target.sdk, route => route.fulfill({ contentType: 'text/javascript', body: '' }))
      const started = performance.now()
      await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 16_000 })
      const spawn = page.locator('#spawn')
      await expect(spawn).toBeEnabled({ timeout: 19_000 })
      await expect(spawn).toBeInViewport({ ratio: 1 })
      await spawn.click()
      await expect(page.locator('#capacity')).toHaveText('1 / 12')
      const elapsed = performance.now() - started
      console.log(`${target.name} desktop 1366×768 mulai dimainkan: ${Math.round(elapsed)} ms`)
      expect(elapsed).toBeLessThan(20_000)
      await expect(page.locator('html')).toHaveAttribute('lang', target.sdk ? 'en' : 'id')
      await expect(page.locator('#pages-analytics')).toHaveCount(target.sdk ? 0 : 1)
      await expect(page.locator('script[src*="umami.is"]')).toHaveCount(0)
      await page.locator('#language').click()
      await page.reload()
      await expect(page.locator('html')).toHaveAttribute('lang', target.sdk ? 'id' : 'en')
      await expect(page.locator('#capacity')).toHaveText('1 / 12')
      expect(analyticsRequests).toEqual([])
      expect(errors).toEqual([])
    } finally {
      await context.close()
    }
  })
}

test('Pages mengirim enam event sekali per sesi setelah SDK siap, tanpa kueri atau referrer', async ({ page, request }) => {
  await page.route(`${publicUrl}**`, async route => {
    const url = new URL(route.request().url())
    await route.fulfill({ response: await request.get(new URL(url.pathname.split('/dumpling-steam-merge/')[1], pagesUrl).href) })
  })
  let releaseSdk!: () => void
  const sdkReady = new Promise<void>(resolve => { releaseSdk = resolve })
  await page.route(analyticsScript, async route => {
    await sdkReady
    await route.fulfill({ contentType: 'text/javascript', body: `
      window.umami = {track(callback) {
        const payload = callback({url: location.href, referrer: 'https://example.com/?test=referrer'});
        const values = JSON.parse(sessionStorage.getItem('m4-events') || '[]');
        sessionStorage.setItem('m4-events', JSON.stringify([...values, payload]));
      }};
    ` })
  })
  const received = (): Promise<{ name: string; url: string; referrer: string }[]> =>
    page.evaluate(() => JSON.parse(sessionStorage.getItem('m4-events') ?? '[]'))

  await page.clock.install({ time: Date.now() })
  await page.goto(`${publicUrl}?test=query#test-hash`, { waitUntil: 'domcontentloaded' })
  const spawn = page.locator('#spawn')
  await expect(spawn).toBeEnabled()
  await forceRarity(page, 0)
  await spawn.click()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  expect(await received()).toEqual([])
  releaseSdk()
  const script = page.locator('head > script[src*="umami.is"]')
  await expect(script).toHaveAttribute('data-website-id', '2479dffc-2df8-4616-9cd7-b2384a0f9409')
  await expect(script).toHaveAttribute('data-domains', 'projekpod.github.io')
  await expect(script).toHaveAttribute('defer', '')
  await expect.poll(async () => (await received()).map(event => event.name)).toEqual(['game_start', 'first_rare'])

  await page.clock.fastForward(9000)
  await forceRarity(page, 0)
  await spawn.click()
  await mouseMerge(page)
  await expect(page.locator('#onboarding-label')).toHaveText('Tahan untuk meremas')
  const b = await center(page, 1)
  await page.mouse.move(b.x, b.y)
  await page.mouse.down()
  await page.clock.runFor(600)
  await page.mouse.up()
  await expect(page.locator('#onboarding')).toBeHidden()

  await page.addInitScript(key => {
    const data = JSON.parse(localStorage.getItem(key)!)
    if (sessionStorage.getItem('m4-area-fixture')) return
    sessionStorage.setItem('m4-area-fixture', '1')
    data.board = [7, 7, ...Array(28).fill(0)]
    data.highest = 7
    data.variants = Array(30).fill('normal')
    localStorage.setItem(key, JSON.stringify(data))
  }, BOARD_KEY)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#capacity')).toHaveText('2 / 12')
  await mouseMerge(page)
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await page.clock.fastForward(360_000)
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  expect((await received()).some(event => event.name === 'session_5min')).toBe(false)
  await page.clock.fastForward(300_000)
  await expect.poll(async () => (await received()).map(event => event.name).sort()).toEqual([
    'area_unlocked', 'first_merge', 'first_rare', 'game_start', 'onboarding_done', 'session_5min',
  ])
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  expect(await received()).toHaveLength(6)
  for (const event of await received()) {
    expect(event).toEqual({ name: event.name, url: '/dumpling-steam-merge/', referrer: '' })
  }
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await page.clock.fastForward(30 * 60_000)
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  await expect.poll(async () => (await received()).filter(event => event.name === 'game_start')).toHaveLength(2)
})

test('adblock Umami pada Pages membiarkan kukusan berfungsi dan penjelasan privasi tersedia', async ({ page, request }) => {
  await page.route(`${publicUrl}**`, async route => {
    const path = new URL(route.request().url()).pathname.split('/dumpling-steam-merge/')[1]
    await route.fulfill({ response: await request.get(new URL(path, pagesUrl).href) })
  })
  await page.route(analyticsScript, route => route.abort('blockedbyclient'))
  const blocked = page.waitForEvent('requestfailed', request => request.url() === analyticsScript)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' })
  await blocked
  await page.locator('#spawn').tap()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await page.getByText('Pengaturan audio', { exact: true }).tap()
  await expect(page.getByText(/Versi ini memakai Umami Cloud/)).toBeVisible()
  expect(errors).toEqual([])
})

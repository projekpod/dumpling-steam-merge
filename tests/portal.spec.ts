import { expect, test, type Page } from '@playwright/test'

const url = 'http://127.0.0.1:4174/'
const sdkUrl = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'
const now = 1_800_000_000_000

type AdCallback = 'start' | 'finish' | 'error'

declare global {
  interface Window {
    portalTest: {
      events: string[]
      requests: string[]
      act(callback: AdCallback, code?: string): void
      mute(value: boolean): void
    }
  }
}

async function mockSdk(page: Page) {
  await page.route(sdkUrl, route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      const events = [];
      const requests = [];
      let ad, onSettings;
      window.portalTest = {
        events, requests,
        act(callback, code) {
          if (callback === 'start') ad.adStarted();
          if (callback === 'finish') ad.adFinished();
          if (callback === 'error') ad.adError({ code });
        },
        mute(value) { onSettings({ muteAudio: value }); },
      };
      window.CrazyGames = { SDK: {
        environment: 'crazygames',
        async init() { events.push('init'); },
        game: {
          settings: { muteAudio: false },
          addSettingsChangeListener(fn) { onSettings = fn; },
          loadingStart() { events.push('loadingStart'); },
          loadingStop() { events.push('loadingStop'); },
          gameplayStart() { events.push('gameplayStart'); },
          gameplayStop() { events.push('gameplayStop'); },
        },
        data: {
          getItem(key) { return localStorage.getItem('sdk:' + key); },
          setItem(key, value) { localStorage.setItem('sdk:' + key, value); },
        },
        ad: { requestAd(kind, callbacks) { requests.push(kind); ad = callbacks; } },
      }};
    `,
  }))
}

const requests = (page: Page) => page.evaluate(() => window.portalTest.requests)
const act = (page: Page, callback: AdCallback, code?: string) =>
  page.evaluate(({ callback, code }) => window.portalTest.act(callback, code), { callback, code })

async function visitAndReturn(page: Page) {
  const section = page.locator('details').first()
  await section.locator('summary').click()
  await expect(section).toHaveAttribute('open', '')
  await section.getByRole('button', { name: 'Back to the Garden' }).click()
}

test('bahasa browser dan tombol bahasa bekerja di lanskap dengan rasio papan tetap', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1024, height: 576 } })
  try {
    const page = await context.newPage()
    const sdkRequests: string[] = []
    page.on('request', request => { if (request.url().startsWith('https://sdk.crazygames.com/')) sdkRequests.push(request.url()) })
    await page.goto('http://127.0.0.1:4173/dumpling-steam-merge/')
    await expect(page.getByText('Tap the steamer', { exact: true })).toBeVisible()
    const opener = page.getByRole('button', { name: /Open steamer/ })
    await expect(opener).toBeEnabled()
    const canvas = (await page.locator('#field canvas').boundingBox())!
    const game = (await page.locator('.game').boundingBox())!
    const control = (await opener.boundingBox())!
    expect(canvas.width / canvas.height).toBeCloseTo(330 / 360, 2)
    expect(game.x + game.width / 2).toBeCloseTo(512, 0)
    expect(control.y + control.height).toBeLessThanOrEqual(576)
    await expect(page.locator('.decoration-left')).toBeVisible()
    await expect(page.locator('.decoration-right')).toBeVisible()

    await page.setViewportSize({ width: 844, height: 390 })
    const compact = (await opener.boundingBox())!
    const compactCanvas = (await page.locator('#field canvas').boundingBox())!
    expect(compact.y + compact.height).toBeLessThanOrEqual(390)
    expect(compactCanvas.width / compactCanvas.height).toBeCloseTo(330 / 360, 2)
    await page.setViewportSize({ width: 1024, height: 576 })

    await opener.click()
    await expect(page.locator('#capacity')).toHaveText('1 / 12')
    await page.getByRole('button', { name: 'Switch to Indonesian' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.getByText('Buka satu lagi', { exact: true })).toBeVisible()
    await expect(page.locator('#capacity')).toHaveText('1 / 12')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.locator('#capacity')).toHaveText('1 / 12')
    await expect(page.locator('a, #reward')).toHaveCount(0)
    expect(sdkRequests).toEqual([])
  } finally {
    await context.close()
  }
})

test('SDK menerima event, simpanan, blokir input dan bayar hadiah sekali setelah selesai', async ({ page }) => {
  await mockSdk(page)
  await page.clock.setFixedTime(now)
  await page.goto(url)
  const opener = page.getByRole('button', { name: /Open steamer/ })
  await expect(opener).toBeEnabled()
  expect(await page.evaluate(() => window.portalTest.events)).toEqual(['init', 'loadingStart', 'loadingStop', 'gameplayStart'])
  const mute = page.getByRole('button', { name: 'Mute sound' })
  await page.evaluate(() => window.portalTest.mute(true))
  await expect(mute).toBeDisabled()
  await expect(mute).toHaveAttribute('aria-pressed', 'true')
  await page.evaluate(() => window.portalTest.mute(false))
  await expect(mute).toBeEnabled()
  await opener.tap()
  const checkSave = () => page.evaluate(() => JSON.parse(localStorage.getItem('sdk:kebun-mochi:board')!))
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await page.clock.setFixedTime(now + 500)
  await page.locator('#reward').tap()
  await expect.poll(() => requests(page)).toEqual(['rewarded'])
  await act(page, 'start')
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await expect(page.locator('#app')).toHaveClass(/paused/)
  expect(await page.evaluate(() => window.portalTest.events.at(-1))).toBe('gameplayStop')
  expect((await checkSave()).boostUntil).toBe(0)

  await page.clock.setFixedTime(now + 10_000)
  await act(page, 'finish')
  await act(page, 'finish')
  await expect(page.locator('.game')).not.toHaveAttribute('inert', '')
  await expect(page.locator('#boost')).toHaveText('2× coins · 10:00')
  await expect(opener).toContainText('3/3 saved')
  expect((await checkSave()).boostUntil).toBe(now + 610_000)
  const saved = await checkSave()
  const rates: Record<string, number> = { normal: 1, glitter: 2, rainbow: 3, gold: 5, pink: 10 }
  expect(saved.coins).toBeCloseTo(0.5 * rates[saved.variants[0]])
  expect(await page.evaluate(() => localStorage.getItem('kebun-mochi:board'))).toBeNull()
  expect(await page.evaluate(() => window.portalTest.events.at(-1))).toBe('gameplayStart')
  await page.reload()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await expect(page.locator('#boost')).toHaveText('2× coins · 10:00')
})

test('midgame hanya di akhir panel setelah sesi pertama serta menaati empat menit', async ({ page }) => {
  await mockSdk(page)
  await page.clock.setFixedTime(now)
  await page.goto(url)
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.clock.setFixedTime(now + 300_000)
  await visitAndReturn(page)
  expect(await requests(page)).toEqual([])

  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  const second = now + 40 * 60_000
  await page.clock.setFixedTime(second)
  await page.reload()
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.clock.setFixedTime(second + 239_000)
  await visitAndReturn(page)
  expect(await requests(page)).toEqual([])

  await page.clock.setFixedTime(second + 240_000)
  await visitAndReturn(page)
  await expect.poll(() => requests(page)).toEqual(['midgame'])
  await act(page, 'start')
  await act(page, 'finish')
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.clock.setFixedTime(second + 479_999)
  await visitAndReturn(page)
  expect(await requests(page)).toEqual(['midgame'])
  await page.clock.setFixedTime(second + 480_000)
  await visitAndReturn(page)
  await expect.poll(() => requests(page)).toEqual(['midgame', 'midgame'])
  await act(page, 'error', 'unfilled')
  await expect(page.locator('#spawn')).toBeEnabled()
})

test('adblock mengembalikan permainan tanpa hadiah dan SDK yang diblokir memakai simpanan browser', async ({ page }) => {
  await mockSdk(page)
  await page.goto(url)
  await page.locator('#reward').tap()
  await expect.poll(() => requests(page)).toEqual(['rewarded'])
  await act(page, 'start')
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await act(page, 'error', 'adblock')
  await expect(page.locator('#status')).toContainText('No ad is available')
  await expect(page.locator('#boost')).toBeHidden()
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.unroute(sdkUrl)
  await page.route(sdkUrl, route => route.abort('blockedbyclient'))
  await page.reload()
  await expect(page.locator('#reward')).toHaveCount(0)
  await page.locator('#spawn').tap()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  expect(await page.evaluate(() => localStorage.getItem('kebun-mochi:board'))).toBeTruthy()
})

test('permintaan SDK tanpa callback berhenti menunggu dan melepas game', async ({ page }) => {
  await mockSdk(page)
  await page.clock.install({ time: now })
  await page.goto(url)
  await page.locator('#reward').tap()
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await page.clock.runFor(5100)
  await expect(page.locator('.game')).not.toHaveAttribute('inert', '')
  await expect(page.locator('#status')).toContainText('No ad is available')
  await expect(page.locator('#boost')).toBeHidden()
  await expect(page.locator('#spawn')).toBeEnabled()
})

test('rewarded yang dibatalkan memulihkan input, frame dan audio tanpa memberi hadiah', async ({ page }) => {
  const faults: string[] = []
  page.on('pageerror', error => faults.push(error.message))
  await mockSdk(page)
  await page.clock.setFixedTime(now)
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect
    CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
      if (this.canvas.parentElement?.id === 'field') {
        this.canvas.dataset.qaFrames = String(Number(this.canvas.dataset.qaFrames ?? 0) + 1)
      }
      clear.call(this, x, y, w, h)
    }
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (at) {
      document.documentElement.dataset.musicNotes =
        String(Number(document.documentElement.dataset.musicNotes ?? 0) + 1)
      start.call(this, at)
    }
    const gainConnect = GainNode.prototype.connect
    GainNode.prototype.connect = function (this: GainNode, ...args: Parameters<typeof gainConnect>) {
      if (args[0] instanceof AudioDestinationNode) {
        Object.defineProperty(document, 'qaAudio', { value: { master: this, context: this.context } })
      }
      return Reflect.apply(gainConnect, this, args)
    } as typeof gainConnect
  })
  const audio = () => page.evaluate(() => {
    const { qaAudio } = document as Document & { qaAudio: { master: GainNode; context: AudioContext } }
    return [qaAudio.master.gain.value, qaAudio.context.state]
  })
  const notes = async () => Number(await page.locator('html').getAttribute('data-music-notes'))
  const frames = async () => Number(await page.locator('#field canvas').getAttribute('data-qa-frames'))

  await page.clock.setFixedTime(now)
  await page.goto(url)
  await page.locator('#spawn').tap()
  await expect.poll(audio).toEqual([1, 'running'])
  await expect.poll(notes).toBeGreaterThan(3)
  await page.clock.setFixedTime(now + 500)
  await page.locator('#reward').tap()
  await act(page, 'start')
  await expect.poll(audio).toEqual([0, 'suspended'])
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  const paused = await frames()
  const pausedNotes = await notes()
  await page.waitForTimeout(200)
  expect(await frames()).toBe(paused)
  expect(await notes()).toBe(pausedNotes)
  const wallet = await page.locator('#coins').textContent()

  await page.clock.setFixedTime(now + 15_000)
  await act(page, 'error', 'other')
  // Ignore a stale completion callback after the cancellation.
  await act(page, 'finish')
  await expect(page.locator('#status')).toContainText('No ad is available')
  await expect(page.locator('#boost')).toBeHidden()
  await expect(page.locator('#coins')).toHaveText(wallet!)
  await expect(page.locator('.game')).not.toHaveAttribute('inert', '')
  await expect.poll(frames).toBeGreaterThan(paused)
  await expect.poll(audio).toEqual([1, 'running'])
  await expect.poll(notes).toBeGreaterThan(pausedNotes)
  await page.clock.setFixedTime(now + 16_000)
  await expect(page.locator('#spawn')).not.toContainText('3/3')
  expect(faults).toEqual([])
})

test('SDK yang terlambat memulai iklan setelah timeout tetap menjeda permainan', async ({ page }) => {
  await mockSdk(page)
  await page.clock.install({ time: now })
  await page.goto(url)
  await page.locator('#reward').tap()
  await page.clock.runFor(5100)
  await expect(page.locator('.game')).not.toHaveAttribute('inert', '')
  await act(page, 'start')
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await expect(page.locator('#app')).toHaveClass(/paused/)
  await act(page, 'finish')
  await expect(page.locator('#spawn')).toBeEnabled()
  await expect(page.locator('#boost')).toBeHidden()
})

test('tombol rewarded memberi keadaan nonaktif saat animasi kukusan', async ({ page }) => {
  await mockSdk(page)
  await page.clock.setFixedTime(now)
  await page.goto(url)
  await page.locator('#spawn').tap()
  await expect(page.locator('#reward')).toBeDisabled()
  await page.clock.setFixedTime(now + 450)
  await expect(page.locator('#reward')).toBeEnabled()
})

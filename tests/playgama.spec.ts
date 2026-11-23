import { expect, test, type Page } from '@playwright/test'
import { BOARD_KEY } from '../src/save-keys'

const url = 'http://127.0.0.1:4175/'
const sdkUrl = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js'
const now = 1_800_000_000_000

type AdState = 'opened' | 'rewarded' | 'closed' | 'failed'

declare global {
  interface Window {
    bridgeTest: {
      events: string[]
      requests: string[]
      emit(name: string, state: AdState | boolean): void
    }
  }
}

async function mockBridge(page: Page, unreadable = false) {
  await page.route(sdkUrl, route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      const listeners = new Map();
      const events = [];
      const requests = [];
      const on = (name, callback) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(callback);
      };
      window.bridgeTest = {
        events, requests,
        emit(name, value) {
          for (const callback of listeners.get(name) ?? []) callback(value);
        },
      };
      window.bridge = {
        async initialize() { events.push('initialize'); },
        platform: {
          isAudioEnabled: true, on,
          async sendMessage(message) { events.push(message); },
        },
        advertisement: {
          isRewardedSupported: true,
          isInterstitialSupported: true,
          on,
          off(name, callback) { listeners.get(name)?.delete(callback); },
          showRewarded() { requests.push('rewarded'); },
          showInterstitial() { requests.push('interstitial'); },
        },
        storage: {
          async get(keys, parse) {
            if (${unreadable} || parse !== false) throw new Error('No storage connection');
            return keys.map(key => localStorage.getItem('bridge:' + key));
          },
          async set(key, value) { localStorage.setItem('bridge:' + key, value); },
        },
      };
    `,
  }))
}

const requests = (page: Page) => page.evaluate(() => window.bridgeTest.requests)
const save = (page: Page) => page.evaluate(key => {
  const raw = localStorage.getItem('bridge:' + key)
  return raw ? JSON.parse(raw) : null
}, BOARD_KEY)
const adState = (page: Page, kind: 'rewarded' | 'interstitial', state: AdState) =>
  page.evaluate(({ kind, state }) => window.bridgeTest.emit(kind + '_state_changed', state), { kind, state })

async function returnFromPanel(page: Page) {
  const panel = page.locator('details').first()
  await panel.locator('summary').tap()
  await panel.getByRole('button', { name: 'Kembali ke Kebun' }).tap()
}

test('Playgama menyimpan via Bridge dan memberi hadiah hanya setelah rewarded lalu closed', async ({ page }) => {
  await mockBridge(page)
  await page.clock.setFixedTime(now)
  await page.addInitScript(() => {
    const original = GainNode.prototype.connect
    GainNode.prototype.connect = function (this: GainNode, ...args: Parameters<typeof original>) {
      if (args[0] instanceof AudioDestinationNode) Object.defineProperty(document, 'qaMaster', { value: this })
      return Reflect.apply(original, this, args)
    } as typeof original
  })
  const audioGain = () => page.evaluate(() => {
    const { qaMaster } = document as Document & { qaMaster: GainNode }
    return [qaMaster.gain.value, qaMaster.context.state]
  })
  await page.goto(url)
  const spawn = page.locator('#spawn')
  await spawn.tap()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await expect.poll(() => save(page)).toMatchObject({ boostUntil: 0 })
  expect(await page.evaluate(() => window.bridgeTest.events.slice(0, 3)))
    .toEqual(['initialize', 'game_ready', 'gameplay_started'])
  await expect.poll(audioGain).toEqual([1, 'running'])

  await page.evaluate(() => window.bridgeTest.emit('audio_state_changed', false))
  await expect(page.locator('#mute')).toBeDisabled()
  await page.evaluate(() => window.bridgeTest.emit('audio_state_changed', true))
  await expect(page.locator('#mute')).toBeEnabled()

  await page.clock.setFixedTime(now + 500)
  await page.locator('#reward').tap()
  await expect.poll(() => requests(page)).toEqual(['rewarded'])
  await adState(page, 'rewarded', 'opened')
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await expect(page.locator('#app')).toHaveClass(/paused/)
  await expect.poll(audioGain).toEqual([0, 'suspended'])
  await adState(page, 'rewarded', 'rewarded')
  expect((await save(page)).boostUntil).toBe(0)
  await page.clock.setFixedTime(now + 7000)
  await adState(page, 'rewarded', 'closed')
  await adState(page, 'rewarded', 'closed')
  await expect(page.locator('#boost')).toHaveText('Koin ×2 · 10:00')
  await expect(spawn).toContainText('3/3 tersimpan')
  await expect.poll(() => save(page)).toMatchObject({ boostUntil: now + 607_000 })
  await expect.poll(audioGain).toEqual([1, 'running'])
  await page.reload()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await expect(page.locator('#boost')).toHaveText('Koin ×2 · 10:00')
})

test('Playgama melepas game saat iklan dibatalkan, gagal atau terlambat', async ({ page }) => {
  await mockBridge(page)
  await page.clock.install({ time: now })
  await page.goto(url)
  const reward = page.locator('#reward')
  const spawn = page.locator('#spawn')
  for (const state of ['closed', 'failed'] as const) {
    await reward.tap()
    await adState(page, 'rewarded', 'opened')
    await expect(page.locator('.game')).toHaveAttribute('inert', '')
    await adState(page, 'rewarded', state)
    await expect(page.locator('#status')).toContainText('Iklan belum tersedia')
    await expect(page.locator('#boost')).toBeHidden()
    await expect(spawn).toBeEnabled()
  }
  await reward.tap()
  await page.clock.runFor(5100)
  await expect(spawn).toBeEnabled()
  await adState(page, 'rewarded', 'opened')
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await adState(page, 'rewarded', 'rewarded')
  await adState(page, 'rewarded', 'closed')
  await expect(spawn).toBeEnabled()
  await expect(page.locator('#boost')).toBeHidden()
  expect(await requests(page)).toEqual(['rewarded', 'rewarded', 'rewarded'])
})

test('Playgama mengikuti jeda interstitial sejak sesi kedua dan saat kembali dari panel', async ({ page }) => {
  await mockBridge(page)
  await page.clock.setFixedTime(now)
  await page.goto(url)
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.clock.setFixedTime(now + 300_000)
  await returnFromPanel(page)
  expect(await requests(page)).toEqual([])
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')))
  const second = now + 40 * 60_000
  await page.clock.setFixedTime(second)
  await page.reload()
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.clock.setFixedTime(second + 239_000)
  await returnFromPanel(page)
  expect(await requests(page)).toEqual([])
  await page.clock.setFixedTime(second + 240_000)
  await returnFromPanel(page)
  await expect.poll(() => requests(page)).toEqual(['interstitial'])
  await adState(page, 'interstitial', 'opened')
  await expect(page.locator('.game')).toHaveAttribute('inert', '')
  await adState(page, 'interstitial', 'closed')
  await expect(page.locator('#spawn')).toBeEnabled()
  await page.clock.setFixedTime(second + 479_000)
  await returnFromPanel(page)
  expect(await requests(page)).toEqual(['interstitial'])
  await page.clock.setFixedTime(second + 480_000)
  await returnFromPanel(page)
  await expect.poll(() => requests(page)).toEqual(['interstitial', 'interstitial'])
  await adState(page, 'interstitial', 'failed')
  await expect(page.locator('#spawn')).toBeEnabled()
})

test('Playgama memakai progres lokal jika Bridge atau pembacaan penyimpanan gagal', async ({ page }) => {
  await mockBridge(page, true)
  await page.clock.setFixedTime(now)
  await page.goto(url)
  await page.locator('#spawn').tap()
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  expect(await save(page)).toBeNull()
  await page.unroute(sdkUrl)
  await page.route(sdkUrl, route => route.abort('blockedbyclient'))
  await page.clock.setFixedTime(now + 30_000)
  await page.reload()
  await expect(page.locator('#reward')).toHaveCount(0)
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await page.locator('#spawn').tap()
  await expect(page.locator('#capacity')).toHaveText('2 / 12')
})

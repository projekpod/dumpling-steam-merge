import { expect, test, type Page } from '@playwright/test'
import { newAreaBoard } from '../src/areas'
import { emptyBoard } from '../src/board'
import { EGG_INTERVAL, newGarden, switchArea, type Garden } from '../src/economy'
import { BOARD_KEY } from '../src/save-keys'
import { encodeGarden } from '../src/storage'

const now = 1_800_000_000_000
const boardWith = (...levels: number[]) => [...levels, ...emptyBoard().slice(levels.length)]
const saved = (page: Page): Promise<Garden & { version: number }> =>
  page.evaluate(key => JSON.parse(localStorage.getItem(key)!), BOARD_KEY)

async function seed(page: Page, raw: string) {
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw)
  }, { key: BOARD_KEY, raw })
}

async function pickArea(page: Page, area: string) {
  await page.locator('#area').tap()
  await page.locator(`[data-area-option=${area}]`).tap()
  await expect(page.locator('.game')).toHaveAttribute('data-area', area)
}

test('cold start seluler, migrasi v5 dan bermain serta berpindah area tanpa jaringan', async ({ page }) => {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const garden = newGarden(Date.now(), boardWith(8, 1))
  await seed(page, JSON.stringify({ ...garden, version: 5 }))
  await page.addInitScript(() => {
    new MutationObserver((_entries, observer) => {
      const opener = document.querySelector<HTMLButtonElement>('#spawn')
      if (!opener || opener.disabled || !document.querySelector('#field canvas')) return
      document.documentElement.dataset.steamerReady = String(performance.now())
      observer.disconnect()
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] })
  })
  await page.goto('./')
  await expect(page.locator('#spawn')).toBeEnabled()
  await expect(page.locator('html')).toHaveAttribute('data-steamer-ready', /^[\d.]+$/)
  const coldStart = Number(await page.locator('html').getAttribute('data-steamer-ready'))
  console.log(`Cold start Chromium (360×640, CPU 4×): ${Math.round(coldStart)} ms`)
  expect(coldStart).toBeLessThan(3000)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await cdp.detach()
  expect((await saved(page)).version).toBe(6)
  const readyGarden = await saved(page)

  const list = page.locator('#dex')
  const collection = page.locator('details').filter({ has: page.locator('#dex') })
  await collection.locator('summary').tap()
  await expect(list.locator('li')).toHaveCount(12)
  await expect(list.locator('.dex-portrait:not(.silhouette)')).toHaveCount(8)
  await expect(list.locator('li').nth(8)).toContainText('Lv. 9 · ???')
  const gardenSilhouette = await list.locator('.silhouette').getAttribute('src')
  await expect(list).not.toContainText('Dumpling Melon')

  await page.context().setOffline(true)
  try {
    await pickArea(page, 'pantai')
    await expect(page.locator('#capacity')).toHaveText('0 / 12')
    await expect(page.locator('#rate')).toHaveText('+0 koin/detik')
    await page.locator('#area').tap()
    const snow = page.locator('[data-area-option=salju]')
    await expect(snow).toBeDisabled()
    await expect(snow).toContainText('Temukan Lv. 9 di Pantai')
    await page.getByRole('button', { name: 'Tutup' }).tap()

    await collection.locator('summary').tap()
    await expect(list.locator('li')).toHaveCount(12)
    await expect(list.locator('.silhouette')).not.toHaveAttribute('src', gardenSilhouette!)
    await expect(list.locator('li').first()).toContainText('Lv. 1 · ???')
    await page.locator('#spawn').tap()
    await expect(page.locator('#capacity')).toHaveText('1 / 12')
    await expect(page.locator('#discovery-name')).toHaveText('Dumpling Butir Pasir')

    await page.locator('#language').tap()
    await collection.locator('summary').tap()
    await expect(list.getByText('Lv. 1 · Sand Grain Dumpling')).toBeVisible()
    await expect(list.getByText('It knows every grain of sand except its own house number.')).toBeVisible()
    await expect(list.locator('li').nth(1).locator('.silhouette')).toBeVisible()
    const beachSave = await saved(page)
    expect(beachSave.otherAreas.kebun).toMatchObject({
      board: readyGarden.board, variants: readyGarden.variants, discovered: readyGarden.discovered, highest: 8,
    })
    await pickArea(page, 'kebun')
    await expect(page.locator('#capacity')).toHaveText('2 / 12')
    expect((await saved(page)).otherAreas.pantai?.board).toEqual(beachSave.board)
  } finally {
    await page.context().setOffline(false)
  }
  await pickArea(page, 'pantai')
  await page.reload()
  await expect(page.locator('.game')).toHaveAttribute('data-area', 'pantai')
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
})

test('membuka Salju lewat hasil gabung Pantai Lv. 9', async ({ page }) => {
  await page.clock.setFixedTime(now)
  const garden = newGarden(now, boardWith(8))
  const beach = { ...switchArea(garden, 'pantai', now), ...newAreaBoard(boardWith(8, 8)) }
  await seed(page, encodeGarden(beach))
  await page.goto('./')
  await page.locator('#area').tap()
  await expect(page.locator('[data-area-option=salju]')).toBeDisabled()
  await page.getByRole('button', { name: 'Tutup' }).tap()

  const bounds = (await page.locator('#field canvas').boundingBox())!
  const y = bounds.y + bounds.height / 12
  await page.mouse.move(bounds.x + bounds.width / 10, y)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * 0.3, y, { steps: 3 })
  await page.mouse.up()
  await expect(page.locator('#discovery-name')).toHaveText('Dumpling Karang Geli')
  await pickArea(page, 'salju')
  await expect(page.locator('#capacity')).toHaveText('0 / 12')
  await page.locator('#spawn').tap()
  await expect(page.locator('#discovery-name')).toHaveText('Dumpling Serbuk')
  await page.reload()
  await expect(page.locator('.game')).toHaveAttribute('data-area', 'salju')
  expect((await saved(page)).otherAreas.pantai?.board[1]).toBe(9)
  const collection = page.locator('details').filter({ has: page.locator('#dex') })
  await collection.locator('summary').tap()
  await expect(page.locator('#dex li')).toHaveCount(12)
  await expect(page.locator('#dex li').first()).toContainText('Dumpling Serbuk')
})

test('telur menghitung waktu aktif lintas reload, menunggu papan, dan hanya bisa dibuka sekali', async ({ page }) => {
  await page.clock.install({ time: now })
  const full = boardWith(...Array.from({ length: 12 }, (_, i) => i + 1))
  await seed(page, encodeGarden(newGarden(now, full)))
  await page.goto('./')
  await expect(page.locator('#capacity')).toHaveText('12 / 12')
  await page.clock.fastForward(80_000)
  await expect.poll(async () => (await saved(page)).eggActiveMs).toBeGreaterThanOrEqual(80_000)
  await page.reload()
  await expect(page.locator('#capacity')).toHaveText('12 / 12')
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  const pausedAt = (await saved(page)).eggActiveMs
  await page.clock.fastForward(600_000)
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')))
  expect((await saved(page)).eggActiveMs - pausedAt).toBeLessThan(1000)
  await page.clock.fastForward(85_000)
  await expect(page.locator('#egg')).toBeHidden()
  await page.clock.fastForward(16_000)
  const hatch = page.locator('#hatch')
  await expect(hatch).toBeVisible()
  await expect(hatch).toBeDisabled()
  await expect(page.locator('#egg-hint')).toBeVisible()
  expect((await saved(page)).eggActiveMs).toBe(EGG_INTERVAL)
  await page.clock.fastForward(EGG_INTERVAL * 2)
  await page.reload()
  await expect(hatch).toBeVisible()
  await expect(hatch).toBeDisabled()

  await page.locator('#release').tap()
  await page.getByRole('button', { name: 'Lepaskan dumpling' }).tap()
  await expect(hatch).toBeEnabled()
  await hatch.evaluate(button => {
    button.addEventListener('click', () => {
      const original = Math.random
      Math.random = () => 0
      window.setTimeout(() => { Math.random = original }, 0)
    }, { capture: true, once: true })
  })
  const beforeHatching = await saved(page)
  await hatch.tap()
  await expect(page.locator('#egg')).toBeHidden()
  await expect(page.locator('#capacity')).toHaveText('12 / 12')
  const afterHatching = await saved(page)
  expect(afterHatching.board[0]).toBe(2)
  expect(afterHatching.variants[0]).toBe('pink')
  expect(afterHatching.freeCharges).toBe(beforeHatching.freeCharges)
  expect(afterHatching.eggActiveMs).toBeLessThan(1000)
  await page.reload()
  await expect(page.locator('#capacity')).toHaveText('12 / 12')
  await expect(page.locator('#egg')).toBeHidden()
})

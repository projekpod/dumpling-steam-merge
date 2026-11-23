import { expect, test } from '@playwright/test'
import { mockUmami, publicUrl, routePages } from './pages-fixture'
import { BOARD_KEY } from '../src/save-keys'

test('Safari emulasi iPhone menampilkan tutorial dan mengirim onboarding_done', async ({ page, request }) => {
  await routePages(page, request)
  const received = await mockUmami(page)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.clock.install({ time: Date.now() })
  await page.goto(publicUrl, { waitUntil: 'domcontentloaded' })
  const guide = page.locator('#onboarding-label')
  const spawn = page.locator('#spawn')
  const canvas = page.locator('#field canvas')
  await spawn.evaluate(button => {
    button.addEventListener('click', () => {
      const random = Math.random
      Math.random = () => .5
      setTimeout(() => { Math.random = random }, 0)
    }, { capture: true })
  })

  await expect(guide).toHaveText('Ketuk kukusan')
  await expect(guide).toBeInViewport({ ratio: 1 })
  await expect(page.locator('#onboarding-steamer b')).toBeVisible()
  await expect(spawn).toBeInViewport({ ratio: 1 })
  await spawn.tap()
  await expect(guide).toHaveText('Buka satu lagi')
  await page.clock.fastForward(9000)
  await spawn.tap()
  await expect(guide).toHaveText('Seret dumpling selevel')

  const bounds = (await canvas.boundingBox())!
  const y = bounds.y + bounds.height / 12
  const from = bounds.x + bounds.width / 10
  const to = bounds.x + bounds.width * 0.3
  // Playwright supports native WebKit taps. Its mouse API supplies the longer pointer gestures.
  await page.mouse.move(from, y)
  await page.mouse.down()
  await page.mouse.move(to, y, { steps: 5 })
  await page.mouse.up()
  await expect(guide).toHaveText('Tahan untuk meremas')

  await page.touchscreen.tap(to, y)
  await expect(guide).toHaveText('Tahan untuk meremas')
  const menuAllowed = await canvas.evaluate(node => node.dispatchEvent(new MouseEvent('contextmenu', { cancelable: true })))
  expect(menuAllowed).toBe(false)
  await page.mouse.move(to, y)
  await page.mouse.down()
  await page.clock.runFor(650)
  await page.mouse.up()
  await expect(page.locator('#onboarding')).toBeHidden()
  await expect.poll(async () => (await received()).map(event => event.name ?? 'pageview')).toEqual([
    'pageview', 'game_start', 'first_merge', 'onboarding_done',
  ])

  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('#capacity')).toHaveText('1 / 12')
  await expect(page.locator('#onboarding')).toBeHidden()
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).onboarding, BOARD_KEY)).toBe('done')
  await expect.poll(async () => (await received()).filter(event => !event.name)).toHaveLength(2)
  expect((await received()).filter(event => event.name === 'onboarding_done')).toHaveLength(1)
  expect(errors).toEqual([])
})

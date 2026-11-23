import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { preview } from 'vite'
import { drawCover } from './portal-cover.mjs'

const output = fileURLToPath(new URL('../docs/rilis/screenshots/', import.meta.url))
await mkdir(output, { recursive: true })
const server = await preview({ preview: { host: '127.0.0.1', port: 4196, strictPort: true } })
try {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, locale: 'en-US' })
    const now = 1_800_000_000_000
    await page.clock.setFixedTime(now)
    await page.addInitScript(time => {
      localStorage.setItem('kebun-mochi:board', JSON.stringify({
        version: 5, board: [3, 3, 5, 2, 4, 2, 6, 1, 1, 3, 4, 2, 5, 2, 1, ...Array(15).fill(0)],
        variants: ['normal', 'glitter', 'rainbow', 'pink', 'gold', 'normal', 'gold', 'glitter', 'normal',
          'rainbow', 'pink', 'normal', 'normal', 'glitter', 'normal', ...Array(15).fill('normal')],
        discovered: [3, 19, 7, 24, 5, 8, 0, 0, 0, 0, 0, 0], coins: 1480, settledAt: time, highest: 6,
        freeCharges: 2, freeAt: time, squishedAt: [], boostUntil: 0,
        levels: { saver: 2, capacity: 5, free: 1, special: 2, bonus: 2, squish: 1 },
      }))
    }, now)
    await page.goto('http://127.0.0.1:4196/')
    await page.waitForFunction(() => document.querySelector('#capacity')?.textContent === '15 / 17')
    await page.screenshot({ path: output + 'gameplay-landscape.png' })
    await page.setViewportSize({ width: 412, height: 915 })

    await page.locator('#spawn').evaluate(button => {
      button.addEventListener('click', () => {
        const original = Math.random
        const rolls = [.8, 0]
        Math.random = () => rolls.shift() ?? original()
        window.setTimeout(() => { Math.random = original }, 0)
      }, { capture: true, once: true })
    })
    await page.locator('#spawn').click()
    await page.getByText('Sprout Dumpling · Rare Pink!', { exact: true }).waitFor()
    await page.waitForTimeout(180)
    await page.screenshot({ path: output + 'gameplay-portrait.png' })

    const field = (await page.locator('#field canvas').boundingBox())
    const y = field.y + field.height / 12
    const x = column => field.x + field.width * (column + .5) / 5
    await page.mouse.move(x(0), y)
    await page.mouse.down()
    await page.mouse.move(x(1), y, { steps: 5 })
    await page.mouse.up()
    await page.waitForTimeout(255)
    await page.screenshot({ path: output + 'gameplay-merge.png' })

    await page.waitForTimeout(700)
    await page.mouse.move(x(2), y)
    await page.mouse.down()
    await page.waitForTimeout(940)
    await page.screenshot({ path: output + 'gameplay-squish.png' })
    await page.mouse.up()

    await page.getByText('Dumpling Collection', { exact: true }).click()
    await page.locator('#dex li').first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: output + 'gameplay-collection.png' })
    await page.getByText('Dumpling Collection', { exact: true }).click()
    await page.getByText('Garden upgrades', { exact: true }).click()
    await page.locator('#upgrade-squish').scrollIntoViewIfNeeded()
    await page.screenshot({ path: output + 'gameplay-upgrades.png' })

    const cover = await browser.newPage()
    const font = await readFile(new URL('../src/fonts/Nunito.ttf', import.meta.url))
    await cover.setContent(`<style>@font-face{font-family:Nunito;font-weight:200 1000;src:url(data:font/ttf;base64,${font.toString('base64')})}</style>`)
    await cover.evaluate(() => document.fonts.load('1000 120px Nunito'))
    for (const [name, width, height] of [
      ['landscape', 1920, 1080], ['portrait', 800, 1200], ['square', 800, 800],
    ]) {
      const image = await cover.evaluate(drawCover, { width, height })
      await writeFile(output + `cover-${name}.jpg`, Buffer.from(image, 'base64'))
    }
  } finally {
    await browser.close()
  }
} finally {
  await server.close()
}

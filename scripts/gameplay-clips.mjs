import { execFileSync, spawnSync } from 'node:child_process'
import { mkdir, rename, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { chromium, expect } from '@playwright/test'
import { preview } from 'vite'

const output = process.argv[2] ?? 'gameplay-clips'
await mkdir(output, { recursive: true })
const url = 'http://127.0.0.1:4197/'
const server = await preview({ preview: { host: '127.0.0.1', port: 4197, strictPort: true } })
const canConvert = spawnSync('ffmpeg', ['-version']).status === 0

async function setSteamerRoll(page, rarityRoll) {
  await page.locator('#spawn').evaluate((button, roll) => {
    button.addEventListener('click', () => {
      const original = Math.random
      const rolls = [.8, roll]
      Math.random = () => rolls.shift() ?? original()
      setTimeout(() => { Math.random = original }, 0)
    }, { capture: true, once: true })
  }, rarityRoll)
}

async function play(page, zoom) {
  await page.goto(url)
  const spawn = page.locator('#spawn')
  await expect(spawn).toBeEnabled()
  await page.addStyleTag({ content: `
    #app { align-content: center; }
    .game { zoom: ${zoom}; }
    #offline, .upgrades { display: none; }
    .capture-pointer {
      position: fixed; z-index: 999; pointer-events: none; display: none;
      width: 30px; height: 30px; border-radius: 50%; transform: translate(-50%, -50%);
      border: 3px solid #fff8ed; background: #9c593853; box-shadow: 0 0 0 2px #74452b90;
    }
    .capture-pointer.down { background: #ba603dbd; }
  ` })
  await page.evaluate(() => {
    const pointer = document.createElement('i')
    pointer.className = 'capture-pointer'
    document.body.append(pointer)
    document.addEventListener('pointermove', event => {
      pointer.style.display = 'block'
      pointer.style.left = `${event.clientX}px`
      pointer.style.top = `${event.clientY}px`
    })
    document.addEventListener('pointerdown', () => pointer.classList.add('down'))
    document.addEventListener('pointerup', () => pointer.classList.remove('down'))
  })
  const field = await page.locator('#field canvas').boundingBox()
  const center = index => [
    field.x + field.width * (index % 5 + .5) / 5,
    field.y + field.height * (Math.floor(index / 5) + .5) / 6,
  ]
  const at = t => page.waitForTimeout(Math.max(0, t - (performance.now() - started)))
  async function merge(from, to) {
    await page.mouse.move(...center(from))
    await page.mouse.down()
    await page.mouse.move(...center(to), { steps: 6 })
    await page.mouse.up()
  }

  const started = performance.now()
  const capacity = page.locator('#capacity')
  await expect(capacity).toHaveText('7 / 12')
  await at(2800)
  await setSteamerRoll(page, .5)
  await spawn.hover()
  await spawn.click()
  await expect(capacity).toHaveText('8 / 12')

  // Fix the game clock during the combo so encode speed cannot break its two-second window.
  await at(6200)
  const comboTime = Date.now()
  await page.clock.setFixedTime(comboTime)
  await merge(0, 1)
  await expect(capacity).toHaveText('7 / 12')
  await at(7000)
  await page.clock.setFixedTime(comboTime + 700)
  await merge(3, 4)
  await expect(page.locator('#status')).toContainText('Combo ×2')
  await at(7800)
  await page.clock.setFixedTime(comboTime + 1400)
  await merge(1, 4)
  await expect(page.locator('#status')).toContainText('Combo ×3')

  await at(11200)
  await page.clock.setFixedTime(comboTime + 5000)
  await page.mouse.move(...center(2))
  await page.mouse.down()
  await at(13000)
  await page.clock.setFixedTime(comboTime + 6800)
  await page.mouse.up()
  await expect(page.locator('#status')).toHaveText(/^\+[\d.]+ coins$/)

  await at(16200)
  await page.clock.setFixedTime(comboTime + 10000)
  await setSteamerRoll(page, 0)
  await spawn.hover()
  await spawn.click()
  await expect(page.locator('#status')).toHaveText('Sprout Dumpling · Rare Pink!')
  await at(20500)
  await page.clock.setFixedTime(comboTime + 14300)
  await page.mouse.move(...center(0))
  await page.mouse.down()
  await at(21600)
  await page.clock.setFixedTime(comboTime + 15400)
  await page.mouse.up()
  await at(24500)
}

try {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
  try {
    for (const [name, width, height, zoom] of [
      ['landscape', 1920, 1080, 1.43],
      ['portrait', 1080, 1920, 2.25],
    ]) {
      const viewport = { width, height }
      const context = await browser.newContext({ locale: 'en-US', viewport, recordVideo: { dir: output, size: viewport } })
      const page = await context.newPage()
      const video = page.video()
      try {
        await page.addInitScript(() => {
          const now = Date.now()
          localStorage.setItem('kebun-mochi:board', JSON.stringify({
            version: 5, board: [2, 2, 4, 2, 2, 1, 3, ...Array(23).fill(0)],
            variants: ['normal', 'glitter', 'rainbow', 'normal', 'gold', 'normal', 'normal', ...Array(23).fill('normal')],
            discovered: [1, 11, 1, 5, ...Array(8).fill(0)], coins: 225, settledAt: now, highest: 4,
            freeCharges: 3, freeAt: now, squishedAt: [], boostUntil: 0,
            levels: { saver: 0, capacity: 0, free: 0, special: 0, bonus: 0, squish: 0 },
          }))
        })
        await play(page, zoom)
      } finally {
        await context.close()
      }
      const raw = await video.path()
      const stem = join(output, `gameplay-${name}-clip`)
      if (canConvert) {
        execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw,
          '-c:v', 'libx264', '-threads', '4', '-preset', 'fast', '-crf', '20',
          '-pix_fmt', 'yuv420p', '-movflags', '+faststart', stem + '.mp4'], { stdio: 'inherit' })
        await rm(raw)
      } else {
        await rename(raw, stem + '.webm')
      }
    }
  } finally {
    await browser.close()
  }
} finally {
  await server.close()
}

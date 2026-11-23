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

async function play(page, zoom, orientation) {
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
  async function center(index) {
    const field = await page.locator('#field canvas').boundingBox()
    return [
      field.x + field.width * (index % 5 + .5) / 5,
      field.y + field.height * (Math.floor(index / 5) + .5) / 6,
    ]
  }
  const at = t => page.waitForTimeout(Math.max(0, t - (performance.now() - started)))
  const started = performance.now()
  const clock = Date.now()
  const capacity = page.locator('#capacity')
  const guide = page.locator('#onboarding-label')
  async function snapshot(step) {
    await page.screenshot({ path: join(output, `gameplay-onboarding-${orientation}-${step}.png`) })
  }

  await page.clock.setFixedTime(clock)
  await expect(capacity).toHaveText('0 / 12')
  await expect(guide).toHaveText('Tap the steamer')
  await at(1500)
  if (orientation === 'landscape') await snapshot('tap')
  await at(2800)
  await setSteamerRoll(page, .5)
  await spawn.click()
  await expect(guide).toHaveText('Open one more')

  await at(5600)
  // Advance the normal paid steamer availability for the recording.
  await page.clock.setFixedTime(clock + 9000)
  await setSteamerRoll(page, .5)
  await spawn.click()
  await expect(guide).toHaveText('Drag matching dumplings together')
  await at(7400)
  if (orientation === 'portrait') await snapshot('merge')
  await at(9600)
  await page.mouse.move(...await center(0))
  await page.mouse.down()
  await page.mouse.move(...await center(1), { steps: 7 })
  await page.mouse.up()
  await expect(capacity).toHaveText('1 / 12')
  await expect(guide).toHaveText('Press and hold to squish')

  await at(11700)
  if (orientation === 'portrait') await snapshot('squish')
  await at(14000)
  await page.clock.setFixedTime(clock + 15000)
  await expect(page.locator('#discovery')).toBeHidden()
  await page.mouse.move(...await center(1))
  await page.mouse.down()
  await at(15800)
  await page.clock.setFixedTime(clock + 16800)
  await page.mouse.up()
  await expect(page.locator('#onboarding')).toBeHidden()
  await expect(page.locator('#status')).toHaveText(/^\+[\d.]+ coins$/)

  await at(19100)
  await page.clock.setFixedTime(clock + 41000)
  await setSteamerRoll(page, 0)
  await spawn.click()
  await expect(page.locator('#status')).toHaveText('Sprout Dumpling · Rare Pink!')
  await at(21300)
  await page.clock.setFixedTime(clock + 43200)
  await page.mouse.move(...await center(0))
  await page.mouse.down()
  await at(22800)
  await page.clock.setFixedTime(clock + 44700)
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
        await play(page, zoom, name)
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

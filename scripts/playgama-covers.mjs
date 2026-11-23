import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { writeCovers } from './portal-cover.mjs'

const output = fileURLToPath(new URL('../docs/rilis/screenshots/', import.meta.url))
const covers = [
  { name: 'playgama-cover-square.jpg', width: 800, height: 800 },
  { name: 'playgama-cover-portrait.jpg', width: 1080, height: 1920 },
  { name: 'playgama-cover-landscape.jpg', width: 1920, height: 1080 },
]

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE })
try {
  await writeCovers(browser, output, covers.map(cover => ({ ...cover, titleInset: cover.width * .07 })))
} finally {
  await browser.close()
}

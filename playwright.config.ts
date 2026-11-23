import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    ...devices['Pixel 5'],
    viewport: { width: 360, height: 640 },
    baseURL: 'http://127.0.0.1:4173/kebun-mochi/',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort --base /kebun-mochi/',
    url: 'http://127.0.0.1:4173/kebun-mochi/',
  },
})

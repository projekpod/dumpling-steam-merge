import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    ...devices['Pixel 5'],
    locale: 'id-ID',
    viewport: { width: 360, height: 640 },
    baseURL: 'http://127.0.0.1:4173/dumpling-steam-merge/',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
  },
  webServer: [{
    command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort --base /dumpling-steam-merge/',
    url: 'http://127.0.0.1:4173/dumpling-steam-merge/',
  }, {
    command: 'npm run build:crazygames && npm run preview -- --mode crazygames --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/',
  }, {
    command: 'npm run build:playgama && npm run preview -- --mode playgama --host 127.0.0.1 --port 4175 --strictPort',
    url: 'http://127.0.0.1:4175/',
  }],
})

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    locale: 'id-ID',
    baseURL: 'http://127.0.0.1:4173/dumpling-steam-merge/',
  },
  projects: [{
    name: 'chromium',
    testIgnore: '**/*.ios.spec.ts',
    use: {
      ...devices['Pixel 5'],
      viewport: { width: 360, height: 640 },
      launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE },
    },
  }, {
    name: 'iphone-webkit',
    testMatch: '**/*.ios.spec.ts',
    use: devices['iPhone 13'],
  }],
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

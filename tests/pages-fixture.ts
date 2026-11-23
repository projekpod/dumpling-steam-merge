import type { APIRequestContext, Page } from '@playwright/test'

export const pagesUrl = 'http://127.0.0.1:4173/dumpling-steam-merge/'
export const publicUrl = 'https://projekpod.github.io/dumpling-steam-merge/'
export const analyticsScript = 'https://cloud.umami.is/script.js'

export async function routePages(page: Page, request: APIRequestContext) {
  await page.route(`${publicUrl}**`, async route => {
    const path = new URL(route.request().url()).pathname.slice(new URL(publicUrl).pathname.length)
    await route.fulfill({ response: await request.get(new URL(path, pagesUrl).href) })
  })
}

type AnalyticsPayload = { name?: string; url: string; referrer: string }

export async function mockUmami(page: Page, sdkReady?: Promise<void>) {
  await page.route(analyticsScript, async route => {
    await sdkReady
    await route.fulfill({ contentType: 'text/javascript', body: `
      window.umami = {track(callback) {
        const payload = callback({url: location.href, referrer: 'https://example.com/?test=referrer'});
        const values = JSON.parse(sessionStorage.getItem('test-umami-payloads') || '[]');
        sessionStorage.setItem('test-umami-payloads', JSON.stringify([...values, payload]));
      }};
    ` })
  })
  return (): Promise<AnalyticsPayload[]> =>
    page.evaluate(() => JSON.parse(sessionStorage.getItem('test-umami-payloads') ?? '[]'))
}

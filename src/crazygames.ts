import { localStore, noAds, type AdKind, type GamePlatform, type SaveStore } from './platform'
import { BOARD_KEY } from './storage'

const SDK_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js'
const CONNECT_TIMEOUT = 2300
const AD_REQUEST_TIMEOUT = 5000
const AD_PLAY_TIMEOUT = 120_000

interface Settings { muteAudio?: boolean }
interface CrazySDK {
  init(): Promise<void>
  readonly environment: 'local' | 'crazygames' | 'disabled'
  data: SaveStore
  game: {
    loadingStart(): void
    loadingStop(): void
    gameplayStart(): void
    gameplayStop(): void
    settings: Settings
    addSettingsChangeListener(listener: (settings: Settings) => void): void
  }
  ad: {
    requestAd(kind: AdKind, callbacks: {
      adStarted(): void
      adFinished(): void
      adError(error: { code?: string }): void
    }): void
  }
}

declare global {
  interface Window { CrazyGames?: { SDK: CrazySDK } }
}

function loadScript(): Promise<void> {
  if (window.CrazyGames?.SDK) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => resolve()
    script.onerror = reject
    document.head.append(script)
  })
}

async function initialize(): Promise<CrazySDK | undefined> {
  let timer: number | undefined
  try {
    return await Promise.race([
      (async () => {
        await loadScript()
        const sdk = window.CrazyGames?.SDK
        if (!sdk) return undefined
        await sdk.init()
        return sdk.environment === 'disabled' ? undefined : sdk
      })(),
      new Promise<undefined>(resolve => { timer = window.setTimeout(resolve, CONNECT_TIMEOUT) }),
    ])
  } catch {
    return undefined
  } finally {
    window.clearTimeout(timer)
  }
}

function call(report: () => void) {
  try { report() } catch {
    // Measurement events should never interrupt play.
  }
}

function createAdapter(sdk: CrazySDK, storage: SaveStore): GamePlatform {
  let blocked = false
  let pending = false

  return {
    storage,
    get adsAvailable() { return !blocked },
    loadingStart: () => call(() => sdk.game.loadingStart()),
    loadingStop: () => call(() => sdk.game.loadingStop()),
    gameplayStart: () => call(() => sdk.game.gameplayStart()),
    gameplayStop: () => call(() => sdk.game.gameplayStop()),
    onMute: callback => call(() => {
      callback(Boolean(sdk.game.settings?.muteAudio))
      sdk.game.addSettingsChangeListener(settings => callback(Boolean(settings.muteAudio)))
    }),
    async requestAd(kind, onEvent) {
      if (pending || blocked) return false
      pending = true
      return new Promise<boolean>(resolve => {
        let started = false
        let done = false
        let requestTimedOut = false
        let latePlaying = false
        let timer = window.setTimeout(() => {
          blocked = true
          requestTimedOut = true
          finish(false)
        }, AD_REQUEST_TIMEOUT)

        function finish(success: boolean) {
          if (done) return
          done = true
          pending = false
          window.clearTimeout(timer)
          resolve(success)
        }

        function finishLate() {
          if (!latePlaying) return
          latePlaying = false
          window.clearTimeout(timer)
          onEvent('late-ended')
        }

        try {
          sdk.ad.requestAd(kind, {
            adStarted() {
              if (started || (done && !requestTimedOut)) return
              started = true
              if (requestTimedOut) {
                latePlaying = true
                timer = window.setTimeout(finishLate, AD_PLAY_TIMEOUT)
                onEvent('late-started')
                return
              }
              window.clearTimeout(timer)
              timer = window.setTimeout(() => {
                blocked = true
                finish(false)
              }, AD_PLAY_TIMEOUT)
              onEvent('started')
            },
            adFinished() {
              if (latePlaying) finishLate()
              else finish(started)
            },
            adError(error) {
              if (latePlaying) finishLate()
              if (done) return
              if (error?.code === 'adblock' || error?.code === 'adsDisabled') blocked = true
              finish(false)
            },
          })
        } catch {
          blocked = true
          finish(false)
        }
      })
    },
  }
}

export async function openCrazyGames(): Promise<GamePlatform> {
  const fallback = localStore('crazygames-fallback:')
  const sdk = await initialize()
  if (!sdk) return noAds(window.self === window.top ? localStore() : fallback)
  if (sdk.environment !== 'crazygames') return createAdapter(sdk, localStore())
  try {
    // Select the backend once. A disabled or unreadable module must not be
    // overwritten with a new garden if it begins responding later in the session.
    sdk.data.getItem(BOARD_KEY)
    return createAdapter(sdk, sdk.data)
  } catch {
    return createAdapter(sdk, fallback)
  }
}

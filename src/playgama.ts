import { fullscreenAds } from './fullscreen-ad'
import { localStore, noAds, type GamePlatform, type SaveStore } from './platform'
import { AD_HISTORY_KEY, BOARD_KEY, LANGUAGE_KEY, MUTE_KEY, VOLUME_KEYS } from './save-keys'

const SDK_URL = 'https://bridge.playgama.com/v2/stable/playgama-bridge.js'
const SAVE_KEYS = [BOARD_KEY, LANGUAGE_KEY, MUTE_KEY, ...Object.values(VOLUME_KEYS), AD_HISTORY_KEY]

type AdState = 'loading' | 'opened' | 'rewarded' | 'closed' | 'failed'
type AdStateEvent = 'rewarded_state_changed' | 'interstitial_state_changed'
type PlatformMessage = 'game_ready' | 'gameplay_started' | 'gameplay_stopped'

interface PlaygamaBridge {
  initialize(): Promise<void>
  platform: {
    readonly isAudioEnabled: boolean
    on(event: 'audio_state_changed', listener: (enabled: boolean) => void): void
    sendMessage(message: PlatformMessage): Promise<unknown>
  }
  advertisement: {
    readonly isRewardedSupported: boolean
    readonly isInterstitialSupported: boolean
    on(event: AdStateEvent, listener: (state: AdState) => void): void
    off(event: AdStateEvent, listener: (state: AdState) => void): void
    showRewarded(): void
    showInterstitial(): void
  }
  storage: {
    get(keys: string[], tryParseJson: false): Promise<unknown>
    set(key: string, value: string): Promise<void>
  }
}

declare global {
  interface Window { bridge?: PlaygamaBridge }
}

function loadScript(): Promise<void> {
  if (window.bridge) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_URL
    script.onload = () => resolve()
    script.onerror = reject
    document.head.append(script)
  })
}

async function withTimeout<T>(task: Promise<T>, ms: number): Promise<T | undefined> {
  let timer: number | undefined
  try {
    return await Promise.race([
      task,
      new Promise<undefined>(resolve => { timer = window.setTimeout(resolve, ms) }),
    ])
  } catch {
    return undefined
  } finally {
    window.clearTimeout(timer)
  }
}

async function initialize() {
  await loadScript()
  const bridge = window.bridge
  await bridge?.initialize()
  return bridge
}

async function openStore(bridge: PlaygamaBridge, fallback: SaveStore): Promise<SaveStore> {
  const values = await withTimeout(bridge.storage.get(SAVE_KEYS, false), 2300)
  // A failed read must never turn into a write over an existing cloud save.
  if (!Array.isArray(values) || values.length !== SAVE_KEYS.length) return fallback
  const cache = new Map(SAVE_KEYS.map((key, index) => [key, typeof values[index] === 'string' ? values[index] : null]))

  async function write(key: string, value: string) {
    try {
      await bridge.storage.set(key, value)
    } catch {
      // Keep the latest snapshot available if the storage module stops responding.
      try {
        for (const [name, current] of cache) {
          if (current !== null) fallback.setItem(name, current)
        }
      } catch {
        // Retain the current session in memory if browser storage is blocked too.
      }
    }
  }

  return {
    getItem: key => cache.get(key) ?? null,
    setItem(key, value) {
      if (cache.get(key) === value) return
      cache.set(key, value)
      void write(key, value)
    },
  }
}

function createAdapter(bridge: PlaygamaBridge, storage: SaveStore): GamePlatform {
  const { advertisement, platform } = bridge
  const ads = fullscreenAds((kind, callbacks) => {
    const rewarded = kind === 'rewarded'
    const event = rewarded ? 'rewarded_state_changed' : 'interstitial_state_changed'
    let earned = false
    const onState = (state: AdState) => {
      if (state === 'opened') callbacks.adStarted()
      if (state === 'rewarded') earned = true
      if (state === 'closed' || state === 'failed') {
        advertisement.off(event, onState)
        if (state === 'closed' && (!rewarded || earned)) callbacks.adFinished()
        else callbacks.adError()
      }
    }
    advertisement.on(event, onState)
    try {
      if (rewarded) advertisement.showRewarded()
      else advertisement.showInterstitial()
    } catch (error) {
      advertisement.off(event, onState)
      throw error
    }
  }, kind => kind === 'rewarded' ? advertisement.isRewardedSupported : advertisement.isInterstitialSupported)

  async function send(message: PlatformMessage) {
    try { await platform.sendMessage(message) } catch {
      // A failed lifecycle event should leave the game playable.
    }
  }

  return {
    ...ads,
    storage,
    loadingStart() {},
    loadingStop: () => void send('game_ready'),
    gameplayStart: () => void send('gameplay_started'),
    gameplayStop: () => void send('gameplay_stopped'),
    onMute(callback) {
      callback(!platform.isAudioEnabled)
      platform.on('audio_state_changed', enabled => callback(!enabled))
    },
  }
}

export async function openPlaygama(): Promise<GamePlatform> {
  const local = window.self === window.top ? localStore() : localStore('playgama-fallback:')
  const bridge = await withTimeout(initialize(), 4500)
  if (!bridge?.platform || !bridge.advertisement || !bridge.storage) return noAds(local)
  const storage = await openStore(bridge, local).catch(() => local)
  return createAdapter(bridge, storage)
}

export type SaveStore = Pick<Storage, 'getItem' | 'setItem'>
export type AdKind = 'midgame' | 'rewarded'
export type AdEvent = 'started' | 'late-started' | 'late-ended'

export interface GamePlatform {
  storage: SaveStore
  supportsAd(kind: AdKind): boolean
  loadingStart(): void
  loadingStop(): void
  gameplayStart(): void
  gameplayStop(): void
  onMute(callback: (muted: boolean) => void): void
  requestAd(kind: AdKind, onEvent: (event: AdEvent) => void): Promise<boolean>
}

export function localStore(prefix = ''): SaveStore {
  return {
    getItem: key => localStorage.getItem(prefix + key),
    setItem: (key, value) => localStorage.setItem(prefix + key, value),
  }
}

export function noAds(storage = localStore()): GamePlatform {
  return {
    storage,
    supportsAd: () => false,
    loadingStart() {},
    loadingStop() {},
    gameplayStart() {},
    gameplayStop() {},
    onMute() {},
    async requestAd() { return false },
  }
}

export async function openPlatform(): Promise<GamePlatform> {
  if (import.meta.env.MODE === 'crazygames') return (await import('./crazygames')).openCrazyGames()
  if (import.meta.env.MODE === 'playgama') return (await import('./playgama')).openPlaygama()
  if (import.meta.env.MODE === 'admob') return (await import('./admob')).openAdMob()
  return noAds()
}

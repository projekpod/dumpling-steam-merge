import type { SaveStore } from './platform'
import { AD_HISTORY_KEY } from './save-keys'

const SESSION_GAP = 30 * 60_000
export const MIDGAME_INTERVAL = 4 * 60_000

interface History {
  sessions: number
  lastSeen: number
  activeTime: number
  lastFullscreen: number
}

function load(store: SaveStore): History {
  try {
    const history = JSON.parse(store.getItem(AD_HISTORY_KEY) ?? 'null')
    if (history && ['sessions', 'lastSeen', 'activeTime', 'lastFullscreen'].every(field =>
      Number.isSafeInteger(history[field]) && history[field] >= 0)) return history
  } catch {
    // Treat unavailable history as a first session.
  }
  return { sessions: 0, lastSeen: 0, activeTime: 0, lastFullscreen: 0 }
}

export class AdPacing {
  private readonly history: History
  private playingSince: number | undefined

  constructor(private readonly store: SaveStore) {
    this.history = load(store)
  }

  start(now: number) {
    if (this.playingSince !== undefined) return
    const history = this.history
    if (history.sessions === 0 || now - history.lastSeen >= SESSION_GAP) {
      history.sessions++
      history.activeTime = 0
    }
    this.playingSince = now
    this.checkpoint(now)
  }

  stop(now: number) {
    if (this.playingSince === undefined) return
    this.checkpoint(now)
    this.playingSince = undefined
  }

  tick(now: number) {
    if (this.playingSince !== undefined && now - this.playingSince >= 15_000) this.checkpoint(now)
  }

  canRequestMidgame(now: number): boolean {
    const elapsed = this.playingSince === undefined ? 0 : Math.max(0, now - this.playingSince)
    return this.history.sessions > 1 &&
      this.history.activeTime + elapsed >= MIDGAME_INTERVAL &&
      now - this.history.lastFullscreen >= MIDGAME_INTERVAL
  }

  fullscreen(now: number) {
    this.history.lastFullscreen = now
    this.persist()
  }

  private checkpoint(now: number) {
    this.history.activeTime += Math.max(0, now - (this.playingSince ?? now))
    this.history.lastSeen = now
    this.playingSince = now
    this.persist()
  }

  private persist() {
    try { this.store.setItem(AD_HISTORY_KEY, JSON.stringify(this.history)) } catch {
      // Keep pacing in memory when saving is unavailable.
    }
  }
}

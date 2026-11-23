const events = ['game_start', 'onboarding_done', 'first_merge', 'first_rare', 'area_unlocked', 'session_5min'] as const
type GameEvent = typeof events[number]
type Payload = Record<string, unknown>
type Delivery = Partial<Record<GameEvent, 'pending' | 'sent'>>

const storageKey = 'dumpling-steam:pages-events'
const sessionGap = 30 * 60_000
const fiveMinutes = 5 * 60_000

interface Session {
  lastSeen: number
  activeMs: number
  delivery: Delivery
}

declare global {
  interface Window {
    umami?: { track(payload: (defaults: Payload) => Payload): unknown }
  }
}

function newSession(now: number): Session {
  return { lastSeen: now, activeMs: 0, delivery: {} }
}

function readSession(now: number): Session {
  try {
    const raw = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null')
    if (Number.isFinite(raw?.lastSeen) && now - raw.lastSeen < sessionGap && Number.isFinite(raw.activeMs)) {
      const delivery: Delivery = {}
      for (const event of events) {
        const state = raw.delivery?.[event]
        if (state === 'pending' || state === 'sent') delivery[event] = state
      }
      return { lastSeen: raw.lastSeen, activeMs: Math.max(0, raw.activeMs), delivery }
    }
  } catch {
    // Keep this tab playable if storage is inaccessible.
  }
  return newSession(now)
}

class PagesAnalytics {
  private session = readSession(Date.now())
  private activeSince: number | undefined

  resume(now: number) {
    if (now - this.session.lastSeen >= sessionGap) this.session = newSession(now)
    this.activeSince = performance.now()
    this.track('game_start')
  }

  pause(now: number) {
    this.checkpoint(now)
    this.activeSince = undefined
  }

  tick(now: number) {
    if (this.activeSince !== undefined && performance.now() - this.activeSince >= 1000) this.checkpoint(now)
  }

  track(event: GameEvent) {
    if (this.session.delivery[event]) return
    this.session.delivery[event] = 'pending'
    this.persist()
    this.flush()
  }

  flush() {
    const sdk = window.umami
    if (!sdk) return
    for (const event of events) {
      if (this.session.delivery[event] !== 'pending') continue
      this.session.delivery[event] = 'sent'
      this.persist()
      try {
        // Supply only the action name plus Umami metadata without a query, hash or referrer.
        void Promise.resolve(sdk.track(defaults => ({
          ...defaults, name: event, url: location.pathname, referrer: '',
        }))).catch(() => {})
      } catch {
        // Privacy tools and unavailable analytics cannot interrupt play.
      }
    }
  }

  private checkpoint(now: number) {
    if (this.activeSince === undefined) return
    const elapsedAt = performance.now()
    this.session.activeMs += Math.max(0, elapsedAt - this.activeSince)
    this.session.lastSeen = now
    this.activeSince = elapsedAt
    if (this.session.activeMs >= fiveMinutes) this.track('session_5min')
    this.persist()
  }

  private persist() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(this.session)) } catch {
      // Deduplicate in memory if session storage is unavailable.
    }
  }
}

export function startPagesAnalytics() {
  const tag = document.querySelector<HTMLTemplateElement>('#pages-analytics')?.content.querySelector('script')
  if (!tag || tag.dataset.domains !== location.hostname) return

  const analytics = new PagesAnalytics()
  const script = document.createElement('script')
  for (const attribute of tag.attributes) script.setAttribute(attribute.name, attribute.value)
  script.dataset.autoTrack = 'false'
  script.referrerPolicy = 'no-referrer'
  script.addEventListener('load', () => analytics.flush(), { once: true })
  // The browser can load or block the SDK independently of the ready game.
  document.head.append(script)
  return analytics
}

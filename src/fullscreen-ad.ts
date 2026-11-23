import type { AdKind, GamePlatform } from './platform'

const AD_REQUEST_TIMEOUT = 5000
const AD_PLAY_TIMEOUT = 120_000

interface AdCallbacks {
  adStarted(): void
  adFinished(): void
  adError(error?: { code?: string }): void
}

export function fullscreenAds(
  request: (kind: AdKind, callbacks: AdCallbacks) => void,
  isSupported: (kind: AdKind) => boolean = () => true,
): Pick<GamePlatform, 'supportsAd' | 'requestAd'> {
  let blocked = false
  let pending = false
  const supportsAd = (kind: AdKind) => !blocked && isSupported(kind)

  return {
    supportsAd,
    async requestAd(kind, onEvent) {
      if (pending || !supportsAd(kind)) return false
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
          request(kind, {
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

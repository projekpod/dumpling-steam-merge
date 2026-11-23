import { expect, it } from 'vitest'
import { AdPacing, MIDGAME_INTERVAL } from '../src/ad-pacing'
import { accrue, coinsPerSecond, newGarden, rewardAd, skipAdTime } from '../src/economy'
import { spawn, emptyBoard } from '../src/board'
import { decodeGarden, encodeGarden } from '../src/storage'

it('menjaga sesi pertama setelah reload dan membatasi iklan midgame dari semua fullscreen', () => {
  const saved = new Map<string, string>()
  const store = { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => { saved.set(key, value) } }
  const start = 1_800_000_000_000
  const first = new AdPacing(store)
  first.start(start)
  const finish = start + MIDGAME_INTERVAL * 2
  expect(first.canRequestMidgame(finish)).toBe(false)
  first.stop(finish)
  const reload = new AdPacing(store)
  reload.start(finish + 1000)
  expect(reload.canRequestMidgame(finish + 1000)).toBe(false)
  reload.stop(finish + 2000)

  const later = new AdPacing(store)
  const next = finish + 31 * 60_000
  later.start(next)
  expect(later.canRequestMidgame(next + MIDGAME_INTERVAL - 1)).toBe(false)
  const ad = next + MIDGAME_INTERVAL
  expect(later.canRequestMidgame(ad)).toBe(true)
  later.fullscreen(ad)
  expect(later.canRequestMidgame(ad + MIDGAME_INTERVAL - 1)).toBe(false)
  expect(later.canRequestMidgame(ad + MIDGAME_INTERVAL)).toBe(true)
})

it('membayar boost sampai batas 10 menit dan membuang waktu yang dihabiskan menonton iklan', () => {
  const now = 1_800_000_000_000
  const garden = newGarden(now, spawn(emptyBoard()))
  const rewarded = rewardAd(garden, now)
  expect(rewarded.freeCharges).toBe(3)
  expect(coinsPerSecond(rewarded, now)).toBe(2)
  expect(coinsPerSecond(rewarded, now + 600_000)).toBe(1)
  expect(accrue(rewarded, now + 601_000).coins).toBe(1201)
  const paused = accrue(rewarded, now + 1000)
  const resumed = skipAdTime(paused, now + 1000, now + 21_000)
  expect(resumed.coins).toBe(2)
  expect(resumed.boostUntil).toBe(now + 620_000)
  expect(accrue(resumed, now + 621_000, true).coins).toBe(1201)
  expect(decodeGarden(encodeGarden(resumed), now + 21_000)).toEqual(resumed)
})

import { expect, it } from 'vitest'
import { CELL_COUNT, MAX_LEVEL } from '../src/board'
import {
  accrue, buyUpgrade, capacityLimit, coinsPerSecond, moveMochi, newGarden, releaseBlockedMochi,
  spawnMochi, upgradeCost, upgradeKeys,
} from '../src/economy'
import { rarityBit } from '../src/rarity'

function player(seed: number) {
  let now = 0
  let garden = newGarden(now)
  let firstUpgrade = Infinity
  let fullCapacity = Infinity
  let gold = Infinity
  let pink = Infinity
  let rng = seed

  function roll() {
    rng = (Math.imul(1664525, rng) + 1013904223) >>> 0
    return rng / 2 ** 32
  }

  function active(seconds: number) {
    const until = now + seconds * 1000
    while (now < until) {
      for (const kind of upgradeKeys) {
        const next = buyUpgrade(garden, kind, now)
        if (next === garden) continue
        firstUpgrade = Math.min(firstUpgrade, now)
        garden = next
        if (capacityLimit(garden) === CELL_COUNT) fullCapacity = Math.min(fullCapacity, now)
      }
      garden = spawnMochi(garden, now, roll(), roll())
      const seen = new Map<number, number>()
      for (const [to, level] of garden.board.entries()) {
        if (!level || level === MAX_LEVEL) continue
        const from = seen.get(level)
        if (from === undefined) {
          seen.set(level, to)
          continue
        }
        garden = moveMochi(garden, from, to, now).garden
        break
      }
      garden = releaseBlockedMochi(garden, now)
      if (coinsPerSecond(garden) <= 0) throw new Error('Simulasi buntu tanpa pendapatan')
      for (const found of garden.discovered) {
        if (found & rarityBit('gold')) gold = Math.min(gold, now)
        if (found & rarityBit('pink')) pink = Math.min(pink, now)
      }
      now += 1000
    }
  }

  function rest(hours: number) {
    garden = accrue(garden, now)
    now += hours * 3_600_000
    garden = accrue(garden, now, true)
  }

  return { active, rest, result: () => ({ garden, firstUpgrade, fullCapacity, gold, pink }) }
}

const DAY = 86_400_000
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]

it('mencapai upgrade awal sebelum 30 detik dan masih punya upgrade mahal setelah dua jam aktif', () => {
  const results = Array.from({ length: 31 }, (_, index) => {
    const simulation = player(42 + index * 7919)
    simulation.active(2 * 3600)
    return simulation.result()
  })
  const waits = results.map(({ garden }) => Math.max(...upgradeKeys.map(kind =>
    ((upgradeCost(garden, kind) ?? 0) - garden.coins) / coinsPerSecond(garden),
  )))
  console.log(`Simulasi: upgrade pertama ${results[0].firstUpgrade / 1000}s; setelah 2 jam, upgrade termahal butuh ${(waits[0] / 60).toFixed(1)} menit pendapatan pada seed acuan, median ${(median(waits) / 60).toFixed(1)} menit`)
  expect(Math.max(...results.map(result => result.firstUpgrade))).toBeLessThan(30_000)
  expect(waits[0]).toBeGreaterThanOrEqual(10 * 60)
  expect(median(waits)).toBeGreaterThanOrEqual(5 * 60)
})

it('memodelkan kapasitas dan penemuan langka dalam 31 perjalanan dengan sesi pendek', () => {
  const results = Array.from({ length: 31 }, (_, index) => {
    const simulation = player(42 + index * 7919)
    for (let session = 0; session < 90; session++) {
      simulation.active(180)
      simulation.rest(7.95)
    }
    return simulation.result()
  })
  const capacity = results.map(result => result.fullCapacity / DAY)
  const gold = median(results.map(result => result.gold / DAY))
  const pink = median(results.map(result => result.pink / DAY))
  console.log(`Simulasi 31 pemain: kapasitas median ${median(capacity).toFixed(2)} hari (tercepat ${Math.min(...capacity).toFixed(2)}); Emas ${gold.toFixed(2)} hari; Pink ${pink.toFixed(2)} hari`)
  expect(Math.max(...results.map(result => result.firstUpgrade))).toBeLessThan(30_000)
  expect(Math.min(...capacity)).toBeGreaterThanOrEqual(2.8)
  expect(median(capacity)).toBeLessThanOrEqual(5)
  expect(gold).toBeGreaterThanOrEqual(1)
  expect(gold).toBeLessThanOrEqual(2)
  expect(pink).toBeGreaterThanOrEqual(7)
  expect(pink).toBeLessThanOrEqual(14)
})

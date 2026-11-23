import { expect, it } from 'vitest'
import { CELL_COUNT, MAX_LEVEL } from '../src/board'
import {
  accrue, buyUpgrade, capacityLimit, coinsPerSecond, moveMochi, newGarden, spawnMochi,
  upgradeCost, upgradeKeys,
} from '../src/economy'

function player() {
  let now = 0
  let garden = newGarden(now)
  let firstUpgrade = Infinity
  let fullCapacity = Infinity
  let rng = 42

  function active(seconds: number) {
    const until = now + seconds * 1000
    while (now < until) {
      rng = (Math.imul(1664525, rng) + 1013904223) >>> 0
      garden = spawnMochi(garden, now, rng / 2 ** 32)
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
      for (const kind of upgradeKeys) {
        const next = buyUpgrade(garden, kind, now)
        if (next === garden) continue
        firstUpgrade = Math.min(firstUpgrade, now)
        garden = next
        if (capacityLimit(garden) === CELL_COUNT) fullCapacity = Math.min(fullCapacity, now)
      }
      now += 1000
    }
  }

  function rest(hours: number) {
    garden = accrue(garden, now)
    now += hours * 3_600_000
    garden = accrue(garden, now, true)
  }

  return { active, rest, result: () => ({ garden, firstUpgrade, fullCapacity }) }
}

it('mencapai upgrade awal sebelum 30 detik dan masih punya upgrade mahal setelah dua jam aktif', () => {
  const simulation = player()
  simulation.active(2 * 3600)
  const { garden, firstUpgrade } = simulation.result()
  const wait = upgradeKeys.map(kind =>
    ((upgradeCost(garden, kind) ?? 0) - garden.coins) / coinsPerSecond(garden),
  )
  console.log(`Simulasi: upgrade pertama ${firstUpgrade / 1000}s, upgrade termahal setelah 2 jam ${(Math.max(...wait) / 60).toFixed(1)} menit pendapatan`)
  expect(firstUpgrade).toBeLessThan(30_000)
  expect(Math.max(...wait)).toBeGreaterThanOrEqual(10 * 60)
})

it('mencapai 30 petak sekitar hari ketiga dengan sesi pendek dan penghasilan offline', () => {
  const simulation = player()
  for (let session = 0; session < 15; session++) {
    simulation.active(3 * 60)
    simulation.rest(8)
  }
  const days = simulation.result().fullCapacity / 86_400_000
  console.log(`Simulasi kapasitas penuh: hari ${days.toFixed(2)}`)
  expect(days).toBeGreaterThanOrEqual(2.8)
  expect(days).toBeLessThanOrEqual(4)
})

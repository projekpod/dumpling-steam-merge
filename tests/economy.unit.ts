import { describe, expect, it } from 'vitest'
import { emptyBoard, spawn } from '../src/board'
import {
  OFFLINE_LIMIT_MS, accrue, buyUpgrade, capacityLimit, coinsPerSecond, cooldownRemaining,
  formatNumber, jarDelay, magicChance, moveMochi, newGarden, simulateHour, spawnMochi, upgradeCost,
} from '../src/economy'
import { decodeGarden, encodeGarden } from '../src/storage'

describe('ekonomi Kebun', () => {
  it('menghitung hasil tiap mochi dan menyimpan pecahan koin', () => {
    const garden = newGarden(1000, [1, 2, 3, ...emptyBoard().slice(3)])
    expect(coinsPerSecond(garden)).toBe(7)
    const settled = accrue(garden, 1250)
    expect(settled.coins).toBe(1.75)
    expect(accrue(settled, 2000).coins).toBe(7)
  })

  it('membatasi hasil offline hingga 8 jam dan simulasi debug tepat 1 jam', () => {
    const garden = newGarden(1000, spawn(emptyBoard()))
    const now = garden.settledAt + 2 * OFFLINE_LIMIT_MS
    const settled = accrue(garden, now, true)
    expect(settled.coins).toBe(28_800)
    expect(accrue(settled, now, true).coins).toBe(28_800)
    expect(accrue(settled, 1000, true).coins).toBe(28_800)
    expect(simulateHour(garden, 2000).coins).toBe(3601)
  })

  it('menagih harga eksponensial dan memakai tingkat kecepatan dan bonus baru', () => {
    const garden = spawnMochi(newGarden(1000), 1000, 0.5)
    expect(spawnMochi(garden, 1500, 0.5)).toBe(garden)
    expect(buyUpgrade(garden, 'speed', 1500)).toBe(garden)
    const fast = buyUpgrade({ ...garden, coins: 270 }, 'speed', 1500)
    expect(fast.coins).toBe(245.5)
    expect(cooldownRemaining(fast, 1500)).toBe(2300)
    expect(upgradeCost(fast, 'speed')).toBe(39)
    expect(jarDelay(1000)).toBeGreaterThanOrEqual(500)
    const bonus = buyUpgrade(fast, 'bonus', 2000)
    expect(bonus.coins).toBe(46)
    expect(accrue(bonus, 3000).coins).toBeCloseTo(47.1)
    const high = { ...bonus, coins: 1e20, levels: { ...bonus.levels, bonus: 20 } }
    expect(buyUpgrade(high, 'bonus', 3000).levels.bonus).toBe(21)
  })

  it('memungkinkan toples ajaib memunculkan level 2 dengan peluang yang dibatasi', () => {
    const garden = buyUpgrade({ ...newGarden(1000), coins: 500 }, 'magic', 1000)
    expect(magicChance(garden.levels.magic)).toBeCloseTo(0.012)
    expect(magicChance(10000)).toBeLessThanOrEqual(0.4)
    expect(spawnMochi(garden, 1000, 0.01).board[0]).toBe(2)
    expect(spawnMochi(garden, 1000, 0.02).board[0]).toBe(1)
  })

  it('menambah kapasitas satu petak dan berhenti pada 30 petak', () => {
    const board = [...Array<number>(12).fill(1), ...emptyBoard().slice(12)]
    const garden = { ...newGarden(1000, board), coins: 100 }
    expect(spawnMochi(garden, 1000, 0.5)).toBe(garden)
    const upgraded = buyUpgrade(garden, 'capacity', 1000)
    expect(capacityLimit(upgraded)).toBe(13)
    expect(spawnMochi(upgraded, 1000, 0.5).board[12]).toBe(1)
    const full = newGarden(1000, Array<number>(30).fill(1))
    expect(upgradeCost(full, 'capacity')).toBeUndefined()
  })

  it('membayar hadiah gabung dan mencatat rekor level', () => {
    const garden = newGarden(1000, [1, 1, ...emptyBoard().slice(2)])
    const { garden: merged, reward } = moveMochi(garden, 0, 1, 2000)
    expect(reward).toBe(6)
    expect(merged.coins).toBe(8)
    expect(merged.highest).toBe(2)
    expect(moveMochi(merged, 1, 0, 2000).reward).toBe(0)
  })

  it('mempertahankan papan lawas dan memigrasikan saldo dan tingkat versi 2', () => {
    const board = [...Array<number>(26).fill(1), ...emptyBoard().slice(26)]
    for (const save of [board, { version: 1, cells: board }]) {
      const migrated = decodeGarden(JSON.stringify(save), 1000)
      expect(migrated.board).toEqual(board)
      expect(capacityLimit(migrated)).toBe(26)
      expect(migrated.settledAt).toBe(1000)
    }
    const old = {
      version: 2, board, coins: 123.75, settledAt: 1000, lastSpawnAt: null,
      levels: { speed: 2, capacity: 1, bonus: 2 },
    }
    const migrated = decodeGarden(JSON.stringify(old), 2000)
    expect(migrated.coins).toBe(123.75)
    expect(migrated.levels).toEqual({ speed: 2, capacity: 14, bonus: 5, magic: 0 })
    expect(decodeGarden(encodeGarden(migrated), 3000)).toEqual(migrated)
    for (const raw of [null, ']', '{"version":2}', JSON.stringify([13, ...board.slice(1)])]) {
      expect(decodeGarden(raw, 1000)).toEqual(newGarden(1000))
    }
  })

  it('menyingkat angka dari K sampai di atas T', () => {
    expect(formatNumber(1200)).toBe('1.2K')
    expect(formatNumber(3_400_000)).toBe('3.4M')
    expect(formatNumber(999_999)).toBe('1M')
    expect(formatNumber(1e15)).toBe('1aa')
    expect(formatNumber(1.2e18)).toBe('1.2ab')
    expect(formatNumber(1e93)).toBe('1ba')
    expect(formatNumber(Number.MAX_VALUE)).toMatch(/^179\.8[a-z]+$/)
  })
})

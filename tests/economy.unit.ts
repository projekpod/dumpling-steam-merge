import { describe, expect, it } from 'vitest'
import { emptyBoard, spawn } from '../src/board'
import {
  OFFLINE_LIMIT_MS, accrue, buyUpgrade, capacityLimit, coinsPerSecond,
  cooldownRemaining, formatNumber, newGarden, spawnMochi,
} from '../src/economy'
import { decodeGarden, encodeGarden } from '../src/storage'

describe('ekonomi Kebun', () => {
  it('menghitung hasil tiap mochi dan menyimpan pecahan koin', () => {
    const garden = newGarden(1_000, [1, 2, 3, ...emptyBoard().slice(3)])
    expect(coinsPerSecond(garden)).toBe(7)
    const settled = accrue(garden, 1_250)
    expect(settled.coins).toBe(1.75)
    expect(accrue(settled, 2_000).coins).toBe(7)
  })

  it('membatasi hasil offline hingga 8 jam dan mencatatnya sekali', () => {
    const garden = newGarden(1_000, spawn(emptyBoard()))
    const now = garden.settledAt + 2 * OFFLINE_LIMIT_MS
    const settled = accrue(garden, now, true)
    expect(settled.coins).toBe(28_800)
    expect(accrue(settled, now, true).coins).toBe(28_800)
    expect(accrue(settled, 1_000, true).coins).toBe(28_800)
  })

  it('menagih upgrade lalu memakai kecepatan dan bonus baru', () => {
    const garden = spawnMochi(newGarden(1_000), 1_000)
    expect(spawnMochi(garden, 1_500)).toBe(garden)
    expect(buyUpgrade(garden, 'speed', 1_500)).toBe(garden)
    const fast = buyUpgrade({ ...garden, coins: 40 }, 'speed', 1_500)
    expect(fast.coins).toBe(25.5)
    expect(cooldownRemaining(fast, 1_500)).toBe(250)
    const bonus = buyUpgrade(fast, 'bonus', 2_000)
    expect(bonus.coins).toBe(6)
    expect(accrue(bonus, 3_000).coins).toBe(7.25)
    const maxed = { ...bonus, levels: { ...bonus.levels, bonus: 3 } }
    expect(buyUpgrade(maxed, 'bonus', 3_000)).toBe(maxed)
  })

  it('menolak spawn saat kapasitas penuh hingga kapasitas ditingkatkan', () => {
    const board = [...Array<number>(20).fill(1), ...emptyBoard().slice(20)]
    const garden = { ...newGarden(1_000, board), coins: 30 }
    expect(spawnMochi(garden, 1_000)).toBe(garden)
    const upgraded = buyUpgrade(garden, 'capacity', 1_000)
    expect(capacityLimit(upgraded)).toBe(25)
    expect(spawnMochi(upgraded, 1_000).board[20]).toBe(1)
  })

  it('memigrasikan versi 0 dan 1 tanpa menghilangkan mochi atau memberi koin retroaktif', () => {
    const board = [...Array<number>(26).fill(1), ...emptyBoard().slice(26)]
    for (const save of [board, { version: 1, cells: board }]) {
      const migrated = decodeGarden(JSON.stringify(save), 1_000)
      expect(migrated.board).toEqual(board)
      expect(capacityLimit(migrated)).toBe(30)
      expect(migrated.coins).toBe(0)
      expect(migrated.settledAt).toBe(1_000)
      expect(decodeGarden(encodeGarden(migrated), 2_000)).toEqual(migrated)
    }
    for (const raw of [null, ']', '{"version":2}', JSON.stringify([13, ...board.slice(1)])]) {
      expect(decodeGarden(raw, 1_000)).toEqual(newGarden(1_000))
    }
  })

  it('menyingkat angka besar', () => {
    expect(formatNumber(1_200)).toBe('1.2K')
    expect(formatNumber(3_400_000)).toBe('3.4M')
    expect(formatNumber(999_999)).toBe('1M')
  })
})

import { describe, expect, it } from 'vitest'
import { emptyBoard, spawn } from '../src/board'
import {
  OFFLINE_LIMIT_MS, accrue, buyUpgrade, capacityLimit, coinsPerSecond, formatNumber,
  freeInterval, moveMochi, newGarden, refill, releaseBlockedMochi, rewardSquish,
  simulateHour, spawnMochi, steamerOffer, steamerPrice, upgradeCost,
} from '../src/economy'
import { rarities, rarityBit, rarityChances, rollRarity } from '../src/rarity'
import { decodeGarden, encodeGarden } from '../src/storage'

describe('ekonomi kukusan', () => {
  it('menghitung penghasilan per level dan varian, serta menyimpan pecahan koin', () => {
    const board = [1, 2, 3, ...emptyBoard().slice(3)]
    const variants = [...newGarden(1000).variants]
    variants[1] = 'glitter'
    variants[2] = 'rainbow'
    const garden = { ...newGarden(1000, board), variants }
    expect(coinsPerSecond(garden)).toBe(17)
    const settled = accrue(garden, 1250)
    expect(settled.coins).toBe(4.25)
    expect(accrue(settled, 2000).coins).toBe(17)
  })

  it('membatasi hasil offline 8 jam dan mengisi kukusan gratis hingga 3', () => {
    const garden = newGarden(1000, spawn(emptyBoard()))
    const now = garden.settledAt + 2 * OFFLINE_LIMIT_MS
    const settled = accrue(garden, now, true)
    expect(settled.coins).toBe(28_800)
    expect(accrue(settled, now, true).coins).toBe(28_800)
    expect(accrue(settled, 1000, true).coins).toBe(28_800)
    expect(refill(garden, now).freeCharges).toBe(3)
    expect(simulateHour(garden, 2000)).toMatchObject({ coins: 3601, freeCharges: 3 })
  })

  it('memakai gratis, membayar hanya jika mampu, lalu mengisi gratis tepat waktu', () => {
    const garden = spawnMochi(newGarden(1000), 1000, 0.5, 0.5)
    expect(garden.freeCharges).toBe(0)
    expect(garden.coins).toBe(0)
    expect(steamerPrice(garden)).toBe(8)
    expect(spawnMochi(garden, 7999, 0.5, 0.5)).toBe(garden)
    const paid = spawnMochi(garden, 9000, 0.5, 0.5)
    expect(paid.board.slice(0, 2)).toEqual([1, 1])
    expect(paid.coins).toBe(0)
    expect(refill(garden, 20999).freeCharges).toBe(0)
    expect(refill(garden, 21000)).toMatchObject({ freeCharges: 1, freeAt: 21000 })

    const full = refill(garden, 1_000_000)
    const after = spawnMochi(full, 1_200_000, 0.5, 0.5)
    expect(after.freeCharges).toBe(2)
    expect(refill(after, 1_200_001).freeCharges).toBe(2)
  })

  it('memberi kukusan darurat jika papan kosong dan saldo serta stok kurang', () => {
    const garden = { ...newGarden(1000), freeCharges: 0, highest: 12 }
    expect(steamerOffer(garden, 1000).emergency).toBe(true)
    expect(spawnMochi(garden, 1000, 0.5, 0.5)).toMatchObject({
      board: spawn(emptyBoard()), coins: 0, highest: 12, freeCharges: 0,
    })
  })

  it('membuka satu petak dari papan yang penuh tanpa pasangan dan mempertahankan Mochidex', () => {
    const garden = newGarden(1000, [...Array.from({ length: 12 }, (_, i) => i + 1), ...emptyBoard().slice(12)])
    expect(spawnMochi(garden, 1000, 0.5, 0.5)).toBe(garden)
    const recovered = releaseBlockedMochi(garden, 1000)
    expect(recovered.board[0]).toBe(0)
    expect(recovered.discovered).toEqual(garden.discovered)
    expect(spawnMochi(recovered, 1000, 0.5, 0.5).board[0]).toBe(1)
  })

  it('menagih upgrade eksponensial dan menghormati batas efek', () => {
    const garden = { ...newGarden(1000), coins: 600 }
    const saver = buyUpgrade(garden, 'saver', 1000)
    expect(saver.coins).toBe(584)
    expect(upgradeCost(saver, 'saver')).toBe(28)
    expect(steamerPrice({ ...saver, highest: 4 })).toBeLessThan(steamerPrice({ ...garden, highest: 4 }))
    const free = buyUpgrade(saver, 'free', 11000)
    expect(freeInterval(free.levels.free)).toBe(18880)
    expect(freeInterval(1000)).toBe(6000)
    expect(free.freeAt + freeInterval(free.levels.free)).toBe(20440)
    const special = buyUpgrade(free, 'special', 11000)
    expect(spawnMochi(special, 11000, 0.001, 0.5).board[0]).toBe(3)
    expect(spawnMochi(special, 11000, 0.01, 0.5).board[0]).toBe(2)
    expect(buyUpgrade({ ...garden, coins: 1e20, levels: { ...garden.levels, bonus: 20 } }, 'bonus', 1000).levels.bonus).toBe(21)
    expect(capacityLimit(buyUpgrade(garden, 'capacity', 1000))).toBe(13)
    expect(upgradeCost(newGarden(1000, Array<number>(30).fill(1)), 'capacity')).toBeUndefined()
  })

  it('menjumlahkan peluang, memilih varian sesuai ambang dan mewariskan varian tertinggi', () => {
    const chances = rarityChances(0)
    expect(Object.values(chances).reduce((sum, chance) => sum + chance, 0)).toBeCloseTo(1)
    expect(rarityChances(1000).pink).toBeCloseTo(chances.pink * 1.65)
    expect(rarities).toHaveLength(5)
    expect(rollRarity(0, 0)).toBe('pink')
    expect(rollRarity(0, chances.pink)).toBe('gold')
    expect(rollRarity(0, chances.pink + chances.gold + chances.rainbow / 2)).toBe('rainbow')
    expect(rollRarity(0, 0.02)).toBe('glitter')
    expect(rollRarity(0, 0.5)).toBe('normal')
    const a = spawnMochi(newGarden(0), 0, 0.5, 0)
    const b = spawnMochi(a, 20_000, 0.5, 0.001)
    const { garden: merged, reward } = moveMochi(b, 0, 1, 20_000)
    expect(reward).toBe(6)
    expect(merged.variants[1]).toBe('pink')
    expect(merged.discovered[1]).toBe(rarityBit('pink'))
    expect(coinsPerSecond(merged)).toBe(20)
    expect(moveMochi(merged, 1, 0, 20_000).garden.variants[0]).toBe('pink')
  })

  it('membayar maksimal tiga remas sah dalam menit bergulir, termasuk setelah reload', () => {
    let garden = spawnMochi(newGarden(0), 0, 0.5, 0.5)
    expect(rewardSquish(garden, 0, 499, 1000)).toBe(garden)
    expect(rewardSquish(garden, 1, 700, 1000)).toBe(garden)
    for (const now of [1000, 2000, 3000]) garden = rewardSquish(garden, 0, 500, now)
    expect(garden.coins).toBe(6)
    garden = decodeGarden(encodeGarden(garden), 59999)
    expect(rewardSquish(garden, 0, 500, 59999)).toBe(garden)
    expect(rewardSquish(garden, 0, 500, 61000).squishedAt).toEqual([2000, 3000, 61000])
  })

  it('memigrasikan versi 0–3 dengan papan dan saldo utuh, serta memuat versi 4', () => {
    const board = [...Array<number>(26).fill(1), ...emptyBoard().slice(26)]
    const banks = [board, { version: 1, cells: board }]
    banks.forEach(save => expect(decodeGarden(JSON.stringify(save), 1000).board).toEqual(board))
    const old = { board, coins: 123.75, settledAt: 1000, highest: 5, levels: { speed: 2, capacity: 1, bonus: 2, magic: 4 } }
    for (const version of [2, 3]) {
      const migrated = decodeGarden(JSON.stringify({ ...old, version }), 2000)
      expect(migrated.coins).toBe(123.75)
      expect(migrated.board).toEqual(board)
      expect(migrated.variants.every(variant => variant === 'normal')).toBe(true)
      expect(migrated.levels).toEqual({ saver: 0, capacity: 14, free: 2, bonus: version === 2 ? 5 : 2, special: version === 2 ? 0 : 4, squish: 0 })
      expect(migrated.discovered.slice(0, 5)).toEqual([1, 1, 1, 1, 1])
      expect(decodeGarden(encodeGarden(migrated), 3000)).toEqual(migrated)
    }
    expect(decodeGarden(']', 1000)).toEqual(newGarden(1000))
  })

  it('menyingkat angka besar melewati T', () => {
    expect(formatNumber(1200)).toBe('1.2K')
    expect(formatNumber(3_400_000)).toBe('3.4M')
    expect(formatNumber(999_999)).toBe('1M')
    expect(formatNumber(1e15)).toBe('1aa')
    expect(formatNumber(1.2e18)).toBe('1.2ab')
    expect(formatNumber(1e93)).toBe('1ba')
    expect(formatNumber(Number.MAX_VALUE)).toMatch(/^179\.8[a-z]+$/)
  })
})

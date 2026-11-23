import { describe, expect, it } from 'vitest'
import { areas, newAreaBoard } from '../src/areas'
import { emptyBoard, MAX_LEVEL } from '../src/board'
import {
  EGG_INTERVAL, accrue, capacityLimit, coinsPerSecond, hatchEgg, isAreaUnlocked, moveDumpling,
  newGarden, steamerPrice, switchArea, trackEggTime,
} from '../src/economy'
import { rarities, rarityBit, rarityChances } from '../src/rarity'
import { decodeGarden, encodeGarden } from '../src/storage'
import { text } from '../src/strings'

const boardWith = (...levels: number[]) => [...levels, ...emptyBoard().slice(levels.length)]

describe('area dan Buku Koleksi Dumpling', () => {
  it('memiliki 12 spesies dan slot koleksi per area', () => {
    for (const area of areas) {
      expect(newAreaBoard().discovered).toHaveLength(MAX_LEVEL)
      expect(new Set(text.names[area]).size).toBe(MAX_LEVEL)
      expect(new Set(text.descriptions[area]).size).toBe(MAX_LEVEL)
    }
  })

  it('membuka Pantai pada Kebun Lv. 8 dan Salju pada Pantai Lv. 9 serta menyimpan ketiga papan', () => {
    const garden = newGarden(0, boardWith(7, 7, 2))
    expect(switchArea(garden, 'pantai', 0)).toBe(garden)
    const discovered = moveDumpling(garden, 0, 1, 0).garden
    const ready = trackEggTime(discovered, EGG_INTERVAL)
    const beach = switchArea(ready, 'pantai', 1000)
    expect(beach.coins).toBe(ready.coins + 130)
    expect(beach.eggActiveMs).toBe(EGG_INTERVAL)
    expect(beach.area).toBe('pantai')
    expect(beach.board).toEqual(emptyBoard())
    expect(beach.highest).toBe(0)
    expect(steamerPrice(beach)).toBe(8)
    expect(coinsPerSecond(beach)).toBe(0)
    expect(beach.otherAreas.kebun).toMatchObject({ board: ready.board, variants: ready.variants, discovered: ready.discovered, highest: 8 })
    expect(switchArea(beach, 'salju', 1000)).toBe(beach)

    const beachBoard = { ...beach, ...newAreaBoard(boardWith(8, 8)) }
    expect(isAreaUnlocked(beachBoard, 'salju')).toBe(false)
    const merged = moveDumpling(beachBoard, 0, 1, 1000).garden
    const snow = switchArea(merged, 'salju', 2000)
    expect(snow.area).toBe('salju')
    expect(snow.coins).toBe(merged.coins + 256)
    expect(accrue(snow, 10_000, true).coins).toBe(snow.coins)
    expect(snow.otherAreas.kebun).toBe(beach.otherAreas.kebun)
    expect(snow.otherAreas.pantai).toMatchObject({ board: merged.board, highest: 9 })
    expect(snow.freeCharges).toBe(garden.freeCharges)
    expect(snow.levels).toBe(garden.levels)
    expect(capacityLimit(snow)).toBe(12)

    const reloaded = decodeGarden(encodeGarden(snow), 5000)
    expect(reloaded).toEqual(snow)
    const back = switchArea(reloaded, 'kebun', 5000)
    expect(back.board).toEqual(ready.board)
    expect(back.discovered).toEqual(ready.discovered)
    expect(back.highest).toBe(8)
    expect(back.otherAreas.pantai).toEqual(snow.otherAreas.pantai)
    expect(accrue(back, 6000, true).coins - back.coins).toBe(130)
  })

  it.each([4, 5])('memigrasikan simpanan versi %i ke Kebun tanpa mengurangi progres', version => {
    const seed = newGarden(1000, boardWith(6, 2))
    const variants = seed.board.map((_, i) => i === 0 ? 'gold' : 'normal')
    const discovered = seed.discovered.map((mask, i) => i === 7 ? rarityBit('pink') : mask)
    const levels = { ...seed.levels, capacity: 4, special: 3, bonus: 5 }
    const legacy = {
      version, board: seed.board, variants, discovered, highest: 9, coins: 125.75,
      settledAt: 1000, levels, freeCharges: 2, freeAt: 900, squishedAt: [999],
      ...(version === 5 ? { boostUntil: 601_000 } : {}),
    }
    const migrated = decodeGarden(JSON.stringify(legacy), 2000)
    expect(migrated).toMatchObject({
      area: 'kebun', otherAreas: {}, eggActiveMs: 0, board: legacy.board, variants: legacy.variants,
      coins: legacy.coins, highest: 9, levels, freeCharges: 2, freeAt: 900, squishedAt: [999],
      boostUntil: version === 5 ? 601_000 : 0,
    })
    expect(migrated.discovered[5] & rarityBit('gold')).toBeTruthy()
    expect(migrated.discovered[7]).toBe(rarityBit('pink'))
    expect(isAreaUnlocked(migrated, 'pantai')).toBe(true)
  })
})

describe('telur kejutan', () => {
  it('menampung satu telur setelah 180 detik dan menyimpannya sampai ada ruang', () => {
    const seed = newGarden(1000, boardWith(...Array<number>(12).fill(1)))
    const early = trackEggTime(seed, EGG_INTERVAL - 1)
    expect(hatchEgg(early, 1000, 0.2, 0)).toBe(early)
    const ready = trackEggTime(early, 1)
    expect(trackEggTime(ready, EGG_INTERVAL * 4)).toBe(ready)
    expect(hatchEgg(ready, 1000, 0.2, 0)).toBe(ready)
    const cleared = moveDumpling(ready, 0, 1, 1000).garden
    const loaded = decodeGarden(encodeGarden(cleared), 1000)
    const hatched = hatchEgg(loaded, 1000, 0.2, 0)
    expect(hatched).toMatchObject({
      eggActiveMs: 0, freeCharges: cleared.freeCharges, freeAt: cleared.freeAt, coins: cleared.coins,
    })
    expect(hatched.board[0]).toBe(1)
    expect(hatched.variants[0]).toBe('pink')
    expect(hatched.discovered[0] & rarityBit('pink')).toBeTruthy()
    expect(hatchEgg(hatched, 1000, 0, 0)).toBe(hatched)
  })

  it('mengundi level 80/20 dan varian M2c secara terpisah', () => {
    const seed = trackEggTime(newGarden(1000), EGG_INTERVAL)
    const ready = { ...seed, levels: { ...seed.levels, special: 6 } }
    const samples = 50_000
    const levels = [0, 0, 0]
    const variants = Object.fromEntries(rarities.map(rarity => [rarity, 0]))
    const pinkLevels = new Set<number>()
    for (let i = 0; i < samples; i++) {
      const levelRoll = ((i * 13_649) % samples + 0.5) / samples
      const rarityRoll = (i + 0.5) / samples
      const after = hatchEgg(ready, 1000, levelRoll, rarityRoll)
      levels[after.board[0]]++
      const rarity = after.variants[0]
      variants[rarity]++
      if (rarity === 'pink') pinkLevels.add(after.board[0])
    }
    expect(levels).toEqual([0, 40_000, 10_000])
    const odds = rarityChances(ready.levels.special)
    for (const rarity of rarities) {
      expect(Math.abs(variants[rarity] - odds[rarity] * samples)).toBeLessThanOrEqual(1)
    }
    expect([...pinkLevels].sort()).toEqual([1, 2])
  })
})

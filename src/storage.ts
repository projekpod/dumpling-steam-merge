import { CELL_COUNT, MAX_LEVEL, isBoard } from './board'
import { CAPACITY_LEVELS, FREE_LIMIT, INITIAL_CAPACITY, SQUISH_LIMIT, newGarden, upgradeKeys, type Garden } from './economy'
import { localStore, type SaveStore } from './platform'
import { rarities, rarityBit, type Rarity } from './rarity'
import { BOARD_KEY } from './save-keys'

function isNatural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isRarity(value: unknown): value is Rarity {
  return rarities.some(rarity => rarity === value)
}

export function decodeGarden(raw: string | null, now: number): Garden {
  try {
    const data = raw === null ? null : JSON.parse(raw)
    if (isBoard(data)) return newGarden(now, data)
    if (data?.version === 1 && isBoard(data.cells)) return newGarden(now, data.cells)
    if ([2, 3, 4, 5].includes(data?.version) && isBoard(data.board) &&
      Number.isFinite(data.coins) && data.coins >= 0 && isNatural(data.settledAt)) {
      const seed = newGarden(now, data.board)
      const highest = isNatural(data.highest) && data.highest <= MAX_LEVEL
        ? Math.max(seed.highest, data.highest) : seed.highest
      const saved = { ...seed, coins: data.coins, settledAt: data.settledAt, highest }
      if (data.version === 2 || data.version === 3) {
        const old = data.levels
        const capacity = isNatural(old?.capacity) ? old.capacity : 0
        const paidCapacity = data.version === 2 && capacity ? 20 + capacity * 5 - INITIAL_CAPACITY : capacity
        const bonus = isNatural(old?.bonus) ? old.bonus : 0
        return {
          ...saved,
          discovered: seed.discovered.map((_, i) => Number(i < highest)),
          levels: {
            ...seed.levels,
            free: isNatural(old?.speed) ? old.speed : 0,
            capacity: Math.max(seed.levels.capacity, Math.min(CAPACITY_LEVELS, paidCapacity)),
            bonus: data.version === 2 ? Math.round(bonus * 2.5) : bonus,
            special: data.version === 3 && isNatural(old?.magic) ? old.magic : 0,
          },
        }
      }

      if (Array.isArray(data.variants) && data.variants.length === CELL_COUNT && data.variants.every(isRarity) &&
        Array.isArray(data.discovered) && data.discovered.length === MAX_LEVEL &&
        data.discovered.every((mask: unknown) => isNatural(mask) && mask < 2 ** rarities.length) &&
        isNatural(data.freeCharges) && data.freeCharges <= FREE_LIMIT && isNatural(data.freeAt) &&
        Array.isArray(data.squishedAt) && data.squishedAt.length <= SQUISH_LIMIT && data.squishedAt.every(isNatural) &&
        upgradeKeys.every(kind => isNatural(data.levels?.[kind])) && data.levels.capacity <= CAPACITY_LEVELS) {
        const variants: Rarity[] = seed.board.map((level, i) => level ? data.variants[i] : 'normal')
        const discovered = [...data.discovered]
        seed.board.forEach((level, i) => {
          if (level) discovered[level - 1] |= rarityBit(variants[i])
        })
        return {
          ...saved,
          variants, discovered, highest: Math.max(highest, ...discovered.map((mask, i) => mask ? i + 1 : 0)),
          freeCharges: data.freeCharges, freeAt: data.freeAt, squishedAt: data.squishedAt,
          boostUntil: isNatural(data.boostUntil) ? data.boostUntil : 0,
          levels: { ...data.levels, capacity: Math.max(seed.levels.capacity, data.levels.capacity) },
        }
      }
    }
  } catch {
    // Replace malformed saves with a fresh garden.
  }
  return newGarden(now)
}

export function encodeGarden(garden: Garden): string {
  return JSON.stringify({ version: 5, ...garden })
}

export function loadGarden(now: number, store = localStore()): { garden: Garden; error: boolean } {
  try {
    return { garden: decodeGarden(store.getItem(BOARD_KEY), now), error: false }
  } catch {
    return { garden: newGarden(now), error: true }
  }
}

export function saveGarden(garden: Garden, store: SaveStore): boolean {
  try {
    store.setItem(BOARD_KEY, encodeGarden(garden))
    return true
  } catch {
    return false
  }
}

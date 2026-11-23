import { MAX_LEVEL, isBoard } from './board'
import { CAPACITY_LEVELS, INITIAL_CAPACITY, newGarden, upgradeKeys, type Garden } from './economy'

const key = 'kebun-mochi:board'

function isNatural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

export function decodeGarden(raw: string | null, now: number): Garden {
  try {
    const data = raw === null ? null : JSON.parse(raw)
    if (isBoard(data)) return newGarden(now, data)
    if (data?.version === 1 && isBoard(data.cells)) return newGarden(now, data.cells)
    if ((data?.version === 2 || data?.version === 3) && isBoard(data.board) &&
      Number.isFinite(data.coins) && data.coins >= 0 &&
      isNatural(data.settledAt) &&
      (data.lastSpawnAt === null || isNatural(data.lastSpawnAt))) {
      const seed = newGarden(now, data.board)
      const saved = { ...seed, coins: data.coins, settledAt: data.settledAt, lastSpawnAt: data.lastSpawnAt }
      if (data.version === 2 && isNatural(data.levels?.speed) && isNatural(data.levels?.bonus) &&
        isNatural(data.levels?.capacity)) {
        return {
          ...saved,
          levels: {
            speed: data.levels.speed,
            capacity: data.levels.capacity === 0
              ? seed.levels.capacity
              : Math.max(seed.levels.capacity, Math.min(CAPACITY_LEVELS, 20 + data.levels.capacity * 5 - INITIAL_CAPACITY)),
            bonus: Math.round(data.levels.bonus * 2.5),
            magic: 0,
          },
        }
      }
      if (data.version === 3 && isNatural(data.highest) && data.highest <= MAX_LEVEL &&
        upgradeKeys.every(kind => isNatural(data.levels?.[kind])) && data.levels.capacity <= CAPACITY_LEVELS) {
        return {
          ...saved,
          highest: Math.max(seed.highest, data.highest),
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
  return JSON.stringify({ version: 3, ...garden })
}

export function loadGarden(now: number): { garden: Garden; error: boolean } {
  try {
    return { garden: decodeGarden(localStorage.getItem(key), now), error: false }
  } catch {
    return { garden: newGarden(now), error: true }
  }
}

export function saveGarden(garden: Garden): boolean {
  try {
    localStorage.setItem(key, encodeGarden(garden))
    return true
  } catch {
    return false
  }
}

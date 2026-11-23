import { isBoard } from './board'
import { newGarden, upgradeKeys, upgrades, type Garden } from './economy'

const key = 'kebun-mochi:board'

export function decodeGarden(raw: string | null, now: number): Garden {
  try {
    const data = raw === null ? null : JSON.parse(raw)
    if (isBoard(data)) return newGarden(now, data)
    if (data?.version === 1 && isBoard(data.cells)) return newGarden(now, data.cells)
    if (data?.version === 2 && isBoard(data.board) &&
      Number.isFinite(data.coins) && data.coins >= 0 &&
      Number.isSafeInteger(data.settledAt) && data.settledAt >= 0 &&
      (data.lastSpawnAt === null || (Number.isSafeInteger(data.lastSpawnAt) && data.lastSpawnAt >= 0)) &&
      upgradeKeys.every(kind => Number.isInteger(data.levels?.[kind]) &&
        data.levels[kind] >= 0 && data.levels[kind] <= upgrades[kind].costs.length)) {
      return {
        board: data.board,
        coins: data.coins,
        settledAt: data.settledAt,
        lastSpawnAt: data.lastSpawnAt,
        levels: data.levels,
      }
    }
  } catch {
    // Replace malformed saves with a fresh garden.
  }
  return newGarden(now)
}

export function encodeGarden(garden: Garden): string {
  return JSON.stringify({ version: 2, ...garden })
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

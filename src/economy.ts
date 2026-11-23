import { CELL_COUNT, emptyBoard, isBoard, spawn, type Board } from './board'

export const OFFLINE_LIMIT_MS = 8 * 60 * 60 * 1000

export const upgrades = {
  speed: { costs: [15, 60, 180] },
  capacity: { costs: [30, 120] },
  bonus: { costs: [20, 80, 240] },
} as const

export type Upgrade = keyof typeof upgrades
export const upgradeKeys: Upgrade[] = ['speed', 'capacity', 'bonus']

export interface Garden {
  board: Board
  coins: number
  settledAt: number
  lastSpawnAt: number | null
  levels: Record<Upgrade, number>
}

export function newGarden(now: number, board = emptyBoard()): Garden {
  const capacity = Math.max(0, Math.ceil((board.filter(Boolean).length - 20) / 5))
  return { board, coins: 0, settledAt: now, lastSpawnAt: null, levels: { speed: 0, capacity, bonus: 0 } }
}

export function capacityLimit(garden: Garden): number {
  return Math.min(CELL_COUNT, 20 + garden.levels.capacity * 5)
}

export function coinsPerSecond(garden: Garden): number {
  return garden.board.reduce((sum, level) => sum + (level ? 2 ** (level - 1) : 0), 0)
    * (1 + garden.levels.bonus * 0.25)
}

export function accrue(garden: Garden, now: number, offline = false): Garden {
  const elapsed = Math.max(0, now - garden.settledAt)
  const paidTime = offline ? Math.min(elapsed, OFFLINE_LIMIT_MS) : elapsed
  return {
    ...garden,
    coins: garden.coins + coinsPerSecond(garden) * paidTime / 1000,
    settledAt: now,
    lastSpawnAt: garden.lastSpawnAt !== null && garden.lastSpawnAt > now ? null : garden.lastSpawnAt,
  }
}

export function cooldownRemaining(garden: Garden, now: number): number {
  if (garden.lastSpawnAt === null || garden.lastSpawnAt > now) return 0
  const delay = [1000, 750, 500, 250][garden.levels.speed]
  return Math.max(0, garden.lastSpawnAt + delay - now)
}

export function spawnMochi(garden: Garden, now: number): Garden {
  if (garden.board.filter(Boolean).length >= capacityLimit(garden) || cooldownRemaining(garden, now)) {
    return garden
  }
  return { ...accrue(garden, now), board: spawn(garden.board), lastSpawnAt: now }
}

export function upgradeCost(garden: Garden, kind: Upgrade): number | undefined {
  return upgrades[kind].costs[garden.levels[kind]]
}

export function buyUpgrade(garden: Garden, kind: Upgrade, now: number): Garden {
  const cost = upgradeCost(garden, kind)
  const settled = accrue(garden, now)
  if (cost === undefined || settled.coins < cost) return garden
  return { ...settled, coins: settled.coins - cost, levels: { ...garden.levels, [kind]: garden.levels[kind] + 1 } }
}

export function formatNumber(value: number): string {
  const units = ['', 'K', 'M', 'B', 'T']
  let unit = 0
  while (value >= 999.95 && unit < units.length - 1) {
    value /= 1000
    unit++
  }
  return Number(value.toFixed(unit === 0 ? 2 : 1)) + units[unit]
}

import { CELL_COUNT, emptyBoard, move, spawn, type Board } from './board'

export const OFFLINE_LIMIT_MS = 8 * 60 * 60 * 1000
export const INITIAL_CAPACITY = 12
export const CAPACITY_LEVELS = CELL_COUNT - INITIAL_CAPACITY

export const upgrades = {
  speed: { base: 25, multiplier: 1.55 },
  capacity: { base: 100, multiplier: 2.28 },
  bonus: { base: 200, multiplier: 1.75 },
  magic: { base: 500, multiplier: 1.9 },
} as const

export type Upgrade = keyof typeof upgrades
export const upgradeKeys: Upgrade[] = ['speed', 'capacity', 'bonus', 'magic']

export interface Garden {
  board: Board
  coins: number
  settledAt: number
  lastSpawnAt: number | null
  levels: Record<Upgrade, number>
  highest: number
}

export function newGarden(now: number, board = emptyBoard()): Garden {
  const capacity = Math.max(0, board.filter(Boolean).length - INITIAL_CAPACITY)
  return {
    board, coins: 0, settledAt: now, lastSpawnAt: null,
    levels: { speed: 0, capacity, bonus: 0, magic: 0 },
    highest: Math.max(...board),
  }
}

export function capacityLimit(garden: Garden): number {
  return INITIAL_CAPACITY + garden.levels.capacity
}

function mochiIncome(level: number): number {
  return level ? 2 ** (level - 1) : 0
}

export function coinsPerSecond(garden: Garden): number {
  return garden.board.reduce((sum, level) => sum + mochiIncome(level), 0)
    * (1 + garden.levels.bonus * 0.1)
}

export function accrue(garden: Garden, now: number, offline = false): Garden {
  const elapsed = Math.max(0, now - garden.settledAt)
  const paidTime = offline ? Math.min(elapsed, OFFLINE_LIMIT_MS) : elapsed
  return {
    ...garden,
    coins: Math.min(Number.MAX_VALUE, garden.coins + coinsPerSecond(garden) * paidTime / 1000),
    settledAt: now,
    lastSpawnAt: garden.lastSpawnAt !== null && garden.lastSpawnAt > now ? null : garden.lastSpawnAt,
  }
}

export function jarDelay(level: number): number {
  return 500 + 2500 * 0.92 ** level
}

export function magicChance(level: number): number {
  return 0.4 * (1 - 0.97 ** level)
}

export function cooldownRemaining(garden: Garden, now: number): number {
  if (garden.lastSpawnAt === null || garden.lastSpawnAt > now) return 0
  return Math.max(0, garden.lastSpawnAt + jarDelay(garden.levels.speed) - now)
}

export function spawnMochi(garden: Garden, now: number, roll: number): Garden {
  if (garden.board.filter(Boolean).length >= capacityLimit(garden) || cooldownRemaining(garden, now)) {
    return garden
  }
  const level = roll < magicChance(garden.levels.magic) ? 2 : 1
  return {
    ...accrue(garden, now), board: spawn(garden.board, level), lastSpawnAt: now,
    highest: Math.max(garden.highest, level),
  }
}

export function moveMochi(garden: Garden, from: number, to: number, now: number) {
  const board = move(garden.board, from, to)
  if (board === garden.board) return { garden, reward: 0 }
  const settled = accrue(garden, now)
  const reward = garden.board[to] ? 3 * mochiIncome(board[to]) : 0
  return {
    garden: {
      ...settled, board, coins: Math.min(Number.MAX_VALUE, settled.coins + reward),
      highest: Math.max(garden.highest, board[to]),
    },
    reward,
  }
}

export function upgradeCost(garden: Garden, kind: Upgrade): number | undefined {
  const level = garden.levels[kind]
  if (kind === 'capacity' && level >= CAPACITY_LEVELS) return undefined
  const { base, multiplier } = upgrades[kind]
  return Math.ceil(base * multiplier ** level)
}

export function buyUpgrade(garden: Garden, kind: Upgrade, now: number): Garden {
  const cost = upgradeCost(garden, kind)
  const settled = accrue(garden, now)
  if (cost === undefined || settled.coins < cost) return garden
  return { ...settled, coins: settled.coins - cost, levels: { ...garden.levels, [kind]: garden.levels[kind] + 1 } }
}

export function simulateHour(garden: Garden, now: number): Garden {
  const settled = accrue(garden, now)
  return accrue({ ...settled, settledAt: now - 3_600_000, lastSpawnAt: null }, now, true)
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '∞'
  const units = ['', 'K', 'M', 'B', 'T']
  let unit = 0
  while (value >= (unit === 0 ? 999.995 : 999.95)) {
    value /= 1000
    unit++
  }
  let suffix = units[unit]
  if (suffix === undefined) {
    let index = unit - units.length
    suffix = String.fromCharCode(97 + index % 26)
    index = Math.floor(index / 26)
    do {
      suffix = String.fromCharCode(97 + index % 26) + suffix
      index = Math.floor(index / 26) - 1
    } while (index >= 0)
  }
  return Number(value.toFixed(unit === 0 ? 2 : 1)) + suffix
}

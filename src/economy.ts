import { CELL_COUNT, MAX_LEVEL, emptyBoard, move, spawn } from './board'
import { newAreaBoard, unlocks, type Area, type AreaBoard } from './areas'
import { higherRarity, rarityBit, rarityMultiplier, rollRarity, type Rarity } from './rarity'

export const REWARD_DURATION = 10 * 60_000
export const OFFLINE_LIMIT_MS = 8 * 60 * 60 * 1000
export const INITIAL_CAPACITY = 12
export const CAPACITY_LEVELS = CELL_COUNT - INITIAL_CAPACITY
export const FREE_LIMIT = 3
export const SQUISH_WINDOW = 60_000
export const SQUISH_LIMIT = 3
export const SQUISH_HOLD = 500
export const EGG_INTERVAL = 180_000
export const EGG_LEVEL_TWO = 0.2

export const upgrades = {
  saver: { base: 16, multiplier: 1.72 },
  capacity: { base: 100, multiplier: 2.56 },
  free: { base: 22, multiplier: 1.78 },
  special: { base: 500, multiplier: 3.7 },
  bonus: { base: 200, multiplier: 2.0 },
  squish: { base: 30, multiplier: 1.9 },
} as const

export type Upgrade = keyof typeof upgrades
export const upgradeKeys = Object.keys(upgrades) as Upgrade[]
export const onboardingSteps = ['tap', 'merge', 'squish', 'done', 'skipped'] as const
export type OnboardingStep = typeof onboardingSteps[number]

export interface Garden extends AreaBoard {
  onboarding: OnboardingStep
  area: Area
  otherAreas: Partial<Record<Area, AreaBoard>>
  eggActiveMs: number
  coins: number
  settledAt: number
  levels: Record<Upgrade, number>
  freeCharges: number
  freeAt: number
  squishedAt: readonly number[]
  boostUntil: number
}

export function newGarden(now: number, board = emptyBoard()): Garden {
  const capacity = Math.max(0, board.filter(Boolean).length - INITIAL_CAPACITY)
  return {
    ...newAreaBoard(board), area: 'kebun', otherAreas: {}, eggActiveMs: 0,
    onboarding: board.some(Boolean) ? 'done' : 'tap',
    coins: 0, settledAt: now, levels: { saver: 0, capacity, free: 0, special: 0, bonus: 0, squish: 0 },
    freeCharges: 1, freeAt: now, squishedAt: [], boostUntil: 0,
  }
}

export function isAreaUnlocked(garden: Garden, area: Area): boolean {
  const requirement = unlocks[area]
  if (!requirement) return true
  const source = requirement.area === garden.area ? garden : garden.otherAreas[requirement.area]
  return (source?.highest ?? 0) >= requirement.level
}

export function switchArea(garden: Garden, area: Area, now: number): Garden {
  if (area === garden.area || !isAreaUnlocked(garden, area)) return garden
  const { board, variants, discovered, highest } = garden
  const otherAreas = { ...garden.otherAreas, [garden.area]: { board, variants, discovered, highest } }
  const destination = otherAreas[area] ?? newAreaBoard()
  delete otherAreas[area]
  return { ...accrue(refill(garden, now), now), ...destination, area, otherAreas }
}

export function trackEggTime(garden: Garden, elapsed: number): Garden {
  const eggActiveMs = Math.min(EGG_INTERVAL, garden.eggActiveMs + Math.max(0, Math.floor(elapsed)))
  return eggActiveMs === garden.eggActiveMs ? garden : { ...garden, eggActiveMs }
}

export function capacityLimit(garden: Garden): number {
  return INITIAL_CAPACITY + garden.levels.capacity
}

export function dumplingIncome(level: number, rarity: Rarity): number {
  return level ? 2 ** (level - 1) * rarityMultiplier(rarity) : 0
}

function baseIncome(garden: Garden): number {
  return garden.board.reduce((sum, level, index) => sum + dumplingIncome(level, garden.variants[index]), 0)
    * (1 + garden.levels.bonus * 0.1)
}

export function coinsPerSecond(garden: Garden, now = garden.settledAt): number {
  return baseIncome(garden) * (garden.boostUntil > 0 && now < garden.boostUntil ? 2 : 1)
}

export function accrue(garden: Garden, now: number, offline = false): Garden {
  const elapsed = Math.max(0, now - garden.settledAt)
  const paidTime = offline ? Math.min(elapsed, OFFLINE_LIMIT_MS) : elapsed
  const extraTime = garden.boostUntil > 0
    ? Math.max(0, Math.min(paidTime, garden.boostUntil - garden.settledAt))
    : 0
  return {
    ...garden,
    coins: Math.min(Number.MAX_VALUE, garden.coins + baseIncome(garden) * (paidTime + extraTime) / 1000),
    settledAt: now,
  }
}

export function rewardAd(garden: Garden, now: number): Garden {
  return { ...accrue(garden, now), boostUntil: now + REWARD_DURATION, freeCharges: FREE_LIMIT, freeAt: now }
}

export function skipAdTime(garden: Garden, started: number, now: number): Garden {
  const duration = Math.max(0, now - started)
  return {
    ...garden, freeAt: garden.freeAt + duration, settledAt: garden.settledAt + duration,
    boostUntil: garden.boostUntil > started ? garden.boostUntil + duration : garden.boostUntil,
  }
}

export function freeInterval(level: number): number {
  return Math.round(6000 + 14000 * 0.92 ** level)
}

export function refill(garden: Garden, now: number): Garden {
  const interval = freeInterval(garden.levels.free)
  const count = Math.floor((now - garden.freeAt) / interval)
  const freeCharges = Math.min(FREE_LIMIT, garden.freeCharges + Math.max(0, count))
  if (freeCharges === FREE_LIMIT || now < garden.freeAt) return { ...garden, freeCharges, freeAt: now }
  if (count > 0) return { ...garden, freeCharges, freeAt: garden.freeAt + count * interval }
  return garden
}

export function steamerPrice(garden: Garden): number {
  const discount = 0.6 * (1 - 0.91 ** garden.levels.saver)
  return Math.ceil(8 * 2.15 ** (Math.max(1, garden.highest) - 1) * (1 - discount))
}

export function specialLevelChances(level: number) {
  const strength = 1 - 0.96 ** level
  return { two: 0.32 * strength, three: 0.08 * strength }
}

export function steamerOffer(garden: Garden, now: number) {
  const stocked = refill(garden, now)
  const occupied = garden.board.filter(Boolean).length
  const price = steamerPrice(garden)
  const free = stocked.freeCharges > 0
  const emergency = occupied === 0 && !free && accrue(garden, now).coins < price
  return { stocked, occupied, price, free, emergency, full: occupied >= capacityLimit(garden) }
}

function discover(garden: Garden, level: number, rarity: Rarity): Garden {
  const bit = rarityBit(rarity)
  if (garden.discovered[level - 1] & bit) return garden
  const discovered = [...garden.discovered]
  discovered[level - 1] |= bit
  return { ...garden, discovered, highest: Math.max(garden.highest, level) }
}

function placeDumpling(garden: Garden, level: number, rarity: Rarity) {
  const variants = [...garden.variants]
  variants[garden.board.indexOf(0)] = rarity
  return { board: spawn(garden.board, level), variants }
}

export function spawnDumpling(garden: Garden, now: number, levelRoll: number, rarityRoll: number): Garden {
  const { stocked, price, free, emergency, full } = steamerOffer(garden, now)
  if (full) return garden
  const settled = accrue(stocked, now)
  if (!free && !emergency && settled.coins < price) return garden
  const chance = specialLevelChances(garden.levels.special)
  const level = levelRoll < chance.three ? 3 : levelRoll < chance.two + chance.three ? 2 : 1
  const rarity = rollRarity(garden.levels.special, rarityRoll)
  return discover({
    ...settled, ...placeDumpling(garden, level, rarity),
    coins: free || emergency ? settled.coins : settled.coins - price,
    freeCharges: stocked.freeCharges - Number(free),
  }, level, rarity)
}

export function hatchEgg(garden: Garden, now: number, levelRoll: number, rarityRoll: number): Garden {
  if (garden.eggActiveMs < EGG_INTERVAL || garden.board.filter(Boolean).length >= capacityLimit(garden)) return garden
  const level = levelRoll < EGG_LEVEL_TWO ? 2 : 1
  const rarity = rollRarity(garden.levels.special, rarityRoll)
  return discover({ ...accrue(garden, now), ...placeDumpling(garden, level, rarity), eggActiveMs: 0 }, level, rarity)
}

export function moveDumpling(garden: Garden, from: number, to: number, now: number) {
  const board = move(garden.board, from, to)
  if (board === garden.board) return { garden, reward: 0 }
  const settled = accrue(garden, now)
  const variants = [...garden.variants]
  const rarity = higherRarity(variants[from], variants[to])
  variants[from] = 'normal'
  variants[to] = rarity
  const reward = garden.board[to] ? 3 * 2 ** (board[to] - 1) : 0
  return {
    garden: discover({
      ...settled, board, variants, coins: Math.min(Number.MAX_VALUE, settled.coins + reward),
    }, board[to], rarity),
    reward,
  }
}

export function blockedCell(garden: Garden): number {
  if (garden.board.filter(Boolean).length < capacityLimit(garden)) return -1
  const seen = new Set<number>()
  let weakest = -1
  let income = Infinity
  for (const [index, level] of garden.board.entries()) {
    if (!level) continue
    if (level < MAX_LEVEL && seen.has(level)) return -1
    seen.add(level)
    const current = dumplingIncome(level, garden.variants[index])
    if (current < income) {
      weakest = index
      income = current
    }
  }
  return weakest
}

export function releaseBlockedDumpling(garden: Garden, now: number): Garden {
  const index = blockedCell(garden)
  if (index < 0) return garden
  const board = [...garden.board]
  const variants = [...garden.variants]
  board[index] = 0
  variants[index] = 'normal'
  return { ...accrue(garden, now), board, variants }
}

function recentSquishes(garden: Garden, now: number): number[] {
  return garden.squishedAt.filter(time => now - time < SQUISH_WINDOW)
}

export function squishReward(level: number): number {
  return 1 + 7 * (1 - 0.9 ** level)
}

export function rewardSquish(garden: Garden, index: number, heldMs: number, now: number): Garden {
  const recent = recentSquishes(garden, now)
  if (heldMs < SQUISH_HOLD || !garden.board[index] || recent.length >= SQUISH_LIMIT) return garden
  const settled = accrue(garden, now)
  const reward = squishReward(garden.levels.squish)
  return { ...settled, coins: Math.min(Number.MAX_VALUE, settled.coins + reward), squishedAt: [...recent, now] }
}

export function upgradeCost(garden: Garden, kind: Upgrade): number | undefined {
  const level = garden.levels[kind]
  if (kind === 'capacity' && level >= CAPACITY_LEVELS) return undefined
  const { base, multiplier } = upgrades[kind]
  return Math.ceil(base * multiplier ** level)
}

export function buyUpgrade(garden: Garden, kind: Upgrade, now: number): Garden {
  const cost = upgradeCost(garden, kind)
  const settled = accrue(refill(garden, now), now)
  if (cost === undefined || settled.coins < cost) return garden
  const levels = { ...garden.levels, [kind]: garden.levels[kind] + 1 }
  const freeAt = kind === 'free'
    ? now - Math.floor((now - settled.freeAt) * freeInterval(levels.free) / freeInterval(garden.levels.free))
    : settled.freeAt
  return { ...settled, coins: settled.coins - cost, levels, freeAt }
}

export function simulateHour(garden: Garden, now: number): Garden {
  const settled = accrue(garden, now)
  const future = accrue(settled, now + 3_600_000, true)
  return { ...future, settledAt: now, boostUntil: 0, freeCharges: FREE_LIMIT, freeAt: now }
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

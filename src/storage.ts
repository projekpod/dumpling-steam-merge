import { CELL_COUNT, MAX_LEVEL, isBoard } from './board'
import { areas, type Area, type AreaBoard } from './areas'
import { CAPACITY_LEVELS, EGG_INTERVAL, FREE_LIMIT, INITIAL_CAPACITY, SQUISH_LIMIT, isAreaUnlocked, newGarden, onboardingSteps, upgradeKeys, type Garden } from './economy'
import { localStore, type SaveStore } from './platform'
import { rarities, rarityBit, type Rarity } from './rarity'
import { BOARD_KEY } from './save-keys'

function isNatural(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isRarity(value: unknown): value is Rarity {
  return rarities.some(rarity => rarity === value)
}

function decodeArea(data: Record<string, unknown> | undefined): AreaBoard | undefined {
  if (!data) return
  const { board, variants, discovered, highest } = data
  if (!isBoard(board) || !Array.isArray(variants) || variants.length !== CELL_COUNT || !variants.every(isRarity) ||
    !Array.isArray(discovered) || discovered.length !== MAX_LEVEL ||
    !discovered.every((mask: unknown) => isNatural(mask) && mask < 2 ** rarities.length)) return

  const normalizedVariants = board.map((level, i) => level ? variants[i] : 'normal')
  const collection = [...discovered]
  board.forEach((level, i) => {
    if (level) collection[level - 1] |= rarityBit(normalizedVariants[i])
  })
  const record = isNatural(highest) && highest <= MAX_LEVEL ? highest : 0
  return {
    board, variants: normalizedVariants, discovered: collection,
    highest: Math.max(record, ...collection.map((mask, i) => mask ? i + 1 : 0)),
  }
}

function decodeAreas(data: Record<string, unknown>, garden: Garden): Garden | undefined {
  if (data.version !== 6 && data.version !== 7) return garden
  const area = areas.find(id => id === data.area)
  const savedAreas = data.otherAreas
  if (!area || !savedAreas || typeof savedAreas !== 'object' || Array.isArray(savedAreas) ||
    !isNatural(data.eggActiveMs) || data.eggActiveMs > EGG_INTERVAL) return

  const otherAreas: Partial<Record<Area, AreaBoard>> = {}
  let capacity = garden.levels.capacity
  for (const id of areas) {
    if (id === area || !(id in savedAreas)) continue
    const saved = decodeArea((savedAreas as Record<string, Record<string, unknown>>)[id])
    if (!saved) return
    otherAreas[id] = saved
    capacity = Math.max(capacity, saved.board.filter(Boolean).length - INITIAL_CAPACITY)
  }
  const profile = { ...garden, area, otherAreas, eggActiveMs: data.eggActiveMs, levels: { ...garden.levels, capacity } }
  if (isAreaUnlocked(profile, area)) return profile
}

export function decodeGarden(raw: string | null, now: number): Garden {
  try {
    const data = raw === null ? null : JSON.parse(raw)
    if (isBoard(data)) return { ...newGarden(now, data), onboarding: 'done' }
    if (data?.version === 1 && isBoard(data.cells)) return { ...newGarden(now, data.cells), onboarding: 'done' }
    if ([2, 3, 4, 5, 6, 7].includes(data?.version) && isBoard(data.board) &&
      Number.isFinite(data.coins) && data.coins >= 0 && isNatural(data.settledAt)) {
      const seed = newGarden(now, data.board)
      const highest = isNatural(data.highest) && data.highest <= MAX_LEVEL
        ? Math.max(seed.highest, data.highest) : seed.highest
      const onboarding = data.version === 7 ? onboardingSteps.find(step => step === data.onboarding) : undefined
      const saved = { ...seed, coins: data.coins, settledAt: data.settledAt, highest, onboarding: onboarding ?? 'done' as const }
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

      const areaBoard = decodeArea(data)
      if (areaBoard && isNatural(data.freeCharges) && data.freeCharges <= FREE_LIMIT && isNatural(data.freeAt) &&
        Array.isArray(data.squishedAt) && data.squishedAt.length <= SQUISH_LIMIT && data.squishedAt.every(isNatural) &&
        upgradeKeys.every(kind => isNatural(data.levels?.[kind])) && data.levels.capacity <= CAPACITY_LEVELS) {
        const profile = decodeAreas(data, {
          ...saved, ...areaBoard,
          freeCharges: data.freeCharges, freeAt: data.freeAt, squishedAt: data.squishedAt,
          boostUntil: isNatural(data.boostUntil) ? data.boostUntil : 0,
          levels: { ...data.levels, capacity: Math.max(seed.levels.capacity, data.levels.capacity) },
        })
        if (profile) return profile
      }
    }
  } catch {
    // Replace malformed saves with a fresh garden.
  }
  return newGarden(now)
}

export function encodeGarden(garden: Garden): string {
  return JSON.stringify({ version: 7, ...garden })
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

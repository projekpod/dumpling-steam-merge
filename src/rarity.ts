export const rarities = ['normal', 'glitter', 'rainbow', 'gold', 'pink'] as const
export type Rarity = typeof rarities[number]

const multipliers = { normal: 1, glitter: 2, rainbow: 3, gold: 5, pink: 10 }

export function rarityMultiplier(rarity: Rarity): number {
  return multipliers[rarity]
}

export function higherRarity(first: Rarity, second: Rarity): Rarity {
  return multipliers[first] >= multipliers[second] ? first : second
}

export function rarityChances(level: number): Record<Rarity, number> {
  const factor = 1 + 0.65 * (1 - 0.94 ** level)
  const glitter = 0.06 * factor
  const rainbow = 0.012 * factor
  const gold = 0.0008 * factor
  const pink = 0.000105 * factor
  return { normal: 1 - glitter - rainbow - gold - pink, glitter, rainbow, gold, pink }
}

export function rollRarity(level: number, roll: number): Rarity {
  const chances = rarityChances(level)
  for (const rarity of ['pink', 'gold', 'rainbow', 'glitter'] as const) {
    if (roll < chances[rarity]) return rarity
    roll -= chances[rarity]
  }
  return 'normal'
}

export function rarityBit(rarity: Rarity): number {
  return 1 << rarities.indexOf(rarity)
}

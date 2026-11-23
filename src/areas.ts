import { MAX_LEVEL, emptyBoard, type Board } from './board'
import type { Rarity } from './rarity'

export const areas = ['kebun', 'pantai', 'salju'] as const
export type Area = typeof areas[number]

export const unlocks = {
  kebun: undefined,
  pantai: { area: 'kebun', level: 8 },
  salju: { area: 'pantai', level: 9 },
} as const

export interface AreaBoard {
  board: Board
  variants: readonly Rarity[]
  discovered: readonly number[]
  highest: number
}

export function newAreaBoard(board = emptyBoard()): AreaBoard {
  const highest = Math.max(...board)
  return {
    board,
    variants: board.map(() => 'normal'),
    discovered: Array.from({ length: MAX_LEVEL }, (_, index) => Number(index < highest)),
    highest,
  }
}

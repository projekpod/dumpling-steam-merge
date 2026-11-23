export const COLUMNS = 5
export const ROWS = 6
export const MAX_LEVEL = 12
export const CELL_COUNT = COLUMNS * ROWS

export type Board = readonly number[]
export const emptyBoard = (): Board => Array<number>(CELL_COUNT).fill(0)

export function spawn(board: Board): Board {
  const index = board.indexOf(0)
  if (index < 0) return board
  const next = [...board]
  next[index] = 1
  return next
}

export function move(board: Board, from: number, to: number): Board {
  const level = board[from]
  const target = board[to]
  if (!level || target === undefined || from === to) return board
  if (target !== 0 && (target !== level || level === MAX_LEVEL)) return board
  const next = [...board]
  next[from] = 0
  next[to] = target === 0 ? level : level + 1
  return next
}

export function encodeBoard(board: Board): string {
  return JSON.stringify({ version: 1, cells: board })
}

export function decodeBoard(raw: string | null): Board {
  if (raw === null) return emptyBoard()
  try {
    const data = JSON.parse(raw)
    // Accept an unversioned cell array as schema 0.
    const cells = Array.isArray(data) ? data : data?.version === 1 ? data.cells : null
    if (Array.isArray(cells) && cells.length === CELL_COUNT &&
      cells.every(level => Number.isInteger(level) && level >= 0 && level <= MAX_LEVEL)) {
      return cells
    }
  } catch {
    // Corrupt saves fall back to an empty board.
  }
  return emptyBoard()
}

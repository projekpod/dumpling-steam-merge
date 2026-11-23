import { decodeBoard, emptyBoard, encodeBoard, type Board } from './board'

const key = 'kebun-mochi:board'

export function loadBoard(): { board: Board; error: boolean } {
  try {
    return { board: decodeBoard(localStorage.getItem(key)), error: false }
  } catch {
    return { board: emptyBoard(), error: true }
  }
}

export function saveBoard(board: Board): boolean {
  try {
    localStorage.setItem(key, encodeBoard(board))
    return true
  } catch {
    return false
  }
}

import { describe, expect, it } from 'vitest'
import { CELL_COUNT, MAX_LEVEL, emptyBoard, move, spawn } from '../src/board'

describe('papan Kebun', () => {
  it('mengisi petak kosong pertama tanpa mengubah papan sebelumnya', () => {
    const board = emptyBoard()
    expect(spawn(board).slice(0, 3)).toEqual([1, 0, 0])
    expect(board).toEqual(emptyBoard())
    const full = Array(CELL_COUNT).fill(1)
    expect(spawn(full)).toBe(full)
  })

  it('memindahkan mochi ke petak kosong dan mengabaikan tujuan di luar papan', () => {
    const board = spawn(emptyBoard())
    expect(move(board, 0, 8)[8]).toBe(1)
    expect(move(board, 0, -1)).toBe(board)
    expect(move(board, 1, 8)).toBe(board)
  })

  it('menggabungkan semua pasangan selevel hingga level 12', () => {
    for (let level = 1; level < MAX_LEVEL; level++) {
      const board = [level, level, ...emptyBoard().slice(2)]
      expect(move(board, 0, 1).slice(0, 2)).toEqual([0, level + 1])
    }
  })

  it('menolak level berbeda dan pasangan level 12', () => {
    const board = [12, 12, 1, ...emptyBoard().slice(3)]
    expect(move(board, 0, 1)).toBe(board)
    expect(move(board, 0, 2)).toBe(board)
    expect(move(board, 0, 0)).toBe(board)
  })
})

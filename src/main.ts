import Phaser from 'phaser'
import { CELL_COUNT, COLUMNS, MAX_LEVEL, ROWS, move, spawn, type Board } from './board'
import { makeMochi } from './art'
import { loadBoard, saveBoard } from './storage'
import { text } from './strings'
import './style.css'

document.title = text.title
document.querySelector('#app')!.innerHTML = `
  <section class="game">
    <header class="top">
      <span class="brand"><i class="sprout" aria-hidden="true"></i>${text.title}</span>
      <span class="area"><span aria-hidden="true"></span>${text.area}</span>
    </header>
    <section class="intro">
      <h1>${text.headline}</h1>
      <p>${text.instruction}</p>
    </section>
    <section class="board" aria-label="${text.board}">
      <div class="board-header">
        <span>${text.capacity}</span>
        <output id="capacity"></output>
      </div>
      <div id="field">
        <div class="cells" aria-hidden="true">${'<i></i>'.repeat(CELL_COUNT)}</div>
      </div>
    </section>
    <button id="spawn" type="button" disabled>
      <span class="jar" aria-hidden="true"><i></i></span>
      <span><strong>${text.spawn}</strong><small>${text.spawnHint}</small></span>
    </button>
    <p id="status" role="status"></p>
  </section>
`

const initial = loadBoard()
let board = initial.board
let storageError = initial.error
const width = 330
const height = 360
const cellWidth = width / COLUMNS
const cellHeight = height / ROWS
const field = document.querySelector<HTMLElement>('#field')!
const capacity = document.querySelector<HTMLOutputElement>('#capacity')!
const status = document.querySelector<HTMLElement>('#status')!
const button = document.querySelector<HTMLButtonElement>('#spawn')!

async function start() {
  await document.fonts.load('900 12px Nunito')

  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: field,
    width,
    height,
    transparent: true,
    input: { mouse: false, touch: false, keyboard: false, gamepad: false },
    scene: { create },
  })
}

function create(this: Phaser.Scene) {
  for (let level = 1; level <= MAX_LEVEL; level++) {
    this.textures.addCanvas(String(level), makeMochi(level))
  }
  const sprites = Array.from({ length: CELL_COUNT }, (_, index) =>
    this.add.image((index % COLUMNS + 0.5) * cellWidth,
      (Math.floor(index / COLUMNS) + 0.5) * cellHeight, '1').setScale(0.5),
  )
  const dragged = this.add.image(0, 0, '1').setScale(0.52).setVisible(false)
  const canvas = this.game.canvas
  let drag: { index: number; pointer: number } | undefined

  function render(message = '') {
    board.forEach((level, index) => {
      const sprite = sprites[index]
      sprite.setVisible(level > 0 && drag?.index !== index)
      if (level) sprite.setTexture(String(level))
    })
    const occupied = board.filter(Boolean).length
    capacity.value = `${occupied} / ${CELL_COUNT}`
    button.disabled = occupied === CELL_COUNT
    status.textContent = storageError ? text.saveError : occupied === CELL_COUNT ? text.full : message
  }

  function commit(next: Board, message = '') {
    if (next === board) return
    board = next
    storageError = !saveBoard(board)
    render(message)
  }

  function point(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * width / rect.width,
      y: (event.clientY - rect.top) * height / rect.height,
    }
  }

  function cell({ x, y }: ReturnType<typeof point>) {
    if (x < 0 || y < 0 || x >= width || y >= height) return -1
    return Math.floor(y / cellHeight) * COLUMNS + Math.floor(x / cellWidth)
  }

  function clearDrag() {
    drag = undefined
    dragged.setVisible(false)
  }

  canvas.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0) return
    const position = point(event)
    const index = cell(position)
    const level = board[index]
    if (!level) return
    canvas.setPointerCapture(event.pointerId)
    drag = { index, pointer: event.pointerId }
    sprites[index].setVisible(false)
    dragged.setTexture(String(level)).setPosition(position.x, position.y).setVisible(true)
  })
  canvas.addEventListener('pointermove', event => {
    if (drag?.pointer !== event.pointerId) return
    const { x, y } = point(event)
    dragged.setPosition(x, y)
  })
  canvas.addEventListener('pointerup', event => {
    if (drag?.pointer !== event.pointerId) return
    const from = drag.index
    const to = cell(point(event))
    clearDrag()
    sprites[from].setVisible(true)
    const next = move(board, from, to)
    commit(next, board[to] && next !== board ? `${text.merge(next[to])} ${text.names[next[to] - 1]}` : '')
  })
  function cancel(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId) return
    sprites[drag.index].setVisible(true)
    clearDrag()
  }
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  button.addEventListener('click', () => commit(spawn(board)))

  function persist() {
    storageError = !saveBoard(board)
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return
    if (drag) sprites[drag.index].setVisible(true)
    clearDrag()
    persist()
  })
  window.addEventListener('pagehide', persist)
  render()
}

void start()

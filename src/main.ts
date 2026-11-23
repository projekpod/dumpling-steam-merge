import Phaser from 'phaser'
import { CELL_COUNT, COLUMNS, MAX_LEVEL, ROWS, move } from './board'
import { makeMochi } from './art'
import {
  accrue, buyUpgrade, capacityLimit, coinsPerSecond, cooldownRemaining, formatNumber,
  spawnMochi, upgradeCost, upgradeKeys, type Garden,
} from './economy'
import { loadGarden, saveGarden } from './storage'
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
    <div class="wallet">
      <strong><i aria-hidden="true"></i><span id="coins"></span></strong>
      <span id="rate"></span>
    </div>
    <p id="offline" class="offline" role="status" hidden></p>
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
      <span><strong>${text.spawn}</strong><small id="spawn-hint">${text.spawnHint}</small></span>
    </button>
    <p id="status" role="status"></p>
    <details class="upgrades">
      <summary>${text.upgrades}</summary>
      ${upgradeKeys.map(kind => `
        <button type="button" id="upgrade-${kind}" class="upgrade" disabled>
          <span><strong>${text.upgrade[kind].name}</strong><small>${text.upgrade[kind].hint}</small></span>
          <span data-cost></span>
        </button>
      `).join('')}
    </details>
  </section>
`

const width = 330
const height = 360
const cellWidth = width / COLUMNS
const cellHeight = height / ROWS
const field = document.querySelector<HTMLElement>('#field')!
const capacity = document.querySelector<HTMLOutputElement>('#capacity')!
const status = document.querySelector<HTMLElement>('#status')!
const button = document.querySelector<HTMLButtonElement>('#spawn')!
const hint = document.querySelector('#spawn-hint')!
const coins = document.querySelector('#coins')!
const rate = document.querySelector('#rate')!
const offline = document.querySelector<HTMLElement>('#offline')!
const shop = upgradeKeys.map(kind => {
  const button = document.querySelector<HTMLButtonElement>(`#upgrade-${kind}`)!
  return { kind, button, price: button.querySelector('[data-cost]')! }
})

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
  const loadedAt = Date.now()
  const initial = loadGarden(loadedAt)
  let garden = initial.garden
  let storageError = initial.error
  let timer: number | undefined
  let active = false
  let drag: { index: number; pointer: number } | undefined

  function render(message = '') {
    garden.board.forEach((level, index) => {
      const sprite = sprites[index]
      sprite.setVisible(level > 0 && drag?.index !== index)
      if (level) sprite.setTexture(String(level))
    })
    const occupied = garden.board.filter(Boolean).length
    capacity.value = `${occupied} / ${capacityLimit(garden)}`
    status.textContent = storageError ? text.saveError
      : occupied >= capacityLimit(garden) ? text.full : message
    updateEconomy()
  }

  function updateEconomy() {
    const now = Date.now()
    const income = coinsPerSecond(garden)
    const balance = garden.coins + income * Math.max(0, now - garden.settledAt) / 1000
    const remaining = cooldownRemaining(garden, now)
    coins.textContent = text.coinAmount(formatNumber(Math.floor(balance)))
    rate.textContent = text.coinRate(formatNumber(income))
    button.disabled = remaining > 0 || garden.board.filter(Boolean).length >= capacityLimit(garden)
    hint.textContent = remaining ? text.cooldown(Math.ceil(remaining / 100) / 10) : text.spawnHint
    for (const item of shop) {
      const cost = upgradeCost(garden, item.kind)
      item.price.textContent = cost === undefined ? text.maxUpgrade : text.coinAmount(formatNumber(cost))
      item.button.disabled = cost === undefined || balance < cost
    }
  }

  function commit(next: Garden, message = '') {
    if (next === garden) return
    garden = next
    storageError = !saveGarden(garden)
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
    const level = garden.board[index]
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
    const board = garden.board
    const next = move(board, from, to)
    if (next === board) return
    const message = board[to] ? `${text.merge(next[to])} ${text.names[next[to] - 1]}` : ''
    commit({ ...accrue(garden, Date.now()), board: next }, message)
  })
  function cancel(event: PointerEvent) {
    if (drag?.pointer !== event.pointerId) return
    sprites[drag.index].setVisible(true)
    clearDrag()
  }
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  button.addEventListener('click', () => commit(spawnMochi(garden, Date.now())))
  for (const { kind, button } of shop) {
    button.addEventListener('click', () => {
      commit(buyUpgrade(garden, kind, Date.now()), text.upgradeBought)
    })
  }

  function pause() {
    if (!active) return
    active = false
    window.clearInterval(timer)
    if (drag) sprites[drag.index].setVisible(true)
    clearDrag()
    garden = accrue(garden, Date.now())
    storageError = !saveGarden(garden)
  }

  function resume(now = Date.now()) {
    if (active || document.hidden) return
    active = true
    const settled = accrue(garden, now, true)
    const earned = settled.coins - garden.coins
    offline.hidden = earned < 0.05
    if (!offline.hidden) {
      offline.textContent = text.offlineReward(formatNumber(earned))
    }
    commit(settled)
    timer = window.setInterval(updateEconomy, 100)
  }

  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume())
  window.addEventListener('pagehide', pause)
  window.addEventListener('pageshow', () => resume())
  if (document.hidden) render()
  else resume(loadedAt)
}

void start()

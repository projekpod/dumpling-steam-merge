import Phaser from 'phaser'
import { CELL_COUNT, COLUMNS } from './board'
import { GardenAudio } from './audio'
import { CELL_WIDTH, CELL_HEIGHT, WIDTH, HEIGHT, MochiMotion } from './mochi-motion'
import {
  accrue, buyUpgrade, capacityLimit, coinsPerSecond, cooldownRemaining, formatNumber,
  moveMochi, simulateHour, spawnMochi, upgradeCost, upgradeKeys, type Garden,
} from './economy'
import { loadGarden, saveGarden } from './storage'
import { text } from './strings'
import './style.css'

const debug = new URLSearchParams(location.search).get('debug') === '1'
const audio = new GardenAudio()

document.title = text.title
document.querySelector('#app')!.innerHTML = `
  <section class="game">
    <header class="top">
      <span class="brand"><i class="sprout" aria-hidden="true"></i>${text.title}</span>
      <div class="top-actions">
        <span class="area"><span aria-hidden="true"></span>${text.area}</span>
        <button id="mute" type="button" aria-label="${text.mute}"></button>
      </div>
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
    <aside id="discovery" role="status" hidden>
      <strong>${text.discovery}</strong>
      <span id="discovery-name"></span>
      <small id="discovery-description"></small>
    </aside>
    <p id="status" role="status"></p>
    <details class="upgrades">
      <summary>${text.upgrades}</summary>
      ${upgradeKeys.map(kind => `
        <button type="button" id="upgrade-${kind}" class="upgrade" disabled>
          <span><strong>${text.upgrade[kind].name}</strong><small>${text.upgrade[kind].hint}</small></span>
          <span class="upgrade-cost"><small data-level></small><strong data-cost></strong></span>
        </button>
      `).join('')}
    </details>
    ${debug ? `<div class="debug">
      <button type="button" id="debug-hour">${text.debugHour}</button>
      <button type="button" id="debug-coins">${text.debugCoins}</button>
    </div>` : ''}
  </section>
`

const field = document.querySelector<HTMLElement>('#field')!
const capacity = document.querySelector<HTMLOutputElement>('#capacity')!
const status = document.querySelector<HTMLElement>('#status')!
const button = document.querySelector<HTMLButtonElement>('#spawn')!
const hint = document.querySelector('#spawn-hint')!
const coins = document.querySelector('#coins')!
const rate = document.querySelector('#rate')!
const offline = document.querySelector<HTMLElement>('#offline')!
const discovery = document.querySelector<HTMLElement>('#discovery')!
const discoveryName = document.querySelector('#discovery-name')!
const discoveryDescription = document.querySelector('#discovery-description')!
const mute = document.querySelector<HTMLButtonElement>('#mute')!

function renderMute() {
  mute.textContent = audio.muted ? text.mutedIcon : text.soundIcon
  mute.setAttribute('aria-pressed', String(audio.muted))
}
mute.addEventListener('click', () => {
  audio.toggle()
  renderMute()
})
renderMute()

const shop = upgradeKeys.map(kind => {
  const button = document.querySelector<HTMLButtonElement>(`#upgrade-${kind}`)!
  return { kind, button, price: button.querySelector('[data-cost]')!, level: button.querySelector('[data-level]')! }
})

async function start() {
  await document.fonts.load('900 12px Nunito')

  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: field,
    width: WIDTH,
    height: HEIGHT,
    transparent: true,
    input: { mouse: false, touch: false, keyboard: false, gamepad: false },
    scene: { create },
  })
}

function create(this: Phaser.Scene) {
  const motion = new MochiMotion(this)
  const { canvas, loop } = this.game
  const loadedAt = Date.now()
  const initial = loadGarden(loadedAt)
  let garden = initial.garden
  let storageError = initial.error
  let timer: number | undefined
  let active = false
  let discoveryUntil = 0
  let offlineChime = false
  let lastMerge = -Infinity
  let combo = 0
  let drag: { index: number; pointer: number; x: number; y: number; moved: boolean } | undefined

  function render(message = '') {
    motion.setBoard(garden.board)
    const occupied = garden.board.filter(Boolean).length
    capacity.value = `${occupied} / ${capacityLimit(garden)}`
    status.textContent = storageError ? text.saveError
      : occupied >= capacityLimit(garden) ? text.full : message
    updateEconomy()
  }

  function updateEconomy() {
    const now = Date.now()
    if (!discovery.hidden && now >= discoveryUntil) discovery.hidden = true
    const income = coinsPerSecond(garden)
    const balance = garden.coins + income * Math.max(0, now - garden.settledAt) / 1000
    const remaining = cooldownRemaining(garden, now)
    coins.textContent = text.coinAmount(formatNumber(Math.floor(balance)))
    rate.textContent = text.coinRate(formatNumber(income))
    button.disabled = remaining > 0 || garden.board.filter(Boolean).length >= capacityLimit(garden)
    hint.textContent = remaining ? text.cooldown(Math.ceil(remaining / 100) / 10) : text.spawnHint
    for (const item of shop) {
      const cost = upgradeCost(garden, item.kind)
      item.level.textContent = text.upgradeLevel(garden.levels[item.kind])
      item.price.textContent = cost === undefined ? text.maxUpgrade : text.coinAmount(formatNumber(cost))
      item.button.disabled = cost === undefined || balance < cost
    }
  }

  function commit(next: Garden, message = '') {
    if (next === garden) return
    if (next.highest > garden.highest) {
      discoveryName.textContent = text.names[next.highest - 1]
      discoveryDescription.textContent = text.descriptions[next.highest - 1]
      discoveryUntil = Date.now() + 3200
      discovery.hidden = false
    }
    garden = next
    storageError = !saveGarden(garden)
    render(message)
  }

  function point(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: (event.clientX - rect.left) * WIDTH / rect.width,
      y: (event.clientY - rect.top) * HEIGHT / rect.height,
    }
  }

  function cell({ x, y }: ReturnType<typeof point>) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return -1
    return Math.floor(y / CELL_HEIGHT) * COLUMNS + Math.floor(x / CELL_WIDTH)
  }

  function clearDrag() {
    drag = undefined
    motion.release()
  }

  document.addEventListener('pointerdown', event => {
    motion.touch()
    if (!offlineChime || event.target === mute) return
    offlineChime = false
    audio.play('cling')
  })
  canvas.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0) return
    const { x, y } = point(event)
    const index = cell({ x, y })
    if (!garden.board[index]) return
    canvas.setPointerCapture(event.pointerId)
    drag = { index, pointer: event.pointerId, x, y, moved: false }
  })
  canvas.addEventListener('pointermove', event => {
    if (drag?.pointer !== event.pointerId) return
    const { x, y } = point(event)
    motion.touch()
    const dx = x - drag.x
    const dy = y - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 5) return
    drag.moved = true
    motion.drag(drag.index, x, y, dx, dy)
  })
  canvas.addEventListener('pointerup', event => {
    if (drag?.pointer !== event.pointerId) return
    motion.touch()
    const { index: from, moved } = drag
    const to = cell(point(event))
    clearDrag()
    if (!moved && to === from) {
      motion.react(from)
      return
    }
    const now = Date.now()
    const level = garden.board[from]
    const result = moveMochi(garden, from, to, now)
    if (result.garden === garden) return
    if (!result.reward) {
      commit(result.garden)
      return
    }
    combo = now - lastMerge <= 2000 ? combo + 1 : 1
    lastMerge = now
    const combinedLevel = result.garden.board[to]
    const name = text.names[combinedLevel - 1]
    commit(result.garden, `${text.merge(combinedLevel)} ${name}${combo > 1 ? ` · ${text.combo(combo)}` : ''}`)
    motion.merge(from, to, level, text.coinGain(formatNumber(result.reward)), combo)
    audio.play('pop')
  })

  function cancel(event: PointerEvent) {
    if (drag?.pointer === event.pointerId) clearDrag()
  }
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  button.addEventListener('click', () => {
    const next = spawnMochi(garden, Date.now(), Math.random())
    if (next === garden) return
    commit(next)
    audio.play('plop')
  })
  for (const { kind, button } of shop) {
    button.addEventListener('click', () => {
      const next = buyUpgrade(garden, kind, Date.now())
      if (next === garden) return
      commit(next, text.upgradeBought)
      audio.play('cling')
    })
  }

  if (debug) {
    document.querySelector('#debug-hour')!.addEventListener('click', () => {
      const now = Date.now()
      const next = simulateHour(garden, now)
      const gained = next.coins - accrue(garden, now).coins
      commit(next, text.offlineReward(formatNumber(gained)))
      audio.play('cling')
    })
    document.querySelector('#debug-coins')!.addEventListener('click', () => {
      const next = accrue(garden, Date.now())
      commit({ ...next, coins: Math.min(Number.MAX_VALUE, next.coins * 10) })
      audio.play('cling')
    })
  }

  function pause() {
    if (!active) return
    active = false
    window.clearInterval(timer)
    clearDrag()
    lastMerge = -Infinity
    loop.sleep()
    audio.pause()
    garden = accrue(garden, Date.now())
    storageError = !saveGarden(garden)
  }

  function resume(now = Date.now()) {
    if (active || document.hidden) return
    active = true
    motion.resetFpsSample()
    loop.wake(true)
    const settled = accrue(garden, now, true)
    const earned = settled.coins - garden.coins
    offlineChime = earned >= 0.05
    offline.hidden = !offlineChime
    if (!offline.hidden) {
      offline.textContent = text.offlineReward(formatNumber(earned))
    }
    commit(settled)
    timer = window.setInterval(updateEconomy, 100)
  }

  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume())
  window.addEventListener('pagehide', pause)
  window.addEventListener('pageshow', () => resume())
  if (document.hidden) {
    render()
    loop.sleep()
  } else resume(loadedAt)
}

void start()

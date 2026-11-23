import Phaser from 'phaser'
import { CELL_COUNT, COLUMNS } from './board'
import { GardenAudio } from './audio'
import { CELL_WIDTH, CELL_HEIGHT, WIDTH, HEIGHT, MochiMotion } from './mochi-motion'
import {
  accrue, blockedCell, buyUpgrade, capacityLimit, coinsPerSecond, formatNumber,
  freeInterval, moveMochi, refill, releaseBlockedMochi, rewardSquish, simulateHour, spawnMochi,
  specialLevelChances, steamerOffer, upgradeCost, upgradeKeys, type Garden,
} from './economy'
import { loadGarden, saveGarden } from './storage'
import { rarities, rarityBit, rarityChances, rarityMultiplier } from './rarity'
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
      <span class="steamer" aria-hidden="true"><i class="steam"></i><i class="puff"></i><i class="lid"></i></span>
      <span class="spawn-label"><strong>${text.spawn}</strong><small id="spawn-hint"></small></span>
      <span id="spawn-price"></span>
    </button>
    <p id="offline" class="offline" role="status" hidden></p>
    <aside id="discovery" role="status" hidden>
      <strong>${text.discovery}</strong>
      <span id="discovery-name"></span>
      <small id="discovery-description"></small>
    </aside>
    <p id="status" role="status"></p>
    <button class="release" id="release" type="button" hidden>${text.release}</button>
    <details class="upgrades">
      <summary>${text.upgrades}</summary>
      ${upgradeKeys.map(kind => `
        <button type="button" id="upgrade-${kind}" class="upgrade" disabled>
          <span><strong>${text.upgrade[kind].name}</strong><small>${text.upgrade[kind].hint}</small></span>
          <span class="upgrade-cost"><small data-level></small><strong data-cost></strong></span>
        </button>
      `).join('')}
    </details>
    <details class="upgrades">
      <summary>${text.odds}</summary>
      <p class="odds-hint">${text.oddsHint}</p>
      <dl class="odds">
        ${rarities.map(rarity => `<div><dt><i class="rarity-dot ${rarity}" aria-hidden="true"></i>${text.rarity[rarity]} · ×${rarityMultiplier(rarity)}</dt><dd id="odds-${rarity}"></dd></div>`).join('')}
      </dl>
      <p class="odds-hint" id="special-chance"></p>
    </details>
    <details class="upgrades">
      <summary>${text.dex}</summary>
      <ol class="dex" id="dex"></ol>
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
const priceLabel = document.querySelector('#spawn-price')!
const releaseButton = document.querySelector<HTMLButtonElement>('#release')!
const dex = document.querySelector('#dex')!
const odds = rarities.map(rarity => ({ rarity, label: document.querySelector(`#odds-${rarity}`)! }))
const specialChance = document.querySelector('#special-chance')!
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
  const app = document.querySelector('#app')!
  const motion = new MochiMotion(this, enabled => app.classList.toggle('economy-mode', enabled))
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
  let revealUntil = 0
  let displayedDex: Garden['discovered'] | undefined
  let displayedSpecial = -1
  let drag: { index: number; pointer: number; x: number; y: number; clientX: number; clientY: number; started: number; moved: boolean } | undefined

  function render(message = '') {
    motion.setBoard(garden.board, garden.variants)
    const occupied = garden.board.filter(Boolean).length
    capacity.value = `${occupied} / ${capacityLimit(garden)}`
    const blocked = blockedCell(garden) !== -1
    releaseButton.hidden = !blocked
    status.textContent = storageError ? text.saveError : blocked ? text.blocked
      : message || (occupied >= capacityLimit(garden) ? text.full : '')
    if (displayedDex !== garden.discovered) {
      displayedDex = garden.discovered
      dex.innerHTML = garden.discovered.map((mask, i) => {
        const level = i + 1
        const name = mask ? text.names[i] : text.unknown
        const badges = rarities.filter(rarity => mask & rarityBit(rarity))
          .map(rarity => `<span class="badge"><i class="rarity-dot ${rarity}" aria-hidden="true"></i>${text.rarity[rarity]}</span>`).join('')
        return `<li><strong>${text.upgradeLevel(level)} · ${name}</strong>${mask
          ? `<small>${text.descriptions[i]}</small><div class="badges">${badges}</div>` : ''}</li>`
      }).join('')
    }
    if (displayedSpecial !== garden.levels.special) {
      displayedSpecial = garden.levels.special
      const chances = rarityChances(displayedSpecial)
      for (const { rarity, label } of odds) label.textContent = text.probability(chances[rarity])
      const levels = specialLevelChances(displayedSpecial)
      specialChance.textContent = text.specialChance(text.probability(levels.two), text.probability(levels.three))
    }
    updateEconomy()
  }

  function updateEconomy() {
    const now = Date.now()
    if (!discovery.hidden && now >= discoveryUntil) discovery.hidden = true
    const income = coinsPerSecond(garden)
    const balance = garden.coins + income * Math.max(0, now - garden.settledAt) / 1000
    const { stocked, price, free, emergency, full } = steamerOffer(garden, now)
    const opening = now < revealUntil
    const nextFree = Math.ceil((stocked.freeAt + freeInterval(garden.levels.free) - now) / 1000)
    coins.textContent = text.coinAmount(formatNumber(Math.floor(balance)))
    rate.textContent = text.coinRate(formatNumber(income))
    button.classList.toggle('opening', opening)
    button.disabled = opening || full || (!free && !emergency && balance < price)
    priceLabel.textContent = text.coinAmount(formatNumber(price))
    hint.textContent = full ? text.fullSteamer : opening ? text.opening : emergency ? text.emergency
      : free ? text.readyFree(stocked.freeCharges) : text.refill(nextFree)
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
    motion.endPress()
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
    drag = {
      index, pointer: event.pointerId, x, y,
      clientX: event.clientX, clientY: event.clientY, started: Date.now(), moved: false,
    }
    motion.press(index)
  })
  canvas.addEventListener('pointermove', event => {
    if (drag?.pointer !== event.pointerId) return
    const { x, y } = point(event)
    motion.touch()
    const dx = x - drag.x
    const dy = y - drag.y
    if (!drag.moved && Math.hypot(event.clientX - drag.clientX, event.clientY - drag.clientY) <= 10) return
    if (!drag.moved) motion.endPress()
    drag.moved = true
    motion.drag(drag.index, x, y, dx, dy)
  })
  canvas.addEventListener('pointerup', event => {
    if (drag?.pointer !== event.pointerId) return
    motion.touch()
    const { index: from, moved, started, clientX, clientY } = drag
    const to = cell(point(event))
    const travelled = Math.hypot(event.clientX - clientX, event.clientY - clientY)
    const now = Date.now()
    clearDrag()
    if (!moved && travelled <= 10) {
      const held = now - started
      if (held >= 145) {
        const next = rewardSquish(garden, from, held, now)
        if (next !== garden) commit(next, text.coinGain(formatNumber(next.coins - accrue(garden, now).coins)))
        audio.play('squish')
      } else {
        motion.react(from)
      }
      return
    }
    const level = garden.board[from]
    const originals = [garden.variants[from], garden.variants[to]] as const
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
    motion.merge(from, to, level, originals, text.coinGain(formatNumber(result.reward)), combo)
    audio.play('pop')
  })

  function cancel(event: PointerEvent) {
    if (drag?.pointer === event.pointerId) clearDrag()
  }
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  button.addEventListener('click', () => {
    const now = Date.now()
    if (now < revealUntil) return
    const index = garden.board.indexOf(0)
    const next = spawnMochi(garden, now, Math.random(), Math.random())
    if (next === garden) return
    const rarity = next.variants[index]
    const name = text.names[next.board[index] - 1]
    revealUntil = now + 420
    commit(next, rarity === 'normal' ? '' : text.rareFound(name, text.rarity[rarity]))
    motion.reveal(index)
    audio.play(rarity === 'normal' ? 'plop' : 'shimmer')
  })

  releaseButton.addEventListener('click', () => {
    const index = blockedCell(garden)
    if (index < 0) return
    const name = text.names[garden.board[index] - 1]
    if (window.confirm(text.releasePrompt(name, text.rarity[garden.variants[index]]))) {
      commit(releaseBlockedMochi(garden, Date.now()), text.released)
    }
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
    app.classList.add('paused')
    window.clearInterval(timer)
    clearDrag()
    lastMerge = -Infinity
    loop.sleep()
    audio.pause()
    const now = Date.now()
    garden = accrue(refill(garden, now), now)
    storageError = !saveGarden(garden)
  }

  function resume(now = Date.now()) {
    if (active || document.hidden) return
    active = true
    app.classList.remove('paused')
    motion.resetFpsSample()
    loop.wake(true)
    const settled = accrue(refill(garden, now), now, true)
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
    app.classList.add('paused')
    render()
    loop.sleep()
  } else resume(loadedAt)
}

void start()

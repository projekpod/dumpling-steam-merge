import Phaser from 'phaser'
import { COLUMNS } from './board'
import { AdPacing } from './ad-pacing'
import { GardenAudio } from './audio'
import { CELL_WIDTH, CELL_HEIGHT, WIDTH, HEIGHT, MochiMotion } from './mochi-motion'
import {
  accrue, blockedCell, buyUpgrade, capacityLimit, coinsPerSecond, formatNumber,
  freeInterval, moveMochi, refill, releaseBlockedMochi, rewardAd, rewardSquish, simulateHour, skipAdTime, spawnMochi,
  specialLevelChances, steamerOffer, upgradeCost, upgradeKeys, type Garden,
} from './economy'
import { openPlatform, type AdKind, type GamePlatform } from './platform'
import { loadGarden, saveGarden } from './storage'
import { rarities, rarityBit, rarityChances } from './rarity'
import { loadLanguage, text, toggleLanguage } from './strings'
import { mount, translateView } from './view'
import './style.css'

const debug = new URLSearchParams(location.search).get('debug') === '1'
async function start() {
  const font = document.fonts.load('900 12px Nunito').catch(() => [])
  const platform = await openPlatform()
  platform.loadingStart()
  loadLanguage(platform.storage, navigator.language)
  mount(platform.adsAvailable, debug)
  translateView()
  await font

  new Phaser.Game({
    type: Phaser.CANVAS,
    parent: document.querySelector<HTMLElement>('#field')!,
    width: WIDTH,
    height: HEIGHT,
    transparent: true,
    audio: { noAudio: true },
    input: { mouse: false, touch: false, keyboard: false, gamepad: false },
    scene: { create(this: Phaser.Scene) { create.call(this, platform) } },
  })
}

function create(this: Phaser.Scene, platform: GamePlatform) {
  const { storage } = platform
  const audio = new GardenAudio(storage)
  const capacity = document.querySelector<HTMLOutputElement>('#capacity')!
  const status = document.querySelector<HTMLElement>('#status')!
  const button = document.querySelector<HTMLButtonElement>('#spawn')!
  const hint = document.querySelector('#spawn-hint')!
  const priceLabel = document.querySelector('#spawn-price')!
  const releaseDialog = document.querySelector<HTMLDialogElement>('#release-dialog')!
  const releasePrompt = document.querySelector('#release-prompt')!
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
    mute.disabled = audio.locked
  }
  mute.addEventListener('click', () => {
    audio.toggle()
    renderMute()
  })
  renderMute()
  platform.onMute(muted => {
    audio.setPortalMuted(muted)
    renderMute()
  })

  const shop = upgradeKeys.map(kind => {
    const button = document.querySelector<HTMLButtonElement>(`#upgrade-${kind}`)!
    return { kind, button, price: button.querySelector('[data-cost]')!, level: button.querySelector('[data-level]')! }
  })

  const app = document.querySelector('#app')!
  const motion = new MochiMotion(this, enabled => app.classList.toggle('economy-mode', enabled))
  const game = document.querySelector<HTMLElement>('.game')!
  const panels = [...game.querySelectorAll<HTMLDetailsElement>('details')]
  const reward = document.querySelector<HTMLButtonElement>('#reward')
  const boost = document.querySelector<HTMLElement>('#boost')
  const adState = document.querySelector<HTMLElement>('#ad-state')!
  const pacing = platform.adsAvailable ? new AdPacing(storage) : undefined
  const { canvas, loop } = this.game
  const loadedAt = Date.now()
  const initial = loadGarden(loadedAt, storage)
  let garden = initial.garden
  let storageError = initial.error
  let timer: number | undefined
  let active = false
  let adBusy = false
  let gameplayReported = false
  let statusMessage = () => ''
  let offlineEarned = 0
  let discoveredLevel = 0
  let discoveryUntil = 0
  let offlineChime = false
  let lastMerge = -Infinity
  let combo = 0
  let revealUntil = 0
  let displayedDex: Garden['discovered'] | undefined
  let displayedSpecial = -1
  let drag: { index: number; pointer: number; x: number; y: number; clientX: number; clientY: number; started: number; moved: boolean } | undefined

  function reportGameplay() {
    const playing = active && !adBusy && !releaseDialog.open && !panels.some(panel => panel.open)
    if (gameplayReported === playing) return
    gameplayReported = playing
    if (playing) platform.gameplayStart()
    else platform.gameplayStop()
  }

  function render() {
    motion.setBoard(garden.board, garden.variants)
    const occupied = garden.board.filter(Boolean).length
    capacity.value = `${occupied} / ${capacityLimit(garden)}`
    const blocked = blockedCell(garden) !== -1
    releaseButton.hidden = !blocked
    status.textContent = storageError ? text.saveError : blocked ? text.blocked
      : statusMessage() || (occupied >= capacityLimit(garden) ? text.full : '')
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
    if (!offline.hidden) offline.textContent = text.offlineReward(formatNumber(offlineEarned))
    if (!discovery.hidden) {
      discoveryName.textContent = text.names[discoveredLevel - 1]
      discoveryDescription.textContent = text.descriptions[discoveredLevel - 1]
    }
    updateEconomy()
  }

  function updateEconomy() {
    const now = Date.now()
    if (!discovery.hidden && now >= discoveryUntil) discovery.hidden = true
    const income = coinsPerSecond(garden, now)
    const balance = accrue(garden, now).coins
    pacing?.tick(now)
    const boostSeconds = Math.max(0, Math.ceil((garden.boostUntil - now) / 1000))
    if (reward) {
      reward.hidden = !platform.adsAvailable
      reward.disabled = !safeBreak(now) || boostSeconds > 0
    }
    if (boost) {
      boost.hidden = boostSeconds === 0
      if (boostSeconds) {
        const remaining = String(boostSeconds % 60).padStart(2, '0')
        boost.textContent = text.boost(Math.floor(boostSeconds / 60), remaining)
      }
    }
    const { stocked, price, free, emergency, full } = steamerOffer(garden, now)
    const opening = now < revealUntil
    const nextFree = Math.ceil((stocked.freeAt + freeInterval(garden.levels.free) - now) / 1000)
    coins.textContent = text.coinAmount(formatNumber(Math.floor(balance)))
    rate.textContent = text.coinRate(formatNumber(income))
    button.classList.toggle('opening', opening)
    button.disabled = !active || opening || full || (!free && !emergency && balance < price)
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

  function commit(next: Garden, message = () => '') {
    if (next === garden) return
    if (next.highest > garden.highest) {
      discoveredLevel = next.highest
      discoveryUntil = Date.now() + 3200
      discovery.hidden = false
    }
    garden = next
    storageError = !saveGarden(garden, storage)
    statusMessage = message
    render()
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
    if (!active) return
    motion.touch()
    if (!offlineChime || event.target === mute) return
    offlineChime = false
    audio.play('cling')
  })
  canvas.addEventListener('pointerdown', event => {
    if (!active || drag || event.button !== 0) return
    panels.forEach(panel => { panel.open = false })
    reportGameplay()
    const { x, y } = point(event)
    const index = cell({ x, y })
    if (!garden.board[index]) return
    canvas.setPointerCapture(event.pointerId)
    drag = {
      index, pointer: event.pointerId, x, y,
      clientX: event.clientX, clientY: event.clientY, started: Date.now(), moved: false,
    }
    motion.press(index)
    updateEconomy()
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
        const gained = next.coins - accrue(garden, now).coins
        if (next !== garden) commit(next, () => text.coinGain(formatNumber(gained)))
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
    const mergeCombo = combo
    commit(result.garden, () => `${text.merge(combinedLevel)} ${text.names[combinedLevel - 1]}${mergeCombo > 1 ? ` · ${text.combo(mergeCombo)}` : ''}`)
    motion.merge(from, to, level, originals, text.coinGain(formatNumber(result.reward)), combo)
    updateEconomy()
    audio.play('pop')
  })

  function cancel(event: PointerEvent) {
    if (drag?.pointer === event.pointerId) clearDrag()
  }
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  button.addEventListener('click', () => {
    const now = Date.now()
    if (!active || now < revealUntil) return
    panels.forEach(panel => { panel.open = false })
    reportGameplay()
    const index = garden.board.indexOf(0)
    const next = spawnMochi(garden, now, Math.random(), Math.random())
    if (next === garden) return
    const rarity = next.variants[index]
    const level = next.board[index]
    revealUntil = now + 420
    commit(next, () => rarity === 'normal' ? '' : text.rareFound(text.names[level - 1], text.rarity[rarity]))
    motion.reveal(index)
    audio.play(rarity === 'normal' ? 'plop' : 'shimmer')
  })

  releaseButton.addEventListener('click', () => {
    if (!active) return
    const index = blockedCell(garden)
    if (index < 0) return
    const name = text.names[garden.board[index] - 1]
    releasePrompt.textContent = text.releasePrompt(name, text.rarity[garden.variants[index]])
    releaseDialog.returnValue = ''
    releaseDialog.showModal()
    reportGameplay()
  })

  releaseDialog.addEventListener('close', () => {
    if (releaseDialog.returnValue === 'release' && active) {
      commit(releaseBlockedMochi(garden, Date.now()), () => text.released)
    }
    reportGameplay()
  })

  for (const { kind, button } of shop) {
    button.addEventListener('click', () => {
      if (!active) return
      const next = buyUpgrade(garden, kind, Date.now())
      if (next === garden) return
      commit(next, () => text.upgradeBought)
      audio.play('cling')
    })
  }

  if (debug) {
    document.querySelector('#debug-hour')!.addEventListener('click', () => {
      const now = Date.now()
      const next = simulateHour(garden, now)
      const gained = next.coins - accrue(garden, now).coins
      commit(next, () => text.offlineReward(formatNumber(gained)))
      audio.play('cling')
    })
    document.querySelector('#debug-coins')!.addEventListener('click', () => {
      const next = accrue(garden, Date.now())
      commit({ ...next, coins: Math.min(Number.MAX_VALUE, next.coins * 10) })
      audio.play('cling')
    })
  }

  document.querySelector('#language')!.addEventListener('click', () => {
    toggleLanguage(storage)
    translateView()
    displayedDex = undefined
    displayedSpecial = -1
    render()
  })

  function safeBreak(now: number) {
    return active && !adBusy && !releaseDialog.open && !drag && !motion.merging && now >= revealUntil
  }

  function beginAd(now: number) {
    adBusy = true
    pause(now)
    reportGameplay()
    game.inert = true
    adState.textContent = text.adWaiting
    adState.hidden = false
  }

  function endAd(started: number, rewarded = false) {
    const now = Date.now()
    garden = skipAdTime(garden, started, now)
    if (rewarded) garden = rewardAd(garden, now)
    storageError = !saveGarden(garden, storage)
    game.inert = false
    adState.hidden = true
    adBusy = false
    resume(now)
  }

  async function showAd(kind: AdKind, started: number) {
    beginAd(started)
    let lateStarted: number | undefined
    const success = await platform.requestAd(kind, event => {
      const now = Date.now()
      if (event === 'started' || event === 'late-started') pacing?.fullscreen(now)
      if (event === 'late-started') {
        lateStarted = now
        beginAd(now)
      } else if (event === 'late-ended' && lateStarted !== undefined) {
        endAd(lateStarted)
      }
    }).catch(() => false)
    const rewarded = success && kind === 'rewarded'
    endAd(started, rewarded)
    if (kind === 'rewarded') {
      statusMessage = () => rewarded ? text.adRewarded : text.adUnavailable
      render()
    }
  }

  for (const panel of panels) {
    panel.addEventListener('toggle', reportGameplay)
    panel.querySelector('button.back')!.addEventListener('click', () => {
      panel.open = false
      const now = Date.now()
      button.focus({ preventScroll: true })
      window.scrollTo(0, 0)
      if (platform.adsAvailable && safeBreak(now) && now >= discoveryUntil &&
        now - lastMerge >= 10_000 && !panels.some(item => item.open) && pacing?.canRequestMidgame(now)) {
        void showAd('midgame', now)
      } else {
        reportGameplay()
      }
    })
  }

  reward?.addEventListener('click', () => {
    const now = Date.now()
    if (!platform.adsAvailable || now < garden.boostUntil) return
    if (safeBreak(now)) void showAd('rewarded', now)
  })

  function pause(now = Date.now()) {
    if (!active) return
    active = false
    app.classList.add('paused')
    window.clearInterval(timer)
    clearDrag()
    lastMerge = -Infinity
    loop.sleep()
    audio.setBlocked(true)
    pacing?.stop(now)
    garden = accrue(refill(garden, now), now)
    storageError = !saveGarden(garden, storage)
  }

  function resume(now = Date.now()) {
    if (active || adBusy || document.hidden) return
    active = true
    app.classList.remove('paused')
    audio.setBlocked(false)
    pacing?.start(now)
    motion.resetFpsSample()
    loop.wake(true)
    const settled = accrue(refill(garden, now), now, true)
    offlineEarned = settled.coins - garden.coins
    offlineChime = offlineEarned >= 0.05
    offline.hidden = !offlineChime
    commit(settled)
    reportGameplay()
    timer = window.setInterval(updateEconomy, 100)
  }

  document.addEventListener('visibilitychange', () => document.hidden ? pause() : resume())
  window.addEventListener('pagehide', () => pause())
  window.addEventListener('pageshow', () => resume())
  platform.loadingStop()
  if (document.hidden) {
    app.classList.add('paused')
    render()
    loop.sleep()
  } else resume(loadedAt)
}

void start()

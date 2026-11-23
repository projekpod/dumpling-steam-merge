import Phaser from 'phaser'
import { COLUMNS } from './board'
import { areas, unlocks } from './areas'
import { AdPacing } from './ad-pacing'
import { GardenAudio, type Volume } from './audio'
import { CELL_WIDTH, CELL_HEIGHT, WIDTH, HEIGHT, DumplingMotion } from './dumpling-motion'
import {
  EGG_INTERVAL, SQUISH_HOLD, accrue, blockedCell, buyUpgrade, capacityLimit, coinsPerSecond, formatNumber, hatchEgg, isAreaUnlocked,
  freeInterval, moveDumpling, refill, releaseBlockedDumpling, rewardAd, rewardSquish, simulateHour, skipAdTime, spawnDumpling,
  specialLevelChances, steamerOffer, switchArea, trackEggTime, upgradeCost, upgradeKeys, type Garden,
} from './economy'
import { openPlatform, type AdKind, type GamePlatform } from './platform'
import { mountHaptics } from './haptics'
import { mountOnboarding } from './onboarding'
import { startPagesAnalytics } from './pages-analytics'
import { loadGarden, saveGarden } from './storage'
import { rarities, rarityChances } from './rarity'
import { loadLanguage, text, toggleLanguage } from './strings'
import { mount, renderCollection, translateView } from './view'
import './style.css'

const debug = new URLSearchParams(location.search).get('debug') === '1'
const EGG_SAVE_INTERVAL = 5000
const pagesBuild = import.meta.env.PROD && import.meta.env.MODE === 'production'
async function start() {
  const font = document.fonts.load('900 12px Nunito').catch(() => [])
  const platform = await openPlatform()
  platform.loadingStart()
  loadLanguage(platform.storage, navigator.language)
  mount(platform.supportsAd('rewarded'), debug)
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
  const areaButton = document.querySelector<HTMLButtonElement>('#area')!
  const areaDialog = document.querySelector<HTMLDialogElement>('#area-dialog')!
  const areaOptions = areas.map(area => ({ area, button: areaDialog.querySelector<HTMLButtonElement>(`[data-area-option=${area}]`)! }))
  const egg = document.querySelector<HTMLElement>('#egg')!
  const hatchButton = document.querySelector<HTMLButtonElement>('#hatch')!
  const eggHint = document.querySelector<HTMLElement>('#egg-hint')!
  const upgradeTitle = document.querySelector('#upgrade-title')!
  const dex = document.querySelector('#dex')!
  const collection = dex.closest('details')!
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
  for (const channel of ['music', 'effects'] satisfies Volume[]) {
    const slider = document.querySelector<HTMLInputElement>(`#volume-${channel}`)!
    slider.value = String(Math.round(audio.volume(channel) * 100))
    slider.addEventListener('input', () => audio.setVolume(channel, slider.valueAsNumber / 100))
  }
  const unlockAudio = (event: Event) => {
    if (event.isTrusted) audio.unlock()
  }
  document.addEventListener('pointerup', unlockAudio, true)
  document.addEventListener('keydown', unlockAudio, true)
  platform.onMute(muted => {
    audio.setPortalMuted(muted)
    renderMute()
  })

  const shop = upgradeKeys.map(kind => {
    const button = document.querySelector<HTMLButtonElement>(`#upgrade-${kind}`)!
    return { kind, button, price: button.querySelector('[data-cost]')!, level: button.querySelector('[data-level]')! }
  })

  const app = document.querySelector('#app')!
  const motion = new DumplingMotion(this, enabled => {
    app.classList.toggle('economy-mode', enabled)
    audio.setEconomy(enabled)
  }, sleeping => audio.setSleeping(sleeping))
  const game = document.querySelector<HTMLElement>('.game')!
  const renderOnboarding = mountOnboarding(game)
  const hapticMerge = mountHaptics(storage)
  const panels = [...game.querySelectorAll<HTMLDetailsElement>('details')]
  const backButtons = panels.map(panel => panel.querySelector<HTMLButtonElement>('button.back')!)
  const reward = document.querySelector<HTMLButtonElement>('#reward')
  const boost = document.querySelector<HTMLElement>('#boost')
  const adState = document.querySelector<HTMLElement>('#ad-state')!
  const pacing = platform.supportsAd('midgame') ? new AdPacing(storage) : undefined
  const { canvas, loop } = this.game
  const loadedAt = Date.now()
  const initial = loadGarden(loadedAt, storage)
  let garden = initial.garden
  let analytics: ReturnType<typeof startPagesAnalytics>
  let savedEggTime = garden.eggActiveMs
  let eggSample = 0
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
  let steamerReveal = false
  let displayedDex: Garden['discovered'] | undefined
  let displayedSpecial = -1
  let drag: { index: number; pointer: number; x: number; y: number; clientX: number; clientY: number; started: number; moved: boolean } | undefined

  function reportGameplay() {
    const playing = active && !adBusy && !releaseDialog.open && !areaDialog.open && !panels.some(panel => panel.open)
    if (gameplayReported === playing) return
    gameplayReported = playing
    if (playing) platform.gameplayStart()
    else platform.gameplayStop()
  }

  function render() {
    const area = garden.area
    motion.setBoard(area, garden.board, garden.variants)
    renderOnboarding(garden.onboarding, garden.board)
    game.dataset.area = area
    areaButton.textContent = text.areas[area]
    areaButton.setAttribute('aria-label', `${text.chooseArea} · ${text.areas[area]}`)
    upgradeTitle.textContent = area === 'kebun' ? text.upgrades : text.sharedUpgrades
    for (const button of backButtons) button.textContent = text.backToArea[area]
    const occupied = garden.board.filter(Boolean).length
    capacity.value = `${occupied} / ${capacityLimit(garden)}`
    renderStatus()
    renderDex()
    if (displayedSpecial !== garden.levels.special) {
      displayedSpecial = garden.levels.special
      const chances = rarityChances(displayedSpecial)
      for (const { rarity, label } of odds) label.textContent = text.probability(chances[rarity])
      const levels = specialLevelChances(displayedSpecial)
      specialChance.textContent = text.specialChance(text.probability(levels.two), text.probability(levels.three))
    }
    if (!offline.hidden) offline.textContent = text.offlineReward(formatNumber(offlineEarned))
    if (!discovery.hidden) {
      discoveryName.textContent = text.names[area][discoveredLevel - 1]
      discoveryDescription.textContent = text.descriptions[area][discoveredLevel - 1]
    }
    updateEconomy()
  }

  function renderStatus() {
    const blocked = blockedCell(garden) !== -1
    releaseButton.hidden = !blocked
    status.textContent = storageError ? text.saveError : blocked ? text.blocked
      : statusMessage() || (garden.board.filter(Boolean).length >= capacityLimit(garden) ? text.full : '')
  }

  function renderDex() {
    if (!collection.open || displayedDex === garden.discovered) return
    displayedDex = garden.discovered
    renderCollection(dex, garden.area, garden.discovered, garden.highest)
  }
  collection.addEventListener('toggle', renderDex)

  function sampleEgg(profile: Garden) {
    if (!active) return profile
    const now = Math.floor(performance.now())
    const elapsed = now - eggSample
    eggSample = now
    return trackEggTime(profile, elapsed)
  }

  function persist() {
    storageError = !saveGarden(garden, storage)
    savedEggTime = garden.eggActiveMs
  }

  function updateEconomy() {
    const now = Date.now()
    analytics?.tick(now)
    garden = sampleEgg(garden)
    const ready = garden.eggActiveMs === EGG_INTERVAL
    if (garden.eggActiveMs - savedEggTime >= EGG_SAVE_INTERVAL || (ready && savedEggTime < EGG_INTERVAL)) {
      garden = accrue(refill(garden, now), now)
      const previousError = storageError
      persist()
      if (storageError !== previousError) renderStatus()
    }
    if (!discovery.hidden && now >= discoveryUntil) discovery.hidden = true
    const income = coinsPerSecond(garden, now)
    const balance = accrue(garden, now).coins
    pacing?.tick(now)
    const boostSeconds = Math.max(0, Math.ceil((garden.boostUntil - now) / 1000))
    if (reward) {
      reward.hidden = !platform.supportsAd('rewarded')
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
    button.classList.toggle('opening', opening && steamerReveal)
    button.disabled = !active || opening || full || (!free && !emergency && balance < price)
    areaButton.disabled = !active || opening || !!drag
    egg.hidden = !ready
    hatchButton.disabled = !ready || full || !active || opening || !!drag || motion.merging
    const showEggHint = ready && full
    if (eggHint.hidden === showEggHint) {
      eggHint.hidden = !showEggHint
      if (showEggHint) hatchButton.setAttribute('aria-describedby', eggHint.id)
      else hatchButton.removeAttribute('aria-describedby')
    }
    priceLabel.textContent = text.coinAmount(formatNumber(price))
    hint.textContent = full ? text.fullSteamer : opening && steamerReveal ? text.opening : emergency ? text.emergency
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
    if (analytics && areas.some(area => !isAreaUnlocked(garden, area) && isAreaUnlocked(next, area))) {
      analytics.track('area_unlocked')
    }
    if (garden.onboarding === 'squish' && next.onboarding === 'done') analytics?.track('onboarding_done')
    const discoveryIndex = garden.area === next.area
      ? next.discovered.findIndex((mask, index) => !!mask && !garden.discovered[index]) : -1
    if (discoveryIndex !== -1) {
      discoveredLevel = discoveryIndex + 1
      discoveryUntil = Date.now() + 3200
      discovery.hidden = false
    }
    garden = sampleEgg(next)
    persist()
    statusMessage = message
    render()
  }

  document.querySelector('#onboarding-skip')!.addEventListener('click', () => {
    if (!active) return
    commit({ ...garden, onboarding: 'skipped' })
    button.focus({ preventScroll: true })
  })

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

  function clearDrag(outcome?: 'move' | 'merge' | 'failed') {
    drag = undefined
    motion.endPress()
    motion.release(outcome)
  }

  document.addEventListener('pointerdown', event => {
    if (!active) return
    motion.touch()
  })
  document.addEventListener('pointerup', event => {
    if (!active || !offlineChime || event.target === mute) return
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
    if (!moved && travelled <= 10) {
      clearDrag()
      const held = now - started
      if (held >= 145) {
        const rewarded = rewardSquish(garden, from, held, now)
        const next = garden.onboarding === 'squish' && held >= SQUISH_HOLD
          ? { ...rewarded, onboarding: 'done' as const } : rewarded
        const gained = rewarded.coins - accrue(garden, now).coins
        if (next !== garden) commit(next, () => gained > 0 ? text.coinGain(formatNumber(gained)) : '')
        audio.play('squish')
      } else {
        motion.react(from)
      }
      return
    }
    const level = garden.board[from]
    const originals = [garden.variants[from], garden.variants[to]] as const
    const result = moveDumpling(garden, from, to, now)
    if (result.garden === garden) {
      clearDrag(to === from ? 'move' : 'failed')
      return
    }
    clearDrag(result.reward ? 'merge' : 'move')
    if (!result.reward) {
      commit(result.garden)
      return
    }
    combo = now - lastMerge <= 2000 ? combo + 1 : 1
    lastMerge = now
    const combinedLevel = result.garden.board[to]
    const mergeCombo = combo
    const next = garden.onboarding === 'merge' ? { ...result.garden, onboarding: 'squish' as const } : result.garden
    analytics?.track('first_merge')
    commit(next, () => `${text.merge(combinedLevel)} ${text.names[garden.area][combinedLevel - 1]}${mergeCombo > 1 ? ` · ${text.combo(mergeCombo)}` : ''}`)
    motion.merge(from, to, level, originals, text.coinGain(formatNumber(result.reward)), combo)
    updateEconomy()
    audio.play('pop')
    hapticMerge?.(app.classList.contains('economy-mode'))
    if (combo >= 3) audio.jingle('combo')
  })

  function cancel(event: PointerEvent) {
    if (drag?.pointer === event.pointerId) clearDrag()
  }
  canvas.addEventListener('pointercancel', cancel)
  canvas.addEventListener('lostpointercapture', cancel)
  function reveal(source: 'steamer' | 'egg') {
    const now = Date.now()
    if (!active || now < revealUntil || (source === 'egg' && !safeBreak(now))) return
    garden = sampleEgg(garden)
    panels.forEach(panel => { panel.open = false })
    reportGameplay()
    const index = garden.board.indexOf(0)
    const open = source === 'steamer' ? spawnDumpling : hatchEgg
    const spawned = open(garden, now, Math.random(), Math.random())
    if (spawned === garden) return
    const next = source === 'steamer' && garden.onboarding === 'tap'
      ? { ...spawned, onboarding: 'merge' as const } : spawned
    const rarity = next.variants[index]
    const level = next.board[index]
    revealUntil = now + 420
    steamerReveal = source === 'steamer'
    commit(next, () => rarity === 'normal' ? '' : text.rareFound(text.names[garden.area][level - 1], text.rarity[rarity]))
    motion.reveal(index)
    audio.play(rarity === 'normal' ? 'plop' : 'shimmer')
    if (rarity !== 'normal') {
      audio.jingle('rare')
      analytics?.track('first_rare')
    }
  }
  button.addEventListener('click', () => reveal('steamer'))
  hatchButton.addEventListener('click', () => reveal('egg'))

  areaButton.addEventListener('click', () => {
    if (!active || adBusy || releaseDialog.open || areaDialog.open || drag || Date.now() < revealUntil) return
    for (const { area, button } of areaOptions) {
      const current = area === garden.area
      const unlocked = isAreaUnlocked(garden, area)
      const requirement = unlocks[area]
      button.disabled = current || !unlocked
      if (current) button.setAttribute('aria-current', 'location')
      else button.removeAttribute('aria-current')
      button.querySelector('strong')!.textContent = text.areas[area]
      const detail = button.querySelector('small')!
      detail.textContent = current ? text.currentArea : !unlocked && requirement
        ? text.areaUnlock(text.areas[requirement.area], requirement.level) : ''
      detail.hidden = !detail.textContent
    }
    areaDialog.showModal()
    reportGameplay()
  })
  for (const { area, button } of areaOptions) {
    button.addEventListener('click', () => {
      if (!active || !areaDialog.open) return
      const next = switchArea(garden, area, Date.now())
      if (next === garden) return
      areaDialog.close()
      panels.forEach(panel => { panel.open = false })
      discovery.hidden = true
      discoveryUntil = 0
      lastMerge = -Infinity
      commit(next)
      window.scrollTo(0, 0)
      reportGameplay()
    })
  }
  areaDialog.addEventListener('close', reportGameplay)

  releaseButton.addEventListener('click', () => {
    if (!active) return
    const index = blockedCell(garden)
    if (index < 0) return
    const name = text.names[garden.area][garden.board[index] - 1]
    releasePrompt.textContent = text.releasePrompt(name, text.rarity[garden.variants[index]])
    releaseDialog.returnValue = ''
    releaseDialog.showModal()
    reportGameplay()
  })

  releaseDialog.addEventListener('close', () => {
    if (releaseDialog.returnValue === 'release' && active) {
      commit(releaseBlockedDumpling(garden, Date.now()), () => text.released)
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
    return active && !adBusy && !releaseDialog.open && !areaDialog.open && !drag && !motion.merging && now >= revealUntil
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
    persist()
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
      if (platform.supportsAd('midgame') && safeBreak(now) && now >= discoveryUntil &&
        now - lastMerge >= 10_000 && !panels.some(item => item.open) && pacing?.canRequestMidgame(now)) {
        void showAd('midgame', now)
      } else {
        reportGameplay()
      }
    })
  }

  reward?.addEventListener('click', () => {
    const now = Date.now()
    if (!platform.supportsAd('rewarded') || now < garden.boostUntil) return
    if (safeBreak(now)) void showAd('rewarded', now)
  })

  function pause(now = Date.now()) {
    if (!active) return
    analytics?.pause(now)
    garden = sampleEgg(garden)
    active = false
    app.classList.add('paused')
    window.clearInterval(timer)
    clearDrag()
    lastMerge = -Infinity
    loop.sleep()
    audio.setBlocked(true)
    pacing?.stop(now)
    garden = accrue(refill(garden, now), now)
    persist()
    reportGameplay()
  }

  function resume(now = Date.now()) {
    if (active || adBusy || document.hidden) return
    active = true
    eggSample = Math.floor(performance.now())
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
    if (pagesBuild) {
      analytics ??= startPagesAnalytics()
      analytics?.resume(now)
    }
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

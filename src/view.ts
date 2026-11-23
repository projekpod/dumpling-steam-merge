import { CELL_COUNT } from './board'
import { areas, type Area } from './areas'
import { makePortrait } from './art'
import { EGG_LEVEL_TWO, upgradeKeys } from './economy'
import { rarities, rarityBit, rarityMultiplier } from './rarity'
import { language, text } from './strings'

export function mount(ads: boolean, debug: boolean) {
  document.querySelector('#app')!.innerHTML = `
  <div class="decoration decoration-left" aria-hidden="true"><i class="decor-steam"></i><i class="decor-dumpling"></i><i class="decor-basket"></i></div>
  <div class="decoration decoration-right" aria-hidden="true"><i class="decor-steam"></i><i class="decor-dumpling"></i><i class="decor-basket"></i></div>
  <section class="game">
    <header class="top">
      <span class="brand"><i class="sprout" aria-hidden="true"></i><span>Dumpling Steam<small>Merge &amp; Squish</small></span></span>
      <div class="top-actions">
        <button id="language" type="button"></button>
        <button id="mute" type="button"></button>
      </div>
    </header>
    <section class="intro">
      <h1><span data-text="headline"></span></h1>
      <p><span data-text="instruction"></span></p>
    </section>
    <div class="wallet">
      <strong><i aria-hidden="true"></i><span id="coins"></span></strong>
      <span id="rate"></span>
    </div>
    <section class="board">
      <div class="board-header">
        <span class="capacity-label"><span data-text="capacity"></span> <output id="capacity"></output></span>
        <button class="area" id="area" type="button" aria-haspopup="dialog" aria-controls="area-dialog"></button>
      </div>
      <div id="field">
        <div class="cells" aria-hidden="true">${'<i></i>'.repeat(CELL_COUNT)}</div>
      </div>
    </section>
    <button id="spawn" type="button" disabled>
      <span class="steamer" aria-hidden="true"><i class="steam"></i><i class="puff"></i><i class="lid"></i></span>
      <span class="spawn-label"><strong><span data-text="spawn"></span></strong><small id="spawn-hint"></small></span>
      <span id="spawn-price"></span>
    </button>
    <aside id="discovery" role="status" hidden>
      <strong><span data-text="discovery"></span></strong>
      <span id="discovery-name"></span>
      <small id="discovery-description"></small>
    </aside>
    <div class="egg" id="egg" hidden>
      <button id="hatch" type="button" disabled>
        <i aria-hidden="true"></i><span data-text="egg"></span>
      </button>
      <p id="egg-hint" data-text="eggFull" hidden></p>
    </div>
    ${ads ? `<button id="reward" class="reward" type="button" data-text="rewardAd" disabled></button>
    <p id="boost" class="boost" role="status" hidden></p>` : ''}
    <p id="offline" class="offline" role="status" hidden></p>
    <p id="status" role="status"></p>
    <button class="release" id="release" type="button" hidden><span data-text="release"></span></button>
    <dialog id="release-dialog" class="release-dialog" aria-labelledby="release-prompt">
      <p id="release-prompt"></p>
      <form method="dialog">
        <button value="cancel" data-text="cancel" autofocus></button>
        <button value="release" data-text="confirmRelease"></button>
      </form>
    </dialog>
    <dialog id="area-dialog" class="area-dialog" aria-labelledby="area-title">
      <h2 id="area-title" data-text="chooseArea"></h2>
      <div class="area-options">
        ${areas.map(area => `<button type="button" data-area-option="${area}" disabled><strong></strong><small hidden></small></button>`).join('')}
      </div>
      <form method="dialog"><button type="submit" data-text="close" autofocus></button></form>
    </dialog>
    <details class="upgrades">
      <summary><span id="upgrade-title" data-text="upgrades"></span></summary>
      ${upgradeKeys.map(kind => `
        <button type="button" id="upgrade-${kind}" class="upgrade" disabled>
          <span><strong data-name></strong><small data-hint></small></span>
          <span class="upgrade-cost"><small data-level></small><strong data-cost></strong></span>
        </button>
      `).join('')}
      <button class="back" type="button"></button>
    </details>
    <details class="upgrades">
      <summary><span data-text="odds"></span></summary>
      <p class="odds-hint"><span data-text="oddsHint"></span></p>
      <dl class="odds">
        ${rarities.map(rarity => `<div><dt><i class="rarity-dot ${rarity}" aria-hidden="true"></i><span id="rarity-${rarity}"></span></dt><dd id="odds-${rarity}"></dd></div>`).join('')}
      </dl>
      <p class="odds-hint" id="special-chance"></p>
      <p class="odds-hint" id="egg-odds"></p>
      <button class="back" type="button"></button>
    </details>
    <details class="upgrades">
      <summary><span data-text="dex"></span></summary>
      <ol class="dex" id="dex"></ol>
      <button class="back" type="button"></button>
    </details>
    <details class="upgrades">
      <summary><span data-text="audioSettings"></span></summary>
      <label class="volume"><span data-text="musicVolume"></span><input id="volume-music" type="range" min="0" max="100"></label>
      <label class="volume"><span data-text="effectsVolume"></span><input id="volume-effects" type="range" min="0" max="100"></label>
      <button class="back" type="button"></button>
    </details>
    ${debug ? `<div class="debug">
      <button type="button" id="debug-hour"><span data-text="debugHour"></span></button>
      <button type="button" id="debug-coins"><span data-text="debugCoins"></span></button>
    </div>` : ''}
  </section>
  <p id="ad-state" class="ad-state" role="status" hidden></p>
`
}

export function translateView() {
  document.documentElement.lang = language
  document.title = text.title
  document.querySelector('.brand')!.setAttribute('title', text.title)
  document.querySelector('.board')!.setAttribute('aria-label', text.board)
  document.querySelector('#mute')!.setAttribute('aria-label', text.mute)
  document.querySelector('#egg-odds')!.textContent = text.eggOdds(text.probability(1 - EGG_LEVEL_TWO), text.probability(EGG_LEVEL_TWO))
  const button = document.querySelector('#language')!
  button.textContent = language === 'id' ? 'EN' : 'ID'
  button.setAttribute('aria-label', text.switchLanguage)
  document.querySelectorAll<HTMLElement>('[data-text]').forEach(element => {
    const value = text[element.dataset.text as keyof typeof text]
    if (typeof value === 'string') element.textContent = value
  })
  for (const kind of upgradeKeys) {
    const upgrade = document.querySelector(`#upgrade-${kind}`)!
    upgrade.querySelector('[data-name]')!.textContent = text.upgrade[kind].name
    upgrade.querySelector('[data-hint]')!.textContent = text.upgrade[kind].hint
  }
  for (const rarity of rarities) {
    document.querySelector(`#rarity-${rarity}`)!.textContent = `${text.rarity[rarity]} · ×${rarityMultiplier(rarity)}`
  }
}

const portraits = new Map<string, string>()

export function renderCollection(list: Element, area: Area, discovered: readonly number[], highest: number) {
  list.innerHTML = discovered.map((mask, i) => {
    const level = i + 1
    const silhouette = !mask && level === highest + 1
    let portrait = ''
    if (mask || silhouette) {
      const key = `${area}-${level}-${silhouette}`
      let url = portraits.get(key)
      if (!url) {
        url = makePortrait(area, level, silhouette).toDataURL()
        portraits.set(key, url)
      }
      portrait = `<img src="${url}" class="dex-portrait${silhouette ? ' silhouette' : ''}" width="56" height="56" alt="">`
    }
    const name = mask ? text.names[area][i] : text.unknown
    const badges = rarities.filter(rarity => mask & rarityBit(rarity))
      .map(rarity => `<span class="badge"><i class="rarity-dot ${rarity}" aria-hidden="true"></i>${text.rarity[rarity]}</span>`).join('')
    return `<li>${portrait}<div><strong>${text.upgradeLevel(level)} · ${name}</strong>${mask
      ? `<small>${text.descriptions[area][i]}</small><div class="badges">${badges}</div>` : ''}</div></li>`
  }).join('')
}

import { CELL_COUNT } from './board'
import { upgradeKeys } from './economy'
import { rarities, rarityMultiplier } from './rarity'
import { language, text } from './strings'

export function mount(ads: boolean, debug: boolean) {
  document.querySelector('#app')!.innerHTML = `
  <div class="decoration decoration-left" aria-hidden="true"><i class="decor-steam"></i><i class="decor-mochi"></i><i class="decor-basket"></i></div>
  <div class="decoration decoration-right" aria-hidden="true"><i class="decor-steam"></i><i class="decor-mochi"></i><i class="decor-basket"></i></div>
  <section class="game">
    <header class="top">
      <span class="brand"><i class="sprout" aria-hidden="true"></i><span data-text="title"></span></span>
      <div class="top-actions">
        <span class="area"><span aria-hidden="true"></span><span data-text="area"></span></span>
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
        <span><span data-text="capacity"></span></span>
        <output id="capacity"></output>
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
    ${ads ? `<button id="reward" class="reward" type="button" data-text="rewardAd" disabled></button>
    <p id="boost" class="boost" role="status" hidden></p>` : ''}
    <p id="offline" class="offline" role="status" hidden></p>
    <aside id="discovery" role="status" hidden>
      <strong><span data-text="discovery"></span></strong>
      <span id="discovery-name"></span>
      <small id="discovery-description"></small>
    </aside>
    <p id="status" role="status"></p>
    <button class="release" id="release" type="button" hidden><span data-text="release"></span></button>
    <dialog id="release-dialog" class="release-dialog" aria-labelledby="release-prompt">
      <p id="release-prompt"></p>
      <form method="dialog">
        <button value="cancel" data-text="cancel" autofocus></button>
        <button value="release" data-text="confirmRelease"></button>
      </form>
    </dialog>
    <details class="upgrades">
      <summary><span data-text="upgrades"></span></summary>
      ${upgradeKeys.map(kind => `
        <button type="button" id="upgrade-${kind}" class="upgrade" disabled>
          <span><strong data-name></strong><small data-hint></small></span>
          <span class="upgrade-cost"><small data-level></small><strong data-cost></strong></span>
        </button>
      `).join('')}
      <button class="back" type="button" data-text="backToGarden"></button>
    </details>
    <details class="upgrades">
      <summary><span data-text="odds"></span></summary>
      <p class="odds-hint"><span data-text="oddsHint"></span></p>
      <dl class="odds">
        ${rarities.map(rarity => `<div><dt><i class="rarity-dot ${rarity}" aria-hidden="true"></i><span id="rarity-${rarity}"></span></dt><dd id="odds-${rarity}"></dd></div>`).join('')}
      </dl>
      <p class="odds-hint" id="special-chance"></p>
      <button class="back" type="button" data-text="backToGarden"></button>
    </details>
    <details class="upgrades">
      <summary><span data-text="dex"></span></summary>
      <ol class="dex" id="dex"></ol>
      <button class="back" type="button" data-text="backToGarden"></button>
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
  document.querySelector('.board')!.setAttribute('aria-label', text.board)
  document.querySelector('#mute')!.setAttribute('aria-label', text.mute)
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

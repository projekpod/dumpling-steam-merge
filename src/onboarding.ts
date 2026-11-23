import { COLUMNS, MAX_LEVEL, ROWS, type Board } from './board'
import type { OnboardingStep } from './economy'
import { text } from './strings'

function pair(board: Board) {
  const first = new Map<number, number>()
  for (const [index, level] of board.entries()) {
    if (!level || level === MAX_LEVEL) continue
    const match = first.get(level)
    if (match !== undefined) return [match, index] as const
    first.set(level, index)
  }
}

function paintHand() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  ctx.beginPath()
  ctx.moveTo(11, 25)
  ctx.lineTo(11, 8)
  ctx.bezierCurveTo(11, 2, 19, 2, 19, 8)
  ctx.lineTo(19, 21)
  ctx.bezierCurveTo(19, 17, 25, 17, 25, 22)
  ctx.bezierCurveTo(28, 19, 31, 20, 31, 24)
  ctx.bezierCurveTo(35, 22, 39, 24, 39, 28)
  ctx.lineTo(39, 33)
  ctx.quadraticCurveTo(39, 39, 34, 44)
  ctx.lineTo(21, 44)
  ctx.quadraticCurveTo(17, 42, 14, 37)
  ctx.lineTo(7, 30)
  ctx.bezierCurveTo(3, 25, 8, 21, 11, 25)
  ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#fff9ef'
  ctx.lineWidth = 5
  ctx.stroke()
  const fill = ctx.createLinearGradient(9, 8, 34, 43)
  fill.addColorStop(0, '#fff0dd')
  fill.addColorStop(1, '#f4b89d')
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = '#69463d'
  ctx.lineWidth = 1.7
  ctx.stroke()
  return canvas.toDataURL()
}

export function mountOnboarding(game: HTMLElement) {
  const wrapper = game.querySelector<HTMLElement>('#onboarding')!
  const label = game.querySelector<HTMLElement>('#onboarding-label')!
  const field = game.querySelector<HTMLElement>('#onboarding-board')!
  const steamer = game.querySelector<HTMLElement>('#onboarding-steamer')!
  let handReady = false

  function render(step: OnboardingStep, board: Board) {
    const learning = step !== 'done' && step !== 'skipped'
    wrapper.hidden = !learning
    if (!learning) {
      delete game.dataset.onboarding
      steamer.hidden = field.hidden = true
      return
    }

    if (!handReady) {
      game.style.setProperty('--onboarding-hand', `url(${paintHand()})`)
      handReady = true
    }
    const matches = step === 'merge' ? pair(board) : undefined
    const present = step === 'squish' ? board.findIndex(Boolean) : -1
    const cue = step === 'merge' && !matches ? 'pair' : step === 'squish' && present < 0 ? 'tap' : step
    game.dataset.onboarding = step
    label.textContent = text.onboarding[cue]
    steamer.hidden = cue !== 'tap' && cue !== 'pair'
    field.hidden = !steamer.hidden

    if (!field.hidden) {
      const [from, to] = matches ?? [present, present]
      field.dataset.gesture = cue
      for (const [name, index] of [['from', from], ['to', to]] as const) {
        field.style.setProperty(`--${name}-x`, `${((index % COLUMNS + 0.5) / COLUMNS) * 100}%`)
        field.style.setProperty(`--${name}-y`, `${((Math.floor(index / COLUMNS) + 0.5) / ROWS) * 100}%`)
      }
    }
  }
  return render
}

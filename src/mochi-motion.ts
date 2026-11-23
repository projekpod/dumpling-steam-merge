import type Phaser from 'phaser'
import { faces, makeEffect, makeMochi, type Face } from './art'
import { CELL_COUNT, COLUMNS, MAX_LEVEL, ROWS, type Board } from './board'
import { text } from './strings'

export const WIDTH = 330
export const HEIGHT = 360
export const CELL_WIDTH = WIDTH / COLUMNS
export const CELL_HEIGHT = HEIGHT / ROWS

const SCALE = 0.5
const STRIKE_MS = 135
const MERGE_MS = 800
const IDLE_STYLES = ['blink', 'breathe', 'hop', 'sway', 'glance', 'leaf', 'blush', 'happy'] as const
const IDLE_TIMES = [180, 950, 460, 650, 650, 520, 850, 650]

type Image = Phaser.GameObjects.Image

interface Mochi {
  sprite: Image
  x: number
  y: number
  level: number
  face: Face
  due: number
  style: number
  started: number
  reactedAt: number
  resting: number
}

const texture = (level: number, face: Face = 'normal') => `mochi-${level}-${face}`
const nextIdle = () => 2000 + Math.random() * 4000
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

function character(scene: Phaser.Scene) {
  return scene.add.image(0, 0, texture(1)).setScale(SCALE).setVisible(false)
}

function mergeEffect(scene: Phaser.Scene) {
  return {
    from: character(scene).setDepth(1),
    to: character(scene).setDepth(1),
    ring: scene.add.image(0, 0, 'ring').setDepth(2).setVisible(false),
    caption: scene.add.text(0, 0, '', {
      fontFamily: 'Nunito', fontSize: '13px', fontStyle: '900',
      color: '#8b3f60', stroke: '#fff8ed', strokeThickness: 3, align: 'center',
    }).setOrigin(0.5).setDepth(4).setVisible(false),
    target: -1,
    x: 0, y: 0, sourceX: 0, sourceY: 0, started: 0,
  }
}

/** Interpolates short poses with one scene update and reuses sprites for every effect. */
export class MochiMotion {
  private readonly cells: Mochi[]
  private readonly dragSprite: Image
  private readonly effects: ReturnType<typeof mergeEffect>[]
  private readonly particles: { sprite: Image; x: number; y: number; vx: number; vy: number; started: number }[]
  private elapsed = 0
  private touchedAt = 0
  private dragX: number | null = null
  private draggedIndex = -1
  private sampleTime = 0
  private sampleFrames = 0
  private economyMode = false

  constructor(private readonly scene: Phaser.Scene) {
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (const face of faces) scene.textures.addCanvas(texture(level, face), makeMochi(level, face))
    }
    for (const kind of ['star', 'heart', 'ring'] as const) scene.textures.addCanvas(kind, makeEffect(kind))

    this.cells = Array.from({ length: CELL_COUNT }, (_, index) => ({
      sprite: character(scene),
      x: (index % COLUMNS + 0.5) * CELL_WIDTH,
      y: (Math.floor(index / COLUMNS) + 0.5) * CELL_HEIGHT,
      level: 0, face: 'normal', due: nextIdle(), started: -1000, style: 0, reactedAt: -1000, resting: 0,
    }))
    this.effects = Array.from({ length: 3 }, () => mergeEffect(scene))
    this.particles = Array.from({ length: 30 }, () => ({
      sprite: scene.add.image(0, 0, 'star').setDepth(3).setVisible(false),
      x: 0, y: 0, vx: 0, vy: 0, started: -1000,
    }))
    this.dragSprite = character(scene).setDepth(5)
    scene.events.on('update', this.update, this)
  }

  setBoard(board: Board) {
    board.forEach((level, index) => {
      const cell = this.cells[index]
      if (cell.level === level) return
      this.finishAt(index)
      cell.level = level
      cell.style = 0
      cell.started = cell.reactedAt = -1000
      cell.due = this.elapsed + nextIdle()
      cell.face = 'normal'
      cell.sprite.setVisible(level > 0).setPosition(cell.x, cell.y).setRotation(0).setScale(SCALE)
      if (level) cell.sprite.setTexture(texture(level))
    })
  }

  touch() {
    this.touchedAt = this.elapsed
  }

  react(index: number) {
    this.finishAt(index)
    this.cells[index].reactedAt = this.elapsed
  }

  drag(index: number, x: number, y: number, dx: number, dy: number) {
    this.finishAt(index)
    this.draggedIndex = index
    this.dragX = x
    const cell = this.cells[index]
    const distance = Math.hypot(dx, dy) || 1
    const stretch = Math.min(distance / 100, 0.26)
    const direction = (dx * dx - dy * dy) / (distance * distance)
    this.dragSprite.setVisible(true).setTexture(texture(cell.level, 'surprised')).setPosition(x, y)
      .setScale(SCALE * (1 + direction * stretch), SCALE * (1 - direction * stretch))
      .setRotation(0.14 * dx / distance)
    cell.sprite.setVisible(false)
  }

  release() {
    this.draggedIndex = -1
    this.dragX = null
    this.dragSprite.setVisible(false)
  }

  merge(from: number, to: number, level: number, reward: string, combo: number) {
    this.finishAt(to)
    const effect = this.effects.find(item => item.target === -1) ??
      this.effects.reduce((oldest, item) => item.started < oldest.started ? item : oldest)
    if (effect.target !== -1) this.endEffect(effect)
    const source = this.cells[from]
    const target = this.cells[to]
    const distance = Math.hypot(source.x - target.x, source.y - target.y)
    const offset = Math.min(1, 48 / Math.max(distance, 1))
    effect.target = to
    effect.started = this.elapsed
    effect.x = target.x
    effect.y = target.y
    effect.sourceX = lerp(target.x, source.x, offset)
    effect.sourceY = lerp(target.y, source.y, offset)
    effect.from.setTexture(texture(level, 'surprised')).setVisible(true)
    effect.to.setTexture(texture(level, 'surprised')).setVisible(true)
    effect.ring.setVisible(false)
    effect.caption.setVisible(false).setText(combo > 1 ? `${text.combo(combo)}\n${reward}` : reward)
    target.sprite.setVisible(false)

    let count = this.economyMode ? 4 + Math.min(combo - 1, 3) : 9 + Math.min((combo - 1) * 2, 12)
    for (const particle of this.particles) {
      if (!count) break
      if (this.elapsed - particle.started < 520) continue
      const angle = Math.random() * Math.PI * 2
      const distance = 25 + Math.random() * 37
      particle.x = target.x
      particle.y = target.y
      particle.vx = Math.cos(angle) * distance
      particle.vy = Math.sin(angle) * distance - 13
      particle.started = this.elapsed + STRIKE_MS
      particle.sprite.setTexture(Math.random() < 0.4 ? 'heart' : 'star')
      count--
    }
  }

  resetFpsSample() {
    this.sampleFrames = this.sampleTime = 0
  }

  private finishAt(index: number) {
    const effect = this.effects.find(item => item.target === index)
    if (effect) this.endEffect(effect)
  }

  private endEffect(effect: ReturnType<typeof mergeEffect>) {
    this.cells[effect.target].sprite.setScale(SCALE)
    effect.target = -1
    effect.from.setVisible(false)
    effect.to.setVisible(false)
    effect.ring.setVisible(false)
    effect.caption.setVisible(false)
  }

  private update(_time: number, delta: number) {
    this.elapsed += Math.min(delta, 100)
    this.sampleFrames++
    this.sampleTime += this.scene.game.loop.rawDelta
    if (this.sampleTime >= 1200) {
      const fps = this.sampleFrames * 1000 / this.sampleTime
      if (fps < 45) this.economyMode = true
      else if (fps >= 50) this.economyMode = false
      this.resetFpsSample()
    }

    for (let index = 0; index < this.cells.length; index++) {
      const cell = this.cells[index]
      if (!cell.level || index === this.draggedIndex) continue
      this.pose(cell, index)
    }
    for (const effect of this.effects) {
      if (effect.target !== -1) this.animateMerge(effect)
    }
    for (const particle of this.particles) {
      const progress = (this.elapsed - particle.started) / 520
      if (progress < 0 || progress >= 1) {
        if (particle.sprite.visible) particle.sprite.setVisible(false)
        continue
      }
      const speed = 1 - (1 - progress) ** 2
      particle.sprite.setVisible(true).setAlpha(1 - progress)
        .setPosition(particle.x + particle.vx * speed, particle.y + particle.vy * speed + 15 * progress ** 2)
        .setScale(0.43 - 0.2 * progress).setRotation(progress * 3)
    }
  }

  private pose(cell: Mochi, index: number) {
    if (this.elapsed >= cell.due) {
      cell.style = Math.floor(Math.random() * IDLE_STYLES.length)
      cell.started = this.elapsed
      cell.due = this.elapsed + nextIdle() * (this.economyMode ? 2 : 1)
    }
    const sleepy = this.elapsed >= this.touchedAt + 30000 + index * 26
    cell.resting = clamp(cell.resting + (sleepy ? 0.025 : -0.12))
    const age = this.elapsed - cell.reactedAt
    const progress = (this.elapsed - cell.started) / IDLE_TIMES[cell.style]
    const pulse = progress < 1 ? Math.sin(progress * Math.PI) : 0
    let face: Face = 'normal'
    let squash = -0.08 * cell.resting
    let y = 2.5 * cell.resting
    let tilt = 0

    if (age < 410) {
      face = age < 105 ? 'surprised' : 'happy'
      squash += 0.22 * Math.sin(Math.PI * age / 410)
    } else if (this.dragX !== null) {
      face = this.dragX < cell.x ? 'left' : 'right'
    } else if (cell.resting > 0.38) {
      face = 'sleep'
      squash += 0.022 * Math.sin(this.elapsed / 440 + index)
    } else if (progress < 1) {
      switch (IDLE_STYLES[cell.style]) {
        case 'blink': face = 'blink'; break
        case 'breathe': squash = -0.1 * pulse; break
        case 'hop': y = -5.5 * pulse; squash = -0.07 * pulse; break
        case 'sway': tilt = 0.12 * Math.sin(2 * Math.PI * progress) * pulse; break
        case 'glance': face = index % 2 ? 'left' : 'right'; break
        case 'leaf': face = faces[8 + Math.min(2, Math.floor(progress * 3))]; break
        case 'blush': face = 'blush'; break
        case 'happy': face = 'happy'; break
      }
    }

    if (face !== cell.face) {
      cell.face = face
      cell.sprite.setTexture(texture(cell.level, face))
    }
    cell.sprite.setVisible(true)
      .setPosition(cell.x, cell.y + y)
      .setScale(SCALE * (1 + squash), SCALE * (1 - squash))
      .setRotation(tilt)
  }

  private animateMerge(effect: ReturnType<typeof mergeEffect>) {
    const age = this.elapsed - effect.started
    const target = this.cells[effect.target].sprite
    if (age < STRIKE_MS) {
      const progress = clamp(age / STRIKE_MS)
      const collision = progress ** 2
      target.setVisible(false)
      effect.from.setPosition(lerp(effect.sourceX, effect.x, collision), lerp(effect.sourceY, effect.y, collision))
        .setScale(SCALE * (1 + 0.34 * collision), SCALE * (1 - 0.52 * collision))
      const lean = 0.17 * Math.sin(Math.PI * progress)
      effect.to.setPosition(lerp(effect.x, effect.sourceX, lean), lerp(effect.y, effect.sourceY, lean))
        .setScale(SCALE * (1 + 0.4 * collision), SCALE * (1 - 0.48 * collision))
    } else if (age < MERGE_MS) {
      effect.from.setVisible(false)
      effect.to.setVisible(false)
      const pop = age - STRIKE_MS
      const bounce = pop < 130 ? lerp(0, 1.25, 1 - (1 - pop / 130) ** 2)
        : pop < 225 ? lerp(1.25, 0.9, (pop - 130) / 95) : lerp(0.9, 1, clamp((pop - 225) / 95))
      target.setScale(SCALE * bounce)
      const flare = pop / 400
      effect.ring.setVisible(flare < 1).setPosition(effect.x, effect.y)
        .setScale(0.15 + 0.65 * clamp(flare)).setAlpha(1 - clamp(flare))
      const captionX = Math.max(44, Math.min(WIDTH - 44, effect.x))
      effect.caption.setVisible(true).setPosition(captionX, Math.max(18, effect.y - 8 - pop * 0.055))
        .setAlpha(clamp((MERGE_MS - age) / 200))
    } else {
      this.endEffect(effect)
    }
  }
}

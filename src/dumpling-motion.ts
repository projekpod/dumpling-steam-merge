import type Phaser from 'phaser'
import { makeEffect, makeDumpling, makeRainbowSweep, type Face } from './art'
import { loadFaces, DumplingSprite } from './dumpling-face'
import { CELL_COUNT, COLUMNS, MAX_LEVEL, ROWS, type Board } from './board'
import type { Rarity } from './rarity'
import { text } from './strings'

export const WIDTH = 330
export const HEIGHT = 360
export const CELL_WIDTH = WIDTH / COLUMNS
export const CELL_HEIGHT = HEIGHT / ROWS

const SCALE = 0.5
const STRIKE_MS = 135
const MERGE_MS = 800
const IDLE_STYLES = ['blink', 'breathe', 'hop', 'sway', 'glance', 'leaf', 'blush', 'happy'] as const
const LEAF_POSES = ['leaf1', 'leaf2', 'leaf3'] as const
const BODY_POSES = ['normal', 'blush', 'sleep', ...LEAF_POSES] as const
const IDLE_TIMES = [180, 950, 460, 650, 650, 520, 850, 650]

type Image = Phaser.GameObjects.Image

interface Dumpling {
  sprite: DumplingSprite
  shine: Image
  rarity: Rarity
  revealAt: number
  releasedAt: number
  releaseDepth: number
  x: number
  y: number
  level: number
  face: Face
  due: number
  style: number
  started: number
  reactedAt: number
  resting: number
  peek: boolean
  gazeX: number
  gazeY: number
  lean: number
}

const texture = (level: number, face: Face = 'normal', rarity: Rarity = 'normal') => `dumpling-${level}-${face}-${rarity}`
const nextIdle = () => 2000 + Math.random() * 4000
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress

type Faces = ReturnType<typeof loadFaces>

function character(scene: Phaser.Scene, faces: Faces) {
  return new DumplingSprite(scene, texture(1), faces).setScale(SCALE).setVisible(false)
}

function mergeEffect(scene: Phaser.Scene, faces: Faces) {
  return {
    from: character(scene, faces).setDepth(1),
    to: character(scene, faces).setDepth(1),
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
export class DumplingMotion {
  private readonly cells: Dumpling[]
  private readonly dragSprite: DumplingSprite
  private readonly effects: ReturnType<typeof mergeEffect>[]
  private readonly particles: { sprite: Image; x: number; y: number; vx: number; vy: number; started: number }[]
  private elapsed = 0
  private touchedAt = 0
  private gaze?: { index: number; x: number; y: number; started: number }
  private reaction?: { kind: 'move' | 'merge' | 'failed'; started: number }
  private sleeping = false
  private draggedIndex = -1
  private pressing: { index: number; started: number } | undefined
  private sampleTime = 0
  private sampleFrames = 0
  private economyMode = false

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onEconomyMode: (enabled: boolean) => void,
    private readonly onSleeping: (sleeping: boolean) => void,
  ) {
    const faces = loadFaces()
    for (let level = 1; level <= MAX_LEVEL; level++) {
      for (const face of BODY_POSES) scene.textures.addCanvas(texture(level, face), makeDumpling(level, face))
    }
    for (const kind of ['star', 'heart', 'ring'] as const) scene.textures.addCanvas(kind, makeEffect(kind))

    scene.textures.addCanvas('rainbow-sweep', makeRainbowSweep())
    this.cells = Array.from({ length: CELL_COUNT }, (_, index) => ({
      sprite: character(scene, faces),
      shine: scene.add.image(0, 0, 'star').setVisible(false),
      rarity: 'normal', revealAt: -1000, releasedAt: -1000, releaseDepth: 0,
      x: (index % COLUMNS + 0.5) * CELL_WIDTH,
      y: (Math.floor(index / COLUMNS) + 0.5) * CELL_HEIGHT,
      level: 0, face: 'normal', due: nextIdle(), started: -1000, style: 0, reactedAt: -1000, resting: 0, peek: false, gazeX: 0, gazeY: 0, lean: 0,
    }))
    this.effects = Array.from({ length: 3 }, () => mergeEffect(scene, faces))
    this.particles = Array.from({ length: 30 }, () => ({
      sprite: scene.add.image(0, 0, 'star').setDepth(3).setVisible(false),
      x: 0, y: 0, vx: 0, vy: 0, started: -1000,
    }))
    this.dragSprite = character(scene, faces).setDepth(5)
    scene.events.on('update', this.update, this)
  }

  private skin(level: number, face: Face, rarity: Rarity) {
    const body = BODY_POSES.find(pose => pose === face) ?? 'normal'
    const key = texture(level, body, rarity)
    if (!this.scene.textures.exists(key)) this.scene.textures.addCanvas(key, makeDumpling(level, body, rarity))
    return key
  }

  setBoard(board: Board, variants: readonly Rarity[]) {
    board.forEach((level, index) => {
      const cell = this.cells[index]
      if (cell.level === level && cell.rarity === variants[index]) return
      this.finishAt(index)
      cell.level = level
      cell.rarity = variants[index]
      cell.shine.setVisible(false)
      cell.revealAt = cell.releasedAt = -1000
      cell.style = 0
      cell.started = cell.reactedAt = -1000
      cell.due = this.elapsed + nextIdle()
      cell.face = 'normal'
      cell.sprite.setVisible(level > 0).setPosition(cell.x, cell.y).setRotation(0).setScale(SCALE)
      if (level) cell.sprite.setLook(this.skin(level, 'normal', cell.rarity), 'normal')
    })
  }

  touch() {
    this.touchedAt = this.elapsed
    this.setSleeping(false)
  }

  private setSleeping(value: boolean) {
    if (this.sleeping === value) return
    this.sleeping = value
    this.onSleeping(value)
  }

  react(index: number) {
    this.finishAt(index)
    this.cells[index].reactedAt = this.elapsed
  }

  press(index: number) {
    this.finishAt(index)
    const cell = this.cells[index]
    cell.reactedAt = cell.releasedAt = -1000
    this.pressing = { index, started: this.elapsed }
    this.gaze = { index, x: cell.x, y: cell.y, started: this.elapsed }
    this.reaction = undefined
    for (const other of this.cells) {
      other.peek = other.resting > 0.38
      other.gazeX = other.gazeY = 0
    }
  }

  private pressDepth(started: number) {
    return 0.45 * (1 - (1 - clamp((this.elapsed - started - 145) / 810)) ** 2)
  }

  endPress() {
    if (!this.pressing) return
    const { index, started } = this.pressing
    const cell = this.cells[index]
    cell.releaseDepth = this.pressDepth(started)
    cell.releasedAt = this.elapsed
    this.pressing = undefined
  }

  reveal(index: number) {
    this.cells[index].revealAt = this.elapsed
  }

  drag(index: number, x: number, y: number, dx: number, dy: number) {
    this.finishAt(index)
    this.draggedIndex = index
    if (this.gaze) {
      this.gaze.x = x
      this.gaze.y = y
    }
    const cell = this.cells[index]
    const distance = Math.hypot(dx, dy) || 1
    const stretch = Math.min(distance / 100, 0.26)
    const direction = (dx * dx - dy * dy) / (distance * distance)
    this.dragSprite.setVisible(true).setLook(this.skin(cell.level, 'surprised', cell.rarity), 'surprised').setPosition(x, y)
      .setScale(SCALE * (1 + direction * stretch), SCALE * (1 - direction * stretch))
      .setRotation(0.14 * dx / distance)
    cell.sprite.setVisible(false)
    cell.shine.setVisible(false)
  }

  release(kind: 'move' | 'merge' | 'failed' = 'move') {
    this.draggedIndex = -1
    if (this.gaze) this.reaction = { kind, started: this.elapsed }
    this.gaze = undefined
    this.dragSprite.setVisible(false)
  }

  merge(from: number, to: number, level: number, original: readonly [Rarity, Rarity], reward: string, combo: number) {
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
    effect.from.setLook(this.skin(level, 'surprised', original[0]), 'surprised').setVisible(true)
    effect.to.setLook(this.skin(level, 'surprised', original[1]), 'surprised').setVisible(true)
    effect.ring.setVisible(false)
    effect.caption.setVisible(false).setText(combo > 1 ? `${text.combo(combo)}\n${reward}` : reward)
    target.sprite.setVisible(false)
    target.shine.setVisible(false)

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

  get merging() {
    return this.effects.some(effect => effect.target !== -1)
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
      const next = fps < 45 || (fps < 50 && this.economyMode)
      if (next !== this.economyMode) {
        this.economyMode = next
        this.onEconomyMode(next)
      }
      this.resetFpsSample()
    }

    for (let index = 0; index < this.cells.length; index++) {
      const cell = this.cells[index]
      if (!cell.level || index === this.draggedIndex) continue
      this.pose(cell, index, delta)
    }
    if (this.reaction && this.elapsed - this.reaction.started >= 850) this.reaction = undefined
    if (!this.gaze && this.elapsed >= this.touchedAt + 30000) {
      this.setSleeping(this.cells.some(cell => cell.level > 0) &&
        this.cells.every(cell => !cell.level || cell.resting >= 0.95))
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

  private pose(cell: Dumpling, index: number, delta: number) {
    if (this.elapsed >= cell.due) {
      cell.style = Math.floor(Math.random() * IDLE_STYLES.length)
      cell.started = this.elapsed
      cell.due = this.elapsed + nextIdle() * (this.economyMode ? 2 : 1)
    }
    const sleepy = !this.gaze && this.elapsed >= this.touchedAt + 30000 + index * 26
    cell.resting = clamp(cell.resting + (sleepy ? 0.025 : -0.12))
    const age = this.elapsed - cell.reactedAt
    const progress = (this.elapsed - cell.started) / IDLE_TIMES[cell.style]
    const pulse = progress < 1 ? Math.sin(progress * Math.PI) : 0
    let face: Face = 'normal'
    let squash = -0.08 * cell.resting
    let x = 0
    let y = 2.5 * cell.resting
    let tilt = 0

    const held = this.pressing?.index === index ? this.pressDepth(this.pressing.started) : 0
    const recovery = cell.releaseDepth * (1 - clamp((this.elapsed - cell.releasedAt) / 750)) ** 2
    const squeeze = Math.max(held, recovery)
    if (this.gaze && this.gaze.index !== index) {
      const dx = this.gaze.x - cell.x
      const dy = this.gaze.y - cell.y
      // Use a bounded direction so a pupil stays inside the eye even at the board edges.
      const distance = Math.max(25, Math.sqrt(dx * dx + dy * dy))
      const smoothing = clamp(delta / 58)
      cell.gazeX = lerp(cell.gazeX, 2.8 * dx / distance, smoothing)
      cell.gazeY = lerp(cell.gazeY, 3.6 * dy / distance, smoothing)
      cell.lean = lerp(cell.lean, 0.14 * dx / distance, smoothing)
      tilt = cell.lean
      x = cell.gazeX * 0.6
      y += cell.gazeY * 0.6
      cell.sprite.lookAt(cell.gazeX, cell.gazeY)
      face = cell.peek && this.elapsed - this.gaze.started < 155 ? 'peek' : 'gaze'
    } else if (squeeze > 0.005) {
      face = 'happy'
      squash = squeeze
      y = squeeze * 17
    } else if (age < 410) {
      face = age < 105 ? 'surprised' : 'happy'
      squash += 0.22 * Math.sin(Math.PI * age / 410)
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
        case 'leaf': face = LEAF_POSES[Math.min(2, Math.floor(progress * 3))]; break
        case 'blush': face = 'blush'; break
        case 'happy': face = 'happy'; break
      }
    }

    if (!this.gaze && this.reaction) {
      const elapsed = this.elapsed - this.reaction.started
      const release = (1 - clamp(elapsed / 300)) ** 2
      tilt += cell.lean * release
      x += cell.gazeX * release * 0.6
      y += cell.gazeY * release * 0.6
      if (elapsed >= 300) cell.lean = 0
      if (this.reaction.kind === 'merge') {
        const jump = (elapsed - index * 17) / 340
        if (jump >= 0 && jump < 1) {
          face = 'happy'
          y -= 7 * Math.sin(Math.PI * jump)
        }
      } else if (this.reaction.kind === 'failed' && elapsed < 430) {
        face = 'sad'
      }
    }

    if (face !== cell.face) {
      cell.face = face
      cell.sprite.setLook(this.skin(cell.level, face, cell.rarity), face)
    }
    const reveal = clamp((this.elapsed - cell.revealAt) / 395)
    const size = SCALE * (0.4 + 0.6 * reveal + 0.18 * Math.sin(Math.PI * reveal))
    cell.sprite.setVisible(true)
      .setPosition(cell.x + x, cell.y + y + (1 - reveal) * 6)
      .setScale(size * (1 + squash * 0.65), size * (1 - squash))
      .setRotation(tilt)
    this.animateShine(cell, index, reveal, squeeze)
  }

  private animateShine(cell: Dumpling, index: number, reveal: number, squeeze: number) {
    if (cell.rarity === 'normal' || squeeze >= 0.1 || (this.economyMode && reveal >= 0.8)) {
      cell.shine.setVisible(false)
      return
    }
    const phase = this.elapsed / 1500 + index * 0.29
    const glint = Math.max(0, Math.sin(phase * 2.9) - 0.65) * 2
    const prism = cell.rarity === 'rainbow'
    const visible = prism || glint > 0 || reveal < 0.8
    cell.shine.setVisible(visible)
    if (!visible) return
    if (cell.shine.texture.key !== (prism ? 'rainbow-sweep' : 'star')) {
      cell.shine.setTexture(prism ? 'rainbow-sweep' : 'star')
    }
    cell.shine.setPosition(cell.x + (prism ? 5 * Math.sin(phase) : 11), cell.y - (prism ? 6 : 10))
      .setAlpha(prism ? 0.38 + 0.19 * Math.sin(phase) : Math.max(glint, 1 - reveal))
      .setScale(prism ? 0.48 : 0.28 + (1 - reveal) * 0.12)
  }

  private animateMerge(effect: ReturnType<typeof mergeEffect>) {
    const age = this.elapsed - effect.started
    const cell = this.cells[effect.target]
    const target = cell.sprite
    cell.shine.setVisible(false)
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

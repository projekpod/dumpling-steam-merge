import { text } from './strings'
import type { Rarity } from './rarity'

const colors = [
  '#ffd6e8', '#fff3b0', '#b8f2e6', '#ffb4a2', '#c5e6a1', '#aed9e0',
  '#ddd0f8', '#ffc3b8', '#e1ed9f', '#ffe397', '#eec0eb', '#ffd0da',
]

export const faces = [
  'normal', 'blink', 'left', 'right', 'blush', 'happy', 'surprised', 'sleep',
  'leaf1', 'leaf2', 'leaf3',
] as const
export type Face = typeof faces[number]

function surface(width: number, height = width) {
  const canvas = document.createElement('canvas')
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  return { canvas, ctx }
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  ctx.beginPath()
  ctx.moveTo(x, y + size)
  ctx.bezierCurveTo(x - size * 2, y - size / 3, x - size / 2, y - size * 1.5, x, y - size / 2)
  ctx.bezierCurveTo(x + size / 2, y - size * 1.5, x + size * 2, y - size / 3, x, y + size)
  ctx.fillStyle = color
  ctx.fill()
}

export function makeMochi(level: number, face: Face, rarity: Rarity = 'normal'): HTMLCanvasElement {
  const { canvas, ctx } = surface(60)
  const ink = '#614451'
  const color = colors[level - 1]

  function oval(x: number, y: number, rx: number, ry: number, color: string, outline = false, angle = 0) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    if (outline) {
      ctx.strokeStyle = ink
      ctx.lineWidth = 1.8
      ctx.stroke()
    }
  }

  const shadow = ctx.createRadialGradient(30, 48, 1, 30, 48, 23)
  shadow.addColorStop(0, '#7041263b')
  shadow.addColorStop(1, '#70412600')
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.ellipse(30, 48, 24, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  const turn = face === 'leaf1' ? -2 : face === 'leaf2' ? 2 : face === 'leaf3' ? -1 : 0
  const skin = ctx.createLinearGradient(15, 14, 43, 49)
  const stops: Record<Rarity, string[]> = {
    normal: ['#fffaf2', color, '#dca3a9'],
    glitter: ['#fcf7ff', '#d8c7fa', '#9c80ce'],
    rainbow: ['#ffd3e5', '#fff0ab', '#a9e8da', '#b7b7f2'],
    gold: ['#fff8ca', '#d2902b', '#fff0a5', '#bd7323'],
    pink: ['#fff5fb', '#ffabd5', '#d25697'],
  }
  const tones = stops[rarity]
  tones.forEach((tone, i) => skin.addColorStop(i / (tones.length - 1), tone))

  ctx.beginPath()
  ctx.moveTo(30 + turn, 12)
  ctx.bezierCurveTo(21, 13, 8, 22, 8, 35)
  ctx.bezierCurveTo(8, 47, 17, 48, 30, 48)
  ctx.bezierCurveTo(43, 48, 52, 47, 52, 35)
  ctx.bezierCurveTo(52, 22, 39, 13, 30 + turn, 12)
  ctx.fillStyle = skin
  ctx.fill()
  ctx.lineWidth = 1.45
  ctx.strokeStyle = rarity === 'gold' ? '#915a27' : ink
  ctx.stroke()

  for (const x of [20, 26, 34, 40]) {
    ctx.beginPath()
    ctx.moveTo(30 + turn, 13)
    ctx.quadraticCurveTo(x, 17, x, x === 26 || x === 34 ? 21 : 23)
    ctx.strokeStyle = '#79516558'
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  oval(19, 27, 7, 3.8, '#ffffff91', false, -0.51)
  oval(15, 31, 2, 1.35, '#fff9')
  if (rarity === 'glitter' || rarity === 'pink' || rarity === 'gold') {
    for (const [x, y, r] of [[13, 34, 1], [18, 40, 0.8], [33, 22, 1.1], [45, 29, 1.5], [47, 38, 0.8], [38, 42, 1]]) {
      oval(x, y, r, r, rarity === 'pink' ? '#fff1fc' : '#fff7ca')
    }
  }
  if (level >= 4) oval(30 + turn, 15, Math.min(4, 2 + level / 7), 2, color, true)
  const pink = face === 'blush' ? '#f26d98' : '#f38bab'
  oval(15, 35, face === 'blush' ? 5.4 : 4, 2.5, pink)
  oval(45, 35, face === 'blush' ? 5.4 : 4, 2.5, pink)
  const glance = face === 'left' ? -2 : face === 'right' ? 2 : 0
  ctx.strokeStyle = ink
  ctx.lineWidth = 1.7
  ctx.lineCap = 'round'
  for (const x of [22, 38]) {
    if (face === 'blink' || face === 'sleep' || face === 'happy') {
      ctx.beginPath()
      ctx.moveTo(x - 3, 31)
      ctx.quadraticCurveTo(x, face === 'happy' ? 25 : 34, x + 3, 31)
      ctx.stroke()
    } else {
      oval(x + glance, 31, 3.4, face === 'surprised' ? 5 : 4.1, ink)
      oval(x + glance - 0.9, 30, 1, 1, '#fff')
    }
  }
  if (face === 'surprised' || face === 'happy') {
    oval(30, 36, face === 'happy' ? 4 : 2, 3, ink)
  } else {
    ctx.beginPath()
    ctx.arc(30 + glance / 2, 34, face === 'sleep' ? 2 : 3, 0, Math.PI)
    ctx.stroke()
  }

  if (face === 'blush') heart(ctx, 50, 10, 4, '#e96794')
  if (face === 'sleep') {
    ctx.font = '900 8px Nunito'
    ctx.fillStyle = '#75629f'
    ctx.fillText(text.sleep, 36, 11)
  }
  ctx.fillStyle = ink
  ctx.font = '900 9px Nunito'
  ctx.textAlign = 'center'
  ctx.fillText(`${text.level} ${level}`, 30, 59)
  return canvas
}

export function makeEffect(kind: 'star' | 'heart' | 'ring'): HTMLCanvasElement {
  const size = kind === 'ring' ? 64 : 16
  const { canvas, ctx } = surface(size)
  const center = size / 2
  if (kind === 'heart') {
    heart(ctx, center, center, 5, '#ff6f91')
  } else if (kind === 'ring') {
    ctx.beginPath()
    ctx.arc(center, center, 29, 0, Math.PI * 2)
    ctx.lineWidth = 2.2
    ctx.strokeStyle = '#ffed9d'
    ctx.stroke()
    ctx.lineWidth = 0.8
    ctx.strokeStyle = '#fff9df'
    ctx.stroke()
  } else {
    ctx.beginPath()
    for (let point = 0; point < 8; point++) {
      const angle = point * Math.PI / 4
      const radius = point % 2 ? 2.5 : 7
      ctx.lineTo(center + Math.sin(angle) * radius, center + Math.cos(angle) * radius)
    }
    ctx.closePath()
    ctx.fillStyle = '#ffe08a'
    ctx.fill()
    ctx.strokeStyle = '#d69062'
    ctx.stroke()
  }
  return canvas
}

export function makeRainbowSweep(): HTMLCanvasElement {
  const { canvas, ctx } = surface(23, 16)
  const color = ctx.createLinearGradient(0, 0, 23, 0)
  color.addColorStop(0, '#ff9bc500')
  color.addColorStop(0.33, '#ffe27db0')
  color.addColorStop(0.64, '#a3e6eb99')
  color.addColorStop(1, '#c8a8f800')
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(11.5, 8, 11.5, 6.5, -0.35, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

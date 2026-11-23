import { text } from './strings'
import type { Rarity } from './rarity'
import type { Area } from './areas'
import { paintFeature, speciesColors } from './dumpling-features'

const faces = [
  'normal', 'blink', 'left', 'right', 'blush', 'happy', 'surprised', 'sleep',
  'gaze', 'peek', 'sad',
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

function bodyPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.moveTo(30, 12)
  ctx.bezierCurveTo(21, 13, 8, 22, 8, 35)
  ctx.bezierCurveTo(8, 47, 17, 48, 30, 48)
  ctx.bezierCurveTo(43, 48, 52, 47, 52, 35)
  ctx.bezierCurveTo(52, 22, 39, 13, 30, 12)
}

export function makeDumpling(area: Area, level: number, face: Face, rarity: Rarity = 'normal', phase = 0, showLevel = true): HTMLCanvasElement {
  const { canvas, ctx } = surface(60)
  const ink = '#614451'
  const color = speciesColors[area][level - 1]
  const pulse = Math.sin(Math.PI * phase)

  function oval(x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
  }

  const shadow = ctx.createRadialGradient(30, 48, 1, 30, 48, 23)
  shadow.addColorStop(0, '#7041263b')
  shadow.addColorStop(1, '#70412600')
  ctx.fillStyle = shadow
  ctx.beginPath()
  ctx.ellipse(30, 48, 24, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  const skin = ctx.createLinearGradient(15, 14, 43, 49)
  const stops: Record<Rarity, string[]> = {
    normal: ['#fffaf2', color, area === 'kebun' ? '#dca3a9' : area === 'pantai' ? '#9dbed2' : '#a4b2dd'],
    glitter: ['#fcf7ff', '#d8c7fa', '#9c80ce'],
    rainbow: ['#ffd3e5', '#fff0ab', '#a9e8da', '#b7b7f2'],
    gold: ['#fff8ca', '#d2902b', '#fff0a5', '#bd7323'],
    pink: ['#fff5fb', '#ffabd5', '#d25697'],
  }
  const tones = stops[rarity]
  tones.forEach((tone, i) => skin.addColorStop(i / (tones.length - 1), tone))

  bodyPath(ctx)
  ctx.fillStyle = skin
  ctx.fill()
  ctx.lineWidth = 1.45
  ctx.strokeStyle = rarity === 'gold' ? '#915a27' : ink
  ctx.stroke()

  for (const x of [20, 26, 34, 40]) {
    ctx.beginPath()
    ctx.moveTo(30, 13)
    ctx.quadraticCurveTo(x, 17, x, x === 26 || x === 34 ? 21 : 23)
    ctx.strokeStyle = '#79516558'
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    ctx.stroke()
  }
  oval(19, 27, 7, 3.8, '#ffffff91', -0.51)
  oval(15, 31, 2, 1.35, '#fff9')
  if (rarity === 'glitter' || rarity === 'pink' || rarity === 'gold') {
    for (const [x, y, r] of [[13, 34, 1], [18, 40, 0.8], [33, 22, 1.1], [45, 29, 1.5], [47, 38, 0.8], [38, 42, 1]]) {
      oval(x, y, r, r, rarity === 'pink' ? '#fff1fc' : '#fff7ca')
    }
  }
  paintFeature(ctx, area, level, phase)
  const pink = face === 'blush' ? '#f26d98' : '#f38bab'
  const cheeks = face === 'blush' ? 5.4 : 4 + (area === 'kebun' && level === 8 ? pulse : 0)
  oval(15, 35, cheeks, 2.5, pink)
  oval(45, 35, cheeks, 2.5, pink)
  if (face === 'blush') heart(ctx, 50, 10, 4, '#e96794')
  if (face === 'sleep') {
    ctx.font = '900 8px Nunito'
    ctx.fillStyle = '#75629f'
    ctx.fillText(text.sleep, 36, 11)
  }
  if (showLevel) {
    ctx.fillStyle = ink
    ctx.font = '900 9px Nunito'
    ctx.textAlign = 'center'
    ctx.fillText(`${text.level} ${level}`, 30, 59)
  }
  return canvas
}

export function makePortrait(area: Area, level: number, silhouette: boolean) {
  if (silhouette) {
    const { canvas, ctx } = surface(60)
    const color = '#856c7d'
    bodyPath(ctx)
    ctx.fillStyle = color
    ctx.fill()
    paintFeature(ctx, area, level, 0, color)
    return canvas
  }
  const canvas = makeDumpling(area, level, 'normal', 'normal', 0, false)
  const ctx = canvas.getContext('2d')!
  for (const part of ['eyes', 'mouth'] as const) ctx.drawImage(makeFace(part), 14, 22, 32, 18)
  return canvas
}

export function makeFace(part: 'eyes' | 'brows' | 'mouth' | 'pupil', face: Face = 'normal') {
  const { canvas, ctx } = part === 'pupil' ? surface(6, 7) : surface(32, 18)
  const ink = '#614451'
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = 1.6
  ctx.lineCap = 'round'
  const oval = (x: number, y: number, rx: number, ry: number, color = ink) => {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  }
  const arc = (x: number, y: number, bend: number, width = 3) => {
    ctx.beginPath()
    ctx.moveTo(x - width, y)
    ctx.quadraticCurveTo(x, y + bend, x + width, y)
    ctx.stroke()
  }
  if (part === 'eyes') {
    const watching = face === 'gaze' || face === 'peek'
    const glance = face === 'left' ? -1.5 : face === 'right' ? 1.5 : 0
    for (const x of [8, 24]) {
      if (face === 'blink' || face === 'sleep' || (face === 'peek' && x === 8)) {
        arc(x, 9, 3)
      } else if (face === 'happy') {
        ctx.beginPath()
        ctx.moveTo(x - 3, 10)
        ctx.lineTo(x, 6)
        ctx.lineTo(x + 3, 10)
        ctx.stroke()
      } else if (watching) {
        oval(x, 9, 4.3, 5.1)
        oval(x, 9, 3.55, 4.4, '#fffaf2')
      } else {
        oval(x + glance, 9, 3.4, face === 'surprised' ? 5 : 4.1)
        oval(x + glance - 0.9, 8, 0.95, 0.95, '#fff')
      }
    }
  } else if (part === 'brows') {
    if (face !== 'peek') arc(8, 2.6, -2.8, 2.6)
    arc(24, 2.6, -2.8, 2.6)
  } else if (part === 'mouth') {
    if (face === 'gaze' || face === 'peek' || face === 'surprised') oval(16, 14.5, 2, 2.5)
    else if (face === 'happy') oval(16, 14.5, 4, 2.8)
    else if (face === 'sad') arc(16, 15, -4.4)
    else arc(16, 13, face === 'sleep' ? 2.8 : 5)
  } else {
    oval(3, 3.5, 1.78, 2.05)
    oval(2.5, 2.8, 0.53, 0.53, '#fff')
  }
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

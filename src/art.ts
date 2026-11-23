import { text } from './strings'

const colors = [
  '#ffd6e8', '#fff3b0', '#b8f2e6', '#ffb4a2', '#c5e6a1', '#aed9e0',
  '#ddd0f8', '#ffc3b8', '#e1ed9f', '#ffe397', '#eec0eb', '#ffd0da',
]

export function makeMochi(level: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 120
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  const ink = '#614451'

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

  oval(30, 49, 20, 4, '#e4c7bc')
  if (level % 3 === 1 || level > 9) {
    oval(26, 12, 4, 8, '#a9c782', true, -0.65)
    oval(34, 11, 4, 8, '#c4de98', true, 0.75)
  } else {
    oval(18, 16, 5, 8, colors[level - 1], true, -0.45)
    oval(42, 16, 5, 8, colors[level - 1], true, 0.45)
  }
  oval(30, 31, 22, 18, colors[level - 1], true)
  oval(22, 23, 7, 3, '#ffffff80', false, -0.3)
  oval(15, 35, 4, 2.5, '#f38bab')
  oval(45, 35, 4, 2.5, '#f38bab')
  for (const x of [22, 38]) {
    oval(x, 31, 3.4, 4.1, ink)
    oval(x - 0.9, 30, 1, 1, '#fff')
  }
  ctx.beginPath()
  ctx.arc(30, 34, 3, 0, Math.PI)
  ctx.strokeStyle = ink
  ctx.lineWidth = 1.5
  ctx.stroke()

  if (level >= 4) {
    oval(30, 16, 3.8, 3.8, level >= 10 ? '#f7b245' : '#fff3b0', true)
  }
  ctx.fillStyle = ink
  ctx.font = '900 9px Nunito'
  ctx.textAlign = 'center'
  ctx.fillText(`${text.level} ${level}`, 30, 59)
  return canvas
}

import type { Area } from './areas'

type Point = [number, number]
const TAU = Math.PI * 2

function texture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width * 2
  canvas.height = height * 2
  const ctx = canvas.getContext('2d')!
  ctx.scale(2, 2)
  paint(ctx)
  return canvas.toDataURL()
}

function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, tint: string, angle = 0) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, angle, 0, TAU)
  ctx.fillStyle = tint
  ctx.fill()
}

function shape(ctx: CanvasRenderingContext2D, tint: string, points: Point[]) {
  ctx.beginPath()
  ctx.moveTo(...points[0])
  for (const point of points.slice(1)) ctx.lineTo(...point)
  ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.lineWidth = 2
  ctx.fillStyle = ctx.strokeStyle = tint
  ctx.fill()
  ctx.stroke()
}

function gradient(ctx: CanvasRenderingContext2D, from: number, to: number, ...colors: string[]) {
  const fill = ctx.createLinearGradient(0, from, 0, to)
  colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color))
  return fill
}

function hill(ctx: CanvasRenderingContext2D, tint: string | CanvasGradient, left: number, middle: number, right: number) {
  ctx.beginPath()
  ctx.moveTo(-1, left)
  ctx.bezierCurveTo(140, middle, 270, right + 48, 421, right)
  ctx.lineTo(421, 691)
  ctx.lineTo(-1, 691)
  ctx.fillStyle = tint
  ctx.fill()
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tint = '#fffdf2') {
  oval(ctx, x, y, size, size * .24, tint)
  oval(ctx, x - size * .30, y - size * .10, size * .31, size * .26, tint)
  oval(ctx, x + size * .15, y - size * .15, size * .37, size * .37, tint)
}

function flower(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tint: string) {
  ctx.fillStyle = '#628b51'
  ctx.fillRect(x - size * .11, y, size * .22, size * 2.2)
  oval(ctx, x + .5 * size, y + 1.6 * size, size * .63, size * .24, '#719d57', -.57)
  for (let i = 0; i < 5; i++) {
    const angle = i * TAU / 5
    oval(ctx, x + Math.cos(angle) * size * .68, y + Math.sin(angle) * size * .68, size * .56, size * .56, tint)
  }
  oval(ctx, x, y, size * .38, size * .38, '#eab74e')
}

function pine(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tint: string, snow = '#f5fcff') {
  ctx.fillStyle = '#677e88'
  ctx.fillRect(x - size * .09, y - size * .21, size * .18, size * .29)
  for (const [i, spread] of [.49, .38, .26].entries()) {
    const base = y - (i * .24 + .07) * size
    shape(ctx, tint, [[x - spread * size, base], [x, base - size * .59], [x + spread * size, base], [x, base + .06 * size]])
    shape(ctx, snow, [[x - spread * size * .63, base - size * .22], [x, base - size * .59],
      [x + spread * size * .72, base - size * .17], [x + .05 * size, base - size * .21], [x - .08 * size, base - size * .28]])
  }
}

function shell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tint: string, rib: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(-.35)
  ctx.beginPath()
  ctx.moveTo(0, size * .47)
  ctx.bezierCurveTo(-size * .2, size * .48, -size * .67, -size * .22, -size * .45, -size * .32)
  ctx.bezierCurveTo(-size * .38, -size * .63, size * .38, -size * .63, size * .45, -size * .32)
  ctx.bezierCurveTo(size * .67, -size * .22, size * .2, size * .48, 0, size * .47)
  ctx.fillStyle = tint
  ctx.fill()
  ctx.strokeStyle = rib
  ctx.lineWidth = size * .06
  ctx.lineCap = 'round'
  for (const spread of [-.26, 0, .26]) {
    ctx.beginPath()
    ctx.moveTo(0, size * .34)
    ctx.quadraticCurveTo(size * spread * .65, -size * .12, size * spread, -size * .35)
    ctx.stroke()
  }
  ctx.restore()
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, tint: string, arms: number, angle = -TAU / 4) {
  shape(ctx, tint, Array.from({ length: arms * 2 }, (_, i) => {
    const radius = size * (i % 2 === 0 ? 1 : .37)
    const bearing = angle + i * Math.PI / arms
    return [x + Math.cos(bearing) * radius, y + Math.sin(bearing) * radius]
  }))
}

function scatter(count: number, plot: (x: number, y: number, size: number, i: number) => void) {
  for (let i = 0; i < count; i++) plot((i * .618034 + .07) % 1, (i * .414214 + .13) % 1, (i * .173 + .21) % 1, i)
}

const scenes: Record<Area, (ctx: CanvasRenderingContext2D) => void> = {
  kebun(ctx) {
    ctx.fillStyle = gradient(ctx, 0, 198, '#a7deda', '#f9f4d4')
    ctx.fillRect(0, 0, 420, 690)
    cloud(ctx, 72, 67, 49)
    cloud(ctx, 349, 77, 51, '#ffffffc9')
    hill(ctx, '#c0daa6', 152, 69, 131)
    hill(ctx, '#a8cf92', 128, 185, 117)
    hill(ctx, gradient(ctx, 161, 690, '#d5e8a9', '#b8d497'), 175, 134, 156)
    scatter(145, (x, y, r, i) => {
      const px = x * 420
      const py = 171 + y * 519
      oval(ctx, px, py, 1 + r * 3, .65 + r * 1.5, i % 2 ? '#729f665e' : '#ecf3be9c', -.35)
      if (i % 3 === 0) flower(ctx, px, py, 2 + r * 3, ['#fff8d8', '#efb3bd', '#fff1a3', '#efd7f5'][i % 4])
    })
    flower(ctx, 22, 115, 5, '#fff8da')
    flower(ctx, 397, 126, 6, '#f2bacf')
    flower(ctx, 384, 118, 4, '#fff6d5')
  },
  pantai(ctx) {
    ctx.fillStyle = gradient(ctx, 0, 147, '#8bd6e9', '#d4f1ee')
    ctx.fillRect(0, 0, 420, 690)
    oval(ctx, 359, 93, 32, 32, '#fff2bb66')
    oval(ctx, 359, 93, 24, 24, '#ffed9a')
    cloud(ctx, 74, 77, 54)
    cloud(ctx, 281, 62, 25, '#ffffefb8')
    ctx.fillStyle = gradient(ctx, 111, 275, '#59bbd3', '#a9e3dc')
    ctx.fillRect(0, 126, 420, 255)
    scatter(36, (x, y, r) => oval(ctx, x * 420, 132 + y * 95, 2 + 12 * r, .6 + r, '#dcfff0aa'))
    hill(ctx, '#abddd5', 228, 176, 188)
    hill(ctx, '#edf8de', 243, 190, 203)
    hill(ctx, gradient(ctx, 221, 684, '#fae6af', '#f5d7a2'), 252, 206, 211)
    scatter(133, (x, y, r, i) => {
      const px = x * 420
      const py = 240 + y * 450
      oval(ctx, px, py, .7 + r * 2, .5 + r, i % 2 ? '#b9864f49' : '#fff6d0')
      if (i % 19 === 0) shell(ctx, px, py, 10 + r * 8, '#e6a084', '#fff1bf')
    })
  },
  salju(ctx) {
    ctx.fillStyle = gradient(ctx, 0, 240, '#9fb8e8', '#edebfb')
    ctx.fillRect(0, 0, 420, 690)
    cloud(ctx, 348, 72, 51, '#f5f5ffac')
    shape(ctx, '#bfd4ef', [[-4, 168], [58, 91], [95, 126], [123, 98], [206, 178], [288, 98], [315, 124], [365, 80], [424, 143], [424, 238], [-4, 238]])
    shape(ctx, '#f3f7ff', [[28, 129], [58, 91], [89, 121], [67, 114], [57, 120], [50, 112]])
    shape(ctx, '#f3f7ff', [[340, 108], [365, 80], [391, 109], [371, 103], [363, 110], [356, 101]])
    hill(ctx, '#d4e7fa', 161, 149, 143)
    for (const [x, y, s] of [[19, 151, 59], [55, 151, 38], [105, 159, 49], [303, 163, 46], [359, 157, 37], [400, 145, 62]]) {
      pine(ctx, x, y, s, '#7298aa')
    }
    hill(ctx, gradient(ctx, 155, 690, '#f7faff', '#dcebf9'), 165, 125, 157)
    pine(ctx, 10, 201, 36, '#578393')
    pine(ctx, 410, 207, 45, '#5e8a9c')
    scatter(111, (x, y, r, i) => oval(ctx, x * 420, 183 + y * 507, 1 + r * 4, .7 + r, i % 2 ? '#9dbfd93d' : '#fff'))
  },
}

export const makeAreaLandscape = (area: Area) => texture(420, 690, scenes[area])

export const makeAreaBadge = (area: Area) => texture(54, 48, ctx => {
  if (area === 'kebun') {
    ctx.fillStyle = '#7fa766'
    ctx.fillRect(25.5, 10, 3, 31)
    oval(ctx, 32, 34, 10, 4.2, '#7fa766', -.5)
    oval(ctx, 22, 30, 8, 3.8, '#6b995d', .53)
    flower(ctx, 27, 15, 8, '#ef9cb6')
  } else if (area === 'pantai') {
    shell(ctx, 26, 24, 37, '#dd8f74', '#ffe7b8')
  } else {
    pine(ctx, 27, 41, 35, '#688fa5')
  }
})

export const makeBoardTrim = (area: Area) => texture(48, 40, ctx => {
  if (area === 'kebun') {
    flower(ctx, 15, 14, 6, '#ffebad')
    flower(ctx, 29, 21, 7, '#f7b7d0')
    oval(ctx, 35, 28, 8, 3.7, '#6e9c58', -.35)
  } else if (area === 'pantai') {
    shell(ctx, 14, 19, 25, '#ed9a83', '#ffe7bd')
    star(ctx, 33, 25, 11, '#e7a047', 5, -.9)
    oval(ctx, 33, 25, 1.6, 1.6, '#ffe59e')
  } else {
    star(ctx, 15, 17, 10, '#f9fcff', 4)
    star(ctx, 33, 24, 6, '#fff', 4)
    oval(ctx, 22, 30, 1.4, 1.4, '#fff')
  }
})

export const makeBackdropSprite = {
  butterfly: () => texture(22, 18, ctx => {
    oval(ctx, 6, 7, 5, 4, '#f7a5c4', .58)
    oval(ctx, 16, 7, 5, 4, '#f7a5c4', -.58)
    oval(ctx, 7, 12, 4, 2.8, '#e67da7', -.5)
    oval(ctx, 15, 12, 4, 2.8, '#e67da7', .5)
    oval(ctx, 11, 9, 1.2, 4, '#985e79')
    oval(ctx, 5.5, 6.4, 1.5, 1.2, '#fff3cf')
    oval(ctx, 16.5, 6.4, 1.5, 1.2, '#fff3cf')
  }),
  wave: () => texture(164, 16, ctx => {
    ctx.beginPath()
    ctx.moveTo(4, 11)
    ctx.bezierCurveTo(59, -4, 113, 15, 160, 4)
    ctx.strokeStyle = '#f7fff4cd'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
    oval(ctx, 70, 9, 27, 1.2, '#e3fff29c', .02)
  }),
  bubble: () => texture(16, 16, ctx => {
    oval(ctx, 8, 8, 7.3, 7.3, '#fff8ed')
    oval(ctx, 8, 8, 6, 6, '#a6e6e78f')
    oval(ctx, 5.6, 5.6, 1.9, 1.1, '#fff', -.6)
  }),
  flake: () => texture(14, 14, ctx => {
    ctx.lineWidth = 1.3
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#fff'
    for (let i = 0; i < 3; i++) {
      const x = Math.cos(i * TAU / 6) * 5.3
      const y = Math.sin(i * TAU / 6) * 5.3
      ctx.beginPath()
      ctx.moveTo(7 - x, 7 - y)
      ctx.lineTo(7 + x, 7 + y)
      ctx.stroke()
    }
  }),
  glint: () => texture(12, 12, ctx => star(ctx, 6, 6, 4.5, '#fff', 4)),
}

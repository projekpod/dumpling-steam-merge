import type { Area } from './areas'

export const speciesColors = {
  kebun: ['#ffd6e8', '#fff3b0', '#b8f2e6', '#ffb4a2', '#c5e6a1', '#aed9e0', '#ddd0f8', '#ffc3b8', '#e1ed9f', '#ffe397', '#eec0eb', '#ffd0da'],
  pantai: ['#f5d7a1', '#a9e3e9', '#ffcbbb', '#ffaa9a', '#d4bff2', '#ffd681', '#d9b593', '#8fd7ca', '#ffb0c5', '#e4e3fa', '#91bbe6', '#77c4e8'],
  salju: ['#e9f4ff', '#cfdafc', '#b7def3', '#fff0f3', '#e5cdf3', '#b2e6ee', '#acbde5', '#a9c6ee', '#b4ddd1', '#f2ddd2', '#d2c0f4', '#c7e7ff'],
}

export const signatureTimes = {
  kebun: [400, 420, 540, 360, 500, 560, 680, 500, 450, 590, 570, 650],
  pantai: [320, 400, 450, 480, 660, 520, 380, 600, 620, 700, 520, 710],
  salju: [340, 450, 400, 480, 510, 600, 520, 640, 650, 600, 780, 740],
}

type Point = [number, number]

function brush(ctx: CanvasRenderingContext2D, mask: string | undefined) {
  function oval(x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2)
    ctx.fillStyle = mask ?? color
    ctx.fill()
  }

  function shape(color: string, ...points: Point[]) {
    ctx.beginPath()
    ctx.moveTo(...points[0])
    for (const point of points.slice(1)) ctx.lineTo(...point)
    ctx.closePath()
    ctx.fillStyle = mask ?? color
    ctx.fill()
    ctx.lineWidth = 1.4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = ctx.fillStyle
    ctx.stroke()
  }

  function curve(color: string, width: number, start: Point, control: Point, end: Point) {
    ctx.beginPath()
    ctx.moveTo(...start)
    ctx.quadraticCurveTo(...control, ...end)
    ctx.strokeStyle = mask ?? color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  function rotate(x: number, y: number, degrees: number, draw: () => void) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(degrees * Math.PI / 180)
    ctx.translate(-x, -y)
    draw()
    ctx.restore()
  }

  return { oval, shape, curve, rotate }
}

type Feature = (pen: ReturnType<typeof brush>, pulse: number, phase: number) => void
const leaf = '#67994e'
const green = '#4b855e'
const blue = '#558cba'
const ice = '#81b6d3'
const shell = '#db7969'
const coral = '#df6e87'

const features: Record<Area, Feature[]> = {
  kebun: [
    ({ oval, rotate }, p) => rotate(30, 15, 12 * p, () => {
      oval(26, 11, 7, 3, leaf, 0.55)
      oval(34, 10, 7, 3, green, -0.6)
    }),
    ({ oval }, p) => {
      oval(27 - 3 * p, 12, 3, 6, '#d79f36', -0.36)
      oval(33 + 3 * p, 12, 3, 6, '#d79f36', 0.36)
      oval(30, 10, 3.5, 5, '#efbd54')
    },
    ({ oval }) => {
      oval(25, 13, 3, 6, '#6abbad', -0.45)
      oval(35, 13, 3, 6, '#6abbad', 0.45)
      oval(30, 10, 3.5, 7, '#87cebf')
    },
    ({ oval }) => {
      oval(31, 11, 7, 3.1, leaf, -0.55)
      for (const [x, y] of [[37, 17], [41, 20], [37, 21]]) oval(x, y, 1.15, 1.15, '#c96c43')
    },
    ({ oval, curve, rotate }, p) => rotate(30, 16, 30 * p, () => {
      curve(green, 1.5, [31, 10], [29, 15], [34, 18])
      oval(27, 10, 3.5, 3.5, leaf)
      oval(33, 10, 3.5, 3.5, leaf)
      oval(30, 6, 3.5, 3.5, green)
    }),
    ({ oval, shape }, p) => {
      oval(34, 9 + 4 * p, 4.5, 5, '#6ab5c5')
      shape('#6ab5c5', [30, 9 + 4 * p], [34, 2 + 4 * p], [38, 9 + 4 * p])
    },
    ({ oval, curve, rotate }, p, phase) => rotate(28, 16, 10 * p * Math.cos(phase * Math.PI), () => {
      curve(green, 1.5, [28, 16], [30, 10], [35, 3])
      oval(31, 10, 4, 2.3, '#936ac2', -0.4)
      oval(33, 7, 3.7, 2.2, '#a27bd3', -0.5)
      oval(35, 4, 3.2, 2, '#ae8bdd', -0.6)
    }),
    ({ oval }) => {
      oval(27, 12, 5, 4.5, '#ec8a83', 0.3)
      oval(33, 12, 5, 4.5, '#ed9a91', -0.3)
      oval(35, 8, 5, 2, leaf, -0.55)
    },
    ({ curve }) => {
      for (const x of [15, 19, 23]) curve('#94ac56', 1.3, [x + 6, 18], [x, 20], [x - 2, 28])
    },
    ({ oval }, p) => {
      for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        oval(32 + x * (4 + 3 * p), 10 + y * (4 + 3 * p), 3.4, 3.4, '#edaa50')
      }
      oval(32, 10, 2.7, 2.7, '#bf6d36')
    },
    ({ oval }, _p, t) => {
      const jump = (i: number) => Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, t * 2 - i * 0.5))))
      oval(25, 11 - 3 * jump(0), 4, 4, '#ab649f')
      oval(31, 8 - 3 * jump(1), 4.7, 4.7, '#bc75b2')
      oval(36, 12 - 3 * jump(2), 4, 4, '#9b5798')
    },
    ({ oval, shape, rotate }, p) => rotate(30, 14, 5 * p, () => {
      const y = 14 - 5 * p
      shape('#d29639', [21, y], [20, y - 8], [26, y - 5], [30, y - 13], [34, y - 5], [40, y - 8], [39, y])
      oval(30, y - 4, 2, 2, '#fbd6ee')
    }),
  ],
  pantai: [
    ({ oval }, p) => {
      oval(30, 13, 8, 2.6, '#daa566')
      for (const [x, y] of [[14, 30], [40, 20], [46, 26]]) oval(x, y + 2 * p, 1.65, 1.65, '#b98961')
    },
    ({ oval, curve }, p) => {
      oval(25 - 5 * p, 10, 3.1, 5, '#74c4dd', -0.5)
      oval(35 + 5 * p, 8, 3.2, 5.3, '#59b1c9', 0.5)
      curve('#6caec6', 1.6, [39, 19], [43, 14], [47, 22])
    },
    ({ shape, curve, rotate }, p) => rotate(29, 18, -18 * p, () => {
      shape(shell, [29, 18], [18, 9], [21, 6], [29, 4], [37, 6], [40, 9])
      for (const x of [23, 29, 35]) curve('#f7ad98', 1.15, [29, 16], [x, 12], [x, 7])
    }),
    ({ curve, rotate }, _p, t) => {
      for (const side of [-1, 1]) {
        const x = 30 + side * 20
        const pulse = Math.max(0, Math.sin(Math.PI * (2 * t - (side + 1) / 2)))
        rotate(x, 27, -side * 25 * pulse, () => curve(shell, 4.8, [x, 29], [x + side * 12, 26], [x + side * 3, 17]))
      }
    },
    ({ oval, curve }, p) => {
      oval(30, 12, 9 + 4 * p, 6, '#a184ca')
      for (const x of [24, 30, 36]) curve('#946ab8', 1.8, [x, 14], [x - 2, 21], [x, 23])
    },
    ({ shape, rotate }, p) => rotate(33, 12, -15 * p, () => {
      const points: Point[] = Array.from({ length: 10 }, (_, i) => {
        const radius = i % 2 ? 4.5 : 8.5
        const angle = i * Math.PI / 5 - Math.PI / 2
        return [33 + radius * Math.cos(angle), 12 + radius * Math.sin(angle)]
      })
      shape('#eb9a3e', ...points)
    }),
    ({ oval }, p) => {
      oval(33, 9, 8, 2.5, green, -0.45)
      for (const [x, y] of [[25, 17], [31, 19], [37, 17]]) oval(x, y - 2 * p, 1.55, 1.55, '#94674e')
    },
    ({ shape, rotate }, _p, t) => {
      shape('#48a49e', [25, 15], [33, 5], [35, 16])
      rotate(48, 31, 14 * Math.sin(t * 4 * Math.PI), () => {
        shape('#48a49e', [46, 31], [58, 23], [55, 32])
        shape('#48a49e', [46, 31], [57, 39], [55, 31])
      })
    },
    ({ curve }, _p, t) => {
      for (const [i, height] of [6, 11, 8].entries()) {
        const x = 24 + i * 6
        const pulse = Math.max(0, Math.sin(Math.PI * (2 * t - i / 2)))
        curve(coral, 4.2, [x, 17], [x + 1, 13], [x + 2, 16 - height + 4 * pulse])
      }
    },
    ({ oval, curve }, p) => {
      curve('#9d83bf', 3.6, [23, 11], [28, 20], [37, 13])
      oval(30, 10, 4.5, 4.5, '#fffdf9')
      curve('#b6a0d5', 3, [23, 11], [30, 0 + 10 * p], [37, 10 + 3 * p])
    },
    ({ shape, curve }, p) => {
      shape(blue, [12, 27], [3, 34 - 5 * p], [14, 42], [21, 35])
      shape(blue, [48, 27], [57, 34 - 5 * p], [46, 42], [39, 35])
      curve(blue, 1.8, [46, 38], [54, 45], [56, 50])
    },
    ({ curve, oval, rotate }, p) => rotate(33, 14, 24 * p, () => {
      curve(blue, 4.2, [21, 16], [29, -2], [39, 10])
      curve(blue, 3.2, [39, 10], [38, 15], [33, 11])
      oval(42, 8, 2.1 - p, 2.1 - p, '#7ac0e0')
      oval(46, 13, 1.5 - p * 0.5, 1.5 - p * 0.5, '#7ac0e0')
    }),
  ],
  salju: [
    ({ oval }, p) => {
      oval(30, 11 - 3 * p, 6.4, 4.4, '#aed4ed')
      for (const [x, y] of [[16, 28], [40, 19], [45, 25]]) oval(x, y, 1.4, 1.4, '#82b9db')
    },
    ({ curve, rotate }, p) => {
      curve('#8669bc', 4, [13, 39], [28, 48], [46, 40])
      rotate(45, 41, 16 * p, () => curve('#986fc3', 4, [45, 41], [47, 44], [49, 50]))
    },
    ({ shape, oval }, p) => {
      const x = 3 * p
      shape(ice, [32, 34], [34 + x, 40], [29, 40])
      oval(32 + x, 38, 1, 1, '#ecf9ff')
    },
    ({ oval }, _p, t) => {
      const wobble = 2 * Math.sin(4 * Math.PI * t)
      oval(30, 15, 10, 3.8, '#dda1b6')
      oval(30 + wobble, 11, 8, 3.8, '#e8b4c5')
      oval(30 + wobble, 6, 2.6, 2.6, '#bd6381')
    },
    ({ oval, curve }, _p, t) => {
      curve('#9269b1', 2.5, [9, 25], [30, -1], [51, 25])
      oval(10 + 2 * Math.max(0, Math.sin(t * 2 * Math.PI)), 28, 4.4, 6.5, '#af83c5')
      oval(50 - 2 * Math.max(0, -Math.sin(t * 2 * Math.PI)), 28, 4.4, 6.5, '#af83c5')
    },
    ({ curve, rotate }, _p, t) => rotate(32, 13, 60 * t, () => {
      curve('#6cadd0', 1.7, [32, 6], [32, 13], [32, 20])
      curve('#6cadd0', 1.7, [26, 9.5], [32, 13], [38, 16.5])
      curve('#6cadd0', 1.7, [26, 16.5], [32, 13], [38, 9.5])
    }),
    ({ oval, shape }) => {
      oval(30, 39, 12, 7, '#fff4e7')
      oval(9, 35, 3, 7, '#7a8dc5', 0.3)
      oval(51, 35, 3, 7, '#7a8dc5', -0.3)
      shape('#e8a249', [27, 35], [33, 35], [30, 38])
    },
    ({ shape, curve }, _p, t) => {
      shape('#91b8e1', [21, 16], [24, 6], [33, 3], [40, 8], [43, 15], [32, 19])
      const width = 1 + Math.abs(Math.sin(t * 2 * Math.PI))
      curve('#5c92c4', width, [27, 8], [31, 8], [30, 13])
      curve('#5c92c4', width, [36, 9], [33, 11], [34, 15])
    },
    ({ shape, oval }, p) => {
      shape(green, [20, 15], [29, 4], [38, 15])
      shape('#72aa95', [23, 9], [29, 1], [35, 9])
      oval(29, 5 + 3 * p, 4.8, 2.5, '#d1eafb')
    },
    ({ oval }, p) => {
      oval(17, 16, 5.1, 5.1, '#ba8e7d')
      oval(43, 16, 5.1, 5.1, '#ba8e7d')
      oval(30, 45, 11 * (1 - 0.2 * p), 4.6, '#ebb1bc')
    },
    ({ curve }, _p, t) => {
      for (const [i, tint] of ['#67bba9', '#8868c4', '#d786b4'].entries()) {
        const shift = 4 * Math.max(0, Math.sin(Math.PI * (2 * t - i * 0.5)))
        curve(tint, 2.2, [19 + i * 4 + shift, 14 - i * 2], [30 + shift, 1 + i], [37 + i * 2 + shift, 15 - i * 2])
      }
    },
    ({ shape }, p) => {
      for (const [x, height] of [[23, 7], [30, 13], [37, 7]]) {
        shape('#7aafd3', [x - 3.6, 15], [x, 15 - height], [x + 3.6, 15])
      }
      const y = 12 - 4 * p
      shape(p > 0.65 ? '#fff9ff' : '#d9c5f3', [30, y - 2.5], [32, y], [30, y + 2.5], [28, y])
    },
  ],
}

export function paintFeature(ctx: CanvasRenderingContext2D, area: Area, level: number, phase: number, mask?: string) {
  features[area][level - 1](brush(ctx, mask), Math.sin(phase * Math.PI), phase)
}

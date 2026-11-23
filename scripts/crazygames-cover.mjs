export function drawCover({ width, height }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const wide = width > height
  const unit = Math.min(width, height) / 800

  function oval(x, y, rx, ry, fill) {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI)
    ctx.fillStyle = fill
    ctx.fill()
  }

  function gradient(x, y, x2, y2, colors) {
    const fill = ctx.createLinearGradient(x, y, x2, y2)
    colors.forEach((color, i) => fill.addColorStop(i / (colors.length - 1), color))
    return fill
  }

  function spark(x, y, size, fill) {
    ctx.beginPath()
    ctx.moveTo(x, y - size)
    ctx.quadraticCurveTo(x + size * .22, y - size * .22, x + size * .75, y)
    ctx.quadraticCurveTo(x + size * .22, y + size * .22, x, y + size)
    ctx.quadraticCurveTo(x - size * .22, y + size * .22, x - size * .75, y)
    ctx.quadraticCurveTo(x - size * .22, y - size * .22, x, y - size)
    ctx.fillStyle = fill
    ctx.fill()
  }

  function mochi(x, y, size, colors, angle, eyes) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.scale(size, size)
    ctx.beginPath()
    ctx.moveTo(0, -89)
    ctx.bezierCurveTo(-27, -83, -99, -48, -101, 10)
    ctx.bezierCurveTo(-106, 65, -67, 70, 0, 70)
    ctx.bezierCurveTo(67, 70, 106, 65, 101, 10)
    ctx.bezierCurveTo(99, -48, 27, -83, 0, -89)
    ctx.fillStyle = gradient(-75, -85, 85, 70, colors)
    ctx.shadowColor = '#69452c55'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 10
    ctx.fill()
    ctx.shadowColor = 'transparent'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#744450'
    ctx.stroke()
    ctx.lineCap = 'round'
    for (const end of [-39, -16, 16, 39]) {
      ctx.beginPath()
      ctx.moveTo(0, -85)
      ctx.quadraticCurveTo(end, -71, end * 1.17, -48)
      ctx.strokeStyle = '#75424c5c'
      ctx.lineWidth = 3
      ctx.stroke()
    }
    ctx.save()
    ctx.translate(-52, -20)
    ctx.rotate(-.53)
    oval(0, 0, 29, 13, '#fff9')
    ctx.restore()
    oval(-73, -1, 6, 5, '#fffd')
    oval(-57, 29, 17, 9, '#e46c9873')
    oval(57, 29, 17, 9, '#e46c9873')
    for (const eye of [-32, 32]) {
      if (eyes === 'happy') {
        ctx.beginPath()
        ctx.moveTo(eye - 10, 20)
        ctx.quadraticCurveTo(eye, 0, eye + 10, 20)
        ctx.strokeStyle = '#472e36'
        ctx.lineWidth = 5
        ctx.stroke()
      } else {
        oval(eye, 17, 10, 13, '#472e36')
        oval(eye - 3, 13, 3, 3, '#fffaf0')
      }
    }
    ctx.beginPath()
    ctx.arc(0, 27, 9, 0, Math.PI)
    ctx.lineWidth = 4
    ctx.strokeStyle = '#472e36'
    ctx.stroke()
    spark(66, -19, 12, '#fff8')
    ctx.restore()
  }

  ctx.fillStyle = gradient(0, 0, width, height, ['#fff5db', '#f8e1bd', '#efd0ac'])
  ctx.fillRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * .54, height * .38, 0, width * .54, height * .38, height * .72)
  glow.addColorStop(0, '#fffdf7dc')
  glow.addColorStop(1, '#fffdf700')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  for (const [x, y, scale] of [[.09, .17, 1.3], [.87, .13, .8], [.77, .78, 1], [.13, .77, .7], [.45, .92, .7]]) {
    spark(width * x, height * y, unit * 25 * scale, '#fff9ea')
  }
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(width * (.5 + side * .47), height * .91)
    ctx.rotate(side * .6)
    ctx.scale(unit, unit)
    oval(0, 0, 20, 90, '#bd936543')
    ctx.rotate(side * .77)
    oval(0, -24, 22, 85, '#bd93652b')
    ctx.restore()
  }

  const titleX = width * (wide ? .255 : .5)
  const titleY = height * (wide ? .38 : .18)
  const font = width * (wide ? .082 : .14)
  ctx.font = `1000 ${font}px Nunito`
  ctx.textAlign = 'center'
  ctx.lineJoin = 'round'
  ctx.lineWidth = font * .065
  ctx.strokeStyle = '#fff7e6'
  ctx.fillStyle = '#4c3027'
  const title = wide ? ['Kebun', 'Mochi'] : ['Kebun Mochi']
  title.forEach((line, index) => {
    const y = titleY + index * font * .95
    ctx.strokeText(line, titleX, y)
    ctx.fillText(line, titleX, y)
  })

  ctx.save()
  ctx.translate(width * (wide ? .706 : .5), height * (wide ? .61 : .62))
  const basketScale = unit * (wide ? 1.08 : .96)
  ctx.scale(basketScale, basketScale)

  for (const [x, y, angle] of [[-111, -167, -.2], [15, -214, .08], [122, -154, .2]]) {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    ctx.beginPath()
    ctx.moveTo(-21, 35)
    ctx.bezierCurveTo(35, -4, -32, -28, 7, -69)
    ctx.bezierCurveTo(-4, -29, 66, -12, 3, 37)
    ctx.fillStyle = gradient(0, -65, 0, 32, ['#ffffff00', '#fffaf0da'])
    ctx.fill()
    ctx.restore()
  }

  oval(0, 132, 292, 47, '#78523335')
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(-302, 19)
  ctx.bezierCurveTo(-305, 184, 305, 184, 302, 19)
  ctx.closePath()
  ctx.clip()
  ctx.fillStyle = gradient(0, 17, 0, 150, ['#e6b77b', '#ce8d51', '#a96a3c'])
  ctx.fillRect(-312, 12, 624, 160)
  for (let x = -306; x < 310; x += 18) {
    ctx.fillStyle = x % 36 ? '#ffd09581' : '#ac703b40'
    ctx.fillRect(x, 10, 9, 161)
  }
  ctx.restore()

  oval(0, 19, 302, 99, '#ab7343')
  oval(0, 13, 294, 92, '#f0c28a')
  oval(0, 12, 267, 72, '#b57944')
  oval(0, 9, 250, 63, '#eac597')
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(0, 9, 250, 63, 0, 0, Math.PI * 2)
  ctx.clip()
  for (let y = -55; y < 74; y += 13) {
    ctx.fillStyle = '#aa6d4448'
    ctx.fillRect(-260, y, 520, 4)
  }
  for (let x = -250; x < 254; x += 21) {
    ctx.fillStyle = '#a76f4542'
    ctx.fillRect(x, -60, 5, 145)
  }
  ctx.restore()

  mochi(-149, -36, .9, ['#fff8eb', '#abdace', '#74a9a7'], -.13, 'happy')
  mochi(150, -40, .91, ['#fff5e9', '#d9c7f4', '#a990d0'], .14, 'open')
  mochi(0, -28, 1.32, ['#fffaf1', '#ffc2d5', '#e988a9'], .025, 'open')
  spark(-230, -107, 23, '#fffdf3')
  spark(213, -136, 26, '#fffdf3')
  spark(238, -94, 12, '#fff4de')
  ctx.restore()
  return canvas.toDataURL('image/jpeg', .94).split(',')[1]
}

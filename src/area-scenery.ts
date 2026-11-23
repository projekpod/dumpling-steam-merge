import { makeAreaBadge, makeAreaLandscape, makeBackdropSprite, makeBoardTrim } from './area-art'
import { areas, type Area } from './areas'

type Sprite = keyof typeof makeBackdropSprite

interface ElementPose {
  sprite: Sprite
  x: number
  y: number
  width: number
  period: number
  delay: number
}

const backdrops: Record<Area, ElementPose[]> = {
  kebun: [[12, 17], [86, 14], [4, 49], [96, 68], [23, 88]].map(([x, y], i) =>
    ({ sprite: 'butterfly', x, y, width: 12 + (i % 3) * 3, period: 7 + i, delay: -i * 1.7 })),
  pantai: [
    ...[[0, 22], [38, 23.5], [72, 26]].map(([x, y], i): ElementPose =>
      ({ sprite: 'wave', x, y, width: 125, period: 7 + i, delay: -i * 2.3 })),
    ...[[6, 36], [95, 39], [4, 59], [97, 53], [7, 78], [92, 85], [19, 91], [88, 30]].map(([x, y], i): ElementPose =>
      ({ sprite: 'bubble', x, y, width: 6 + (i % 4) * 3, period: 6 + i % 4, delay: -i * 1.3 })),
  ],
  salju: Array.from({ length: 13 }, (_, i) => ({
    sprite: 'flake', x: (i * 19 + 5) % 100, y: i * 4 - 2,
    width: 4 + (i % 4) * 2, period: 9 + i % 5, delay: -i * 2.3,
  })),
}

const glints: ElementPose[] = [[2.5, 31], [98, 57], [64, 97]].map(([x, y], i) =>
  ({ sprite: 'glint', x, y, width: 12, period: 4 + i, delay: -i * 1.5 }))

export function mountAreaScenery(app: HTMLElement) {
  const landscape = app.querySelector<HTMLImageElement>('#area-landscape')!
  const backdrop = app.querySelector('#area-motion')!
  const boardMotion = app.querySelector('#board-motion')!
  const board = app.querySelector<HTMLElement>('.board')!
  const scenes = new Map<Area, { landscape: string; trim: string }>()
  const textures = new Map<Sprite, string>()
  let displayedArea: Area | undefined

  for (const area of areas) {
    app.querySelector<HTMLImageElement>(`[data-area-option="${area}"] img`)!.src = makeAreaBadge(area)
  }

  function particle({ sprite, x, y, width, period, delay }: ElementPose) {
    if (!textures.has(sprite)) textures.set(sprite, makeBackdropSprite[sprite]())
    const image = new Image()
    image.alt = ''
    image.className = `area-particle ${sprite}`
    image.src = textures.get(sprite)!
    image.style.left = `${x}%`
    image.style.setProperty('--sprite-top', `${y}%`)
    image.style.setProperty('--sprite-width', `${width}px`)
    image.style.animationDuration = `${period}s`
    image.style.animationDelay = `${delay}s`
    return image
  }

  return (area: Area) => {
    if (area === displayedArea) return
    displayedArea = area
    if (!scenes.has(area)) scenes.set(area, { landscape: makeAreaLandscape(area), trim: makeBoardTrim(area) })
    const art = scenes.get(area)!
    landscape.src = art.landscape
    board.style.setProperty('--board-trim', `url("${art.trim}")`)
    backdrop.replaceChildren(...backdrops[area].map(particle))
    boardMotion.replaceChildren(...(area === 'salju' ? glints.map(particle) : []))
  }
}

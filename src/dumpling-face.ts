import Phaser from 'phaser'
import { makeFace, type Face } from './art'

const expressions = ['normal', 'blink', 'left', 'right', 'happy', 'surprised', 'sleep', 'gaze', 'peek', 'sad'] as const

export function loadFaces() {
  const mouths = Object.fromEntries(expressions.map(face => [face, makeFace('mouth', face)]))
  const layers = Object.fromEntries(expressions.map(face => {
    const canvas = makeFace('eyes', face)
    const ctx = canvas.getContext('2d')!
    if (face === 'gaze' || face === 'peek') ctx.drawImage(makeFace('brows', face), 0, 0, 32, 18)
    ctx.drawImage(mouths[face], 0, 0, 32, 18)
    return [face, canvas]
  }))
  return { layers, mouths, pupil: makeFace('pupil') }
}

export class DumplingSprite extends Phaser.GameObjects.Image {
  private features: HTMLCanvasElement
  private gaze = false
  private peek = false
  private gazeX = 0
  private gazeY = 0

  constructor(scene: Phaser.Scene, skin: string, private readonly faces: ReturnType<typeof loadFaces>) {
    super(scene, 0, 0, skin)
    this.features = faces.layers.normal
    scene.add.existing(this)
  }

  setLook(skin: string, face: Face, sunglasses: boolean) {
    if (this.texture.key !== skin) this.setTexture(skin)
    const expression = face === 'blush' ? 'normal' : face
    this.features = sunglasses ? this.faces.mouths[expression] : this.faces.layers[expression]
    this.gaze = !sunglasses && expression === 'gaze'
    this.peek = !sunglasses && expression === 'peek'
    return this
  }

  lookAt(x: number, y: number) {
    this.gazeX = x
    this.gazeY = y
  }

  // The skin, static face and moving pupils share the same transform.
  renderCanvas(renderer: Phaser.Renderer.Canvas.CanvasRenderer, _source: DumplingSprite,
    camera: Phaser.Cameras.Scene2D.Camera, parent?: Phaser.GameObjects.Components.TransformMatrix) {
    const ctx = renderer.currentContext
    if (!Phaser.Renderer.Canvas.SetTransform(renderer, ctx, this, camera, parent)) return
    camera.addToRenderList(this)
    ctx.drawImage(this.frame.source.image as HTMLCanvasElement, -60, -60)
    ctx.drawImage(this.features, -32, -16)
    if (this.gaze || this.peek) {
      const y = this.gazeY - 5
      if (this.gaze) ctx.drawImage(this.faces.pupil, this.gazeX - 22, y)
      ctx.drawImage(this.faces.pupil, this.gazeX + 10, y)
    }
    ctx.restore()
  }
}

import Phaser from 'phaser'
import { makeFace, type Face } from './art'

const expressions = ['normal', 'blink', 'left', 'right', 'happy', 'surprised', 'sleep', 'gaze', 'peek', 'sad'] as const

export function loadFaces() {
  return {
    eyes: Object.fromEntries(expressions.map(face => [face, makeFace('eyes', face)])),
    mouth: Object.fromEntries(expressions.map(face => [face, makeFace('mouth', face)])),
    brows: { gaze: makeFace('brows', 'gaze'), peek: makeFace('brows', 'peek') },
    pupil: makeFace('pupil'),
  }
}

export class DumplingSprite extends Phaser.GameObjects.Image {
  private eyes: HTMLCanvasElement
  private mouth: HTMLCanvasElement
  private brows?: HTMLCanvasElement
  private expression: Face = 'normal'
  private gazeX = 0
  private gazeY = 0

  constructor(scene: Phaser.Scene, skin: string, private readonly faces: ReturnType<typeof loadFaces>) {
    super(scene, 0, 0, skin)
    this.eyes = faces.eyes.normal
    this.mouth = faces.mouth.normal
    scene.add.existing(this)
  }

  setLook(skin: string, face: Face) {
    if (this.texture.key !== skin) this.setTexture(skin)
    const expression = face.startsWith('leaf') || face === 'blush' ? 'normal' : face
    if (this.expression === expression) return this
    this.expression = expression
    this.eyes = this.faces.eyes[expression]
    this.mouth = this.faces.mouth[expression]
    this.brows = expression === 'gaze' || expression === 'peek' ? this.faces.brows[expression] : undefined
    return this
  }

  lookAt(x: number, y: number) {
    this.gazeX = x
    this.gazeY = y
  }

  // Apply the transform once so all six layers share the squeeze, rotation and position.
  renderCanvas(renderer: Phaser.Renderer.Canvas.CanvasRenderer, _source: DumplingSprite,
    camera: Phaser.Cameras.Scene2D.Camera, parent?: Phaser.GameObjects.Components.TransformMatrix) {
    const ctx = renderer.currentContext
    if (!Phaser.Renderer.Canvas.SetTransform(renderer, ctx, this, camera, parent)) return
    camera.addToRenderList(this)
    ctx.drawImage(this.frame.source.image as HTMLCanvasElement, -60, -60)
    ctx.drawImage(this.eyes, -32, -16)
    if (this.brows) {
      const y = this.gazeY - 5
      if (this.expression === 'gaze') ctx.drawImage(this.faces.pupil, this.gazeX - 22, y)
      ctx.drawImage(this.faces.pupil, this.gazeX + 10, y)
      ctx.drawImage(this.brows, -32, -16)
    }
    ctx.drawImage(this.mouth, -32, -16)
    ctx.restore()
  }
}

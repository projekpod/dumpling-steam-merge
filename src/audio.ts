import type { SaveStore } from './platform'

const key = 'kebun-mochi:mute'

const notes = {
  pop: [390, 210],
  plop: [480, 290],
  cling: [660, 880],
  shimmer: [590, 1080],
  squish: [240, 112],
} as const

export class GardenAudio {
  private context?: AudioContext
  private master?: GainNode
  private blocked = false
  private portalMuted = false
  private userMuted = false

  constructor(private readonly store: SaveStore) {
    try {
      this.userMuted = store.getItem(key) === 'true'
    } catch {
      // Keep the setting in memory if storage is blocked.
    }
  }

  get muted() { return this.userMuted || this.portalMuted }
  get locked() { return this.portalMuted }

  toggle() {
    if (this.portalMuted) return
    this.userMuted = !this.userMuted
    try {
      this.store.setItem(key, String(this.userMuted))
    } catch {
      // Keep the setting in memory if storage is blocked.
    }
    this.updateOutput()
    if (!this.userMuted) this.play('cling')
  }

  setBlocked(value: boolean) {
    this.blocked = value
    this.updateOutput()
  }

  setPortalMuted(value: boolean) {
    this.portalMuted = value
    this.updateOutput()
  }

  private updateOutput() {
    const silent = this.muted || this.blocked
    if (this.master) this.master.gain.value = silent ? 0 : 1
    if (silent && this.context?.state === 'running') void this.context.suspend().catch(() => {})
  }

  play(sound: keyof typeof notes) {
    if (this.muted || this.blocked || !window.AudioContext) return
    const context = this.context ??= new AudioContext()
    if (!this.master) {
      this.master = context.createGain()
      this.master.connect(context.destination)
    }
    void context.resume().catch(() => {})
    const start = context.currentTime
    const oscillator = context.createOscillator()
    const volume = context.createGain()
    const [from, to] = notes[sound]
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(from, start)
    oscillator.frequency.exponentialRampToValueAtTime(to, start + 0.09)
    volume.gain.setValueAtTime(0.001, start)
    volume.gain.exponentialRampToValueAtTime(sound === 'pop' ? 0.15 : 0.09, start + 0.015)
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.17)
    oscillator.connect(volume)
    volume.connect(this.master)
    oscillator.onended = () => {
      oscillator.disconnect()
      volume.disconnect()
    }
    oscillator.start(start)
    oscillator.stop(start + 0.18)
  }
}

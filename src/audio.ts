const key = 'kebun-mochi:mute'

const notes = {
  pop: [390, 210],
  plop: [480, 290],
  cling: [660, 880],
} as const

export class GardenAudio {
  private context?: AudioContext
  muted = false

  constructor() {
    try {
      this.muted = localStorage.getItem(key) === 'true'
    } catch {
      // Keep the setting in memory if storage is blocked.
    }
  }

  toggle() {
    this.muted = !this.muted
    try {
      localStorage.setItem(key, String(this.muted))
    } catch {
      // Keep the setting in memory if storage is blocked.
    }
    if (this.muted) this.pause()
    else this.play('cling')
  }

  pause() {
    if (this.context?.state === 'running') void this.context.suspend().catch(() => {})
  }

  play(sound: keyof typeof notes) {
    if (this.muted || !window.AudioContext) return
    const context = this.context ??= new AudioContext()
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
    volume.connect(context.destination)
    oscillator.onended = () => {
      oscillator.disconnect()
      volume.disconnect()
    }
    oscillator.start(start)
    oscillator.stop(start + 0.18)
  }
}

import type { SaveStore } from './platform'
import { GardenMusic } from './music'
import { ECONOMY_VOICES, MAX_VOICES, Synth } from './synth'

const key = 'kebun-mochi:mute'
export type Volume = 'music' | 'effects'
const volumeKey = (channel: Volume) => `kebun-mochi:volume-${channel}`
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
  private outputs?: Record<Volume, GainNode>
  private synth?: Synth
  private music?: GardenMusic
  private blocked = false
  private portalMuted = false
  private userMuted = false
  private sleeping = false
  private economy = false
  private volumes = { music: 0.55, effects: 1 }

  constructor(private readonly store: SaveStore) {
    try {
      this.userMuted = store.getItem(key) === 'true'
      for (const channel of ['music', 'effects'] as const) {
        const saved = store.getItem(volumeKey(channel))
        const value = Number(saved)
        if (saved !== null && Number.isFinite(value) && value >= 0 && value <= 1) this.volumes[channel] = value
      }
    } catch {
      // Keep the settings in memory if storage is blocked.
    }
  }

  get muted() { return this.userMuted || this.portalMuted }
  get locked() { return this.portalMuted }

  volume(channel: Volume) { return this.volumes[channel] }

  setVolume(channel: Volume, value: number) {
    this.volumes[channel] = value
    const output = this.outputs?.[channel]
    if (output) output.gain.setTargetAtTime(value, output.context.currentTime, 0.025)
    this.persist(volumeKey(channel), String(value))
  }

  private persist(name: string, value: string) {
    try { this.store.setItem(name, value) } catch {
      // Keep the setting in memory if storage is blocked.
    }
  }

  toggle() {
    if (this.portalMuted) return
    this.userMuted = !this.userMuted
    this.persist(key, String(this.userMuted))
    this.updateOutput()
    if (!this.userMuted) this.play('cling')
  }

  unlock() {
    if (this.blocked || !window.AudioContext) return
    if (!this.context) {
      const context = this.context = new AudioContext()
      this.master = context.createGain()
      this.master.connect(context.destination)
      this.outputs = { music: context.createGain(), effects: context.createGain() }
      for (const channel of ['music', 'effects'] as const) {
        this.outputs[channel].gain.value = this.volumes[channel]
        this.outputs[channel].connect(this.master)
      }
      this.synth = new Synth(context)
      this.music = new GardenMusic(context, this.synth, this.outputs.music)
      this.setEconomy(this.economy)
      this.setSleeping(this.sleeping)
    }
    this.updateOutput()
  }

  setBlocked(value: boolean) {
    this.blocked = value
    this.updateOutput()
  }

  setPortalMuted(value: boolean) {
    this.portalMuted = value
    this.updateOutput()
  }

  setEconomy(value: boolean) {
    this.economy = value
    if (this.synth) this.synth.limit = value ? ECONOMY_VOICES : MAX_VOICES
    this.music?.setEconomy(value)
  }

  setSleeping(value: boolean) {
    this.sleeping = value
    this.music?.setSleeping(value)
  }

  private updateOutput() {
    if (!this.context || !this.master) return
    const context = this.context
    const silent = this.muted || this.blocked
    this.master.gain.value = silent ? 0 : 1
    if (silent) {
      this.music?.pause()
      void context.suspend().catch(() => {})
    } else {
      void context.resume().then(() => {
        if (!this.muted && !this.blocked && context.state === 'running') this.music?.resume()
      }).catch(() => {})
    }
  }

  play(sound: keyof typeof notes) {
    if (this.muted || this.blocked || !this.synth || !this.outputs || !this.volumes.effects) return
    const [from, to] = notes[sound]
    this.synth.effect(from, to, this.outputs.effects, sound === 'pop' ? 0.15 : 0.09)
  }

  jingle(occasion: 'rare' | 'combo') {
    if (this.muted || this.blocked || !this.context || !this.synth || !this.outputs || !this.volumes.effects) return
    const at = this.context.currentTime
    const synth = this.synth
    const effects = this.outputs.effects
    const melody = occasion === 'rare' ? [72, 79, 81, 84] : [72, 76, 79, 81]
    this.music?.duckForJingle()
    melody.forEach((midi, index) => {
      synth.note(occasion === 'rare' ? 'box' : 'marimba', midi, at + index * 0.105, effects, false)
    })
  }
}

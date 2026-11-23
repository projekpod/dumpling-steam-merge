import { CROSSFADE, LULLABY, nextAwakeSong, pitch, songDuration, songs } from './music-data'
import { type Instrument, type Synth } from './synth'

const leads = ['box', 'marimba', 'kalimba'] as const

interface Track {
  index: number
  start: number
  step: number
  gain: GainNode
  lead: Instrument
  octave: number
  fill: number
  volume: number
  bedtime: boolean
}

export class GardenMusic {
  private current?: Track
  private retiring?: { track: Track; end: number }
  private interval?: number
  private sleeping = false
  private economy = false
  private wet: GainNode
  private duck: GainNode

  constructor(private readonly context: AudioContext, private readonly synth: Synth, output: AudioNode) {
    this.duck = context.createGain()
    this.duck.connect(output)
    const room = context.createConvolver()
    const reflections = context.createBuffer(1, Math.ceil(context.sampleRate * 0.12), context.sampleRate)
    const impulse = reflections.getChannelData(0)
    for (let i = 0; i < impulse.length; i++) impulse[i] = (Math.random() * 2 - 1) * (1 - i / impulse.length) ** 3
    room.buffer = reflections
    this.wet = context.createGain()
    this.wet.gain.value = 0.14
    room.connect(this.wet).connect(this.duck)
    this.room = room
  }
  private readonly room: ConvolverNode

  setEconomy(value: boolean) {
    if (this.economy === value) return
    this.economy = value
    for (const track of [this.current, this.retiring?.track]) {
      if (!track) continue
      if (value) track.gain.disconnect(this.room)
      else track.gain.connect(this.room)
    }
  }

  setSleeping(value: boolean) {
    this.sleeping = value
  }

  pause() {
    window.clearInterval(this.interval)
    this.interval = undefined
  }

  resume() {
    if (this.interval !== undefined) return
    this.tick()
    this.interval = window.setInterval(() => this.tick(), 45)
  }

  duckForJingle() {
    const at = this.context.currentTime
    this.duck.gain.cancelAndHoldAtTime(at)
    this.duck.gain.linearRampToValueAtTime(0.28, at + 0.06)
    this.duck.gain.setTargetAtTime(1, at + 0.58, 0.16)
  }

  private change(index: number, now: number) {
    const gain = this.context.createGain()
    const end = now + CROSSFADE
    const volume = this.sleeping ? 0.36 : 1
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, this.current ? end : now + 0.35)
    gain.connect(this.duck)
    if (!this.economy) gain.connect(this.room)
    if (this.current) {
      this.current.gain.gain.cancelAndHoldAtTime(now)
      this.current.gain.gain.linearRampToValueAtTime(0, end)
      this.retiring = { track: this.current, end }
    }
    this.current = {
      index, start: now + 0.035, step: 0, gain, volume, bedtime: this.sleeping,
      lead: leads[Math.floor(Math.random() * leads.length)],
      octave: Math.random() < 0.35 ? 1 : 0,
      fill: Math.floor(Math.random() * 3),
    }
  }

  private tick() {
    const now = this.context.currentTime
    if (this.retiring && now >= this.retiring.end) {
      this.retiring.track.gain.disconnect()
      this.retiring = undefined
    }
    const track = this.current
    if (!track) {
      this.change(this.sleeping ? LULLABY : nextAwakeSong(-1, Math.random()), now)
    } else if (!this.retiring) {
      const faded = track.start + CROSSFADE
      if (this.sleeping && track.index !== LULLABY) {
        this.change(LULLABY, now)
      } else if (!this.sleeping && (track.bedtime || now >= track.start + songDuration(songs[track.index]) - CROSSFADE)) {
        this.change(nextAwakeSong(track.index, Math.random()), now)
      } else if (now >= faded) {
        const volume = this.sleeping ? 0.36 : 1
        if (track.volume !== volume) {
          track.volume = volume
          track.gain.gain.setTargetAtTime(volume, now, 0.16)
        }
      }
    }
    const current = this.current!
    this.schedule(current, now, now + 0.14)
    if (this.retiring) this.schedule(this.retiring.track, now, Math.min(now + 0.14, this.retiring.end))
  }

  private schedule(track: Track, now: number, until: number) {
    const song = songs[track.index]
    const eighth = 30 / song.bpm
    track.step = Math.max(track.step, Math.ceil((now - track.start - 0.025) / eighth))
    while (track.start + track.step * eighth < until) {
      const at = Math.max(now, track.start + track.step * eighth)
      const step = track.step++
      const arrangement = Math.floor(step / 32) % 4
      const slot = step % 8
      const bar = Math.floor(step / 8) % song.bars
      const chord = song.chords[bar % song.chords.length]
      const lead = song.motif[(bar % (song.motif.length / 8)) * 8 + slot]
      const hush = track.index === LULLABY
      const note = (instrument: Instrument, degree: number, octave: number, accent = 1) => {
        this.synth.note(instrument, pitch(song, degree, octave), at, track.gain, true, accent)
      }
      if (lead >= 0 && !(arrangement === 3 && slot === 3)) {
        note(track.lead, lead + (arrangement === 1 ? 1 : 0), hush ? 0 : track.octave, hush ? 0.82 : 1)
      } else if (slot === 7 && bar % 4 === 3) {
        note(track.lead, chord + track.fill, track.octave, 0.7)
      }
      if (slot === 0 || (slot === 4 && !hush)) note('bass', chord, -1)
      if (!this.economy && (slot === 0 || (slot === 4 && arrangement === 2))) note('pad', chord + 2, -1)
      if (!hush && slot === 4) note('wood', 4, 1)
      if (!hush && !this.economy && (slot === 2 || slot === 6 || (slot === 7 && bar % 4 === track.fill))) {
        note('shaker', 0, 0)
      }
    }
  }
}

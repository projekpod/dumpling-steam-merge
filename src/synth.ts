export const MAX_VOICES = 8
export const ECONOMY_VOICES = 4
export type Instrument = 'box' | 'marimba' | 'kalimba' | 'bass' | 'pad' | 'shaker' | 'wood'

const timbre: Record<Instrument, [OscillatorType, number, number, number]> = {
  box: ['sine', 0.095, 0.008, 0.64],
  marimba: ['sine', 0.115, 0.004, 0.26],
  kalimba: ['sine', 0.14, 0.005, 0.49],
  bass: ['sine', 0.105, 0.025, 0.53],
  pad: ['sine', 0.051, 0.22, 0.98],
  shaker: ['sine', 0.035, 0.006, 0.09],
  wood: ['triangle', 0.034, 0.004, 0.08],
}

interface Voice {
  source: AudioScheduledSourceNode
  end: number
  music: boolean
}

export class Synth {
  private voices: Voice[] = []
  private plucks = new Map<number, AudioBuffer>()
  private noise?: AudioBuffer
  private bell: PeriodicWave
  private mallet: PeriodicWave
  private softPad: PeriodicWave
  limit = MAX_VOICES

  constructor(private readonly context: AudioContext) {
    const wave = (...harmonics: number[]) => context.createPeriodicWave(
      new Float32Array(harmonics.length + 1), Float32Array.of(0, ...harmonics))
    this.bell = wave(1, 0, 0.30, 0, 0, 0.10)
    this.mallet = wave(1, 0.20, 0, 0.14)
    this.softPad = wave(1, 0.32, 0.13)
  }

  private buffer(seconds: number) {
    return this.context.createBuffer(1, Math.ceil(this.context.sampleRate * seconds), this.context.sampleRate)
  }

  private pluck(midi: number, hz: number) {
    let buffer = this.plucks.get(midi)
    if (!buffer) {
      buffer = this.buffer(timbre.kalimba[3])
      const samples = buffer.getChannelData(0)
      const period = Math.max(2, Math.round(buffer.sampleRate / hz))
      // Karplus–Strong: one noise burst followed by a damped, low-pass delay.
      for (let i = 0; i < period && i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      for (let i = period; i < samples.length; i++) {
        samples[i] = 0.494 * (samples[i - period] + samples[i - period + 1])
      }
      this.plucks.set(midi, buffer)
    }
    return buffer
  }

  private start(source: AudioScheduledSourceNode, to: AudioNode, at: number, duration: number,
    peak: number, attack: number, music: boolean) {
    const now = this.context.currentTime
    const end = at + duration
    this.voices = this.voices.filter(voice => voice.end > now)
    // Count overlapping intervals even when lookahead has already scheduled the next beat.
    const overlapping = this.voices.filter(voice => voice.end > at)
    while (overlapping.length >= this.limit) {
      if (music) return
      const victim = overlapping.find(voice => voice.music) ?? overlapping[0]
      victim.source.stop(at)
      victim.end = at
      overlapping.splice(overlapping.indexOf(victim), 1)
    }
    const envelope = this.context.createGain()
    envelope.gain.setValueAtTime(0.0001, at)
    envelope.gain.exponentialRampToValueAtTime(peak, at + attack)
    envelope.gain.exponentialRampToValueAtTime(0.0001, end)
    source.connect(envelope)
    envelope.connect(to)
    source.onended = () => {
      source.disconnect()
      envelope.disconnect()
    }
    source.start(at)
    source.stop(end)
    this.voices.push({ source, end, music })
  }

  note(instrument: Instrument, midi: number, at: number, to: AudioNode, music = true, accent = 1) {
    const [type, peak, attack, duration] = timbre[instrument]
    const hz = 440 * 2 ** ((midi - 69) / 12)
    let source: AudioScheduledSourceNode
    if (instrument === 'kalimba' || instrument === 'shaker') {
      const sample = this.context.createBufferSource()
      if (instrument === 'kalimba') {
        sample.buffer = this.pluck(midi, hz)
      } else {
        if (!this.noise) {
          this.noise = this.buffer(duration)
          const values = this.noise.getChannelData(0)
          let previous = 0
          for (let i = 0; i < values.length; i++) {
            const next = Math.random() * 2 - 1
            values[i] = next - previous
            previous = next
          }
        }
        sample.buffer = this.noise
      }
      source = sample
    } else {
      const oscillator = this.context.createOscillator()
      oscillator.type = type
      if (instrument === 'box') oscillator.setPeriodicWave(this.bell)
      if (instrument === 'marimba') oscillator.setPeriodicWave(this.mallet)
      if (instrument === 'pad') oscillator.setPeriodicWave(this.softPad)
      oscillator.frequency.value = hz
      if (instrument === 'wood') oscillator.frequency.exponentialRampToValueAtTime(hz / 3, at + 0.055)
      source = oscillator
    }
    this.start(source, to, at, duration, peak * accent, attack, music)
  }

  effect(from: number, to: number, target: AudioNode, peak: number) {
    const at = this.context.currentTime
    const oscillator = this.context.createOscillator()
    oscillator.frequency.setValueAtTime(from, at)
    oscillator.frequency.exponentialRampToValueAtTime(to, at + 0.09)
    this.start(oscillator, target, at, 0.18, peak, 0.015, false)
  }
}

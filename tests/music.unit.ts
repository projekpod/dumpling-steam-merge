import { afterEach, expect, test, vi } from 'vitest'
import { GardenMusic } from '../src/music'
import { CROSSFADE, LULLABY, areaSongs, nextAwakeSong, pitch, songDuration, songs } from '../src/music-data'
import { ECONOMY_VOICES, MAX_VOICES, Synth } from '../src/synth'

function fakeAudio() {
  const gains: ReturnType<typeof gain>[] = []
  const sources: { from: number; to: number }[] = []
  const param = () => ({
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn(),
    cancelAndHoldAtTime: vi.fn(),
  })
  const node = () => ({ connect: (to: unknown) => to, disconnect: vi.fn() })
  function gain() {
    return { ...node(), gain: param() }
  }
  const context = {
    get currentTime() { return Date.now() / 1000 },
    sampleRate: 1000,
    createConvolver: node,
    createBuffer: (_channels: number, samples: number) => ({ getChannelData: () => new Float32Array(samples) }),
    createPeriodicWave: vi.fn(),
    createGain() {
      const output = gain()
      gains.push(output)
      return output
    },
    createOscillator() {
      const window = { from: Infinity, to: -Infinity }
      return {
        ...node(), frequency: param(), setPeriodicWave: vi.fn(),
        start(from: number) { window.from = from; sources.push(window) },
        stop(to: number) { window.to = to },
      }
    },
  }
  return { context: context as unknown as AudioContext, gains, sources }
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

test('delapan partitur unik berdurasi 60–120 detik dan variasi Kebun tanpa pengulangan', () => {
  expect(new Set(songs.map(song => song.motif.join(','))).size).toBe(8)
  for (const [index, song] of songs.entries()) {
    expect(song.bpm).toBeGreaterThanOrEqual(80)
    expect(song.bpm).toBeLessThanOrEqual(110)
    expect(songDuration(song)).toBeGreaterThanOrEqual(60)
    expect(songDuration(song)).toBeLessThanOrEqual(120)
    expect(song.motif).toHaveLength(32)
    expect(song.motif.filter(step => step >= 0).map(step => pitch(song, step) - song.root)
      .every(semitone => song.scale.includes(semitone % 12))).toBe(true)
    const gardenSongs = [0, 1, 2, 5, 6, LULLABY].filter(i => i !== index)
    const choices = gardenSongs.map((_, i) => nextAwakeSong('kebun', index, i / gardenSongs.length))
    expect(choices).toEqual(gardenSongs)
  }
})

test('musik crossfade dua detik ke ninabobo, mengecil selama jingle dan bisa dijeda', () => {
  vi.useFakeTimers({ now: 0 })
  vi.stubGlobal('window', globalThis)
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const { context, gains } = fakeAudio()
  const note = vi.fn()
  const music = new GardenMusic(context, { note } as unknown as Synth, context.createGain())
  music.resume()
  vi.advanceTimersByTime(4_000)
  const awake = gains[3]
  expect(note.mock.calls.some(([, midi]) => midi === pitch(songs[0], 0))).toBe(true)

  music.setSleeping(true)
  vi.advanceTimersByTime(45)
  const lullaby = gains[4]
  const [start] = lullaby.gain.setValueAtTime.mock.calls[0].slice(1)
  expect(lullaby.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.36, start + CROSSFADE)
  expect(awake.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, start + CROSSFADE)
  vi.advanceTimersByTime(2_200)
  expect(awake.disconnect).toHaveBeenCalledOnce()
  expect(note.mock.calls.some(([, midi, , out]) => midi === pitch(songs[LULLABY], 1) && out === lullaby)).toBe(true)

  music.duckForJingle()
  expect(gains[1].gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.28, expect.any(Number))
  expect(gains[1].gain.setTargetAtTime).toHaveBeenCalledWith(1, expect.any(Number), 0.16)
  music.setSleeping(false)
  vi.advanceTimersByTime(45)
  expect(gains[5].gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, expect.any(Number))
  music.pause()
  const count = note.mock.calls.length
  vi.advanceTimersByTime(1_000)
  expect(note).toHaveBeenCalledTimes(count)
})

test('musik mengikuti area dengan crossfade, termasuk saat pindah lagi sebelum fade selesai', () => {
  vi.useFakeTimers({ now: 0 })
  vi.stubGlobal('window', globalThis)
  vi.spyOn(Math, 'random').mockReturnValue(0)
  const { context, gains } = fakeAudio()
  const note = vi.fn()
  const music = new GardenMusic(context, { note } as unknown as Synth, context.createGain())
  music.setArea('pantai')
  music.resume()
  vi.advanceTimersByTime(450)
  const beach = gains[3]
  expect(note.mock.calls.some(([instrument, midi, , out]) =>
    instrument === 'marimba' && midi === pitch(songs[areaSongs.pantai], 1, 1) && out === beach)).toBe(true)

  music.setArea('salju')
  vi.advanceTimersByTime(45)
  const snow = gains[4]
  const snowFadeEnds = 0.495 + CROSSFADE
  expect(snow.gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, snowFadeEnds)
  expect(beach.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, snowFadeEnds)
  expect(note.mock.calls.some(([instrument, midi, , out]) =>
    instrument === 'box' && midi === pitch(songs[areaSongs.salju], 4, 1) && out === snow)).toBe(true)

  music.setArea('kebun')
  vi.advanceTimersByTime(45)
  expect(gains[5].gain.linearRampToValueAtTime).toHaveBeenCalledWith(1, 0.54 + CROSSFADE)
  expect(snow.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 0.54 + CROSSFADE)
  vi.advanceTimersByTime(2_200)
  expect(beach.disconnect).toHaveBeenCalledOnce()
  expect(snow.disconnect).toHaveBeenCalledOnce()
  music.pause()
})

test('jingle dan efek berbagi batas suara dengan kedua lagu saat crossfade', () => {
  vi.useFakeTimers({ now: 0 })
  const { context, sources } = fakeAudio()
  const synth = new Synth(context)
  const bus = context.createGain()
  for (const limit of [MAX_VOICES, ECONOMY_VOICES]) {
    const start = context.currentTime + 0.05
    synth.limit = limit
    for (let note = 0; note < 12; note++) synth.note('box', 60 + note, start, bus)
    synth.effect(440, 220, bus, 0.1)
    synth.note('marimba', 74, start + 0.01, bus, false)
    const sounding = (time: number) => sources.filter(voice => voice.from <= time && voice.to > time).length
    expect(sounding(start)).toBe(limit)
    expect(sounding(start + 0.02)).toBe(limit)
    expect(sounding(start + 0.19)).toBe(limit - 1)
    vi.advanceTimersByTime(1_000)
  }
})

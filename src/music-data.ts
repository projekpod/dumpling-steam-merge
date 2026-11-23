export const CROSSFADE = 2
export const LULLABY = 7
const major = [0, 2, 4, 5, 7, 9, 11]
const pentatonic = [0, 2, 4, 7, 9]

interface Song {
  name: string
  bpm: number
  bars: number
  root: number
  scale: number[]
  chords: number[]
  motif: number[]
}

// Eight eighth-note slots per phrase. A dash is a rest, and degrees start at zero.
const song = (name: string, bpm: number, bars: number, root: number, scale: number[],
  chords: number[], phrase: string): Song => ({
  name, bpm, bars, root, scale, chords, motif: [...phrase].map(note => note === '-' ? -1 : Number(note)),
})

export const songs = [
  song('Pagi di Kukusan', 96, 32, 60, pentatonic, [0, 3, 4, 3], '0-241-32' + '012-4-20' + '4-554-21' + '20-132-0'),
  song('Uap Hangat', 84, 32, 62, major, [0, 5, 3, 4], '2--14-32' + '4-3-157-' + '6--4-210' + '2--1-0--'),
  song('Pesta Glitter', 108, 32, 65, pentatonic, [0, 4, 3, 1], '0-334213' + '-204-324' + '445-6-53' + '2132-0-1'),
  song('Pantai Dumpling', 102, 36, 57, pentatonic, [0, 1, 4, 3], '-1-4231-' + '24-6-320' + '-3-6-534' + '3120-21-'),
  song('Salju Lembut', 82, 28, 67, major, [0, 2, 5, 3], '4--2-610' + '5--432-1' + '3-5-7--6' + '421--0--'),
  song('Sore Santai', 90, 32, 59, major, [0, 3, 2, 4], '12-5-240' + '-34-1-30' + '2-346-5-' + '31-2-10-'),
  song('Pasar Malam', 105, 36, 63, pentatonic, [0, 1, 3, 4], '2-402-56' + '43-2-125' + '54-5364-' + '3021-02-'),
  song('Ninabobo Dumpling', 80, 28, 60, pentatonic, [0, 4, 1, 3], '1--3--20' + '-2--4-10' + '2---12-3' + '1--2-0--'),
]

export function nextAwakeSong(previous: number, roll: number) {
  const choices = songs.length - Number(previous >= 0)
  const index = Math.floor(roll * choices)
  return previous >= 0 && index >= previous ? index + 1 : index
}

export function songDuration(song: Song) { return song.bars * 4 * 60 / song.bpm }

export function pitch(song: Song, degree: number, octave = 0) {
  const { scale, root } = song
  return root + scale[degree % scale.length] + 12 * (Math.floor(degree / scale.length) + octave)
}

import type { SaveStore } from './platform'

const id = {
  title: 'Kebun Mochi',
  switchLanguage: 'Ganti ke Bahasa Inggris',
  backToGarden: 'Kembali ke Kebun',
  rewardAd: 'Tonton iklan: koin ×2 selama 10 menit + isi 3 kukusan',
  adUnavailable: 'Iklan belum tersedia. Silakan lanjut bermain.',
  adWaiting: 'Menyiapkan iklan…',
  adRewarded: 'Penghasilan ×2 selama 10 menit dan 3 kukusan gratis terisi!',
  boost: (minutes: number, seconds: string) => `Koin ×2 · ${minutes}:${seconds}`,
  area: 'Kebun',
  headline: 'Hangat dari kukusan!',
  instruction: 'Tahan untuk meremas. Seret mochi selevel untuk menggabung.',
  board: 'Papan Kebun Mochi, 5 kolom dan 6 baris',
  capacity: 'Petak terisi',
  level: 'Lv.',
  spawn: 'Buka kukusan',
  readyFree: (count: number) => `Gratis · ${count}/3 tersimpan`,
  emergency: 'Gratis untuk papan kosong',
  refill: (seconds: number) => `Gratis berikutnya ${seconds} dtk`,
  fullSteamer: 'Kapasitas penuh',
  opening: 'Tutup sedang terangkat…',
  release: 'Kosongkan 1 petak',
  releasePrompt: (name: string, rarity: string) => `Lepaskan ${name} (${rarity}) untuk membuka satu petak? Catatannya tetap di Mochidex.`,
  cancel: 'Batal',
  confirmRelease: 'Lepaskan mochi',
  released: 'Satu petak sudah kosong.',
  blocked: 'Papan penuh tanpa pasangan. Kamu bisa mengosongkan satu petak.',
  dex: 'Mochidex',
  unknown: '???',
  odds: 'Info peluang kukusan',
  oddsHint: 'Peluang berlaku untuk kukusan gratis dan berbayar.',
  probability: (value: number) => `${Number((value * 100).toFixed(4)).toString().replace('.', ',')}%`,
  specialChance: (two: string, three: string) => `Peluang level 2 ${two} · level 3 ${three}.`,
  rareFound: (name: string, rarity: string) => `${name} · ${rarity}!`,
  rarity: { normal: 'Biasa', glitter: 'Glitter', rainbow: 'Pelangi', gold: 'Emas', pink: 'Pink Langka' },
  full: 'Kapasitas penuh. Gabungkan mochi atau naikkan kapasitas.',
  coinAmount: (amount: string) => `${amount} koin`,
  coinRate: (amount: string) => `+${amount} koin/detik`,
  offlineReward: (amount: string) => `Selamat datang kembali! +${amount} koin saat pergi.`,
  upgrades: 'Upgrade kebun',
  upgradeBought: 'Upgrade berhasil!',
  maxUpgrade: 'Maksimal',
  upgrade: {
    saver: { name: 'Kukusan Hemat', hint: 'Diskon harga sampai mendekati 60%' },
    capacity: { name: 'Kapasitas kebun', hint: 'Tampung 1 mochi lagi' },
    free: { name: 'Kukusan Gratis Lebih Cepat', hint: 'Jeda isi ulang minimal 6 detik' },
    special: { name: 'Kukusan Istimewa', hint: 'Peluang level 2+ dan varian langka' },
    bonus: { name: 'Bonus koin', hint: 'Tambah 10% penghasilan dasar' },
    squish: { name: 'Remas Ajaib', hint: 'Tambah hadiah remas, tetap 3 kali per menit' },
  },
  upgradeLevel: (level: number) => `Lv. ${level}`,
  mute: 'Bisukan suara',
  audioSettings: 'Pengaturan audio',
  musicVolume: 'Volume musik',
  effectsVolume: 'Volume efek',
  mutedIcon: '♪̸',
  soundIcon: '♪',
  debugHour: '+1 jam',
  debugCoins: 'koin ×10',
  discovery: 'Mochi baru!',
  combo: (count: number) => `Combo ×${count}`,
  coinGain: (amount: string) => `+${amount} koin`,
  sleep: 'z z z',
  merge: (level: number) => `Mochi level ${level}!`,
  saveError: 'Progres belum bisa disimpan di perangkat ini.',
  names: [
    'Mochi Tunas', 'Mochi Kuncup', 'Mochi Kelopak', 'Mochi Jeruk',
    'Mochi Semanggi', 'Mochi Embun', 'Mochi Lavender', 'Mochi Persik',
    'Mochi Melon', 'Mochi Bunga', 'Mochi Beri', 'Mochi Mahkota',
  ],
  descriptions: [
    'Tiap pagi ia menyapa tanah, lalu lupa menyiram dirinya.',
    'Ia bertepuk tangan setiap kali satu kuncup terbuka.',
    'Kelopaknya rapi sampai ia mulai menari.',
    'Ia mengaku manis, tapi suka bikin lidah kecut.',
    'Selalu membawa keberuntungan, kecuali saat main petak umpet.',
    'Ia sibuk menghitung tetes embun sampai matahari terbit.',
    'Wanginya bikin ulat lupa kalau sedang buru-buru.',
    'Pipinya merona tiap kali dipanggil buah hati.',
    'Suaranya nyaring padahal ia cuma mau bisik-bisik.',
    'Ia mekar tiap mendengar gosip dari lebah.',
    'Ia menyimpan cemilan beri di balik kedua pipinya.',
    'Raja kebun ini mengadakan rapat penting tentang tidur siang.',
  ],
}

const en: typeof id = {
  title: 'Kebun Mochi',
  switchLanguage: 'Switch to Indonesian',
  backToGarden: 'Back to the Garden',
  rewardAd: 'Watch ad: 2× coins for 10 min + 3 free steamer opens',
  adUnavailable: 'No ad is available. You can keep playing.',
  adWaiting: 'Getting the ad ready…',
  adRewarded: '2× income for 10 minutes and 3 free steamer opens!',
  boost: (minutes, seconds) => `2× coins · ${minutes}:${seconds}`,
  area: 'Garden',
  headline: 'Fresh from the steamer!',
  instruction: 'Hold to squish. Drag matching mochi together to merge.',
  board: 'Kebun Mochi board, 5 columns and 6 rows',
  capacity: 'Spaces filled',
  level: 'Lv.',
  spawn: 'Open steamer',
  readyFree: count => `Free · ${count}/3 saved`,
  emergency: 'Free for an empty board',
  refill: seconds => `Next free open in ${seconds}s`,
  fullSteamer: 'Board at capacity',
  opening: 'Lifting the lid…',
  release: 'Clear 1 space',
  releasePrompt: (name, rarity) => `Release ${name} (${rarity}) to clear a space? Its Mochidex entry will stay.`,
  cancel: 'Cancel',
  confirmRelease: 'Release mochi',
  released: 'One space is clear.',
  blocked: 'The board is full with no pairs. You can clear a space.',
  dex: 'Mochidex',
  unknown: '???',
  odds: 'Steamer odds',
  oddsHint: 'These odds apply to free and paid steamer opens.',
  probability: value => `${Number((value * 100).toFixed(4))}%`,
  specialChance: (two, three) => `Level 2 odds ${two} · Level 3 odds ${three}.`,
  rareFound: (name, rarity) => `${name} · ${rarity}!`,
  rarity: { normal: 'Common', glitter: 'Glitter', rainbow: 'Rainbow', gold: 'Gold', pink: 'Rare Pink' },
  full: 'Board at capacity. Merge mochi or upgrade your capacity.',
  coinAmount: amount => `${amount} coins`,
  coinRate: amount => `+${amount} coins/sec`,
  offlineReward: amount => `Welcome back! You earned +${amount} coins while away.`,
  upgrades: 'Garden upgrades',
  upgradeBought: 'Upgrade purchased!',
  maxUpgrade: 'Maxed',
  upgrade: {
    saver: { name: 'Thrifty Steamer', hint: 'Discount approaches 60%' },
    capacity: { name: 'Garden Capacity', hint: 'Hold 1 more mochi' },
    free: { name: 'Faster Free Steamer', hint: 'Refill time approaches 6 seconds' },
    special: { name: 'Special Steamer', hint: 'Chance of higher levels and rare variants' },
    bonus: { name: 'Coin Bonus', hint: 'Add 10% to base income' },
    squish: { name: 'Magic Squish', hint: 'More coins per squish, up to 3 times per minute' },
  },
  upgradeLevel: level => `Lv. ${level}`,
  mute: 'Mute sound',
  audioSettings: 'Audio settings',
  musicVolume: 'Music volume',
  effectsVolume: 'Effects volume',
  mutedIcon: '♪̸',
  soundIcon: '♪',
  debugHour: '+1 hour',
  debugCoins: 'coins ×10',
  discovery: 'New mochi!',
  combo: count => `Combo ×${count}`,
  coinGain: amount => `+${amount} coins`,
  sleep: 'z z z',
  merge: level => `Level ${level} mochi!`,
  saveError: 'Progress could not be saved on this device.',
  names: [
    'Sprout Mochi', 'Bud Mochi', 'Petal Mochi', 'Orange Mochi',
    'Clover Mochi', 'Dew Mochi', 'Lavender Mochi', 'Peach Mochi',
    'Melon Mochi', 'Blossom Mochi', 'Berry Mochi', 'Crown Mochi',
  ],
  descriptions: [
    'It greets the soil every morning and forgets to water itself.',
    'It claps every time a bud opens.',
    'Its petals stay tidy until it starts to dance.',
    'It insists it is sweet, then makes you pucker.',
    'It always brings luck, except when playing hide-and-seek.',
    'It counts drops of dew until the sun comes up.',
    'It smells so nice that hurried caterpillars stop in their tracks.',
    'Its cheeks turn pink whenever someone calls it sweet pea.',
    'It just wants to whisper, but its voice carries across the garden.',
    'It blooms at the slightest hint of bee gossip.',
    'It stores berry snacks in both cheeks.',
    'This garden monarch holds very important meetings about naps.',
  ],
}

type Language = 'en' | 'id'
const key = 'kebun-mochi:language'

export let text = id
export let language: Language = 'id'

function applyLanguage(value: Language) {
  language = value
  text = value === 'id' ? id : en
}

export function loadLanguage(store: SaveStore, browserLanguage: string) {
  let saved: string | null = null
  try { saved = store.getItem(key) } catch {
    // Use the browser language when preferences cannot be read.
  }
  applyLanguage(saved === 'id' || saved === 'en' ? saved
    : browserLanguage.toLowerCase().split('-')[0] === 'id' ? 'id' : 'en')
}

export function toggleLanguage(store: SaveStore) {
  applyLanguage(language === 'id' ? 'en' : 'id')
  try { store.setItem(key, language) } catch {
    // Keep the language for this visit.
  }
}

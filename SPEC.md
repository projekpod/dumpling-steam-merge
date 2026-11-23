## Konsep
Game untuk orang yang sedang menunggu: sesi 30 detik–5 menit, bisa ditinggal kapan saja, tidak ada kalah, tidak ada timer yang menekan.
- Inti: grid 5x6, portrait, main satu tangan. Ketuk toples untuk memunculkan mochi level 1. Seret 2 mochi dengan level sama → gabung jadi makhluk level berikutnya (12 level per area).
- Idle: tiap mochi menghasilkan koin/detik. Penghasilan offline maksimal 8 jam, ditampilkan saat pemain kembali.
- Rasa penasaran: level berikutnya tampil sebagai siluet "???"; buku koleksi (Mochidex) berisi deskripsi lucu 1 kalimat; telur kejutan tiap ~3 menit; peluang 1% muncul varian emas.
- Berkelanjutan: 3 area (Kebun, Pantai, Salju), masing-masing dengan rantai makhluk sendiri; upgrade (kecepatan toples, kapasitas, bonus koin, dan toples ajaib); hadiah harian tanpa hukuman streak.
- Teks UI berbahasa Indonesia, semua string dikumpulkan di satu file.

## Visual & audio
- Imut dan cerah: makhluk bulat gendut, mata besar, pipi merona, outline tebal yang lembut. Palet: #FFD6E8 #FFF3B0 #B8F2E6 #AED9E0 #FFB4A2, aksen #FF6F91.
- Gambar SEMUA aset (termasuk ikon app) dengan kode; render jadi tekstur sekali saat loading. Jangan pakai aset atau karakter milik pihak lain.
- Animasi dan efek web mengikuti M2b. Getar halus di Android tetap di M4.
- Font bulat berlisensi OFL, dibundel lokal.

## Teknis
- Vite (base: './') + TypeScript + Phaser versi stabil terbaru. PWA dengan manifest + service worker, bisa dimainkan offline. Capacitor versi stabil terbaru untuk Android, portrait-only.
- Simpan progres di localStorage dengan versi skema + migrasi. Auto-save setiap aksi dan saat app masuk background.
- Logika game (merge, ekonomi, offline) dipisah dari rendering dan dites dengan Vitest. Format angka besar: K, M, B, T, lalu aa, ab, ac, dan seterusnya.
- Overlay FPS tampil jika URL berisi ?debug=1.
- GitHub Actions:
  a) pages.yml: setiap push ke main → build → deploy ke GitHub Pages.
  b) android.yml: setiap push ke main → build web → npx cap sync → ./gradlew assembleDebug → unggah APK ke GitHub Release "latest-debug" (timpa yang lama; permissions contents: write).

## Target performa (HP entry-level: RAM 2–3 GB, Android 7+)
- Minimal stabil 30 fps, target 60 fps. Cold start < 3 detik. Bundle web < 3 MB.
- devicePixelRatio dibatasi maksimal 2, pakai object pooling, partikel maksimal 30, game loop berhenti saat tab/app tidak aktif.
- Mode hemat otomatis jika fps < 45 (kurangi partikel & efek).
- Uji Playwright Chromium pada viewport 360×640 dengan papan penuh 30 mochi beranimasi dan CPU throttling 4× via CDP. Ambang minimal 30 FPS. Catat FPS rata-rata di PROGRESS.md. Papan dan tombol toples harus terlihat tanpa scroll, panel upgrade boleh berada di bawah.

## Milestone
M0 Setup Vite+TS+Phaser, Vitest, Playwright, pages.yml, file kerja
M1 Grid, spawn, seret-gabung, 12 level area Kebun, simpan/muat → bisa dimainkan di GitHub Pages
M2 Ekonomi idle, penghasilan offline, upgrade
M2b Ekonomi tanpa ujung, mochi hidup, efek gabung, dan suara
M3 Siluet, Mochidex, telur kejutan, varian emas, area Pantai & Salju
M4 Getar halus di Android dan onboarding 3 langkah tanpa teks panjang
M5 Optimasi performa + PWA offline + overlay FPS
M6 Android: Capacitor, ikon, splash, tombol back, pause saat background, android.yml

## M2b – Ekonomi tanpa ujung + mochi hidup

### Ekonomi

- Harga = dasar × pengali^level, dibulatkan ke atas ke koin utuh. Tampilkan level dan harga berikutnya. Hanya Kapasitas yang memiliki batas level.
- Toples cepat: dasar 25, pengali 1,55. Jeda 0,5 + 2,5 × 0,92^level detik dengan batas bawah 0,5 detik.
- Kapasitas: mulai 12 petak, +1 petak per level hingga 30. Dasar 100, pengali awal 2,1 disetel ke 2,28 lewat simulasi.
- Bonus koin: +10% penghasilan dasar per level. Dasar 200, pengali 1,75.
- Toples ajaib: peluang mochi level 2 sebesar 40% × (1 − 0,97^level). Dasar 500, pengali 1,9.
- Vitest menyimulasikan pemain dan memverifikasi upgrade pertama terbeli sebelum 30 detik, masih ada upgrade mahal setelah 2 jam aktif, dan 30 petak baru tercapai sekitar hari ketiga dalam sesi normal dengan penghasilan offline.
- Migrasikan simpanan dan level upgrade lama tanpa mengurangi saldo koin. `?debug=1` menampilkan tombol `+1 jam` untuk mensimulasikan penghasilan offline dan `koin ×10` untuk pengujian.

### Mochi hidup

- Tiap mochi memilih gerakan acak tiap 2–6 detik dengan waktu berbeda: kedip, bernapas dengan squash & stretch, lompat kecil, goyang kiri-kanan, melirik, putar daun, pipi merona dengan hati kecil, dan mata senang (^ ^).
- Setelah 30 detik tanpa sentuhan, mochi tertidur perlahan dengan “z z z” dan bangun saat layar disentuh. Ketukan membuat mochi kaget lalu tertawa. Seretan membuat mochi melar ke arah tarikan dan mochi lain melirik.
- Gunakan tween ringan dan kurangi frekuensi gerakan diam serta jumlah partikel saat mode hemat aktif di bawah 45 FPS. Hentikan animasi saat tab atau app tidak aktif.

### Gabung dan suara

- Dua mochi bertabrakan dan gepeng sebelum pop. Tampilkan cincin cahaya, bintang atau hati (maksimal 30 partikel total), koin melayang, serta mochi baru yang memantul dengan skala 0 → 1,25 → 0,9 → 1.
- Gabung berikutnya dalam 2 detik menaikkan “Combo ×2, ×3, …” dan menambah efek. Saat pertama mencapai level baru, tampilkan banner “Mochi baru!” berisi nama dan deskripsi lucu satu kalimat.
- Gunakan Web Audio untuk SFX sintetis lembut. Pop saat gabung, plop saat toples, dan cling saat koin atau upgrade. Simpan pilihan tombol mute.

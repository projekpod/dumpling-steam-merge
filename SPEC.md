## Konsep
Game untuk orang yang sedang menunggu: sesi 30 detik–5 menit, bisa ditinggal kapan saja, tidak ada kalah, tidak ada timer yang menekan.
- Inti: grid 5x6, portrait, main satu tangan. Ketuk toples untuk memunculkan mochi level 1. Seret 2 mochi dengan level sama → gabung jadi makhluk level berikutnya (12 level per area).
- Idle: tiap mochi menghasilkan koin/detik. Penghasilan offline maksimal 8 jam, ditampilkan saat pemain kembali.
- Rasa penasaran: level berikutnya tampil sebagai siluet "???"; buku koleksi (Mochidex) berisi deskripsi lucu 1 kalimat; telur kejutan tiap ~3 menit; peluang 1% muncul varian emas.
- Berkelanjutan: 3 area (Kebun, Pantai, Salju), masing-masing dengan rantai makhluk sendiri; upgrade (kecepatan toples, kapasitas, bonus koin); hadiah harian tanpa hukuman streak.
- Teks UI berbahasa Indonesia, semua string dikumpulkan di satu file.

## Visual & audio
- Imut dan cerah: makhluk bulat gendut, mata besar, pipi merona, outline tebal yang lembut. Palet: #FFD6E8 #FFF3B0 #B8F2E6 #AED9E0 #FFB4A2, aksen #FF6F91.
- Gambar SEMUA aset (termasuk ikon app) dengan kode; render jadi tekstur sekali saat loading. Jangan pakai aset atau karakter milik pihak lain.
- Juice: squash & stretch saat gabung, partikel bintang ringan, angka koin melayang, getar halus di Android.
- SFX sintetis via Web Audio, tanpa file audio. Sediakan tombol mute.
- Font bulat berlisensi OFL, dibundel lokal.

## Teknis
- Vite (base: './') + TypeScript + Phaser versi stabil terbaru. PWA dengan manifest + service worker, bisa dimainkan offline. Capacitor versi stabil terbaru untuk Android, portrait-only.
- Simpan progres di localStorage dengan versi skema + migrasi. Auto-save setiap aksi dan saat app masuk background.
- Logika game (merge, ekonomi, offline) dipisah dari rendering dan dites dengan Vitest. Format angka besar: 1.2K, 3.4M.
- Overlay FPS tampil jika URL berisi ?debug=1.
- GitHub Actions:
  a) pages.yml: setiap push ke main → build → deploy ke GitHub Pages.
  b) android.yml: setiap push ke main → build web → npx cap sync → ./gradlew assembleDebug → unggah APK ke GitHub Release "latest-debug" (timpa yang lama; permissions contents: write).

## Target performa (HP entry-level: RAM 2–3 GB, Android 7+)
- Minimal stabil 30 fps, target 60 fps. Cold start < 3 detik. Bundle web < 3 MB.
- devicePixelRatio dibatasi maksimal 2, pakai object pooling, partikel maksimal 30, game loop berhenti saat tab/app tidak aktif.
- Mode hemat otomatis jika fps < 45 (kurangi partikel & efek).
- Uji pakai Playwright Chromium dengan CPU throttling 4x (via CDP). Catat fps rata-rata di PROGRESS.md.

## Milestone
M0 Setup Vite+TS+Phaser, Vitest, Playwright, pages.yml, file kerja
M1 Grid, spawn, seret-gabung, 12 level area Kebun, simpan/muat → bisa dimainkan di GitHub Pages
M2 Ekonomi idle, penghasilan offline, upgrade
M3 Siluet, Mochidex, telur kejutan, varian emas, area Pantai & Salju
M4 Juice, suara, onboarding 3 langkah tanpa teks panjang
M5 Optimasi performa + PWA offline + overlay FPS
M6 Android: Capacitor, ikon, splash, tombol back, pause saat background, android.yml

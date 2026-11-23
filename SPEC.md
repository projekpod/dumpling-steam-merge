## Konsep
Game untuk orang yang sedang menunggu: sesi 30 detik–5 menit, bisa ditinggal kapan saja, tidak ada kalah, tidak ada timer yang menekan.
- Inti: grid 5x6, portrait, main satu tangan. Buka kukusan gratis atau berbayar untuk menemukan mochi-dumpling. Seret 2 mochi dengan level sama → gabung jadi makhluk level berikutnya (12 level per area).
- Idle: tiap mochi menghasilkan koin/detik. Penghasilan offline maksimal 8 jam, ditampilkan saat pemain kembali.
- Rasa penasaran: level berikutnya tampil sebagai siluet "???"; buku koleksi (Mochidex) berisi deskripsi lucu 1 kalimat; telur kejutan tiap ~3 menit; lima varian dengan peluang yang ditampilkan di Info peluang kukusan.
- Berkelanjutan: 3 area (Kebun, Pantai, Salju), masing-masing dengan rantai makhluk sendiri; upgrade (Kukusan Hemat, Kapasitas, Kukusan Gratis Lebih Cepat, Kukusan Istimewa, Bonus Koin, dan Remas Ajaib); hadiah harian tanpa hukuman streak.
- Teks UI berbahasa Inggris dan Indonesia mengikuti bahasa browser, dengan penggantian yang tersimpan. Semua string dikumpulkan di satu file.

## Visual & audio
- Dumpling jeli berwajah kawaii dengan dasar pipih, lipatan puncak, kilap besar, gradasi lembut, dan bayangan halus. Palet meja krem #FFF7E8 dan #F4E3CA, bambu #EAD0AC, #F3D5A6, dan #CE9C65, serta teks cokelat tua #4C3228. Warna mochi tetap mengikuti spesies, dengan lapisan Glitter lavender #D8C7FA, Pelangi pastel, Emas #D2902B, dan Pink Langka #FFABD5.
- Gambar SEMUA aset (termasuk ikon app) dengan kode; render jadi tekstur sekali saat loading. Jangan pakai aset atau karakter milik pihak lain.
- Animasi dan efek web mengikuti M2b. Getar halus di Android tetap di M4.
- Font bulat berlisensi OFL, dibundel lokal.

## Teknis
- Vite (base: './') + TypeScript + Phaser versi stabil terbaru. PWA dengan manifest + service worker, bisa dimainkan offline. Capacitor versi stabil terbaru untuk Android, portrait-only.
- Simpan progres berversi dengan migrasi memakai Data Module di CrazyGames serta localStorage di luar portal. Auto-save setiap aksi dan saat app masuk background.
- Logika game (merge, ekonomi, offline) dipisah dari rendering dan dites dengan Vitest. Format angka besar: K, M, B, T, lalu aa, ab, ac, dan seterusnya.
- Overlay FPS tampil jika URL berisi ?debug=1.
- GitHub Actions:
  a) pages.yml: setiap push ke main → build → deploy ke GitHub Pages.
  b) android.yml: setiap push ke main → build web → npx cap sync → ./gradlew assembleDebug → unggah APK ke GitHub Release "latest-debug" (timpa yang lama; permissions contents: write).

## Target performa (HP entry-level: RAM 2–3 GB, Android 7+)
- Minimal stabil 30 fps, target 60 fps. Cold start < 3 detik. Bundle web < 3 MB.
- devicePixelRatio dibatasi maksimal 2, pakai object pooling, partikel maksimal 30, game loop berhenti saat tab/app tidak aktif.
- Mode hemat otomatis jika fps < 45 (matikan uap serta kurangi kilau, partikel, dan animasi idle).
- Uji Playwright Chromium pada viewport 360×640 dengan papan penuh 30 mochi beranimasi termasuk varian berkilau dan CPU throttling 4× via CDP. Ambang minimal 30 FPS. Catat FPS rata-rata di PROGRESS.md. Papan dan tombol kukusan harus terlihat tanpa scroll, panel upgrade boleh berada di bawah.

## Milestone
M0 Setup Vite+TS+Phaser, Vitest, Playwright, pages.yml, file kerja
M1 Grid, spawn, seret-gabung, 12 level area Kebun, simpan/muat → bisa dimainkan di GitHub Pages
M2 Ekonomi idle, penghasilan offline, upgrade
M2b Ekonomi tanpa ujung, mochi hidup, efek gabung, dan suara
M2c Tema squishy dumpling, kukusan berbayar dan gratis, remas, varian, dan ekonomi ulang
M2d Bahasa ganda, layout lanskap, SDK CrazyGames dan rilis ZIP
M3 Siluet dan penyempurnaan Mochidex, telur kejutan, area Pantai & Salju
M4 Getar halus di Android dan onboarding 3 langkah tanpa teks panjang
M5 Optimasi performa + PWA offline + overlay FPS
M6 Android: Capacitor, ikon, splash, tombol back, pause saat background, android.yml

## M2b – Ekonomi tanpa ujung + mochi hidup

### Ekonomi historis M2b

Aturan kukusan di M2c menggantikan kurva toples di bawah.

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

## M2c – Tema squishy dumpling + kukusan berbayar + ekonomi ulang

- Tiap petak berbentuk keranjang kukusan bambu. Tombol kukusan mengangkat tutup, mengeluarkan puff pendek, dan memunculkan mochi dengan reveal. Varian langka mendapat kilau dari aset yang dipakai ulang dan suara sintetis berbeda. Pelangi memiliki kilap bergradasi yang bergeser pelan.
- Buka dari stok gratis lebih dulu. Mulai dengan satu isi, dapat satu isi tiap 20 detik awal hingga tiga tersimpan, termasuk offline. Harga berbayar terlihat di tombol dan mengikuti rekor level kebun serta diskon. Jika stok dan saldo tidak cukup ketika papan kosong, tersedia satu bukaan darurat. Papan penuh tanpa pasangan menyediakan aksi konfirmasi untuk mengosongkan satu petak.
- Gerak penunjuk lebih dari 10 px memulai seretan. Tekan-tahan diam meremas hingga 45% lebih pipih dan bentuk pulih dalam 750 ms setelah dilepas, dengan wajah senang dan suara squish. Tahan minimal 500 ms untuk hadiah kecil, maksimal tiga kali per 60 detik bergulir.
- Varian Biasa ×1, Glitter ×2, Pelangi ×3, Emas ×5, Pink Langka ×10 mengalikan pasif. Gabung selevel mewarisi varian tertinggi. Info peluang menunjukkan peluang aktual. Mochidex menyimpan setiap varian yang ditemukan per level.
- Hanya Kapasitas berhenti di level 18 (12 sampai 30 petak). Kukusan Hemat mendekati diskon 60%, Kukusan Gratis Lebih Cepat mendekati minimum 6 detik, dan Kukusan Istimewa memiliki peluang terbatas untuk level 2–3 dan varian langka. Bonus Koin dan Remas Ajaib berlanjut. Rumus dan tabel ada di [desain ekonomi](docs/design/ekonomi.md).
- Simpanan versi 4 memigrasikan papan dan koin lama tanpa pengurangan. Simulasi memeriksa upgrade pertama <30 detik, jalur pulih dari papan buntu, upgrade mahal setelah dua jam, kapasitas maksimum mulai sekitar hari ketiga, median Emas sekitar hari 1–2, dan median Pink Langka sekitar minggu 1–2.

## M2d – Versi portal CrazyGames

- UI memilih bahasa Indonesia untuk locale `id` dan Inggris untuk pilihan lain, kecuali pemain telah menyimpan pilihannya. Pada lanskap, panel portrait terpusat dan bentuk papan tetap proporsional, dengan dekorasi kukusan di kedua sisi ketika ruang cukup.
- Vite memilih adapter per build. `none` untuk GitHub Pages, `crazygames` dengan SDK HTML5 v3 resmi, dan `admob` sebagai kerangka tanpa SDK Android.
- Portal melaporkan loading dan gameplay mulai/berhenti, memakai Data Module, dan mengikuti setting mute host. Jika SDK belum tersedia, pemain tetap bisa bermain dengan penyimpanan browser. Iklan hanya lewat SDK dan UI game tidak punya tautan keluar.
- Satu rewarded yang selesai memberi penghasilan pasif ×2 selama 10 menit dan mengisi stok kukusan gratis menjadi 3. Midgame hanya boleh saat menutup panel lewat aksi kembali ke kebun, setelah minimal empat menit sesi aktif, tanpa seret/gabung/reveal aktif, dengan jarak minimal empat menit dari fullscreen terakhir, serta tidak boleh pada sesi pertama. Sesi berikutnya dimulai setelah 30 menit tidak aktif.
- Selama permintaan dan tayangan iklan, input, loop, audio, dan jam ekonomi dijeda. Kegagalan atau adblock mengembalikan permainan tanpa hadiah. Skema versi 5 menambahkan waktu kedaluwarsa boost pada simpanan lama.
- Workflow `crazygames.yml` mengemas build portal dengan `index.html` di root ZIP dan mengunggah ke rilis `crazygames-latest`. Panduan dari HP ada di [dokumen rilis CrazyGames](docs/rilis/crazygames.md).

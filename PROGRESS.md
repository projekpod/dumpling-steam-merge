# Progres

- [x] M0 Fondasi web dan GitHub Pages
- [x] M1 Kebun, gabung dumpling, dan simpan/muat
- [x] M2 Ekonomi idle, penghasilan offline, dan upgrade
- [x] M2b Ekonomi tanpa ujung, dumpling hidup, efek gabung, dan suara
- [x] M2c Squishy dumpling, kukusan, varian, remas, dan ekonomi ulang
- [x] M2d Versi portal CrazyGames, bahasa ganda, dan layout lanskap
- [x] M2e QA sebelum submit CrazyGames dan media promosi
- [x] M2f Musik latar orisinal dan reaksi mata terhadap seretan
- [ ] M3 Penemuan dan area tambahan
- [ ] M4 Getar halus dan onboarding
- [ ] M5 Performa, PWA offline, dan overlay FPS
- [ ] M6 Android dan distribusi APK

## Verifikasi M0–M1

- `npm ci` dan `npm run build` lulus. Paket produksi 1,66 MB sebelum kompresi. Vite memperingatkan bahwa satu chunk JS melebihi 500 kB.
- `npm test` lulus, 5 tes unit mencakup level 1–12, aturan papan, simpan/muat, dan migrasi.
- Smoke test Playwright lulus pada Chromium 156, viewport 360×640. Build produksi diuji dari subpath `/dumpling-steam-merge/` dengan sentuhan, gabung, dan muat ulang.
- Rata-rata 60,4 FPS pada kanvas selama 2,5 detik dengan 8 dumpling dan CPU throttling 4× via CDP. Pengukuran dilakukan di Chromium headless. Cold start dan performa di HP fisik belum diuji.
- Workflow GitHub Pages tersedia. Publikasi dan URL live belum diverifikasi.

## Verifikasi M2

- `npm run build` lulus. Paket produksi sekitar 1,66 MB sebelum kompresi. Peringatan ukuran chunk Vite masih muncul.
- `npm test` lulus, 10 tes unit mencakup papan, pendapatan per level, batas offline 8 jam, upgrade, dan migrasi simpanan.
- Ketiga tes Playwright lulus pada Chromium di viewport 360×640. Smoke test memverifikasi hasil offline, pembelian ketiga jenis upgrade, pembayaran setelah kembali, dan simpan/muat tanpa pembayaran ganda.
- Rata-rata 60,0 FPS pada kanvas dengan 8 dumpling selama 2,5 detik di Chromium headless, dengan CPU throttling 4× via CDP.

## Verifikasi M2b

- `npm run build` lulus. Paket produksi sekitar 1,68 MB sebelum kompresi. Peringatan ukuran chunk Vite masih muncul.
- Vitest lulus, 14 tes. Simulasi dengan pengali Kapasitas 2,28 membeli upgrade pertama pada detik ke-9. Setelah 2 jam aktif, upgrade termahal masih butuh 10,9 menit pendapatan pada laju saat itu. Model tiga sesi 3 menit per hari dengan jeda offline mencapai 30 petak pada hari ke-3,02.
- Keenam tes Playwright lulus pada 360×640. Tes mencakup papan dan toples yang terlihat tanpa scroll, migrasi dan pembayaran offline, empat upgrade, combo dan penemuan pertama, tombol debug, mute persisten, serta tidur dan bangun.
- Rata-rata 59,6 FPS pada papan penuh 30 dumpling beranimasi selama sekitar 6 detik di Chromium headless dengan CPU throttling 4× via CDP. Sampel kanvas berubah selama pengukuran. Performa HP fisik belum diuji.

## Verifikasi M2c

- `npm run build` lulus. Paket produksi 1,69 MB sebelum kompresi. Vite masih melaporkan peringatan ukuran chunk JS.
- 16 tes Vitest lulus. Simulasi mencakup 31 seed, tiga sesi 3 menit per hari dengan jeda offline 7 jam 57 menit, dan skenario dua jam aktif. Pada seed acuan, upgrade pertama terbeli dalam 13 detik dan upgrade termahal setelah dua jam membutuhkan 11,6 menit pendapatan (median 31 seed 8,3 menit). Kapasitas 30 tercapai paling cepat hari 3,00 dengan median hari 4,33. Median Emas hari 1,00 dan Pink Langka hari 9,67. Kedua jalur pemulihan papan diuji.
- 10 tes Playwright lulus pada viewport 360×640. Pengujian mencakup kukusan gratis, berbayar dan darurat, pelepasan dari papan buntu, remas dan seret, peluang varian, Buku Koleksi Dumpling, pembelian upgrade, dan migrasi simpanan.
- Chromium headless mencatat 59,7 FPS pada 30 dumpling, termasuk 24 non-Biasa, selama sekitar 6 detik dengan CPU throttling 4×. Papan dan kukusan terlihat tanpa scroll. Tes terpisah memicu mode hemat dan memverifikasi uap berhenti. HP fisik belum diuji.

## Verifikasi M2d

- Build `none`, `crazygames`, dan `admob` lulus. URL SDK hanya ada pada build portal. Build portal sekitar 1,71 MB sebelum kompresi, dengan peringatan ukuran chunk Vite yang sudah ada. ZIP sekitar 506 kB lulus `unzip -t` dan memuat `index.html` langsung di root.
- 18 tes Vitest dan 15 tes Playwright lulus. Viewport 360×640 memuat papan dan kukusan tanpa scroll. Lanskap 1024×576 dan 844×390 mempertahankan rasio kanvas serta menampilkan kukusan. Tes mencakup bahasa browser, tombol bahasa, data SDK, pacing lintas sesi, hadiah sekali, kegagalan iklan, adblock, dan timeout.
- Chromium headless pada build `none` mencapai 59,0 FPS dengan 30 dumpling beranimasi, 24 non-Biasa, dan throttling CPU 4×.
- SDK resmi HTML5 v3.8.0 berhasil diinisialisasi dalam mode lokal, melaporkan siklus loading dan gameplay, serta menuntaskan demo rewarded. Data SDK portal, mute host, dan kegagalan diuji dengan mock. Preview resmi, sinkronisasi akun riil, iklan live, dan workflow Release menunggu proses setelah merge. Panduan unggah berada di `docs/rilis/crazygames.md`.

## Verifikasi M2e

- Ketiga mode build lulus. ZIP lulus `unzip -t` dan memuat `index.html` serta favicon di root.
- 18 tes Vitest dan 25 tes Playwright lulus. Sesi 30 menit dengan jam dipercepat berjalan pada 360×640, 412×915, dan 1366×768. Tes SDK mencakup pembatalan, adblock, timeout, callback terlambat, jeda frame dan mute, serta skenario penyimpanan lama, rusak, atau diblokir.
- Chromium headless pada build `none` mencapai 58,2 FPS pada papan penuh 30 dumpling dengan CPU throttling 4×.
- Enam screenshot dan tiga cover resmi dibuat otomatis. Workflow akan mengunggah sembilan gambar sebagai aset terpisah bersama ZIP setelah merge ke `main`. Rincian temuan dan batas verifikasi ada di `docs/rilis/qa-m2e.md`.

## Verifikasi M2f

- Build web, CrazyGames, dan kerangka AdMob lulus. Paket web dan portal masing-masing sekitar 1,72 MB sebelum kompresi. Vite masih melaporkan peringatan ukuran chunk JS. ZIP CrazyGames sebesar 512 kB lolos `unzip -t` dengan `index.html` di root.
- 21 tes Vitest dan 27 tes Playwright lulus. Tes mencakup batas suara, pemilihan lagu, crossfade, ninabobo, ducking, penyimpanan kedua slider, jeda dan pemulihan musik saat iklan atau background, serta arah pandang dan reaksi tiap hasil seretan.
- Chromium headless pada 360×640 mencatat rata-rata 36,9 FPS selama 6 detik dengan CPU throttling 4× via CDP, papan penuh 30 dumpling termasuk 24 non-Biasa, satu dumpling diseret, dan musik aktif. Papan dan kukusan terlihat tanpa scroll. Performa di HP fisik dan iklan live belum diuji.

## Penggantian nama

- M5 akan memakai nama PWA **Dumpling Steam: Merge & Squish** dan nama pendek **Dumpling Steam** untuk ikon layar utama dan ruang sempit.
- M6 akan memakai nama yang sama dan appId Capacitor `io.github.projekpod.dumplingsteammerge`.

## Verifikasi rilis portal

- Build web, CrazyGames, Playgama, dan AdMob lulus. Kedua ZIP portal lulus pemeriksaan arsip, memuat `index.html` di tingkat teratas, dan hanya menyertakan integrasi portal masing-masing.
- 21 tes Vitest, 31 tes Playwright, 7 tes Deno, dan tes integrasi PostgreSQL lulus. Chromium 156 headless mencapai 40,8 FPS pada 360×640 dengan 30 dumpling, musik, seretan, dan throttling CPU 4×.
- Playgama Bridge resmi v2.4.4 berhasil diinisialisasi dan diuji simpan/muat di luar portal. Pemberian hadiah, jeda game dan audio, interstitial, serta pemulihan saat gagal diuji dengan simulasi SDK. Penayangan iklan langsung di portal belum diuji.
- Enam screenshot, tiga cover, dan dua MP4 gameplay dibuat ulang. Klip 1920×1080 dan 1080×1920 masing-masing sekitar 26 detik, mencakup buka kukusan, combo ×3, remas, dan Pink Langka.

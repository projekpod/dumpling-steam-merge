# Progres

- [x] M0 Fondasi web dan GitHub Pages
- [x] M1 Kebun, gabung mochi, dan simpan/muat
- [x] M2 Ekonomi idle, penghasilan offline, dan upgrade
- [x] M2b Ekonomi tanpa ujung, mochi hidup, efek gabung, dan suara
- [x] M2c Squishy dumpling, kukusan, varian, remas, dan ekonomi ulang
- [ ] M3 Penemuan dan area tambahan
- [ ] M4 Getar halus dan onboarding
- [ ] M5 Performa, PWA offline, dan overlay FPS
- [ ] M6 Android dan distribusi APK

## Verifikasi M0–M1

- `npm ci` dan `npm run build` lulus. Paket produksi 1,66 MB sebelum kompresi. Vite memperingatkan bahwa satu chunk JS melebihi 500 kB.
- `npm test` lulus, 5 tes unit mencakup level 1–12, aturan papan, simpan/muat, dan migrasi.
- Smoke test Playwright lulus pada Chromium 156, viewport 360×640. Build produksi diuji dari subpath `/kebun-mochi/` dengan sentuhan, gabung, dan muat ulang.
- Rata-rata 60,4 FPS pada kanvas selama 2,5 detik dengan 8 mochi dan CPU throttling 4× via CDP. Pengukuran dilakukan di Chromium headless. Cold start dan performa di HP fisik belum diuji.
- Workflow GitHub Pages tersedia. Publikasi dan URL live belum diverifikasi.

## Verifikasi M2

- `npm run build` lulus. Paket produksi sekitar 1,66 MB sebelum kompresi. Peringatan ukuran chunk Vite masih muncul.
- `npm test` lulus, 10 tes unit mencakup papan, pendapatan per level, batas offline 8 jam, upgrade, dan migrasi simpanan.
- Ketiga tes Playwright lulus pada Chromium di viewport 360×640. Smoke test memverifikasi hasil offline, pembelian ketiga jenis upgrade, pembayaran setelah kembali, dan simpan/muat tanpa pembayaran ganda.
- Rata-rata 60,0 FPS pada kanvas dengan 8 mochi selama 2,5 detik di Chromium headless, dengan CPU throttling 4× via CDP.

## Verifikasi M2b

- `npm run build` lulus. Paket produksi sekitar 1,68 MB sebelum kompresi. Peringatan ukuran chunk Vite masih muncul.
- Vitest lulus, 14 tes. Simulasi dengan pengali Kapasitas 2,28 membeli upgrade pertama pada detik ke-9. Setelah 2 jam aktif, upgrade termahal masih butuh 10,9 menit pendapatan pada laju saat itu. Model tiga sesi 3 menit per hari dengan jeda offline mencapai 30 petak pada hari ke-3,02.
- Keenam tes Playwright lulus pada 360×640. Tes mencakup papan dan toples yang terlihat tanpa scroll, migrasi dan pembayaran offline, empat upgrade, combo dan penemuan pertama, tombol debug, mute persisten, serta tidur dan bangun.
- Rata-rata 59,6 FPS pada papan penuh 30 mochi beranimasi selama sekitar 6 detik di Chromium headless dengan CPU throttling 4× via CDP. Sampel kanvas berubah selama pengukuran. Performa HP fisik belum diuji.

## Verifikasi M2c

- `npm run build` lulus. Paket produksi 1,69 MB sebelum kompresi. Vite masih melaporkan peringatan ukuran chunk JS.
- 16 tes Vitest lulus. Simulasi mencakup 31 seed, tiga sesi 3 menit per hari dengan jeda offline 7 jam 57 menit, dan skenario dua jam aktif. Pada seed acuan, upgrade pertama terbeli dalam 13 detik dan upgrade termahal setelah dua jam membutuhkan 11,6 menit pendapatan (median 31 seed 8,3 menit). Kapasitas 30 tercapai paling cepat hari 3,00 dengan median hari 4,33. Median Emas hari 1,00 dan Pink Langka hari 9,67. Kedua jalur pemulihan papan diuji.
- 10 tes Playwright lulus pada viewport 360×640. Pengujian mencakup kukusan gratis, berbayar dan darurat, pelepasan dari papan buntu, remas dan seret, peluang varian, Mochidex, pembelian upgrade, dan migrasi simpanan.
- Chromium headless mencatat 59,7 FPS pada 30 mochi, termasuk 24 non-Biasa, selama sekitar 6 detik dengan CPU throttling 4×. Papan dan kukusan terlihat tanpa scroll. Tes terpisah memicu mode hemat dan memverifikasi uap berhenti. HP fisik belum diuji.

# Progres

- [x] M0 Fondasi web dan GitHub Pages
- [x] M1 Kebun, gabung mochi, dan simpan/muat
- [ ] M2 Ekonomi idle, penghasilan offline, dan upgrade
- [ ] M3 Penemuan dan area tambahan
- [ ] M4 Efek, suara, dan onboarding
- [ ] M5 Performa, PWA offline, dan overlay FPS
- [ ] M6 Android dan distribusi APK

## Verifikasi M0–M1

- `npm ci` dan `npm run build` lulus. Paket produksi 1,66 MB sebelum kompresi. Vite memperingatkan bahwa satu chunk JS melebihi 500 kB.
- `npm test` lulus, 5 tes unit mencakup level 1–12, aturan papan, simpan/muat, dan migrasi.
- Smoke test Playwright lulus pada Chromium 156, viewport 360×640. Build produksi diuji dari subpath `/kebun-mochi/` dengan sentuhan, gabung, dan muat ulang.
- Rata-rata 60,4 FPS pada kanvas selama 2,5 detik dengan 8 mochi dan CPU throttling 4× via CDP. Pengukuran dilakukan di Chromium headless. Cold start dan performa di HP fisik belum diuji.
- Workflow GitHub Pages tersedia. Publikasi dan URL live belum diverifikasi.

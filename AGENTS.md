# Dumpling Steam: Merge & Squish

- Pakai Node.js 24. Instal dependensi dengan `npm ci` dan Chromium dan WebKit dengan `npx playwright install chromium webkit`.
- Jalankan `npm run dev` untuk pengembangan dan `npm run build` untuk memeriksa tipe dan membuat paket web.
- Jalankan `npm test` untuk tes unit cepat Vitest, `npm run test:simulation` untuk simulasi ekonomi, dan `npm run test:smoke` untuk smoke test Playwright pada hasil build.
- Jika ada yang kurang jelas, buat asumsi paling wajar, catat satu baris di DECISIONS.md, dan lanjut tanpa meminta konfirmasi atau berdebat.
- Setelah dua kegagalan pada pendekatan yang sama, ganti pendekatan.
- Ikuti SPEC.md. Jangan menambah fitur, library, atau refactor di luar spesifikasi.
- Milestone selesai setelah build, tes unit, dan smoke test Playwright pada 360×640 lulus serta PROGRESS.md diperbarui. Jika pemeriksaan tidak dapat dijalankan di container, catat alasan di PROGRESS.md dan lanjut.
- Jika Chromium sudah tersedia di container, jalankan smoke test dengan `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:smoke`.
- Setiap milestone selesai dan semua tes lulus, langsung buat pull request ke main tanpa menunggu diminta.

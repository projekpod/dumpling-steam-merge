# Kebun Mochi

Ketuk toples untuk mengisi kebun dengan mochi. Seret dua mochi selevel untuk menggabungkannya, atau pindahkan mochi ke petak kosong untuk mengatur papan. Progres tersimpan di browser yang dipakai untuk bermain.

## Jalankan di Codex Cloud

Gunakan Node.js 24.

```sh
npm ci
npm run dev -- --host 0.0.0.0
```

```sh
npm run build
npm test
npx playwright install chromium
npm run test:smoke
```

Jika cloud sudah punya Chromium di `/usr/bin/chromium`, lewati unduhan dan jalankan `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:smoke`.

## Publikasikan ke GitHub Pages

Di repo GitHub, buka **Settings → Pages** dan pilih **GitHub Actions** sebagai **Source**. Setelah kode masuk ke `main`, buka tab **Actions** dan pilih run **GitHub Pages** untuk melihat status dan tautan game. Jika kode sudah ada di `main` saat Pages diaktifkan, pilih **Run workflow** pada workflow **GitHub Pages**.

[Spesifikasi](SPEC.md) · [Progres](PROGRESS.md) · [Keputusan](DECISIONS.md)

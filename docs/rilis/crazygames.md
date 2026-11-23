# Mengirim Kebun Mochi ke CrazyGames dari HP

## 1. Unduh ZIP

1. Setelah PR M2d digabung, buka tab **Actions** di repo GitHub. Pastikan run terbaru **CrazyGames package** berwarna hijau.
2. Buka rilis [crazygames-latest](https://github.com/projekpod/kebun-mochi/releases/tag/crazygames-latest). Di **Assets**, unduh **kebun-mochi-crazygames.zip** ke folder Unduhan.
3. Biarkan file dalam bentuk ZIP saat diunggah. Arsip sudah menempatkan `index.html` di tingkat teratas. Pilih ZIP bernama persis seperti di atas, karena **Source code (zip)** di halaman yang sama berisi repo.

## 2. Buat akun dan upload

1. Buka [CrazyGames Developer Portal](https://developer.crazygames.com/games) di Chrome atau Safari. Daftar atau masuk, verifikasi email jika diminta, lalu buka halaman **Games**. Kalau tombol atau formulir terpotong, aktifkan **Situs desktop** atau **Request Desktop Website** dari menu browser dan putar HP ke lanskap.
2. Tekan **Submit a game** atau tombol untuk membuat game baru. Pilih **HTML5**, beri judul **Kebun Mochi**, dan unggah ZIP dari aplikasi Files atau Unduhan. Tempel deskripsi dan kontrol Inggris di bawah. Aktifkan dukungan desktop lanskap dan mobile portrait. Game juga menyesuaikan UI jika HP diputar.
3. Di **Progress Save**, pilih **Yes, using the Data Module from the CrazyGames SDK** agar penyimpanan akun tersedia. Unggah cover dan video sesuai formulir. Kolom atau nama tombol bisa berubah. [Panduan penyimpanan SDK](https://docs.crazygames.com/sdk/data/)
4. Buka **Preview** dari entri game sebelum menekan tombol pengajuan. Coba sentuh kukusan, tahan mochi untuk meremas, seret dua mochi selevel, dan pindah bahasa. Muat ulang dan periksa bahwa papan, koin, dan bahasa tetap benar. Jika punya akun pemain, coba preview dengan akun tersebut. Bila preview menyediakan tes iklan, cek bahwa game berhenti dan hening selama iklan, hadiah diberikan sekali setelah iklan selesai, dan permainan kembali berjalan saat iklan gagal.
5. Periksa data yang tampil, lalu tekan **Submit for review** atau tombol akhir yang tersedia. Pantau status dari **Games** dan email. **Basic Launch** bisa mematikan iklan. Preview yang berhasil berbeda dari persetujuan **Full Launch** dan penayangan iklan nyata. [Persyaratan dan proses resmi](https://docs.crazygames.com/requirements/intro/)

## Metadata yang bisa ditempel

**Title** — Kebun Mochi

**Category** — Puzzle. Jika portal mengizinkan kategori tambahan, pilih Casual bila tersedia.

**Suggested tags** — Merge, Idle, Cute, Relaxing, Mouse, Mobile. Pilih padanan yang tersedia di formulir. Jika jumlah dibatasi, utamakan Merge, Idle, dan Cute.

**Description**

> Lift the bamboo steamer and see which squishy dumpling pops out! Hold your mochi to give it a gentle squeeze, then drag matching levels together to grow your collection. Find glitter, rainbow, gold, and rare pink variants, and track them in the Mochidex. Your mochi earn coins as you play and while you’re away. Spend coins on steamer upgrades and more board space, then pop back in whenever you have a minute. Play in English or Indonesian.

**Controls**

> Tap or click the steamer to open it. Hold a mochi to squish it. Drag one mochi onto another of the same level to merge them. Use the language button to switch to Indonesian or English.

## Screenshot dan media dari HP

Ambil screenshot dari **Preview** dalam bahasa Inggris, tanpa bilah browser bila ada mode fullscreen. Gunakan screenshot bawaan HP lalu pangkas bilah status di aplikasi Foto. Ambil saat papan sudah terisi supaya hasilnya mudah dipahami.

| Urutan | Yang perlu direkam |
| ---: | --- |
| 1 | Landscape dengan panel portrait di tengah, dua dekorasi kukusan, papan terisi, dan tombol **Open steamer** terlihat. |
| 2 | Portrait setelah membuka kukusan, saat ada kilau varian dan nama temuan. |
| 3 | Dua mochi selevel sedang digabung dengan efek pop atau combo. |
| 4 | Mochi sedang gepeng saat ditahan, dengan baki bambu sebagai konteks. |
| 5 | Mochidex terbuka dengan badge varian yang sudah ditemukan. |
| 6 | Panel **Garden upgrades** atau **Steamer odds** yang memperlihatkan progres dan peluang. |

Buat tiga **cover terpisah** dari screenshot QA. Gunakan gambar yang menonjolkan mochi dan kukusan. Ukuran saat ini **1920×1080** lanskap, **800×1200** portrait, dan **800×800** persegi. Jika memakai editor dari HP, pilih kanvas dengan ukuran tersebut, pertahankan bentuk bulat mochi, dan pakai hanya judul game sebagai teks. Untuk video preview, rekam layar saat membuka, meremas, dan menggabung. Siapkan klip **15–20 detik**, maksimal **50 MB**, versi **1080p 16:9** dan **1080p 2:3**. Lihat ukuran yang diminta formulir sebelum unggah. [Panduan cover dan video resmi](https://docs.crazygames.com/requirements/game-covers/)

## Build untuk pengujian

- `npm run build` menghasilkan `dist/` untuk GitHub Pages tanpa SDK iklan.
- `npm run build:crazygames` menghasilkan `dist-crazygames/` dengan adapter SDK HTML5 v3. Pratinjau lokal melalui `npm run preview -- --mode crazygames`. SDK lokal menyimulasikan iklan, sedangkan Developer Portal Preview dipakai untuk memverifikasi layanan host.
- `npm run build:admob` menghasilkan `dist-admob/` dengan adapter kosong untuk Android mendatang.

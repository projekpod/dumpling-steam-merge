# Ekonomi Kebun Mochi

Untuk sesi 30 detik–5 menit. M2b menjadi acuan angka dasar. Multi-area, boost, dan Panen Raya di bawah merupakan rancangan. Semua koin pada dokumen ini hanya berlaku di dalam game, termasuk pada [jalur monetisasi B](backlog.md#dua-jalur-monetisasi).

## Penghasilan dasar

| Level mochi | Koin/detik | Koin/jam | Hadiah sekali gabung ke level ini |
| ---: | ---: | ---: | ---: |
| 1 | 1 | 3.600 | — |
| 2 | 2 | 7.200 | 6 |
| 3 | 4 | 14.400 | 12 |
| 4 | 8 | 28.800 | 24 |
| 5 | 16 | 57.600 | 48 |
| 6 | 32 | 115.200 | 96 |
| 7 | 64 | 230.400 | 192 |
| 8 | 128 | 460.800 | 384 |
| 9 | 256 | 921.600 | 768 |
| 10 | 512 | 1.843.200 | 1.536 |
| 11 | 1.024 | 3.686.400 | 3.072 |
| 12 | 2.048 | 7.372.800 | 6.144 |

Ketiga area memakai kurva yang sama. `S = Σ 2^(level−1)` untuk mochi di papan aktif. Gabung dua mochi mempertahankan total laju dasar keduanya dan memberi hadiah sekali sebesar tiga detik penghasilan dasar mochi baru. Combo menambah efek visual. Toples ajaib dan telur bisa mempercepat pertumbuhan karena langsung memberi mochi Lv. 2. Varian emas bersifat kosmetik.

Selesaikan penghitungan koin pada laju lama sebelum setiap gabung, pembelian, pindah area, atau perubahan boost. Hanya papan aktif yang menghasilkan koin. Saat pindah area, simpan setiap papan dan mulai pendapatan dari area tujuan. Offline membayar dari snapshot papan terakhir, hingga 28.800 detik per kepulangan. Simpan sisa pecahan koin dan hanya bulatkan saat ditampilkan atau saat sebuah hadiah mensyaratkan koin utuh.

Laju pasif setelah Panen Raya adalah `S × (1 + 0,10 × Lv. Bonus Koin) × (1 + 0,15 × P)`, dengan `P` jumlah Panen Raya yang selesai. Boost aktif berlaku hanya pada bagian durasinya. Hadiah gabung, misi, event, dan iklan tidak dikalikan Bonus Koin maupun Panen Raya. Contoh, satu Lv. 5 dan satu Lv. 4 memberi 24 koin/detik. Dengan Bonus Lv. 4 dan dua Panen, lajunya 43,68 koin/detik dan hasil offline maksimum 1.257.984 koin sebelum boost.

## Upgrade

Harga berikutnya adalah `ceil(dasar × pengali^L)`, dengan `L` level saat ini dan level awal 0. Tampilkan level dan harga sebelum membeli satu tingkat.

| Jalur | Dasar | Pengali | Efek pada level L | Batas |
| --- | ---: | ---: | --- | --- |
| Toples cepat | 25 | 1,55 | Jeda `0,5 + 2,5 × 0,92^L` detik, termasuk 3 detik pada Lv. 0 | Jeda minimum 0,5 detik |
| Kapasitas | 100 | 2,28 | `12 + L` mochi pada setiap papan 5×6 | Lv. 18, total 30 |
| Bonus koin | 200 | 1,75 | `+10% × L` terhadap penghasilan dasar | Level berlanjut |
| Toples ajaib | 500 | 1,9 | `40% × (1 − 0,97^L)` peluang spawn Lv. 2 | Peluang mendekati 40% |

| Level saat ini | Toples cepat | Kapasitas | Bonus koin | Toples ajaib |
| ---: | ---: | ---: | ---: | ---: |
| 0 | 25 | 100 | 200 | 500 |
| 1 | 39 | 228 | 350 | 950 |
| 5 | 224 | 6.162 | 3.283 | 12.381 |
| 10 | 2.002 | 379.620 | 53.878 | 306.554 |
| 17 | 43.011 | 121.588.472 | 2.708.176 | 27.401.935 |
| 18 | 66.667 | Maksimal | 4.739.308 | 52.063.676 |
| 25 | 1.432.955 | Maksimal | 238.221.642 | 4.653.824.785 |

Upgrade berlaku di semua area. Simpanan M2b mempertahankan koin, level upgrade, papan Kebun, dan penemuan tertinggi saat migrasi. Untuk angka tampil ikuti K, M, B, T, aa, ab, ac, dan seterusnya.

## Target hari 1, 3, 7, dan 30

Simulasi acuan M2b memakai seed 42, satu kesempatan spawn dan satu merge tiap detik aktif, serta tiga sesi 3 menit dengan jeda offline 8 jam antarsesi. Hasil di M2b ialah upgrade pertama 9 detik, petak ke-30 pada hari 3,02, dan upgrade termahal masih membutuhkan 10,9 menit penghasilan pada akhir simulasi dua jam aktif. Angka di tabel adalah target desain lintas area dan siklus baru, untuk diuji mulai M9. Ukur rekor level dan kapasitas sejak akun dibuat, agar reset tidak menurunkan hasil pengukuran.

| Usia kebun | Waktu aktif kumulatif | Rekor yang dituju | Kapasitas global | Panen selesai | Fokus pengeluaran |
| --- | ---: | --- | ---: | ---: | --- |
| Hari 1 | 9 menit | Kebun Lv. 8–9 dan Pantai terbuka | 23–26 | 0 | Toples cepat Lv. 0 → 1 seharga 25 dalam <30 detik |
| Hari 3 | 27 menit | Kebun Lv. 10–11, atau Pantai Lv. 8–9 bila fokus pindah | 28–30, petak ke-30 mulai sekitar akhir hari ketiga | 0–1 | Petak ke-30 berharga 121.588.472 |
| Hari 7 | 63 menit | Minimal satu area Lv. 12 atau Salju terbuka | 30 | 1–2 | Toples ajaib Lv. 10 → 11 berharga 306.554 pada siklus berikut |
| Hari 30 | 270 menit | Tiga area terbuka, rekor Lv. 12 di minimal dua area | 30 | 5–8 | Bonus koin Lv. 25 → 26 berharga 238.221.642 bila melanjutkan siklus |

Skenario uji pembanding tanpa misi, iklan, debug, atau Panen tetap memakai kondisi M2b dan harus menahan kapasitas maksimum sampai hari 2,8–4,0. Skenario rancangan mengulang jadwal yang sama dengan misi, boost, dan Panen Raya serta mencatat waktu unlock, rekor setiap area, dan sumber koin. Rentang tabel menjadi sasaran tuning sebelum rilis.

## Panen Raya

1. Tawarkan setelah pemain mencapai minimal Lv. 10 di salah satu area dalam siklus berjalan dan saldo minimal 1.000.000 koin. Tampilkan tombol di panel upgrade. Riwayat Mochidex dari siklus lama tetap terlihat dan tidak memenuhi syarat siklus baru.
2. Buka lembar konfirmasi yang merinci saldo dan upgrade yang akan direset serta perubahan pengali. Pemain bisa kembali bermain pada siklus yang sama. Tidak ada batas waktu atau Panen otomatis.
3. Saat konfirmasi, selesaikan akrual lalu simpan reset sebagai satu transaksi. Tambah `P` sebanyak 1, kosongkan ketiga papan, mulai di Kebun dengan satu Mochi Tunas, setel saldo ke 0, dan kembalikan Toples cepat, Bonus koin, serta Toples ajaib ke Lv. 0. Reset rekor siklus berjalan ke Lv. 1 dan kosongkan cooldown.
4. Pertahankan upgrade kapasitas, area terbuka, Mochidex dan emas yang pernah ditemukan, progres misi/event, item, serta sisa waktu boost aktif. Telur siap tetap tersimpan. Peristiwa reset tidak dihitung sebagai spawn, discovery, atau pembelian bagi misi. Tidak ada koin dari papan lama setelah reset tersimpan, termasuk setelah reload.
5. Pengali permanen naik +0,15 per Panen dan berlaku di semua area, baik aktif maupun offline. Syarat Panen tetap sama pada siklus berikutnya. Satu permintaan reset hanya boleh menaikkan `P` sekali, termasuk pada ketuk ganda atau pemulihan aplikasi.

| Panen selesai | Pengali permanen | 1 mochi Lv. 10, Bonus Lv. 0 | Offline 8 jam |
| ---: | ---: | ---: | ---: |
| 0 | ×1,00 | 512 koin/detik | 14.745.600 |
| 1 | ×1,15 | 588,8 koin/detik | 16.957.440 |
| 2 | ×1,30 | 665,6 koin/detik | 19.169.280 |
| 5 | ×1,75 | 896 koin/detik | 25.804.800 |
| 10 | ×2,50 | 1.280 koin/detik | 36.864.000 |
| 30 | ×5,50 | 2.816 koin/detik | 81.100.800 |

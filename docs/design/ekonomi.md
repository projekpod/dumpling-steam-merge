# Ekonomi Dumpling Steam: Merge & Squish

Untuk sesi 30 detik–5 menit. M2c menjadi acuan angka dan aturan kukusan. Multi-area, boost, dan Panen Raya di bawah merupakan rancangan. Semua koin pada dokumen ini hanya berlaku di dalam game, termasuk pada [jalur monetisasi B](backlog.md#dua-jalur-monetisasi).

## Penghasilan dasar

| Level dumpling | Koin/detik | Koin/jam | Hadiah sekali gabung ke level ini |
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

Ketiga area memakai kurva yang sama. `S = Σ 2^(level−1)` untuk dumpling di papan aktif. Untuk setiap dumpling, kalikan angka tabel dengan pengali variannya sebelum menjumlahkannya ke `S`. Hadiah sekali gabung tetap sebesar tiga detik penghasilan dasar spesies hasil gabung. Combo menambah efek visual. Dua Glitter Lv. 2 menghasilkan total 8 koin/detik sebelum dan sesudah menjadi satu Glitter Lv. 3. Jika yang digabung adalah Biasa dan Emas Lv. 2, laju total naik dari 12 menjadi 20 koin/detik karena hasilnya Emas Lv. 3.

Selesaikan penghitungan koin pada laju lama sebelum setiap gabung, pembelian, pindah area, atau perubahan boost. Hanya papan aktif yang menghasilkan koin. Saat pindah area, simpan setiap papan dan mulai pendapatan dari area tujuan. Offline membayar dari snapshot papan terakhir, hingga 28.800 detik per kepulangan. Simpan sisa pecahan koin dan hanya bulatkan saat ditampilkan atau saat sebuah hadiah mensyaratkan koin utuh.

Laju pasif setelah Panen Raya adalah `S × (1 + 0,10 × Lv. Bonus Koin) × (1 + 0,15 × P)`, dengan `P` jumlah Panen Raya yang selesai. Boost aktif berlaku hanya pada bagian durasinya. Hadiah gabung, misi, event, dan iklan tidak dikalikan Bonus Koin maupun Panen Raya. Contoh, satu Lv. 5 dan satu Lv. 4 memberi 24 koin/detik. Dengan Bonus Lv. 4 dan dua Panen, lajunya 43,68 koin/detik dan hasil offline maksimum 1.257.984 koin sebelum boost.

## Kukusan dan remas

Kukusan gratis datang dengan stok awal 1, lalu 1 tiap 20 detik awal hingga stok 3. Timer tetap berjalan saat offline. Kukusan selalu menghabiskan stok gratis sebelum koin, termasuk ketika saldo mencukupi. Harga berbayar adalah `ceil(8 × 2,15^(max(1, H) − 1) × (1 − diskon))` dengan `H` level tertinggi yang pernah ditemukan dalam kebun saat ini. Tombol menampilkan harga sekaligus status stok. Animasi membuka kukusan mengunci aksi berikutnya selama 420 ms agar satu reveal mendapat ruang dan tidak ada pembayaran ganda.

| Rekor level H | Harga, Hemat Lv. 0 | Harga, Hemat Lv. 10 |
| ---: | ---: | ---: |
| 1 | 8 | 6 |
| 4 | 80 | 51 |
| 8 | 1.699 | 1.077 |
| 12 | 36.301 | 23.002 |

Papan kosong dengan saldo kurang dan stok 0 selalu bisa membuka kukusan gratis darurat, tanpa mengisi stok tambahan. Papan penuh dengan pasangan bisa pulih lewat gabung. Jika papan penuh tanpa pasangan sah, pemain bisa mengosongkan petak dumpling berpenghasilan paling kecil melalui konfirmasi. Buku Koleksi Dumpling dan rekor tidak ikut terhapus.

Tekan-tahan diam 500 ms atau lebih membayar 1 koin pada Remas Ajaib Lv. 0, maksimal tiga pembayaran per jendela 60 detik bergulir. Pada Lv. 10 bayar ≈5,56 koin per remas sah dengan batas tetap 3 kali. Hadiah mendekati 8 koin dan tidak dikalikan rarity, Bonus Koin, maupun Panen Raya. Pergerakan >10 px masuk jalur seret dan tidak memberi koin remas.

## Varian

| Varian | Peluang pada Istimewa Lv. 0 | Batas peluang saat level naik | Pengali pasif |
| --- | ---: | ---: | ---: |
| Biasa | 92,7095% | Turun mendekati 87,9707% | ×1 |
| Glitter | 6% | 9,9% | ×2 |
| Pelangi | 1,2% | 1,98% | ×3 |
| Emas | 0,08% | 0,132% | ×5 |
| Pink Langka | 0,0105% | 0,017325% | ×10 |

Kukusan gratis dan berbayar memakai tabel yang sama. Peluang tiap varian non-Biasa dikalikan `1 + 0,65 × (1 − 0,94^L)` dan sisanya menjadi Biasa. Info peluang menampilkan angka untuk level saat ini. Undian level terpisah. Peluang mentok mendekati 32% untuk Lv. 2 dan 8% untuk Lv. 3, dengan sisa peluang di Lv. 1. Gabung mengambil varian tertinggi menurut urutan tabel. Buku Koleksi Dumpling mencatat semua penemuan per spesies, termasuk hasil gabung.

## Upgrade

Harga berikutnya adalah `ceil(dasar × pengali^L)`, dengan `L` level saat ini dan level awal 0. Tampilkan level dan harga sebelum membeli satu tingkat.

| Jalur | Dasar | Pengali | Efek pada level L | Batas |
| --- | ---: | ---: | --- | --- |
| Kukusan Hemat | 16 | 1,72 | Diskon `0,60 × (1 − 0,91^L)` | Mendekati 60% |
| Kapasitas | 100 | 2,56 | `12 + L` dumpling pada tiap papan 5×6 | Lv. 18, total 30 |
| Kukusan Gratis Lebih Cepat | 22 | 1,78 | Isi ulang tiap `6 + 14 × 0,92^L` detik | Minimum 6 detik |
| Kukusan Istimewa | 500 | 3,7 | Peluang Lv. 2 = `32% × (1 − 0,96^L)`, Lv. 3 = `8% × (1 − 0,96^L)`, plus pengali peluang varian di atas | Peluang total Lv. 2–3 mendekati 40% |
| Bonus Koin | 200 | 2,0 | `+10% × L` terhadap laju dasar papan yang sudah mengandung pengali varian | Level berlanjut |
| Remas Ajaib | 30 | 1,9 | `1 + 7 × (1 − 0,9^L)` koin per remas sah | Mendekati 8 koin, tetap 3 kali per menit |

| Level saat ini | Hemat | Kapasitas | Gratis Lebih Cepat | Istimewa | Bonus Koin | Remas Ajaib |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 0 | 16 | 100 | 22 | 500 | 200 | 30 |
| 1 | 28 | 256 | 40 | 1.850 | 400 | 57 |
| 5 | 241 | 10.996 | 394 | 346.720 | 6.400 | 743 |
| 10 | 3.626 | 1.208.926 | 7.025 | 240.429.219 | 204.800 | 18.394 |
| 17 | 161.475 | 871.122.860 | 397.707 | 2.282.439.704.131 | 26.214.400 | 1.644.117 |
| 18 | 277.736 | Maksimal | 707.918 | 8.445.026.905.282 | 52.428.800 | 3.123.821 |

Upgrade berlaku di semua area saat area tambahan tersedia. Migrasi v4 mempertahankan koin, level Bonus Koin dan Kapasitas, papan Kebun, serta rekor. Toples cepat menjadi Kukusan Gratis Lebih Cepat dan Toples ajaib menjadi Kukusan Istimewa pada level yang sama. Dumpling lama menjadi Biasa. Format angka memakai K, M, B, T, aa, ab, ac, dan seterusnya. Sasaran misi dan boost yang sebelumnya merujuk jeda toples perlu disetel dengan kurva baru saat M7–M8.

## Target hari 1, 3, 7, dan 30

Simulasi M2c memakai 31 seed. Tiap hari berisi tiga sesi 3 menit, dipisahkan 7 jam 57 menit offline. Pada tiap detik aktif pemain membeli upgrade terjangkau, mencoba satu bukaan kukusan, dan menggabung satu pasangan. Simulasi tidak memakai misi, remas, iklan, atau debug.

| Ukuran simulasi M2c | Hasil |
| --- | ---: |
| Upgrade pertama, seed acuan 42 | 13 detik |
| Upgrade termahal setelah 2 jam aktif | 11,6 menit pendapatan pada seed 42, median 8,3 menit |
| Waktu 30 petak di 31 seed | Tercepat hari 3,00, median hari 4,33 |
| Emas pertama, median | Hari 1,00 |
| Pink Langka pertama, median | Hari 9,67 |

Sasaran lintas area di bawah berlaku untuk M9 setelah Panen Raya. Ukur rekor level dan kapasitas sejak akun dibuat dan uji terpisah dari simulasi baseline M2c.

| Usia kebun | Waktu aktif kumulatif | Rekor yang dituju | Kapasitas global | Panen selesai |
| --- | ---: | --- | ---: | ---: |
| Hari 1 | 9 menit | Kebun Lv. 8–9 dan Pantai terbuka | 21–26 | 0 |
| Hari 3 | 27 menit | Kebun Lv. 10–11, atau Pantai Lv. 8–9 jika fokus pindah | 26–30 | 0–1 |
| Hari 7 | 63 menit | Minimal satu area Lv. 12 atau Salju terbuka | 29–30 | 1–2 |
| Hari 30 | 270 menit | Tiga area terbuka, rekor Lv. 12 di minimal dua area | 30 | 5–8 |

## Panen Raya

1. Tawarkan setelah pemain mencapai minimal Lv. 10 di salah satu area dalam siklus berjalan dan saldo minimal 1.000.000 koin. Tampilkan tombol di panel upgrade. Riwayat Buku Koleksi Dumpling dari siklus lama tetap terlihat dan tidak memenuhi syarat siklus baru.
2. Buka lembar konfirmasi yang merinci saldo dan upgrade yang akan direset serta perubahan pengali. Pemain bisa kembali bermain pada siklus yang sama. Tidak ada batas waktu atau Panen otomatis.
3. Saat konfirmasi, selesaikan akrual lalu simpan reset sebagai satu transaksi. Tambah `P` sebanyak 1, kosongkan ketiga papan, mulai di Kebun dengan satu Dumpling Tunas, setel saldo ke 0, dan kembalikan Kukusan Hemat, Kukusan Gratis Lebih Cepat, Kukusan Istimewa, Bonus Koin, dan Remas Ajaib ke Lv. 0. Reset rekor harga siklus berjalan ke Lv. 1 dan mulai dengan satu kukusan gratis. Riwayat Buku Koleksi Dumpling tetap permanen.
4. Pertahankan upgrade kapasitas, area terbuka, Buku Koleksi Dumpling dan emas yang pernah ditemukan, progres misi/event, item, serta sisa waktu boost aktif. Telur siap tetap tersimpan. Peristiwa reset tidak dihitung sebagai spawn, discovery, atau pembelian bagi misi. Tidak ada koin dari papan lama setelah reset tersimpan, termasuk setelah reload.
5. Pengali permanen naik +0,15 per Panen dan berlaku di semua area, baik aktif maupun offline. Syarat Panen tetap sama pada siklus berikutnya. Satu permintaan reset hanya boleh menaikkan `P` sekali, termasuk pada ketuk ganda atau pemulihan aplikasi.

| Panen selesai | Pengali permanen | 1 dumpling Lv. 10, Bonus Lv. 0 | Offline 8 jam |
| ---: | ---: | ---: | ---: |
| 0 | ×1,00 | 512 koin/detik | 14.745.600 |
| 1 | ×1,15 | 588,8 koin/detik | 16.957.440 |
| 2 | ×1,30 | 665,6 koin/detik | 19.169.280 |
| 5 | ×1,75 | 896 koin/detik | 25.804.800 |
| 10 | ×2,50 | 1.280 koin/detik | 36.864.000 |
| 30 | ×5,50 | 2.816 koin/detik | 81.100.800 |

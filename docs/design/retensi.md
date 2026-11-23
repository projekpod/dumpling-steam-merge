# Retensi

Untuk pemain yang sedang menunggu dengan satu tangan di HP entry-level. Satu interaksi harus memberi umpan balik dalam sesi 30 detik, dan semua progres tersimpan jika pemain langsung menutup aplikasi.

## Loop harian

| Saat | Rentang aktif | Pemain mendapat |
| --- | --- | --- |
| Kembali ke kebun | 0–5 detik | Papan terakhir dan ringkasan hasil offline sampai 8 jam. Paket dibayar sekali saat kembali. |
| Ketuk dan gabung | 5–30 detik | Dumpling baru, satu gabung, atau peluang membeli upgrade pertama. Tombol toples tetap terlihat di 360×640. |
| Kunjungan singkat | 30–90 detik | Satu misi ringan bisa maju. Setelah 60 detik aktif, hadiah kunjungan 30 × laju dasar tersedia sesuai [batas hadiah](misi-boost.md). |
| Lanjut bermain | 90–300 detik | Pilih sendiri antara misi, upgrade, membuka telur setelah 180 detik aktif kumulatif, dan melihat Buku Koleksi Dumpling. |
| Tutup kapan saja | Kapan pun | Papan, hadiah yang sudah dibayar, progres misi, serta telur tertunda tersimpan. Tenggat klaim misi yang selesai punya masa tenggang 48 jam. |

Hari permainan mulai pukul 04.00 WIB. Hadiah kunjungan tetap sama setelah absen satu hari atau lebih. Saat kembali dari absen ≥7 hari, tampilkan bagian terakhir yang dimainkan dan misi hari ini dengan alur yang sama. Tidak ada layar yang meminta penjelasan kenapa pemain absen.

## Notifikasi

Android memakai notifikasi lokal. Web menampilkan pengingat di dalam game. Jadwal opsional dimulai setelah sesi ketiga pada hari berbeda, hanya jika pemain memilih “Ingatkan saya” di pengaturan. Tawarkan pilihan sekali di panel pengaturan dan izinkan mematikan tiap jenis kapan pun. Tidak ada permintaan izin saat membuka game pertama kali.

| Jenis | Syarat kirim | Contoh isi |
| --- | --- | --- |
| Hasil kebun | Pemain memasang pengingat, papan terakhir menghasilkan koin, dan belum kembali ≥24 jam | “Dumpling sudah mengumpulkan koin. Lihat kebun saat sempat.” |
| Festival | Pemain mengaktifkan kabar acara dan festival sedang berlangsung | “Festival baru sudah mulai. Mampir saat ada waktu.” |

Maksimal 1 notifikasi per 24 jam dan 2 per 7 hari bergulir, gabungan kedua jenis. Kirim pukul 18.00 WIB pada hari yang memenuhi syarat. Jika pemain sudah membuka permainan hari itu, lewati pengingat hasil kebun. Notifikasi festival sekali per acara. Setelah dua notifikasi berturut-turut tanpa pemain kembali dalam 24 jam, hentikan pengiriman hingga pemain membuka game lagi. Ketika dinonaktifkan, batalkan jadwal yang masih tertunda. Notifikasi membuka kebun atau panel festival dan tidak membuka penawaran iklan.

## Event musiman

Empat festival per tahun, tanpa merombak papan normal. Tanggal dan jam mengikuti WIB. ID tetap acara mengikuti tahun dan nama untuk membatasi klaim.

| Festival | Periode inklusif | Aksen bentuk | Cara mendapat kupon |
| --- | --- | --- | --- |
| Pekan Tunas | 10–23 Maret | Stempel daun | Gabung pertama pada hari itu dan klaim hadiah kunjungan |
| Ombak Liburan | 6–19 Juli | Stempel kerang | Gabung pertama pada hari itu dan klaim hadiah kunjungan |
| Hujan Beri | 5–18 Oktober | Stempel beri | Gabung pertama pada hari itu dan klaim hadiah kunjungan |
| Selimut Salju | 10–23 Desember | Stempel serpih | Gabung pertama pada hari itu dan klaim hadiah kunjungan |

Satu kupon per tindakan, maksimal 2 per hari. Tukarkan 4 kupon untuk 1 Teh Toples, 8 untuk satu bingkai Buku Koleksi Dumpling bertema, dan 12 untuk 1 Selimut Embun serta satu Pupuk Kilat. Setiap hadiah maksimal 1× per acara. Bingkai bisa diperoleh dengan empat hari kunjungan penuh dari 14 hari. Penukaran buka 48 jam sesudah acara berakhir. Kupon tersisa lalu dikonversi otomatis menjadi 20 koin per kupon, dibayar sekali. Jika inventaris boost penuh saat penukaran, hadiah item tetap di panel klaim acara sampai 48 jam tambahan, lalu setiap item tertunda berubah menjadi 200 koin. Dekorasi memakai tekstur yang digambar dengan kode dan dilucuti ketika mode hemat aktif. Festival tidak mengubah peluang emas, harga upgrade, atau rumus offline.

## Metrik dan kriteria keputusan

Pemain aktif adalah profil pseudonim yang menjalankan satu aksi sukses atau mencapai 30 detik aktif. Sesi baru dimulai setelah ≥30 menit tidak aktif, dan update dari tab tersembunyi tidak dihitung. Jam usia cohort dimulai dari sesi aktif pertama memakai hari permainan pukul 04.00 WIB. Hitung tiap Dn hanya untuk cohort yang telah mencapai umur n. Ambang di bawah menjadi sasaran awal, bukan hasil rilis.

| Metrik | Definisi | Sasaran awal |
| --- | --- | --- |
| D1 | Persentase cohort hari 0 yang kembali aktif tepat hari 1 | ≥35% |
| D7 | Persentase cohort hari 0 yang kembali aktif tepat hari 7 | ≥15% |
| D30 | Persentase cohort hari 0 yang kembali aktif tepat hari 30 | ≥7% |
| Sesi/hari | Sesi aktif dibagi DAU pada hari yang sama. Laporkan juga median durasi aktif. | 2,0 sesi/DAU, median 30–180 detik |
| ARPDAU | Pendapatan bersih yang diakui hari itu dibagi seluruh DAU hari itu, termasuk yang tidak menonton iklan atau mengambil penawaran | Rp15–40 sebagai hipotesis awal monetisasi, tanpa target pendapatan untuk versi tanpa monetisasi |

Untuk jalur A, gunakan estimasi pendapatan iklan dari SDK dan rekonsiliasi dengan laporan penyedia. Untuk jalur B, gunakan pendapatan penawaran yang disetujui dikurangi biaya pencairan serta kewajiban kredit yang timbul pada hari itu, termasuk saldo yang belum ditarik. Tampilkan pendapatan kotor dan biaya terpisah agar hasil dua jalur dapat dibaca. Laporkan menurut platform, jalur, versi, dan cohort. Data web offline dikirim ulang dengan ID event untuk deduplikasi. Abaikan profil debug dan tes pada semua metrik.

Catat `session_start`, `session_end` dan durasi aktif, `first_merge`, `upgrade_bought`, `offline_paid`, `mission_claimed`, `unlock_area`, `harvest_reset`, `event_redeemed`, `notification_opened`, serta tawaran, impresi, klaim iklan dan penutupan game dalam 10 detik. Jalur B menambah status penawaran dan penukaran dari ledger. Log analitik tidak memuat nama, alamat, kontak, dokumen verifikasi, atau identitas pembayaran. Simpan event mentah 90 hari dan metrik agregat 12 bulan. Hormati pilihan analitik, sediakan pemutusan pengiriman, dan laporkan cakupan pengukuran.

Bandingkan monetisasi dengan kelompok tanpa monetisasi pada ≥1.000 profil per kelompok setelah masing-masing cohort matang tujuh hari. Interstitial tetap dimatikan jika melanggar batas pengalaman pada [rancangan iklan](iklan.md). Kenaikan ARPDAU saja tidak cukup untuk melanjutkan eksperimen.

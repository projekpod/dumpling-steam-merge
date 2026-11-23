# Keputusan

- M1 memakai toples tanpa jeda, mengisi petak kosong pertama, dan menghasilkan dumpling baru di petak tujuan saat dua level yang sama digabung.
- Seretan ke petak kosong memindahkan dumpling agar papan mudah ditata, sedangkan level berbeda dan pasangan level 12 tetap di posisi semula.
- M2 memakai kapasitas awal 20 yang bisa naik ke 25 dan 30 tanpa mengubah grid 5×6; simpanan M1 mendapat kapasitas minimum yang menampung semua dumpling lamanya.
- Dumpling level 1 menghasilkan 1 koin/detik dan hasilnya berlipat dua per level; upgrade koin menambah 25% per tingkat dan upgrade toples mengurangi jeda dari 1 detik menuju 0,25 detik.
- M2b memakai pengali Kapasitas 2,28 setelah simulasi tiga sesi tiga menit per hari dengan delapan jam jeda offline antarsesi. Upgrade mahal berarti masih memerlukan sedikitnya sepuluh menit pendapatan pada laju akhir simulasi dua jam aktif.
- Migrasi M2b mempertahankan saldo, papan, level Toples cepat, dan kapasitas yang sudah dibeli; bonus lama dikonversi ke kelipatan 10% terdekat, sedangkan kapasitas gratis lawas mengikuti aturan baru dengan tetap menampung seluruh dumpling lama.
- Hadiah gabung setara tiga detik penghasilan dasar dumpling hasil gabung. Combo menambah efek visual, dan penghasilan pasif kontinu berjalan tanpa bunyi.
- Kukusan memakai stok gratis lebih dulu. Saat papan penuh tanpa pasangan sah, pemain bisa melepaskan satu dumpling berpenghasilan paling kecil setelah konfirmasi, dengan entri Buku Koleksi Dumpling tetap tersimpan.
- Migrasi versi 4 memetakan Toples cepat ke Kukusan Gratis Lebih Cepat dan Toples ajaib ke Kukusan Istimewa dengan level lama, serta menganggap seluruh dumpling lawas Biasa.
- Remas membayar setelah 500 ms, maksimal tiga pembayaran dalam 60 detik bergulir, dan hadiah gabung tetap memakai laju dasar spesies sebelum pengali varian agar hadiah instan tidak ikut melonjak.
- M2d mendefinisikan sesi baru setelah 30 menit tidak aktif; satu rewarded mengisi stok ke batas tiga dan menggandakan pendapatan pasif, dengan waktu iklan tidak dihitung sebagai gameplay atau penghasilan.
- M2d memakai penyimpanan lokal terpisah di iframe jika Data Module tidak bisa dibaca, agar progres cadangan tidak menimpa simpanan akun di portal.
- M2f memutar Ninabobo lebih pelan selama semua dumpling tidur. Jingle varian dipicu oleh setiap varian non-Biasa yang keluar dari kukusan, sedangkan gabungan memicu jingle mulai combo ×3.
- Build portal memilih satu adapter saat kompilasi. Playgama memakai Bridge v2 dari CDN resmi dan menyimpan lokal jika pembacaan penyimpanan Bridge gagal, agar sesi cadangan tidak menimpa simpanan akun.
- GitHub Pages menunggu artefak terdaftar sebelum menjalankan job deploy terpisah. Nama per percobaan menghindari bentrok saat menjalankan ulang workflow.

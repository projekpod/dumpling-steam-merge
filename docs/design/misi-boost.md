# Misi dan boost

Misi opsional yang bisa dicicil dalam sesi 30 detik–5 menit. Hadiah berupa koin atau item game. Koin misi dan item memakai inventaris game yang sama di kedua jalur, dengan saldo offerwall terpisah.

## Rotasi dan pembayaran

- Pilih 3 misi harian saat profil pertama dibuka pada hari permainan yang mulai pukul 04.00 WIB. Pilih 5 misi mingguan saat profil pertama dibuka sejak Senin pukul 04.00 WIB. Gunakan seed dari ID profil dan ID periode, acak tanpa pengulangan, lalu simpan hasilnya sebelum menerima progres. Reload dan pindah area tidak mengacak ulang. Jika sempat offline, hadiah yang sudah tercapai tetap bisa diambil sampai 48 jam setelah akhir periodenya.
- Dari misi harian yang lolos syarat, ambil 1 dari D01–D04 dan 2 lainnya dari sisa pool. Untuk mingguan, ambil 2 dari W01–W05 dan 3 lainnya dari sisa pool. Undian melewati syarat yang belum terpenuhi pada saat penerbitan. Misi cadangan di kedua kelompok selalu tersedia. Satu aksi boleh memajukan beberapa misi berbeda, termasuk harian dan mingguan.
- `B = clamp(laju dasar papan aktif saat misi diterbitkan, 10, 10.000)` koin/detik tanpa bonus, pengali Panen, atau boost. Hadiah `20B` berarti dua puluh detik penghasilan pada laju terkunci itu. Setiap misi dibayar sekali dengan ID `profil + periode + misi`. Contoh saat `B = 100`, 20B = 2.000 koin.
- Hitung hanya aksi sukses di dalam permainan biasa. Spawn dari telur terpisah dari toples, perpindahan ke petak kosong tidak termasuk gabung, dan simulasi debug tidak mengisi misi. Waktu aktif dihitung saat game tampak dan mendapatkan interaksi dalam 30 detik terakhir. Untuk penghasilan offline, hitung paket yang benar-benar dibayar saat kembali, tanpa tambahan iklan.
- Koin dan item bisa diklaim dari satu panel di bawah toples. Jika tipe item telah mencapai batas 12, tampilkan klaim tertunda sampai pemain memakai item tersebut. Progres yang selesai boleh diklaim hingga 48 jam setelah periode. Tidak ada penalti atau streak.

## 15 misi harian

| ID | Misi | Syarat selesai | Syarat masuk undian | Hadiah |
| --- | --- | --- | --- | --- |
| D01 | Isi Toples | Spawn 5 dumpling dari toples | Selalu | 20B |
| D02 | Teman Baru | Gabung 3 pasangan | Selalu | 25B |
| D03 | Mampir Sebentar | Main 60 detik aktif | Selalu | 15B |
| D04 | Uang Jajan | Terima minimal 30B koin pasif, termasuk offline | Selalu | 20B |
| D05 | Tunas Ramai | Spawn 15 dumpling dari toples | Selalu | 35B |
| D06 | Dekatkan Mereka | Gabung 8 pasangan | Selalu | 40B dan 1 Pupuk Kilat |
| D07 | Kelopak Kecil | Hasilkan satu dumpling Lv. 3 lewat gabung | Rekor Lv. 3 pernah dicapai | 35B |
| D08 | Sapa Kembar | Capai combo ×2 satu kali | Rekor Lv. 4 pernah dicapai | 35B dan 1 Teh Toples |
| D09 | Kulit Retak | Buka 1 telur kejutan | Telur fitur sudah tersedia | 30B |
| D10 | Buka Buku | Lihat 3 entri ditemukan yang berbeda di Buku Koleksi Dumpling | Sudah menemukan 3 spesies | 20B |
| D11 | Isi Rak | Beli 1 tingkat upgrade apa saja | Selalu | 30B |
| D12 | Tetap Berbuah | Terima satu pembayaran offline untuk jeda ≥30 menit | Selalu | 25B |
| D13 | Ganti Pemandangan | Gabung 1 pasangan di area selain area saat misi terbit | Pantai terbuka | 40B |
| D14 | Bonus Dadakan | Toples menghasilkan 1 dumpling Lv. 2 | Toples ajaib Lv. 5+ | 45B |
| D15 | Kenalan Lagi | Gabung menjadi Lv. 4 atau lebih tinggi sebanyak 2 kali | Rekor Lv. 5 pernah dicapai | 50B dan 1 Selimut Embun |

## 10 misi mingguan

| ID | Misi | Syarat selesai | Syarat masuk undian | Hadiah |
| --- | --- | --- | --- | --- |
| W01 | Toples Keliling | Spawn 60 dumpling dari toples | Selalu | 120B dan 1 Teh Toples |
| W02 | Rukun Sekebun | Gabung 30 pasangan | Selalu | 150B dan 1 Pupuk Kilat |
| W03 | Mampir Lagi | Main total 12 menit aktif pada minimal 3 hari berbeda | Selalu | 150B |
| W04 | Terima Hasil | Klaim hadiah kunjungan pada 3 hari berbeda | Selalu | 100B dan 1 Selimut Embun |
| W05 | Rajin Berbenah | Beli 5 tingkat upgrade apa saja | Selalu | 180B |
| W06 | Kolektor Telur | Buka 4 telur kejutan | Telur fitur sudah tersedia | 160B dan 1 Sendok Ajaib |
| W07 | Pentas Toples | Capai combo ×3 pada 2 rangkaian berbeda | Rekor Lv. 6 pernah dicapai | 210B dan 1 Teh Toples |
| W08 | Panen Tidur | Terima pembayaran offline untuk jeda ≥2 jam pada 3 hari berbeda | Selalu | 130B dan 1 Selimut Embun |
| W09 | Dua Papan | Gabung 5 pasangan di Kebun dan 5 di Pantai | Pantai terbuka | 220B dan 1 Pupuk Kilat |
| W10 | Turun Salju | Gabung menjadi Lv. 5 atau lebih tinggi di Salju sebanyak 2 kali | Salju terbuka | 250B dan 1 Sendok Ajaib |

## Empat boost

| Item | Efek | Durasi atau kuota | Waktu berjalan |
| --- | --- | --- | --- |
| Pupuk Kilat | Laju pasif aktif ×2, termasuk laju dari Bonus koin dan Panen Raya | 120 detik | Foreground aktif saja |
| Teh Toples | Jeda toples ×0,70, dengan batas bawah absolut 0,5 detik | 90 detik | Foreground aktif saja |
| Selimut Embun | Segmen offline pertama ×1,5 hingga batas efek | 1 kepulangan dengan jeda ≥5 menit, efek paling lama 3.600 detik dari jendela offline 8 jam | Dipasang sebelum pergi, lalu terpakai pada kepulangan yang memenuhi syarat |
| Sendok Ajaib | Tambah 15 poin persentase pada peluang toples ajaib, total maksimum 40% | 8 spawn sukses dari toples | Hanya mengurangi kuota saat dumpling benar-benar masuk papan |

Aktivasi memakai satu item. Efek berbeda bisa berjalan berbarengan dan efek sejenis ditolak jika masih aktif. Simpan durasi atau kuota saat keluar. Satu Selimut Embun boleh terpasang sekaligus. Bila jeda lebih dari 8 jam, boost tetap hanya memengaruhi 1 jam pertama dari 8 jam yang dibayar. Cooldown Teh Toples memakai durasi yang berlaku ketika spawn sukses dan tidak dihitung ulang di tengah satu jeda.

Hadiah kunjungan bisa diklaim sekali per hari setelah 60 detik aktif, berupa 30 × laju dasar papan saat klaim dengan laju dibatasi 10–10.000 koin/detik. Sampel 100 koin/detik memberi 3.000 koin. Tidak ada kalender streak atau hadiah yang berkurang karena absen. Semua fitur di halaman ini dapat dimainkan tanpa iklan atau offerwall.

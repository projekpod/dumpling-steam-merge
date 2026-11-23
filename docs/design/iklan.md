# Iklan dan penempatan

Rancangan bersyarat setelah keputusan monetisasi. Jalur A memakai AdMob hanya di Android. PWA tetap menawarkan semua progres, misi, event, dan hadiah reguler. Jalur B memakai offerwall sukarela tanpa iklan Google atau interstitial. Koin, item, dan boost game tetap terpisah dari saldo yang bisa ditukar. Lihat [backlog monetisasi](backlog.md#dua-jalur-monetisasi).

## Jalur A · Rewarded opsional

Pemain menekan tombol bertuliskan hadiah persis sebelum SDK dipanggil. Tombol klaim normal tetap tersedia dan berfungsi meskipun SDK tidak siap. Tawaran muncul setelah progres utama sudah tampil, tanpa menutup papan atau membuka dialog otomatis.

| Penempatan | Kapan tersedia | Label tindakan | Hadiah | Batas |
| --- | --- | --- | --- | --- |
| Lembar hasil offline | Paket reguler sudah masuk saldo, jeda offline ≥30 menit, tambahan ≥1 koin | “Tonton untuk +{jumlah} koin” | `floor(min(0,25 × paket reguler, 300 × laju dasar snapshot, 500.000))` | 1× per paket, 2× per hari |
| Panel boost | Pemain membuka panel dan stok Pupuk Kilat <12 | “Tonton untuk 1 Pupuk Kilat” | 1 Pupuk Kilat, efek ×2 pasif aktif selama 120 detik | 2× per hari |

Contoh offline, paket 180.000 koin dengan laju dasar 100 koin/detik memberi tambahan 30.000 koin. Paket reguler sudah mencakup efek yang berhak diterima pemain sebelum tawaran tambahan. Hitung tambahan saat tawaran dibuat dan bayar jumlah yang tertulis. Boost dari iklan mengisi inventaris dan menunggu diaktifkan sendiri.

Maksimal 3 penayangan rewarded per hari di seluruh penempatan, termasuk tayangan yang dilewati setelah layar iklan tampil. Jarak minimum dari fullscreen terakhir 60 detik. Bila frekuensi masih dibatasi, tampilkan waktu siap hanya di panel yang dibuka pemain. Gagal memuat tanpa pernah tampil tidak mengambil kuota. Keluar sebelum selesai tidak memotong koin dan tidak memberi hadiah. Simpan pembayaran ketika callback hadiah sah diterima dengan ID tawaran unik. Callback ganda, muat ulang, dan rotasi layar tetap membayar sekali.

## Jalur A · Interstitial

Interstitial dalam eksperimen peluncuran dimatikan secara default. Bila diaktifkan setelah persetujuan M11, gunakan seluruh aturan berikut.

- Sesi pertama sepanjang umur profil dan sesi pertama setiap hari permainan bebas interstitial. Sesi baru dimulai saat membuka game pertama kali atau kembali setelah ≥30 menit tidak aktif. Hari permainan berganti pukul 04.00 WIB.
- Minimal 240 detik waktu aktif pada sesi berjalan dan 240 detik sejak fullscreen terakhir. Maksimal 1 per sesi dan 2 per hari. Ditambah batas rewarded, total maksimum 5 fullscreen per hari.
- Satu-satunya pemicu ialah tindakan “Kembali ke Kebun” saat menutup panel misi atau upgrade yang dibuka sendiri. Pengiriman hanya ketika game tampak, tidak ada pointer aktif, seretan, animasi merge/combo, discovery, lembar offline, atau onboarding, dan sedikitnya 10 detik sejak gabung sukses terakhir. Pilihan keluar aplikasi, kembali dari background, dan tap toples tidak menjadi pemicu.
- Iklan harus sudah siap saat tombol ditekan. Jika keadaan berubah sebelum tampil atau SDK belum siap, lanjut ke papan saat itu juga dan buang kesempatan tersebut. Jangan membuka iklan tertunda. Auto-save sebelum layar penuh dan jeda animasi serta jam waktu aktif sampai pemain kembali. Tidak ada banner di papan.

Simpan cap per profil dan hari, termasuk lewat relaunch atau crash. Hitung interstitial ketika benar-benar tampil dan catat waktu fullscreen untuk kedua format. Iklan hanya dapat dicoba setelah pilihan privasi dipenuhi sesuai konfigurasi wilayah. Jika iklan gagal, jaringan putus, atau persetujuan dicabut, permainan tetap berjalan. Matikan interstitial dari konfigurasi rilis bila selisih D7 turun ≥2 poin persentase atau keluar dalam 10 detik sesudah iklan naik ≥5 poin dibanding kelompok tanpa interstitial.

## Jalur B · Offerwall

Satu entri “Penawaran opsional” berada di pengaturan, di luar alur papan. Pemain harus membuka daftar penawaran sendiri setiap kali dan melihat penyedia, syarat, jumlah kredit, status, serta estimasi verifikasi sebelum memilih. Penawaran tidak muncul selama onboarding, sebagai pop-up, atau sebagai syarat untuk bonus game. Peninjauan saldo dan penukaran merupakan alur terpisah. Detail batas dan pembayaran ada di [backlog](backlog.md#jalur-b).

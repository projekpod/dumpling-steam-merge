# Data dan privasi

| Data | Bentuk dan akses | Kegunaan |
| --- | --- | --- |
| Identitas Supabase Auth | Supabase Auth dapat menyimpan email, nama, dan metadata Google dalam skema Auth. Tabel aplikasi hanya menyimpan UUID akun dan alias acak. | Login dan pemisahan data pemain. Peringkat bersama menampilkan alias, peringkat, dan skor. |
| ID instalasi | HMAC-SHA256 dengan secret server dan awalan tersendiri. Tabel perangkat menyimpan hash serta waktu pertama dan terakhir terlihat. Klien hanya bisa melihat waktu perangkat miliknya. | Batas akun per perangkat dan cek referral. |
| User-Agent | Potongan hingga 512 karakter yang dinormalisasi, lalu HMAC dengan awalan tersendiri. | Sinyal lunak review bila subnet juga sama. |
| Subnet IP | Jika ingress tepercaya dikonfigurasi, HMAC dari IPv4 /24 atau IPv6 /64. IP mentah dibaca sementara. | Sinyal review serta pemeriksaan allowlist postback. |
| Progres permainan | Field game yang dikenali, koin biasa, revisi, papan verifikasi, aktivitas harian, dan skor. | Pemulihan progres dan validasi nilai berharga. |
| Poin, boost, referral, serta penukaran | ID peristiwa, sumber dan nominal poin, status, waktu, dan pengenal operator saat review. | Rekonsiliasi, deduplikasi, dan review manual. |
| Limit dan penanda risiko | Hitungan, alasan, serta waktu pertama dan terakhir. Hanya operator bisa melihat alasan lengkap. | Kendalikan laju klaim dan bantu review. |
| Tiket dan callback hadiah | UUID tiket, waktu kedaluwarsa, dan ID transaksi. Ledger mempertahankan ID transaksi dan jumlah setelah verifikasi. | Kaitkan klaim ke pemain dan cegah pembayaran ganda. |

Fungsi tidak menulis IP mentah, ID instalasi atau UA mentah, JWT, secret, dan isi callback ke log atau tabel. Payload save menolak field di luar data permainan yang dikenali. Infra hosting, Auth, ingress, dan penyedia dapat memproses header serta metadata jaringan untuk operasi layanan. Atur akses operator dan retensi log sebelum rilis.

HMAC perangkat adalah data pseudonim. Merotasi secret tanpa migrasi memutus kaitan antara hash lama dengan yang baru. Berbagi sinyal jaringan atau perangkat tidak membuktikan pelanggaran.

Jadwal retensi dan penghapusan akun otomatis belum dipasang. Relasi pemilik pada ledger append-only memakai pembatasan, tanpa hapus cascade. Operator perlu menangani permintaan penghapusan dan retensi audit sesuai aturan wilayah. Layanan tidak meminta dokumen identitas, kontak, GPS, atau detail pencairan.

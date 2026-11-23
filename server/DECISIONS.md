# Keputusan backend

- Koin cloud memakai amplop M2c dengan asumsi Bonus Koin sampai Lv. 100. Asumsi ini tidak mengubah game lokal dan perlu ditinjau saat integrasi klien mendukung akun di luar amplop.
- Bukti aksi memakai papan terpisah dengan spawn Lv. 1 tanpa varian, anggaran berbasis jam server, dan revisi monoton. Snapshot lokal tidak menentukan peringkat maupun poin. Integrasi klien game masih terpisah.
- Kredit, reserve penukaran, serta refund mempunyai kunci ledger unik. Approval hanya mengubah status. Transfer dan rekonsiliasi berada pada operator.
- Referral membayar pengundang 50 poin setelah cek tiga tanggal aktivitas dan Lv. 8. Hash instalasi yang sama memblokir referral. Gabungan UA dan subnet yang sama hanya memberi tanda review.
- ADS_MODE memilih jalur admob atau offerwall. Cashout mati secara default. AdMob harus punya tiket satu kali milik akun yang sama dan offerwall memakai kontrak HMAC yang dapat diadaptasi untuk penyedia.
- Batas waktu verifikasi AdMob 7 hari untuk retry bertanda tangan dan reward harus terjadi dalam jendela tiket. Query AdMob didekode sesuai verifier Tink tanpa mengubah urutan field. Offerwall memakai jendela lima menit dan ID unik lintas akun.
- CI memakai Supabase CLI 3.2.0 dengan dukungan login role sementara. Database password opsional bila project perlu fallback. Deploy dilewati bila salah satu dari dua secret wajib belum ada.

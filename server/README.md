# Backend Kebun Mochi

Supabase memegang poin hadiah, progres misi, skor terverifikasi, referral, dan antrean penukaran. Saldo poin berasal dari jumlah entri ledger. Koin biasa tetap milik game dan salinan cloud dipakai untuk pemulihan progres.

## Setup dari HP

1. Buka dashboard Supabase dan masuk. Jika menu terpotong, pilih **Situs desktop** di browser. Ketuk **New project**, pilih organisasi, nama, dan region. Simpan database password di password manager. Tunggu project siap. [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Di Supabase, buka **Authentication → Sign In / Providers → Google**. Salin **Callback URL** yang tampil. Nanti isi Client ID dan Client Secret di halaman ini. [Panduan Google Auth Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
3. Di Google Cloud Console, buat atau pilih project. Buka **Google Auth Platform**, lengkapi **Branding** dan **Audience**. Jika memakai **External → Testing**, tambahkan email penguji pada daftar **Test users**. Di **Clients**, buat OAuth client jenis **Web application**. Tambahkan Callback URL dari Supabase pada **Authorized redirect URIs**, lalu simpan. [Google Auth Platform](https://console.cloud.google.com/auth/clients)
4. Kembali ke setelan Google di Supabase. Tempel **Client ID** dan **Client Secret**, aktifkan Google, lalu simpan. Saat game dihubungkan nanti, tambahkan URL frontend yang sah di **Authentication → URL Configuration**.
5. Ambil **project ref** dari **Project Settings → General** atau segmen ID pada alamat dashboard project. Buat personal access token Supabase dengan izin membaca pengaturan project, membuat peran sementara database, dan memasang Edge Functions. [Token akun Supabase](https://supabase.com/dashboard/account/tokens)
6. Buka repo GitHub dan pilih **Settings → Secrets and variables → Actions → New repository secret**. Buat **SUPABASE_ACCESS_TOKEN** dengan token langkah 5 dan **SUPABASE_PROJECT_REF** dengan project ref. Jika autentikasi database gagal karena peran sementara tidak tersedia, tambahkan **SUPABASE_DB_PASSWORD** dari langkah 1. Simpan OAuth Client Secret di Supabase.
7. Di dashboard Supabase, buka **Edge Functions → Secrets**. Tambahkan **MOCHI_DEVICE_HASH_KEY** berupa secret acak stabil dengan entropi minimal 32 byte. Supabase menyediakan URL, anon key, dan service-role key pada runtime Edge. Nama opsi khusus untuk jalur hadiah ada di [.env.example](.env.example).
8. Saat siap deploy, merge perubahan di **server/** ke **main**. Buka **Actions → Supabase backend**. Job deploy mencatat alasan dilewati jika token atau project ref belum ada. Setelah menambahkan secret, jalankan ulang run push dari halaman Actions. Setelah sukses, cek **Table Editor** dan **Edge Functions** di Supabase. Setelan awal tetap **CASHOUT_ENABLED=false** dan **ADS_MODE=none**.

Backend ini belum dideploy. Game belum memanggil endpoint Supabase.

## Tes di Codex Cloud

    cd server
    deno task check
    deno task test
    deno task test:db

Jika Deno belum tersedia, pakai **npx --yes deno@2.9.6 task** diikuti nama task. Tes database menggunakan Postgres 17 tanpa port host dan membuat skema serta peran Auth uji. Container dihapus setelah tes. Tes unit memakai fetch tiruan dan kunci uji hasil generasi.

## API

Endpoint pemain berada di **/functions/v1/<nama>** dan memakai **Authorization: Bearer <access_token Supabase Auth>**. POST pemain memakai **Content-Type: application/json**. Gateway melewatkan verifikasi JWT lama agar JWT Auth dengan key baru dan callback penyedia bisa masuk. Handler memverifikasi sesi pemain ke Supabase Auth sebelum akses RPC. Callback non-pemain hanya diterima setelah verifikasi tanda tangan. Service-role hanya dipakai di runtime Edge.

| Endpoint | Permintaan | Hasil |
| --- | --- | --- |
| save-sync | GET untuk memuat. POST action=save dengan request_id, revision, device_id, coins, save, actions. | Snapshot, revisi, verified_board dan verified_level. Konflik revisi HTTP 409. |
| missions | GET misi aktif. POST action=claim dengan mission_id dan period_start dari list. | Progres server dan status klaim sekali. |
| leaderboard | GET ?scope=weekly atau ?scope=all_time. POST action=submit dengan scope dan score. | Maksimal 100 peringkat, posisi sendiri bila ikut, dan verified_score yang boleh dikirim. |
| referral | POST action=create atau apply dengan device_id dan code untuk apply. POST action=status untuk memeriksa sekaligus mencairkan hadiah yang memenuhi syarat. | Kode, jumlah hari aktif, level terverifikasi, dan status. |
| reward-verify | POST action=ticket dan device_id. GET digunakan callback AdMob bertanda tangan. | Ticket berisi user_id serta custom_data. Callback sah memberi 10 poin. |
| offerwall-postback | POST server penyedia dengan HMAC di header. | Status credited atau duplicate untuk ID transaksi yang sama. |
| redeem | GET saldo poin. POST action=request dengan request_id dan points. | ID dan status pending atau hasil retry. Pemilik bisa membaca status melalui RLS. |

Contoh POST save-sync dengan satu aksi awal. Device ID adalah UUID v4 acak yang dibuat sekali per instalasi.

    {
      "action": "save",
      "request_id": "be9deb59-e0a9-4b09-9485-07304334df85",
      "revision": 0,
      "device_id": "6c64b170-f0af-4a51-8c59-797dc7c68abd",
      "coins": 0,
      "save": { "version": 5, "highest": 1 },
      "actions": [{ "type": "spawn", "to": 0 }]
    }

Indeks 0–29. Kirim spawn dengan to, move dengan from/to, atau release dengan to untuk papan verifikasi yang buntu. Satu batch maksimal 128 aksi. Retry harus memakai request_id asli. Setelah HTTP 409, ambil revisi terbaru dan selaraskan batch sebelum mengirim lagi. Server menerima field permainan yang dikenali, termasuk papan, varian, penemuan, upgrade, dan waktu lokal. Gunakan coins pada respons bersama snapshot save.

### Validasi server

- Papan verifikasi berawal kosong. Spawn buktinya memberi Lv. 1 dan server memutar ulang aksi sampai Lv. 12. Spawn mendapat kuota satu per 420 ms, maksimal 32 tersimpan dengan satu kuota awal. Skor, hadiah misi, dan referral hanya mengikuti papan serta aktivitas server.
- Amplop kenaikan koin memakai jam server maksimal 8 jam, 30 petak, level tertinggi terverifikasi, varian maksimum ×10, Bonus Koin sampai Lv. 100 (×11), boost ×2, hasil gabung terverifikasi, dan kuota remas. Koin snapshot yang lolos batas tidak memberikan poin.
- Hari berganti 00.00 UTC dan minggu berganti Senin 00.00 UTC. Skor memakai 1000 × level puncak + min(999, jumlah gabung). Skor mingguan khusus gabung pada minggu berjalan. Saat seri, pencapaian lebih awal menang, lalu UUID memberi urutan yang stabil.
- Referral membayar 50 poin ke pengundang sekali setelah undangan mempunyai sekurangnya tiga tanggal aktivitas terverifikasi sejak hari ikat kode, mencapai Lv. 8, dan tidak berbagi instalasi terdaftar. Kedua pemain perlu mendaftarkan perangkat.
- Batas utama adalah dua akun per instalasi, lima instalasi per akun, 30 sinkronisasi per menit, 10 klaim misi per menit, serta 10 tiket AdMob dan 10 kredit per sumber per jam. Tinjau penanda berbagi perangkat, jaringan, atau spam klaim. [Daftar data](PRIVACY-DATA.md)

## Callback penyedia dan antrean manual

Mode awal **ADS_MODE=none**. Untuk integrasi AdMob, isi **ADMOB_SSV_AD_UNIT**, **ADMOB_SSV_REWARD_ITEM**, dan **ADMOB_SSV_REWARD_AMOUNT** sesuai field callback. Gunakan UUID tiket sebagai custom_data dan UID tiket sebagai user_id. Server mengambil kunci verifier HTTPS Google dan memverifikasi ECDSA P-256 dengan format Tink. Tiket berlaku 30 menit untuk satu reward. Uji callback asli setelah ad unit tersedia. [Dokumentasi AdMob SSV](https://developers.google.com/admob/android/ssv)

Untuk offerwall, isi **OFFERWALL_REWARDS** dengan objek JSON seperti **{"offer_a":25}** dan set **OFFERWALL_HMAC_SECRET** terpisah dari kunci perangkat. Kirim transaction_id, user_id, dan offer_id di JSON mentah. Header **X-Offerwall-Timestamp** berisi detik UNIX dan **X-Offerwall-Signature** berisi HMAC-SHA256 hex dari byte timestamp + titik + body mentah. Jendela waktu lima menit. Retry yang lebih lama menandatangani lagi dengan timestamp baru dan ID transaksi asli. Tarif poin diambil dari konfigurasi server. Jika mengaktifkan **OFFERWALL_IP_ALLOWLIST** dengan IP/CIDR, atur **MOCHI_TRUSTED_IP_HEADER** hanya untuk header yang ditimpa ingress tepercaya. Endpoint langsung harus mengikuti pembatasan ingress. Daftar IP kosong tetap mewajibkan HMAC.

Operator menyetel ADS_MODE ke none, admob, atau offerwall pada tabel **feature_flags**. Jika penukaran diaktifkan nanti, pengajuan pending menahan poin selama review. Periksa antrean **redemptions** dan alasan pada **risk_flags**. Contoh keputusan operator di SQL Editor:

    select public.mochi_review_redemption('<id-penukaran>'::uuid, 'rejected', '<id-operator>');

Rejected menambah refund satu kali. Approved menetapkan status setelah review dan mempertahankan debit. Backend ini menyimpan antrean dan belum mengirim uang atau menyimpan nomor rekening.

Papan verifikasi memisahkan hasil snapshot dari ekonomi server. Rangkaian aksi legal masih dapat diotomasi dan UUID instalasi bukan bukti hardware. Uji deployment hosted dan lakukan review risiko sebelum mengaktifkan penukaran.

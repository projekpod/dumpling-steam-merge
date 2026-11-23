# QA M2e sebelum submit CrazyGames

## Skenario bermain

Playwright menjalankan build produksi di Chromium dengan locale awal `en-US`. Setiap sesi menjalankan 30 lompatan jam satu menit, dengan interaksi asli sepanjang sesi. Tes membuka kukusan, menggabung dua mochi, menahan satu mochi untuk meremas, membeli upgrade, dan mengulang buka kukusan setiap lima menit. Setelah beralih ke Bahasa Indonesia, tes menutup tab, membukanya kembali satu menit kemudian, dan memeriksa papan, upgrade, bahasa, serta kenaikan koin offline.

| Viewport | Input | Hasil setelah perbaikan |
| --- | --- | --- |
| 360×640 | Sentuh | Alur selesai. Papan dan kukusan terlihat saat halaman pertama dibuka. |
| 412×915 | Sentuh | Alur selesai. Papan dan kukusan terlihat saat halaman pertama dibuka. |
| 1366×768 | Mouse | Alur selesai. Papan portrait tetap di tengah. |

Audit memeriksa lebar halaman, ukuran target, luapan label, dan tumpang tindih elemen di baris header, saldo, kukusan, upgrade, dan peluang. Panel upgrade, peluang, dan Mochidex dibuka selama audit. Sesudah perbaikan tidak ada error atau warning console pada sesi normal, target tombol di bawah 44 × 44 px, atau luapan yang terdeteksi di tiga viewport. Frame kanvas diukur pada setiap checkpoint tindakan lima menit. Frame terus maju saat bermain dan berhenti selama iklan. Error jaringan dari tes injeksi font dan SDK merupakan bagian dari skenario gangguan.

## Temuan dan regresi

| Temuan pada build awal | Perbaikan | Regresi |
| --- | --- | --- |
| Chromium meminta `/favicon.ico` yang tidak tersedia pada subpath Pages, sehingga console mencatat HTTP 404. | Tambah favicon lokal lewat URL relatif di HTML. | Ketiga sesi menolak error atau warning console. |
| Target Upgrade, Info Peluang, dan Mochidex setinggi 39 px dalam Inggris dan Indonesia. | Tetapkan tinggi minimum 44 px untuk judul panel. | Audit target interaktif mengukur setiap tombol dan judul panel yang terlihat. |
| Blokir font Nunito membuat awal permainan macet dan tombol kukusan tetap nonaktif. | Izinkan browser memakai font cadangan ketika unduhan font gagal. | Abort permintaan TTF. Kukusan harus bisa dipakai dan JavaScript tidak boleh melempar error. |
| Rewarded terlihat aktif selama reveal, walau tap diabaikan oleh game. | Tampilkan keadaan nonaktif sesuai guard iklan, termasuk saat animasi atau seret masih berjalan. | Cek tombol nonaktif saat kukusan membuka, lalu aktif kembali ketika reveal selesai. |
| Callback `adStarted` yang terlambat setelah timeout diabaikan sehingga game bisa tetap berjalan ketika SDK mulai menampilkan iklan. | Jeda ulang input, frame, dan audio selama tayangan terlambat, lalu pulihkan tanpa hadiah. | Biarkan SDK tiruan melewati timeout, kirim start dan finish, lalu cek jeda dan pulih. |
| Phaser menginisialisasi keluaran audio tambahan di samping Web Audio SFX milik game. | Matikan audio bawaan Phaser. Gunakan satu jalur audio yang dikendalikan mute game. | Mulai SFX, mulai rewarded, lalu cek gain master 0, AudioContext suspended, dan frame berhenti. Setelah dibatalkan, gain dan frame pulih. |

## SDK dan penyimpanan

- SDK tiruan menguji gagal mengisi iklan, adblock saat sedang tampil, callback yang hilang, dan pemuatan SDK yang diblokir. Keluar dari rewarded di tengah jalan tidak memberi boost atau tiga kukusan, termasuk bila callback selesai yang lama datang kemudian. Skenario positif memastikan satu iklan selesai hanya memberi satu hadiah.
- JSON rusak memulai papan baru yang bisa dimainkan. Simpanan v3 mempertahankan 125 koin, papan, dan upgrade yang dimigrasikan ke v5. Jika akses localStorage melempar `SecurityError`, spawn dan ganti bahasa tetap bekerja untuk sesi saat ini dengan pesan bahwa progres tidak dapat disimpan. Data Module, pacing, dan pengaturan mute host juga diuji pada build portal dengan SDK tiruan.

## Aset dan Release

Enam screenshot produksi berbahasa Inggris dan tiga cover JPEG ada di [folder screenshots](screenshots/). Cover digambar dengan Canvas dan memakai karakter serta palet game. Dimensinya **1920×1080**, **800×1200**, dan **800×800** sesuai panduan. [Spesifikasi media resmi](https://docs.crazygames.com/requirements/game-covers/)

Untuk membuat ulang media, jalankan `npm run build` lalu `npm run media:crazygames`. Gunakan Chromium Playwright atau set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium`. Workflow mengunggah enam PNG dan tiga JPG sebagai aset terpisah bersama ZIP HTML5 ke Release `crazygames-latest` setelah merge ke `main`.

Verifikasi ini dijalankan di Chromium headless. Preview, iklan live, dan pengajuan di CrazyGames Developer Portal tetap menunggu ZIP hasil workflow.

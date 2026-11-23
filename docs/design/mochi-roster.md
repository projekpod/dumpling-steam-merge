# Roster Mochi

Rancangan M3 untuk 36 spesies. Urutan dan nama 12 mochi Kebun mengikuti game M2b agar simpanan serta penemuan lama tetap cocok. ID stabil memakai pasangan area dan level, misalnya `kebun-01`, `pantai-01`, dan `salju-01`.

Gunakan kanvas logis 60 × 60 px seperti aset saat ini. Badan dasar berupa elips 44 × 36 px, outline 1,8 px warna #614451, dua mata, dan dua pipi. Ciri tambahan memakai paling banyak lima primitif di luar badan. Semua animasi khas di bawah satu detik dan menggantikan satu pilihan idle acak yang sudah ada. Tekstur dibuat saat memuat area dan dipakai ulang untuk semua mochi sejenis. Mode hemat menggandakan interval idle 2–6 detik menjadi 4–12 detik, dan animasi berhenti saat aplikasi masuk latar.

## Kebun

| Lv. | Nama | Deskripsi Mochidex | Warna utama | Ciri bentuk | Animasi khas |
| ---: | --- | --- | --- | --- | --- |
| 1 | Mochi Tunas | Tiap pagi ia menyapa tanah, lalu lupa menyiram dirinya. | #FFD6E8 | Dua elips hijau miring di atas kepala | Tunas menunduk 12° dan kembali dalam 400 ms |
| 2 | Mochi Kuncup | Ia bertepuk tangan setiap kali satu kuncup terbuka. | #FFF3B0 | Tiga oval kecil membentuk kuncup tertutup | Tiga oval membuka selebar 3 px selama 420 ms |
| 3 | Mochi Kelopak | Kelopaknya rapi sampai ia mulai menari. | #B8F2E6 | Tiga elips mahkota tegak seperti kelopak | Kepala bergoyang 8° ke kedua sisi selama 540 ms |
| 4 | Mochi Jeruk | Ia mengaku manis, tapi suka bikin lidah kecut. | #FFB4A2 | Satu oval daun dan tiga titik kulit jeruk | Badan mengerut selebar 4 px lalu mengembang dalam 360 ms |
| 5 | Mochi Semanggi | Selalu membawa keberuntungan, kecuali saat main petak umpet. | #C5E6A1 | Tiga lingkaran hijau dan satu garis tangkai | Semanggi berputar 30° lalu kembali dalam 500 ms |
| 6 | Mochi Embun | Ia sibuk menghitung tetes embun sampai matahari terbit. | #AED9E0 | Bentuk tetes dari elips dan segitiga bulat | Tetes bergeser turun 4 px lalu memantul dalam 560 ms |
| 7 | Mochi Lavender | Wanginya bikin ulat lupa kalau sedang buru-buru. | #DDD0F8 | Satu tangkai dan tiga oval ungu bertingkat | Tangkai melengkung kiri-kanan 10° selama 680 ms |
| 8 | Mochi Persik | Pipinya merona tiap kali dipanggil buah hati. | #FFC3B8 | Dua oval besar bertumpuk dan satu daun | Lebar pipi naik 25% bersamaan dalam 500 ms |
| 9 | Mochi Melon | Suaranya nyaring padahal ia cuma mau bisik-bisik. | #E1ED9F | Tiga garis lengkung sejajar di kulit | Mulut bisik membesar dari radius 1 ke 4 px dalam 450 ms |
| 10 | Mochi Bunga | Ia mekar tiap mendengar gosip dari lebah. | #FFE397 | Empat kelopak lingkaran dan satu pusat bunga | Kelopak merekah 3 px dari pusat dalam 590 ms |
| 11 | Mochi Beri | Ia menyimpan cemilan beri di balik kedua pipinya. | #EEC0EB | Tiga lingkaran beri berkelompok di atas kepala | Tiga beri memantul bergiliran selama 570 ms |
| 12 | Mochi Mahkota | Raja kebun ini mengadakan rapat penting tentang tidur siang. | #FFD0DA | Mahkota poligon tiga puncak dan satu permata bulat | Mahkota naik 5 px, miring 5°, lalu mendarat dalam 650 ms |

## Pantai

| Lv. | Nama | Deskripsi Mochidex | Warna utama | Ciri bentuk | Animasi khas |
| ---: | --- | --- | --- | --- | --- |
| 1 | Mochi Butir Pasir | Ia hafal semua butir pasir kecuali nomor rumahnya sendiri. | #F5D7A1 | Tiga bintik pasir besar dan satu kepala datar | Bintik turun 2 px saat badan gepeng selama 320 ms |
| 2 | Mochi Cebur | Ia minta izin ke ombak sebelum mencelupkan satu kaki. | #A9E3E9 | Dua tetes air di atas badan dan satu kurva ombak | Dua tetes terpental ke sisi sejauh 5 px dalam 400 ms |
| 3 | Mochi Tutup Kerang | Ia membuka kerangnya cuma untuk mengintip makan siang. | #FFCBBB | Satu kipas setengah lingkaran dengan tiga rusuk | Kipas membuka 18° lalu menutup dalam 450 ms |
| 4 | Mochi Kepit | Ia latihan menjepit awan karena pasir selalu lolos. | #FFAA9A | Dua capit berbentuk bulan sabit di sisi | Capit kiri dan kanan menutup bergantian selama 480 ms |
| 5 | Mochi Payung Laut | Ia menawarkan tempat teduh kepada ikan yang sudah basah. | #D4BFF2 | Satu kubah setengah lingkaran dan tiga rumbai | Tepi kubah mengembang 4 px dan mengecil dalam 660 ms |
| 6 | Mochi Bintang Terdampar | Ia mengira tepuk ombak adalah tepuk tangan khusus untuknya. | #FFD681 | Bintang sudut tumpul dengan lima lengan pendek | Seluruh bintang berputar 15° ke kiri lalu pulang dalam 520 ms |
| 7 | Mochi Kelapa Kaget | Ia selalu kaget saat mendengar namanya jatuh dari pohon. | #D9B593 | Tiga titik batok dan satu daun lonjong | Ketiga titik naik 2 px ketika badan melonjak dalam 380 ms |
| 8 | Mochi Sirip Mudik | Ia selalu membawa peta pulang meski cuma berputar di kolam. | #8FD7CA | Sirip ekor dua segitiga tumpul dan satu sirip punggung | Ekor menyapu 14° sebanyak dua kali dalam 600 ms |
| 9 | Mochi Karang Geli | Ia cekikikan setiap kali ikan lewat di antara dahannya. | #FFB0C5 | Tiga silinder bulat tegak seperti dahan karang | Dahan pendek dan tinggi memendek bergiliran dalam 620 ms |
| 10 | Mochi Mutiara Malu | Ia bersembunyi dari kameranya sendiri setiap kali berkilau. | #E4E3FA | Butir mutiara bulat dengan dua busur kerang | Kerang menutup hingga menyisakan celah 3 px dalam 700 ms |
| 11 | Mochi Pari Layang | Ia iri pada layangan karena ekornya tidak pernah kusut. | #91BBE6 | Dua sirip berbentuk belah ketupat bulat dan satu garis ekor | Dua sayap mengepak sekali dengan amplitudo 5 px selama 520 ms |
| 12 | Mochi Ombak Raja | Ia mengumumkan pasang dengan suara sekecil gelembung. | #77C4E8 | Jambul ombak spiral dan dua lingkaran buih | Spiral jambul menggulung 24° saat dua buih mengecil dalam 710 ms |

## Salju

| Lv. | Nama | Deskripsi Mochidex | Warna utama | Ciri bentuk | Animasi khas |
| ---: | --- | --- | --- | --- | --- |
| 1 | Mochi Serbuk | Ia menepuk dirinya setiap kali dikira bedak. | #E9F4FF | Tiga bintik biru salju dan satu gumpal kecil di kepala | Gumpal terpental 3 px lalu turun dalam 340 ms |
| 2 | Mochi Selimut | Ia enggan keluar karena selimutnya juga sedang kedinginan. | #CFDAFC | Satu pita syal melengkung dan satu ekor pendek | Ekor syal mengibas 16° selama 450 ms |
| 3 | Mochi Ingus Es | Ia menahan bersin supaya hidung esnya tidak terbang. | #B7DEF3 | Hidung berupa segitiga biru muda dan satu titik kilau | Hidung maju 3 px lalu menciut saat bersin dalam 400 ms |
| 4 | Mochi Bolu Salju | Ia berlatih jadi bolu ulang tahun yang tidak pernah meleleh. | #FFF0F3 | Dua elips bertingkat dan satu bintik merah di atas | Lapisan atas bergetar 2 px sebanyak dua kali dalam 480 ms |
| 5 | Mochi Kuping Beku | Ia bisa mendengar cokelat panas dari balik tiga bukit. | #E5CDF3 | Dua penutup kuping bulat dan satu busur pengikat | Telinga bergantian merapat 2 px ke badan dalam 510 ms |
| 6 | Mochi Serpih | Ia punya enam tangan dan tetap tidak bisa memilih sarung tangan. | #B2E6EE | Enam lengan tersirat dari tiga garis bersilangan di dahi | Serpih memutar 60° tepat satu takik dalam 600 ms |
| 7 | Mochi Pinguin Peleset | Ia menyebut setiap jatuh sebagai latihan seluncur. | #ACBDE5 | Perut oval terang, paruh segitiga, dan dua sirip oval | Badan meluncur 5 px ke samping lalu pulang dalam 520 ms |
| 8 | Mochi Bongkah Ngorok | Ia mengaku bunyi retak itu cuma dengkurannya. | #A9C6EE | Poligon es tumpul dengan dua goresan retak | Retakan melebar 1 px seirama dua dengkuran dalam 640 ms |
| 9 | Mochi Cemara Selimut | Ia memakai salju sebagai topi meski sudah punya daun. | #B4DDD1 | Dua segitiga cemara bulat dan satu tudung salju oval | Tudung turun 3 px dan naik karena dahan bergoyang selama 650 ms |
| 10 | Mochi Beruang Bantal | Ia memeluk bantal supaya bantalnya cepat tidur. | #F2DDD2 | Dua telinga bulat dan satu oval bantal di depan | Bantal terjepit 20% lalu kembali dalam 600 ms |
| 11 | Mochi Aurora | Ia latihan melukis langit dengan pita yang selalu melambai. | #D2C0F4 | Tiga pita busur warna hijau, lavender, dan merah muda | Tiga pita bergeser bergiliran 4 px selama 780 ms |
| 12 | Mochi Ratu Puncak | Ia menobatkan semua bola salju yang berani berguling duluan. | #C7E7FF | Mahkota tiga segitiga es dan satu permata berbentuk belah ketupat | Permata muncul dari balik mahkota dan berkilau satu kali dalam 740 ms |

## Penemuan dan varian

- Mochidex menampilkan 12 slot per area. Slot ditemukan menampilkan nama, potret, dan satu kalimat. Level berikutnya berupa siluet “???” dari bentuk asli, sedangkan level yang lebih jauh hanya tampil sebagai petak kosong bernomor. Banner penemuan memakai durasi M2b, 3,2 detik.
- Pantai terbuka sesudah menemukan Kebun Lv. 8. Salju terbuka sesudah menemukan Pantai Lv. 9. Setiap papan dan rekornya disimpan. Papan lama masuk ke Kebun.
- Telur siap setiap 180 detik aktif kumulatif, dengan satu telur tertunda per profil dan tanpa kadaluwarsa. Pemain membuka sendiri ketika ada ruang di papan aktif. Peluang isi telur ialah 80% Lv. 1 dan 20% Lv. 2.
- Toples dan telur masing-masing mengundi emas 1% per kemunculan sukses, terpisah dari undian level. Emas memakai outline #AD721F, satu kilau berbentuk bintang, dan ikon di Mochidex. Satu induk emas sudah cukup untuk meneruskan varian ketika digabung. Penghasilan emas tetap sama dengan spesiesnya. Roster inti tetap 36 spesies.

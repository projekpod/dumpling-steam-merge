# Roster Dumpling

Rancangan untuk 36 spesies dumpling. Kebun tersedia mulai M2c; Pantai dan Salju tetap untuk M3. Urutan dan nama 12 dumpling Kebun mengikuti game agar simpanan serta penemuan lama tetap cocok. ID stabil memakai pasangan area dan level, misalnya `kebun-01`, `pantai-01`, dan `salju-01`.

Gunakan kanvas logis 60 × 60 px seperti aset saat ini. Badan dimulai di puncak (30, 12) dan melebar hingga 44 px dengan dasar pipih di y=48. Gunakan empat kurva Bézier, empat lipatan pendek, outline lembut #614451, dua mata, dua pipi, kilap putih lebar, dan gradasi dari krem ke warna spesies. Tempel ciri khas di sisi atau dekat lipatan sehingga siluet dumpling tetap terbaca. Ciri tambahan memakai paling banyak lima primitif di luar badan. Semua animasi khas di bawah satu detik dan menggantikan satu pilihan idle acak yang sudah ada. Tekstur dibuat saat memuat area dan dipakai ulang untuk semua dumpling sejenis. Mode hemat menggandakan interval idle 2–6 detik menjadi 4–12 detik, dan animasi berhenti saat aplikasi masuk latar.

## Kebun

| Lv. | Nama | Deskripsi Buku Koleksi Dumpling | Warna utama | Ciri bentuk | Animasi khas |
| ---: | --- | --- | --- | --- | --- |
| 1 | Dumpling Tunas | Tiap pagi ia menyapa tanah, lalu lupa menyiram dirinya. | #FFD6E8 | Dua elips hijau miring di atas kepala | Tunas menunduk 12° dan kembali dalam 400 ms |
| 2 | Dumpling Kuncup | Ia bertepuk tangan setiap kali satu kuncup terbuka. | #FFF3B0 | Tiga oval kecil membentuk kuncup tertutup | Tiga oval membuka selebar 3 px selama 420 ms |
| 3 | Dumpling Kelopak | Kelopaknya rapi sampai ia mulai menari. | #B8F2E6 | Tiga elips mahkota tegak seperti kelopak | Kepala bergoyang 8° ke kedua sisi selama 540 ms |
| 4 | Dumpling Jeruk | Ia mengaku manis, tapi suka bikin lidah kecut. | #FFB4A2 | Satu oval daun dan tiga titik kulit jeruk | Badan mengerut selebar 4 px lalu mengembang dalam 360 ms |
| 5 | Dumpling Semanggi | Selalu membawa keberuntungan, kecuali saat main petak umpet. | #C5E6A1 | Tiga lingkaran hijau dan satu garis tangkai | Semanggi berputar 30° lalu kembali dalam 500 ms |
| 6 | Dumpling Embun | Ia sibuk menghitung tetes embun sampai matahari terbit. | #AED9E0 | Bentuk tetes dari elips dan segitiga bulat | Tetes bergeser turun 4 px lalu memantul dalam 560 ms |
| 7 | Dumpling Lavender | Wanginya bikin ulat lupa kalau sedang buru-buru. | #DDD0F8 | Satu tangkai dan tiga oval ungu bertingkat | Tangkai melengkung kiri-kanan 10° selama 680 ms |
| 8 | Dumpling Persik | Pipinya merona tiap kali dipanggil buah hati. | #FFC3B8 | Dua oval besar bertumpuk dan satu daun | Lebar pipi naik 25% bersamaan dalam 500 ms |
| 9 | Dumpling Melon | Suaranya nyaring padahal ia cuma mau bisik-bisik. | #E1ED9F | Tiga garis lengkung sejajar di kulit | Mulut bisik membesar dari radius 1 ke 4 px dalam 450 ms |
| 10 | Dumpling Bunga | Ia mekar tiap mendengar gosip dari lebah. | #FFE397 | Empat kelopak lingkaran dan satu pusat bunga | Kelopak merekah 3 px dari pusat dalam 590 ms |
| 11 | Dumpling Beri | Ia menyimpan cemilan beri di balik kedua pipinya. | #EEC0EB | Tiga lingkaran beri berkelompok di atas kepala | Tiga beri memantul bergiliran selama 570 ms |
| 12 | Dumpling Mahkota | Raja kebun ini mengadakan rapat penting tentang tidur siang. | #FFD0DA | Mahkota poligon tiga puncak dan satu permata bulat | Mahkota naik 5 px, miring 5°, lalu mendarat dalam 650 ms |

## Pantai

| Lv. | Nama | Deskripsi Buku Koleksi Dumpling | Warna utama | Ciri bentuk | Animasi khas |
| ---: | --- | --- | --- | --- | --- |
| 1 | Dumpling Butir Pasir | Ia hafal semua butir pasir kecuali nomor rumahnya sendiri. | #F5D7A1 | Kepala datar, tiga bintik pasir, dan kacamata hitam | Bintik turun 2 px saat badan gepeng selama 320 ms |
| 2 | Dumpling Cebur | Ia minta izin ke ombak sebelum mencelupkan satu kaki. | #A9E3E9 | Dua tetes air di atas badan dan satu kurva ombak | Dua tetes terpental ke sisi sejauh 5 px dalam 400 ms |
| 3 | Dumpling Tutup Kerang | Ia membuka kerangnya cuma untuk mengintip makan siang. | #FFCBBB | Satu kipas setengah lingkaran dengan tiga rusuk | Kipas membuka 18° lalu menutup dalam 450 ms |
| 4 | Dumpling Kepit | Ia latihan menjepit awan karena pasir selalu lolos. | #FFAA9A | Dua capit berbentuk bulan sabit di sisi | Capit kiri dan kanan menutup bergantian selama 480 ms |
| 5 | Dumpling Payung Laut | Ia menawarkan tempat teduh kepada ikan yang sudah basah. | #D4BFF2 | Satu kubah setengah lingkaran dan tiga rumbai | Tepi kubah mengembang 4 px dan mengecil dalam 660 ms |
| 6 | Dumpling Bintang Terdampar | Ia mengira tepuk ombak adalah tepuk tangan khusus untuknya. | #FFD681 | Bintang sudut tumpul dengan lima lengan pendek | Seluruh bintang berputar 15° ke kiri lalu pulang dalam 520 ms |
| 7 | Dumpling Kelapa Kaget | Ia selalu kaget saat mendengar namanya jatuh dari pohon. | #D9B593 | Tiga titik batok dan satu daun lonjong | Ketiga titik naik 2 px ketika badan melonjak dalam 380 ms |
| 8 | Dumpling Sirip Mudik | Ia selalu membawa peta pulang meski cuma berputar di kolam. | #8FD7CA | Sirip ekor dua segitiga tumpul dan satu sirip punggung | Ekor menyapu 14° sebanyak dua kali dalam 600 ms |
| 9 | Dumpling Karang Geli | Ia cekikikan setiap kali ikan lewat di antara dahannya. | #FFB0C5 | Tiga silinder bulat tegak seperti dahan karang | Dahan pendek dan tinggi memendek bergiliran dalam 620 ms |
| 10 | Dumpling Mutiara Malu | Ia bersembunyi dari kameranya sendiri setiap kali berkilau. | #E4E3FA | Butir mutiara bulat dengan dua busur kerang | Kerang menutup hingga menyisakan celah 3 px dalam 700 ms |
| 11 | Dumpling Pari Layang | Ia iri pada layangan karena ekornya tidak pernah kusut. | #91BBE6 | Dua sirip berbentuk belah ketupat bulat dan satu garis ekor | Dua sayap mengepak sekali dengan amplitudo 5 px selama 520 ms |
| 12 | Dumpling Ombak Raja | Ia mengumumkan pasang dengan suara sekecil gelembung. | #77C4E8 | Jambul ombak spiral dan dua lingkaran buih | Spiral jambul menggulung 24° saat dua buih mengecil dalam 710 ms |

## Salju

| Lv. | Nama | Deskripsi Buku Koleksi Dumpling | Warna utama | Ciri bentuk | Animasi khas |
| ---: | --- | --- | --- | --- | --- |
| 1 | Dumpling Serbuk | Ia menepuk dirinya setiap kali dikira bedak. | #E9F4FF | Dua bintik biru salju dan topi rajut dengan pom-pom | Topi terpental 2 px lalu turun dalam 340 ms |
| 2 | Dumpling Selimut | Ia enggan keluar karena selimutnya juga sedang kedinginan. | #CFDAFC | Satu pita syal melengkung dan satu ekor pendek | Ekor syal mengibas 16° selama 450 ms |
| 3 | Dumpling Ingus Es | Ia menahan bersin supaya hidung esnya tidak terbang. | #B7DEF3 | Hidung berupa segitiga biru muda dan satu titik kilau | Hidung maju 3 px lalu menciut saat bersin dalam 400 ms |
| 4 | Dumpling Bolu Salju | Ia berlatih jadi bolu ulang tahun yang tidak pernah meleleh. | #FFF0F3 | Dua elips bertingkat dan satu bintik merah di atas | Lapisan atas bergetar 2 px sebanyak dua kali dalam 480 ms |
| 5 | Dumpling Kuping Beku | Ia bisa mendengar cokelat panas dari balik tiga bukit. | #E5CDF3 | Dua penutup kuping bulat berbulu dan satu busur pengikat | Telinga bergantian merapat 2 px ke badan dalam 510 ms |
| 6 | Dumpling Serpih | Ia punya enam tangan dan tetap tidak bisa memilih sarung tangan. | #B2E6EE | Enam lengan tersirat dari tiga garis bersilangan di dahi | Serpih memutar 60° tepat satu takik dalam 600 ms |
| 7 | Dumpling Pinguin Peleset | Ia menyebut setiap jatuh sebagai latihan seluncur. | #ACBDE5 | Perut oval terang, paruh segitiga, dan dua sirip oval | Badan meluncur 5 px ke samping lalu pulang dalam 520 ms |
| 8 | Dumpling Bongkah Ngorok | Ia mengaku bunyi retak itu cuma dengkurannya. | #A9C6EE | Poligon es tumpul dengan dua goresan retak | Retakan melebar 1 px seirama dua dengkuran dalam 640 ms |
| 9 | Dumpling Cemara Selimut | Ia memakai salju sebagai topi meski sudah punya daun. | #B4DDD1 | Dua segitiga cemara bulat dan satu tudung salju oval | Tudung turun 3 px dan naik karena dahan bergoyang selama 650 ms |
| 10 | Dumpling Beruang Bantal | Ia memeluk bantal supaya bantalnya cepat tidur. | #F2DDD2 | Dua telinga bulat dan satu oval bantal di depan | Bantal terjepit 20% lalu kembali dalam 600 ms |
| 11 | Dumpling Aurora | Ia latihan melukis langit dengan pita yang selalu melambai. | #D2C0F4 | Tiga pita busur warna hijau, lavender, dan merah muda | Tiga pita bergeser bergiliran 4 px selama 780 ms |
| 12 | Dumpling Ratu Puncak | Ia menobatkan semua bola salju yang berani berguling duluan. | #C7E7FF | Mahkota tiga segitiga es dan satu permata berbentuk belah ketupat | Permata muncul dari balik mahkota dan berkilau satu kali dalam 740 ms |

## Penemuan dan varian

- Buku Koleksi Dumpling Kebun menampilkan nama, satu kalimat, dan badge untuk setiap varian yang sudah ditemukan. Di M3, tiap area mendapat 12 slot, potret, dan siluet “???” dari bentuk asli untuk level berikutnya. Banner penemuan memakai durasi M2b, 3,2 detik.
- Pantai terbuka sesudah menemukan Kebun Lv. 8. Salju terbuka sesudah menemukan Pantai Lv. 9. Setiap papan dan rekornya disimpan. Papan lama masuk ke Kebun.
- Telur siap setiap 180 detik aktif kumulatif, dengan satu telur tertunda per profil dan tanpa kadaluwarsa. Pemain membuka sendiri ketika ada ruang di papan aktif. Peluang isi telur ialah 80% Lv. 1 dan 20% Lv. 2.
- Lima varian memakai volume dan lipatan yang sama. Biasa memakai warna spesies. Glitter memakai jeli lavender #D8C7FA dengan titik kilau. Pelangi memakai gradien pastel dengan lapisan warna bergerak. Emas memakai pita metalik #D2902B dan kilau hangat. Pink Langka memakai jeli #FFABD5 dengan serpih putih-merah muda. Badge Buku Koleksi Dumpling menyertakan nama atau label, sehingga warna tidak menjadi satu-satunya pembeda.
- Kukusan gratis dan berbayar memakai tabel peluang yang sama. Peluang, penghasilan, dan pewarisan mengikuti [ekonomi M2c](ekonomi.md#varian). Untuk M3, undi varian telur terpisah dari level agar koleksi bisa bertambah tanpa mengubah peluang level telur.

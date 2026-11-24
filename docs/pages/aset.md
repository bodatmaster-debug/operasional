# Referensi Halaman Aset

## Tujuan dan cakupan

Halaman Aset menampilkan katalog acuan workbook dan jumlah aktual yang dicatat
per SPPG untuk peralatan yang dapat dicatat sebagai kuantitas. Tab Kendaraan
menampilkan ringkasan rujukan workbook. Tab Instalasi listrik mencatat
konfigurasi aktual PLN dan genset per SPPG; tab ini tidak menyimpan kuantitas
aktual kendaraan atau item katalog. Catatan aktual hanya dibuat oleh pengguna
berwenang dan disimpan pada SQLite lokal.

## Sumber data

- Referensi: `..\dashboard\docs\references\Standar_Operasional_BGN.xlsx`,
  khusus sheet **Peralatan Dapur**, **Alsintor Seragam Perabot**, **Kendaraan**,
  dan bagian **Fasilitas Wajib** pada **Ringkasan Persyaratan**.
- Ringkasan konteks dan ketidakpastian: `..\dashboard\docs\standar-operasional-bgn.md`.
- Katalog aplikasi adalah transkripsi terpilih dari workbook, bukan data aset
  operasional. Nilai katalog tidak disalin ke catatan aktual.
- Jumlah aktual berasal dari catatan pengguna pada SQLite dan terkait dengan
  satu SPPG serta satu entri katalog.

## Kategori dan pemetaan data

| Kategori | Sumber | Cakupan katalog |
| --- | --- | --- |
| Peralatan dapur, operasional, dan instalasi gas | Sheet Peralatan Dapur | 91 entri teridentifikasi; kuantitas dari sheet ini secara khusus berkonteks SPPG berkapasitas 3.000 penerima manfaat. |
| Peralatan kantor dan perabot ruang | Sheet Alsintor Seragam Perabot, kelompok A dan C | 26 entri. |
| Peralatan operasional, termasuk seragam dan tanda pengenal | Kelompok F–G pada sheet Peralatan Dapur dan kelompok B pada sheet Alsintor Seragam Perabot | Seragam dan tanda pengenal terdiri dari 3 entri pada baris 12–14; penggabungan ini hanya pemetaan tampilan. |
| Kendaraan | Sheet Kendaraan dan sumber publik yang dicantumkan pada bagian Tab Kendaraan | Ringkasan 9 aspek bersyarat serta opsi pencatatan jenis, tipe, merek, model, dan jumlah aktual; contoh merek/model bukan standar BGN. |
| Instalasi listrik | Ringkasan Persyaratan, bagian Fasilitas Wajib | Ringkasan menyebut PLN, genset cadangan, dan instalasi standar aman; tidak mencantumkan daftar item atau kuantitas. |

Setiap jumlah aktual dipetakan menggunakan ID katalog internal, bukan
`sourceNo` atau nomor baris workbook. Data aktual menyimpan `sppg_id`,
`catalog_id`, jumlah, tipe dan merek aset opsional, serta waktu
pencatatan/pembaruan. Satu nilai tipe dan merek berlaku untuk seluruh jumlah
pada satu item katalog di satu SPPG.

Untuk pengelompokan aplikasi, kelompok A–E ditampilkan sebagai Peralatan
Dapur, kelompok F–G sebagai Peralatan Operasional, dan item instalasi gas
ditampilkan terpisah. Ini pemetaan tampilan, bukan perubahan klasifikasi atau
ketentuan workbook. Tiga entri seragam/tanda pengenal juga ditampilkan pada tab
Peralatan Operasional, sesuai pengelompokan yang dipilih pengguna.

Pilihan katalog disajikan sebagai tab kategori, disertai tab “Semua kategori”.
Tab Kendaraan menyajikan tabel jumlah aktual dan carousel panduan rujukan.
Form tambah dan ubah catatan dibuka dalam dialog agar tidak memenuhi area tab.
Pada navigasi, bagian Aset memiliki submenu **Pencatatan aset** untuk halaman
katalog dan catatan yang sudah ada, serta submenu **Kelengkapan aset** untuk
halaman sementara yang belum memiliki data atau pemeriksaan operasional.
Tab Instalasi gas menyajikan konfigurasi aktual, daftar jumlah aktual tiga
peralatan terkait, status perbandingan jumlah aktual terhadap acuan, dan
konteks ketentuan workbook dalam kelompok terpisah. Konfigurasi sensor/alarm
serta jumlah jalur high/low ditampilkan sebagai data aktual terkait, bukan
jumlah aktual alat atau target kelengkapan.
Tab ini tidak memakai tabel katalog umum, pencarian, atau pagination. Tab
Instalasi listrik mencatat konfigurasi aktual PLN dan genset melalui formulir
khusus; tab ini tidak menilai kelayakan atau kepatuhan.

Submenu **Kelengkapan aset** saat ini hanya menampilkan status bahwa
fungsionalitasnya belum ditentukan. Submenu tersebut tidak menggandakan
pencatatan aktual, membuat aturan kelengkapan, atau menilai kepatuhan.

### Tab Instalasi gas

- Workbook mencatat **Instalasi gas** sebanyak **1 unit** dengan keterangan
  **Paket** (Peralatan Dapur, Lampiran 7 no. 76, baris sumber 25). Kuantitas itu
  berasal dari profil 3.000 penerima manfaat, bukan jumlah aktual universal.
- Item peralatan terkait yang tercatat terpisah ialah **2 unit Kuali ring 2
  tungku (high pressure)** (Lampiran 7 no. 82) dan **4 unit Stock pot (low
  pressure)** (Lampiran 7 no. 83). Angka tersebut adalah jumlah alat, bukan
  jumlah jalur pipa gas.
- Ringkasan Persyaratan, **Ps. 4.9.4b**, mencatat LPG 50 kg dan gas station
  terpusat (12 kg bila 50 kg tidak tersedia), gas station terpisah dari ruang
  olah, serta pengelasan oleh welder bersertifikat.
- Form mencatat sensor/alarm kebocoran gas (Ya/Tidak) serta jumlah jalur high
  dan low pressure sebagai bilangan bulat positif. Kedua jumlah wajib diisi
  sesuai kebutuhan pencatatan yang ditentukan pengguna; ini bukan ketentuan
  jumlah dari workbook.
- Ringkasan kondisi menampilkan sistem keamanan dan kedua jumlah jalur sebagai
  catatan per SPPG. Nilai yang belum tersedia tetap ditampilkan sebagai “Belum
  dicatat”; tidak ada badge kepatuhan atau kesimpulan lulus/gagal.
- Daftar peralatan gas menyajikan baris instalasi gas no. 76, kuali ring no. 82,
  dan stock pot no. 83 dengan acuan workbook dan jumlah aktual per SPPG. Nilai
  1 unit “Paket”, 2 unit, dan 4 unit adalah acuan workbook, bukan jumlah aktual.
- Daftar tersebut hanya menampilkan data. Jumlah aktual dikelola melalui tab
  Semua kategori atau Peralatan dapur, menggunakan entri katalog yang sama
  dengan tab aset lain, bukan penyimpanan terpisah. Tombol Catat kondisi hanya
  membuka formulir konfigurasi sensor/alarm dan jumlah jalur.
- Jumlah 2 kuali ring dan 4 stock pot adalah kuantitas alat pada workbook,
  bukan jumlah jalur pipa gas atau kondisi aktual SPPG.
- Status alat terkait membandingkan jumlah aktual alat dengan acuan workbook
  hanya bila jumlah penerima manfaat pada data SPPG tepat 3.000. Jumlah itu
  adalah konteks sheet Peralatan Dapur; aplikasi tidak mengalikan atau
  menyesuaikan acuan untuk jumlah penerima manfaat lain. Jika jumlah penerima
  manfaat belum dicatat atau berbeda, hasilnya **Perlu verifikasi**; jika
  jumlah aktual alat belum dicatat, hasilnya **Belum dicatat**.
- Konfigurasi aktual ditautkan secara informatif ke instalasi gas (sensor/alarm
  dan kedua jenis jalur), kuali ring (jalur high pressure), dan stock pot
  (jalur low pressure). Workbook tidak menetapkan rasio jumlah jalur per alat
  atau keberadaan sensor/alarm, sehingga nilai konfigurasi tidak menghasilkan
  status Terpenuhi/Belum terpenuhi dan tidak disamakan dengan jumlah alat.
- Catatan Ps. 4.9.4b ditampilkan terpisah dari data aktual agar konteks LPG,
  penempatan gas station, dan pengelasan bersertifikat dapat dibaca tanpa
  diperlakukan sebagai hasil validasi aplikasi.
- Workbook tidak menyebut keberadaan sensor/alarm, jumlah jalur high/low
  pressure, atau spesifikasi teknis sistem keamanannya. Karena itu aplikasi
  hanya menyimpan dan menampilkan kondisi yang dicatat; tidak memberi skor
  atau menyimpulkan kepatuhan/kelayakan. Nilai yang belum dicatat tidak
  dianggap Tidak atau nol.

### Tab Kendaraan

Ringkasan dari sheet **Kendaraan** mempertahankan kondisi dan sifat sumber:

| Kondisi / aspek | Ketentuan | Sifat | Rujukan |
| --- | --- | --- | --- |
| Aglomerasi, ≤1.500 penerima manfaat | 1 kendaraan roda 4 (box tertutup) | Minimal | Ps. 4.7k |
| Aglomerasi, >1.500 penerima manfaat | 2 kendaraan roda 4 (box tertutup) | Minimal | Ps. 4.7k |
| Batas maksimum umum | 2 R4 dan/atau 1 R3 dan/atau 2 R2 | Maksimum | Ps. 4.7j |
| Wilayah sulit akses | R3, R2, sampan, speedboat, atau sepeda; jumlah sesuai analisis kebutuhan wajar | Negosiasi harga riil | Ps. 4.7l |
| Pengemudi | 1 sopir utama dan 1 sopir cadangan per tim distribusi; SIM A/C | Wajib | Ps. 4.9.2c.12d, 4.9.2d |
| Kendaraan sewa | Dari badan hukum (CV/PT) atau perorangan; layak jalan, bersih, dan wajib berasuransi | Wajib | Ps. 4.7m |
| Acuan harga sewa | PMK 32/2025 SBM untuk pick up ≤5 tahun; >5 tahun menggunakan formula BPK; pajak ditanggung pemilik | Acuan | Ps. 4.7i |
| Spesifikasi box | Aluminium; lantai SPHC 1,5 mm; atap galvanil minimal 0,9 mm; engsel dan kunci stainless; rak makanan rangka besi; lampu LED interior; 2 jackstand portabel | Contoh/opsional | Lampiran 10 |
| Pemeriksaan sebelum jalan | Kelayakan dan keselamatan kendaraan serta kesehatan petugas; kendaraan dikunci saat ditinggal | Wajib | Ps. 4.9.4e |

Angka pada ringkasan ini adalah kutipan ketentuan bersyarat, bukan jumlah
kendaraan aktual atau rekomendasi untuk SPPG terpilih. Kapasitas dan konteks
wilayah/akses harus diketahui sebelum menilai kebutuhan.

Form Kendaraan mencatat jumlah aktual per SPPG dan kombinasi jenis, tipe, merek,
dan model. Admin dan Supervisor membuka dialog melalui aksi tambah atau ubah,
serta dapat menghapus catatan melalui menu tindakan dengan konfirmasi;
pengguna lain hanya dapat melihat tabel. Nilai yang tersimpan adalah hitungan
aktual yang dimasukkan pengguna; sistem tidak menyimpulkan kepatuhan terhadap
ambang aglomerasi atau kondisi wilayah. Catatan berada di SQLite lokal, dengan
satu jumlah tersimpan untuk setiap kombinasi pada SPPG.

Carousel panduan menggunakan kategori dan kondisi yang tertera pada workbook:
jumlah minimum menurut ambang penerima manfaat, batas maksimum umum, wilayah
sulit akses, pengemudi, kendaraan sewa dan acuan harga sewa, contoh/opsional
spesifikasi box, serta pemeriksaan sebelum jalan. Carousel adalah ringkasan
referensi, bukan konfirmasi bahwa kondisi tersebut berlaku untuk SPPG terpilih.

Kategori jenis (R4, R3, R2, sampan, speedboat, sepeda) mengikuti sheet
**Kendaraan**. Tipe, merek, dan model pada form adalah klasifikasi pencatatan,
bukan persyaratan atau rekomendasi BGN. Contoh yang diberitakan terkait
penggunaan atau dukungan kendaraan MBG:

| Jenis / tipe | Merek dan model contoh | Asal informasi dan batasan |
| --- | --- | --- |
| R4, pickup | Daihatsu Gran Max Pick Up 1.3/1.5; Suzuki New Carry Flat/Wide Deck STD atau AC-PS; Toyota Hilux Rangga 2.0/2.4 DSL; Mitsubishi Colt L300 2.5 Diesel; Isuzu Traga FD/AC | Pabrikan, media otomotif, dan draft katalog tetangga. Bukti dan tingkat sumber berbeda per varian; beberapa entri hanya menyebut penawaran atau model pasar, sehingga penggunaan aktual perlu diverifikasi. |
| R4, box / karoseri | Daihatsu Gran Max Box; Suzuki New Carry Box MBG BGN Std/ACPS; Mitsubishi Colt L300 Box; Isuzu Traga Box | Draft katalog mencatat penawaran dealer/vendor karoseri. Bukan bukti persetujuan BGN atau penggunaan aktual. |
| R4, minibus | Daihatsu Gran Max Minibus 1.3 D FH E4 / D FF FH E4 | Moladin, 12 Desember 2025; artikel otomotif menyebutnya sebagai armada SPPG. Bukan ketentuan BGN. |
| R4, blind van | Daihatsu Gran Max Blind Van | Varian pasar dicantumkan sebagai pembanding; penggunaan MBG dan spesifikasi perlu diverifikasi. |
| R3, roda tiga | Viar Karya MBG / New Karya 200 Ln | Materi promosi produsen Viar; contoh produk komersial, bukan bukti penggunaan universal atau standar BGN. |

Pilihan R4 pada form diperluas dengan varian Daihatsu Gran Max, Suzuki New
Carry, Toyota Hilux Rangga, Mitsubishi Colt L300, dan Isuzu Traga yang
tercantum pada draft katalog kendaraan aplikasi tetangga. Pilihannya mencakup
pickup, box/karoseri, minibus, blind van, dan cab chassis sesuai entri
katalognya. Sebagian entri bersumber dari pemberitaan atau penawaran vendor,
bukan bukti penggunaan aktual; catatan sumber dan status verifikasinya
ditampilkan ketika model terpilih. Blind van ditandai perlu verifikasi.

Daftar tersebut bukan whitelist BGN atau daftar lengkap armada SPPG.
Ketersediaan model dapat berubah menurut periode dan wilayah. Workbook tetap
menjadi sumber ketentuan normatif; draft katalog, media, dealer, dan materi
produsen hanya membantu menyediakan pilihan pencatatan. Opsi yang tidak
tersedia dapat dimasukkan melalui pilihan “Lainnya”.

### Tab Instalasi listrik

Tab menyimpan konfigurasi aktual per SPPG, terpisah dari katalog dan jumlah
aset: daya PLN (VA), keberadaan genset cadangan, kapasitas genset (kVA), dan
merek. Kapasitas dan merek wajib hanya jika genset dinyatakan ada. Lihat
[`instalasi-listrik.md`](instalasi-listrik.md) untuk pemetaan data, validasi,
dan batas interpretasi rujukan.

## Arti nilai dan satuan

- **Jumlah acuan** menampilkan teks dan satuan sebagaimana dicatat dalam
  katalog turunan workbook; nilai ini bukan jumlah aktual SPPG.
- **Jumlah aktual** adalah bilangan bulat yang dimasukkan pengguna untuk satu
  SPPG. Entri yang belum ada ditampilkan sebagai “Belum dicatat”, bukan nol.
- Pada tab Surat Edaran, **Jumlah acuan** dan **Satuan acuan** dicatat pengguna
  sesuai dokumen yang dirujuk; keduanya terpisah dari **Jumlah aset** yang
  dimiliki SPPG. Workbook BGN tidak menyediakan nilai acuan Surat Edaran.
  Aplikasi tidak mengisi nilai secara otomatis, mengonversi satuan, atau
  membandingkan jumlah acuan dengan jumlah aset. Catatan lama yang belum
  memiliki nilai acuan tetap ditampilkan sebagai “Belum diisi”.
- **Tipe aset** dan **merek aset** adalah teks opsional yang dicatat pengguna
  berdasarkan aset yang benar-benar dimiliki. Keduanya bukan klasifikasi,
  persyaratan, atau rekomendasi workbook/BGN; data kosong tidak disimpulkan.
- **Kondisi aset** adalah penilaian pengguna untuk setiap catatan inventaris:
  **Baik**, **Butuh diservis**, atau **Rusak**. Satu kondisi berlaku untuk
  seluruh jumlah pada satu baris inventaris, bukan per unit. Catatan lama yang
  belum dinilai tetap ditampilkan sebagai **Belum dinilai** dan tidak diberi
  kondisi otomatis. Pilihan ini bukan standar atau kesimpulan dari workbook.
  Inventaris peralatan gas ikut dicatat; konfigurasi instalasi gas dan listrik
  bukan baris inventaris sehingga tidak memiliki penilaian kondisi ini.
- Bantuan pada formulir memakai TeachingPopover biru dua langkah dengan visual
  contoh tipe `AB-108-R` lalu merek `GEA`. Nilai ini hanya ilustrasi, bukan data
  aset yang diisi sebelumnya, disimpan, atau dijadikan acuan operasional.
- Catatan sumber, rujukan, dan tanda perlu verifikasi dipertahankan pada tampilan
  katalog. Nilai `Wajib` tanpa angka tidak diubah menjadi kuantitas.
- **Status** membandingkan jumlah aktual dengan acuan katalog yang jelas; ini
  bukan penetapan kepatuhan SPPG secara keseluruhan:
  - “Belum dicatat” berarti jumlah aktual belum tersimpan.
  - “Terpenuhi” berarti jumlah aktual sama dengan atau lebih besar dari acuan
    numerik yang dapat dibandingkan.
  - “Belum terpenuhi” berarti jumlah aktual di bawah acuan numerik yang dapat
    dibandingkan.
  - “Perlu verifikasi” berarti acuan tidak numerik, ditandai tidak pasti,
    opsional, atau penerapannya bergantung pada konteks yang belum diketahui.
- Pada dialog catat dan ubah, jumlah di bawah acuan numerik yang dapat
  dibandingkan menampilkan jumlah acuan, jumlah aktual yang sedang diisi, dan
  pengingat sisa jumlah. Pengingat tidak memblokir penyimpanan.
- Untuk Peralatan dapur, Instalasi gas, dan entri Peralatan operasional yang
  berasal dari sheet Peralatan Dapur, pengingat selisih numerik diberi label
  bersyarat karena kuantitas workbook berkonteks SPPG 3.000 penerima manfaat.
  Pada tiga peralatan terkait di tab Instalasi gas, status dapat dibandingkan
  hanya jika jumlah penerima manfaat SPPG yang dicatat tepat 3.000; selain itu
  status tetap **Perlu verifikasi**. Entri seragam yang angkanya berbeda dari
  ketentuan personel, angka tidak tercantum, angka rentang, nilai opsional, dan
  nilai yang ditandai tidak pasti tidak dihitung sebagai kekurangan.
- Form Kendaraan menampilkan jumlah aktual R4 bertipe **Box / mobil box** dan
  dua pengingat jumlah bersyarat sesuai ambang aglomerasi pada Ps. 4.7k. Ini
  belum memverifikasi kondisi box tertutup atau apakah ambang aglomerasi
  berlaku; wilayah sulit akses tetap mengikuti analisis kebutuhan wajar. Jenis
  kendaraan lain tidak diberi ambang kekurangan numerik yang tidak tercantum.
- Form konfigurasi Instalasi gas menampilkan jumlah jalur aktual, tetapi tidak
  menghitung kekurangan untuk jalur atau sensor/alarm karena workbook tidak
  menetapkan kuantitasnya. Item katalog peralatan gas menggunakan catatan
  aktual aset yang sama dan mengikuti konteks acuan Peralatan Dapur.
- Form Instalasi listrik menampilkan acuan teks dan nilai aktual. Jika genset
  dicatat tidak ada, form memberi pengingat non-blocking karena workbook
  menyebut genset cadangan; jumlah, daya, dan kapasitas teknis tidak
  dibandingkan secara numerik.

## Aturan kontekstual

- Semua entri katalog yang telah ditranskripsi ditampilkan tanpa mengisi
  database. Database baru tetap kosong.
- Jumlah dapur tidak digeneralisasi ke kapasitas SPPG lain.
- Nilai yang ditandai asumsi, buram, kosong, atau bertentangan tetap diberi
  konteks/penanda verifikasi dan tidak dibandingkan sebagai target baku.
- Acuan pada sheet Peralatan Dapur berlaku untuk konteks 3.000 penerima
  manfaat. Data SPPG mencatat jumlah penerima manfaat bila diketahui; hanya
  tiga peralatan terkait pada tab Instalasi gas yang membandingkan jumlah
  aktual dengan acuan ketika nilai itu tepat 3.000. Kategori dapur, operasional,
  dan acuan gas lain tetap mengikuti status dan pengingat kontekstualnya.
- Ringkasan kendaraan mempertahankan kondisi aglomerasi, batas penerima
  manfaat, dan wilayah sulit akses sebagaimana tertulis di workbook. Form
  memberi pengingat selisih jumlah R4 bertipe box untuk kedua skenario
  aglomerasi, tanpa memilih skenario yang berlaku atau memverifikasi bahwa box
  tertutup. Pengingat tidak menetapkan kebutuhan satu SPPG atau status akhir.
- Rujukan instalasi listrik menyebut “PLN + genset cadangan; instalasi standar
  aman” (Ps. 4.9.4b). Data aktual pada tab tidak dibandingkan dengan angka
  teknis atau digunakan untuk menyimpulkan keselamatan dan kepatuhan.
- Status tabel membandingkan jumlah aktual dengan acuan numerik yang jelas pada
  Peralatan kantor. Tab Instalasi gas juga menampilkan status tiga alat terkait
  hanya untuk konteks tepat 3.000 penerima manfaat. Pengingat bersyarat pada
  kategori lain tidak mengubah status **Perlu verifikasi** dan tidak menyatakan
  bahwa acuan berlaku universal.
- Acuan nonnumerik, ditandai tidak pasti, atau opsional tidak diperlakukan
  sebagai target hitung kekurangan.
- Item opsional dan acuan tanpa jumlah numerik juga berstatus “Perlu
  verifikasi” setelah jumlah aktual dicatat.
- “Terpenuhi” dan “Belum terpenuhi” hanya menyatakan perbandingan jumlah
  terhadap acuan numerik yang tidak ditandai tidak pasti dan tidak memiliki
  konteks penerapan yang belum diketahui; keduanya bukan keputusan kepatuhan.
- Hanya Admin dan Supervisor yang dapat mencatat, memperbarui, atau menghapus
  jumlah aktual. User hanya dapat melihat katalog dan catatan tersimpan.
  Pembatasan diterapkan pada API server.
- Penghapusan jumlah aktual setelah konfirmasi hanya menghapus catatan untuk
  satu SPPG dan tidak menghapus SPPG atau entri katalog.
- Sheet Kendaraan dan Denah Ruang Terpencil tidak diubah menjadi hitungan aset
  universal pada halaman ini: persyaratannya memiliki konteks penerapan berbeda
  dan memerlukan pemetaan tersendiri.
- Pilihan tipe dan merek/model bukan standar BGN. Contoh yang diberitakan atau
  dipasarkan tidak dianggap mewakili semua SPPG; pengguna dapat memilih
  “Lainnya” dan mencatat identitas yang benar-benar digunakan.

## Ketidakpastian dan hal yang perlu diverifikasi

- Workbook menyebut Kepka BGN No. 401.1 Tahun 2025 (Juknis MBG TA 2026);
  keberlakuan sumber tidak diverifikasi independen.
- Empat kuantitas katalog dapur, satu kuantitas perabot kantor, dan kuantitas
  seragam memiliki penanda ketidakpastian; beberapa entri tidak memiliki angka.
- Katalog dapur yang teridentifikasi berisi 91 item; item ke-92 yang disebut
  pada catatan sumber belum teridentifikasi dan tidak ditambahkan.
- Jumlah seragam `3 stel × 51 orang` berbeda dari maksimum 47 relawan untuk
  2.001–3.000 penerima manfaat pada Tabel 4/Ps. 4.9.4c. Perbedaan ini perlu
  diverifikasi dan tidak digunakan untuk membandingkan jumlah aktual.

## Rujukan

- `PRODUCT.md` untuk penyimpanan lokal, larangan seed, dan batas akses.
- `..\dashboard\docs\standar-operasional-bgn.md` untuk ringkasan konteks
  standar.
- `..\dashboard\docs\references\Standar_Operasional_BGN.xlsx` sebagai sumber
  workbook.
- Moladin, [Spesifikasi Mobil MBG: Daihatsu Gran Max Minibus untuk Operasional
  SPPG](https://moladin.com/news/spesifikasi-mobil-mbg/), 12 Desember 2025.
- detikOto, [Berkah Program MBG untuk Suzuki New
  Carry](https://oto.detik.com/mobil/d-8603238/berkah-program-mbg-untuk-suzuki-new-carry),
  4 Agustus 2026.
- Viar, [Solusi Distribusi MBG untuk wilayah gang
  sempit](https://motor-viar.com/solusi-distribusi-mbg-untuk-wilayah-gang-sempit-kenapa-motor-roda-3-lebih-efesien-dari-mobil/);
  materi promosi produsen, bukan standar.
- Draft katalog kendaraan aplikasi tetangga,
  `..\dashboard\src\data\kendaraan-mbg.json`; entri campuran dari pabrikan,
  media, dealer, dan vendor karoseri. Label sumber dan catatannya dipertahankan
  sebagai konteks, bukan validasi BGN atau bukti bahwa setiap varian digunakan
  oleh SPPG.
- Katalog transkripsi di `src/lib/asset-catalog.ts` dan berkas JSON katalog
  terkait.

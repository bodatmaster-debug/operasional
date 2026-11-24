# Referensi Halaman Instalasi Listrik

## Tujuan dan cakupan

Halaman mencatat konfigurasi listrik aktual per SPPG: daya PLN dalam VA,
keberadaan genset cadangan, serta kapasitas dan merek genset jika tersedia.
Catatan menggambarkan kondisi yang dimasukkan pengguna; halaman tidak
menentukan ukuran genset, memeriksa keselamatan instalasi, atau menyimpulkan
kepatuhan.

## Sumber dan pemetaan data

Sumber utama adalah workbook
[`..\..\..\dashboard\docs\references\Standar_Operasional_BGN.xlsx`](..\..\..\dashboard\docs\references\Standar_Operasional_BGN.xlsx),
sheet **Ringkasan Persyaratan**, baris 22, Ps. 4.9.4b, yang mencatat
**“PLN + genset cadangan; instalasi standar aman”**. Ringkasan konteks dan
ketidakpastian tersedia di
[`..\..\..\dashboard\docs\standar-operasional-bgn.md`](..\..\..\dashboard\docs\standar-operasional-bgn.md).
Keaslian dan keberlakuan sumber tidak diverifikasi secara independen.

| Data | Arti nilai dan satuan | Sumber |
| --- | --- | --- |
| Daya PLN | Daya sambungan yang dicatat untuk SPPG, dalam VA | Isian operasional; workbook tidak mencantumkan angka baku |
| Genset cadangan | Ya/Tidak sesuai kondisi yang dicatat pengguna | Ps. 4.9.4b menyebut genset cadangan |
| Kapasitas genset | Kapasitas genset aktual, dalam kVA; wajib jika genset ada | Isian operasional; workbook tidak mencantumkan kapasitas atau rekomendasi |
| Merek genset | Nama merek yang dicatat pengguna; wajib jika genset ada | Isian operasional; workbook tidak menetapkan merek |

## Aturan kontekstual dan ketidakpastian

- Simpan satu konfigurasi per SPPG. Tanpa konfigurasi, tampilkan **Belum
  dicatat**, bukan Tidak atau nol.
- Daya PLN harus berupa bilangan bulat positif dalam VA.
- Jika genset dinyatakan ada, kapasitas kVA harus positif dan merek harus
  diisi. Jika dinyatakan tidak ada, kapasitas dan merek tidak berlaku dan
  disimpan sebagai nilai kosong.
- Form mencatat keadaan aktual dan tetap mengizinkan pencatatan kondisi tanpa
  genset. Jika pengguna mencatat genset tidak ada, form menampilkan pengingat
  non-blocking bahwa workbook menyebut genset cadangan. Catatan tersebut tidak
  memblokir penyimpanan dan bukan hasil penilaian kepatuhan.
- Workbook tidak mencantumkan daya PLN, kapasitas atau jumlah genset, merek,
  maupun rekomendasi kapasitas. Nilai-nilai tersebut tidak menjadi nilai
  baku atau pembanding kepatuhan.
- Workbook menyebut instalasi standar aman, tetapi halaman ini tidak
  memeriksa keamanan instalasi dan tidak menyatakan lulus/gagal.
- Nilai 2 kVA pada sheet **Peralatan Dapur** adalah spesifikasi stabilizer,
  bukan kapasitas genset.
- Hanya Admin dan Supervisor yang dapat membuat atau memperbarui catatan.
  Pengguna lain dapat melihat data.

## Format tampilan dan pencatatan

Tab memilih SPPG, menampilkan daya PLN dan kondisi genset sebagai ringkasan,
serta menyediakan dialog **Catat kondisi** atau **Ubah catatan**. Form
menampilkan teks acuan Ps. 4.9.4b bersama nilai aktual yang sedang dicatat;
peringatan saat genset dinyatakan tidak ada hanya mengingatkan pengguna untuk
meninjau kondisi tersebut. Kapasitas dan merek hanya ditampilkan ketika genset
dinyatakan ada. Tidak ada selisih numerik yang dihitung karena workbook tidak
menetapkan jumlah, daya, atau kapasitas teknis.

Data disimpan di SQLite lokal dengan relasi ke SPPG. Evolusi skema memakai
`PRAGMA user_version` dan migrasi non-destruktif.

## Rujukan

- `..\..\..\dashboard\docs\references\Standar_Operasional_BGN.xlsx` → sheet
  **Ringkasan Persyaratan**, baris 22, Ps. 4.9.4b.
- `..\..\..\dashboard\docs\standar-operasional-bgn.md` → fasilitas listrik
  dan batas interpretasi workbook.

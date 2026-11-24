# Referensi Halaman Kelengkapan Aset

## Tujuan dan cakupan

Halaman ini menyajikan ringkasan baca-saja jumlah catatan aset per SPPG dan
persentase item Juknis serta Surat Edaran yang jumlah aktualnya mencapai acuan
yang dapat dibandingkan. Ringkasan ini bukan penilaian kepatuhan. Memilih satu
baris SPPG membuka tabel rincian aset aktual, dengan satu baris untuk setiap
catatan inventaris tersimpan.

## Sumber data dan pemetaan

- Identitas SPPG berasal dari tabel `sppg`.
- Jumlah Juknis menghitung baris yang tersimpan di `asset_inventory` per SPPG;
  angka ini bukan penjumlahan kuantitas aktual.
- Jumlah Non-Juknis menghitung baris di `non_juknis_asset_inventory` per SPPG.
- Jumlah Surat Edaran menghitung baris di `surat_edaran_asset_inventory` per
  SPPG.
- Acuan Juknis berasal dari katalog `assetCatalog`; jumlah aktual berasal dari
  `asset_inventory`.
- Rincian aset aktual menggabungkan catatan `asset_inventory`,
  `vehicle_inventory`, `non_juknis_asset_inventory`, dan
  `surat_edaran_asset_inventory` untuk SPPG yang dipilih. Jumlah dan kondisi
  mengikuti catatan sumber; baris tetap satu catatan inventaris meskipun jumlah
  aktualnya lebih dari satu.
- Untuk Surat Edaran, jumlah dan satuan acuan berasal dari catatan Surat Edaran;
  jumlah dan satuan aktual berasal dari catatan yang sama. Data lama tanpa
  satuan aktual harus diverifikasi, bukan dibandingkan dengan satuan acuan.

## Arti nilai, satuan, dan perhitungan

- Ketiga kolom jumlah aset menunjukkan banyaknya baris/item yang dicatat, bukan
  total nilai pada kolom jumlah aktual.
- Persentase dihitung sebagai
  `item yang mencapai acuan ÷ item yang dapat dibandingkan × 100`.
- Item Juknis hanya masuk pembilang/penyebut bila acuan numeriknya tersedia dan
  aturan status pencatatan aset tidak menandainya perlu verifikasi. Item
  pembanding yang belum dicatat tetap masuk penyebut dan tidak masuk pembilang.
- Item Surat Edaran hanya dapat dibandingkan bila jumlah acuan tersedia,
  satuan aktual dan satuan acuan terisi, dan kedua satuan cocok setelah spasi
  tepi dihapus serta perbedaan kapitalisasi diabaikan. Nilai aktual yang belum
  mencapai jumlah acuan tidak masuk pembilang.
- Item yang acuannya tidak tersedia/tidak pasti, satuannya tidak cocok, atau
  konteks penerapannya belum dapat dipastikan berstatus **Perlu verifikasi**.
  Item ini tidak masuk pembilang maupun penyebut persentase, dan jumlahnya
  disajikan terpisah.
- Bila tidak ada item yang dapat dibandingkan, persentase ditampilkan sebagai
  “—”, bukan 0%.

## Aturan kontekstual dan batas interpretasi

- Status hanya menjelaskan perbandingan terhadap acuan yang tercatat; tidak
  menyatakan pemenuhan kewajiban atau kepatuhan terhadap peraturan.
- Acuan katalog mengikuti aturan status pencatatan aset yang sudah ada,
  termasuk penandaan angka tidak pasti, item opsional, dan konteks kapasitas.
  Kapasitas SPPG yang tidak diketahui tidak boleh dianggap cocok dengan acuan
  yang bersyarat.
- Surat Edaran hanya menghitung catatan yang sudah dimasukkan. Halaman tidak
  menyimpulkan bahwa semua item yang mungkin disebut suatu Surat Edaran sudah
  dicatat, dan tidak menetapkan keberlakuan Surat Edaran untuk SPPG.
- Data sumber tetap berada di halaman Pencatatan aset; ringkasan ini tidak
  membuat atau mengubah catatan operasional.
- Tabel rincian bersifat baca-saja. Konfigurasi instalasi listrik dan gas
  bukan baris inventaris aset sehingga tidak ditampilkan sebagai aset.

## Ketidakpastian dan hal yang perlu diverifikasi

- Jumlah aktual Surat Edaran sebelumnya tidak menyimpan satuan. Migrasi skema
  mempertahankan nilai lama; catatan tersebut perlu satuan aktual sebelum bisa
  dibandingkan.
- Acuan Juknis dengan konteks atau nilai yang belum jelas harus tetap perlu
  verifikasi. Angka kosong bukan nol.
- Workbook tidak menjadi sumber acuan Surat Edaran. Kesesuaian satuan dan
  keberlakuan surat tetap berdasarkan catatan yang dimasukkan pengguna dan
  memerlukan peninjauan sumbernya.

## Rujukan

- `aset.md` untuk katalog serta catatan jumlah aktual.
- `..\..\PRODUCT.md` untuk batas penyimpanan lokal dan larangan data contoh.
- `..\..\..\dashboard\docs\standar-operasional-bgn.md` untuk ringkasan
  interpretasi workbook.
- Workbook `..\..\..\dashboard\docs\references\Standar_Operasional_BGN.xlsx`,
  khususnya sheet **Alsintor Seragam Perabot** dan **Peralatan Dapur**.

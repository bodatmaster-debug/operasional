# Pencatatan aset non-juknis

## Tujuan dan cakupan

Mencatat aset aktual milik SPPG yang tidak terdapat dalam katalog juknis aplikasi. Catatan ini dikelola terpisah dari katalog acuan dan tidak ikut menghitung pemenuhan atau kekurangan standar.

## Sumber dan kategori data

- Sumber nilai: input pengguna untuk SPPG yang dipilih, disimpan pada tabel SQLite lokal `non_juknis_asset_inventory`.
- Kategori dipilih dari kategori aset yang sudah digunakan aplikasi: Peralatan dapur, Peralatan operasional, Peralatan kantor, atau Instalasi gas.
- Nama barang, tipe, merek, dan jumlah merupakan data aktual, bukan nilai atau kategori standar BGN.

## Arti nilai dan validasi aplikasi

- Jumlah disimpan sebagai bilangan bulat non-negatif. Batas 0–1.000.000 adalah batas teknis aplikasi, bukan ketentuan operasional.
- Nama barang, tipe, dan merek wajib diisi; teks dibatasi 100 karakter.
- Tidak ada satuan resmi, jumlah acuan, atau status pemenuhan untuk catatan ini. Aplikasi tidak menyimpulkan satuan maupun kewajiban dari nama atau kategori.
- Kondisi aset merupakan penilaian pengguna: **Baik**, **Butuh diservis**,
  atau **Rusak**. Satu kondisi berlaku untuk seluruh jumlah pada satu baris,
  bukan per unit. Catatan lama tanpa penilaian tetap ditandai **Belum dinilai**;
  aplikasi tidak mengisi kondisi otomatis atau menyimpulkannya dari workbook.

## Konteks dan ketidakpastian

Pengguna menentukan kategori berdasarkan pengelompokan yang tersedia. Kategori tersebut hanya membantu pencatatan dan tidak menyatakan bahwa barang tercantum atau diwajibkan oleh juknis. Jika satuan atau aturan pengadaan diperlukan, konfirmasikan melalui sumber resmi sebelum menambahkannya sebagai ketentuan.

## Rujukan

- Katalog kategori aplikasi: `src/lib/asset-catalog.ts`.
- Workbook acuan juknis yang menjadi pembeda katalog: `docs/references/Standar_Operasional_BGN.xlsx` pada proyek `dashboard`.
- Ringkasan konteks dan batas interpretasi workbook: `docs/standar-operasional-bgn.md` pada proyek `dashboard`.

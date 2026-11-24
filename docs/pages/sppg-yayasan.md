# Referensi Halaman SPPG dan Yayasan

## Tujuan dan cakupan

Halaman ini menyajikan direktori SPPG dan Yayasan menggunakan Fluent UI
DataGrid. Pengguna dapat melihat daftar, berpindah antara SPPG dan Yayasan,
serta menambah dan mengubah catatan melalui dialog. Penghapusan tersedia dari
menu tindakan per baris dengan konfirmasi.

## Sumber data

- Data direktori dibaca dan ditulis pada SQLite lokal aplikasi. Basis data baru
  dimulai kosong; setup akun tidak membuat catatan operasional.
- Nama dan pemetaan kolom mengikuti kontrak direktori yang sudah ada pada
  `..\dashboard\src\lib\directory-data.ts` dan
  `..\dashboard\src\components\entity-directory.tsx`.
- Pilihan wilayah SPPG memakai kode/nama wilayah administratif dari dataset
  `cahyadsn/wilayah` pada GitHub; dataset ini adalah sumber pilihan formulir,
  bukan standar operasional BGN. Koneksi diperlukan untuk memuat pilihan.

## Kategori dan pemetaan data

| Jenis daftar | Kolom | Pemetaan |
| --- | --- | --- |
| SPPG | Nama SPPG | `values.nama` |
| SPPG | Yayasan | `values.yayasan`, ditampilkan sebagai nama Yayasan terkait bila tersedia |
| SPPG | Lokasi | `values.lokasi` |
| SPPG | Kepala SPPG | `values.kepala` |
| SPPG | Jumlah penerima manfaat | `values.jumlah_penerima_manfaat`, dalam orang |
| Yayasan | Nama Yayasan | `values.nama` |
| Yayasan | Ketua Yayasan | `values.kepala` |
| Yayasan | Jumlah SPPG | Jumlah relasi SPPG yang benar-benar tersimpan untuk Yayasan tersebut |

## Arti nilai dan satuan

- Nama, lokasi, dan penanggung jawab adalah nilai deskriptif; tidak memiliki
  satuan.
- Jumlah penerima manfaat adalah bilangan bulat aktual yang dicatat dalam
  satuan orang. Nilainya boleh belum dicatat; aplikasi tidak mengisi atau
  menyimpulkannya dari kapasitas standar.
- Jumlah SPPG adalah hitungan relasi tersimpan, bukan hitungan perkiraan.
- Kode wilayah adalah identitas administratif; label wilayah ditampilkan
  mengikuti dataset pilihan formulir.
- Halaman awal tidak menampilkan hitungan, status, kapasitas, kelengkapan, atau
  klaim kepatuhan yang belum bersumber dari data nyata.

## Aturan kontekstual

- Admin dan Supervisor boleh menambahkan, mengubah, dan menghapus catatan SPPG
  dan Yayasan; User hanya dapat melihat direktori. Hak ini harus diperiksa oleh
  API server.
- Saat daftar aktif kosong, tabel menampilkan pesan data kosong tanpa tombol.
  MessageBar di bawah tabel menawarkan tindakan Tambahkan untuk
  Admin/Supervisor dan Abaikan untuk semua peran. Abaikan menyembunyikan pesan
  sampai dashboard dimuat ulang atau pengguna keluar; tombol tambah di toolbar
  tetap tersedia bagi Admin/Supervisor.
- SPPG wajib terhubung ke Yayasan tersimpan melalui foreign key. Yayasan yang
  masih direferensikan SPPG tidak boleh diubah atau dihapus; pembatasan
  diterapkan pada antarmuka dan API.
- Form SPPG mencatat nama, Yayasan, kepala SPPG, PIC, alamat, serta pilihan
  provinsi, kabupaten/kota, kecamatan, dan desa/kelurahan melalui Combobox
  berjenjang yang dapat dicari, serta jumlah penerima manfaat bila diketahui.
  Nilai `lokasi` diturunkan dari alamat dan label wilayah terpilih.
- Form Yayasan mencatat nama dan ketua Yayasan.
- Jumlah penerima manfaat adalah konteks operasional yang dicatat pengguna,
  bukan penetapan kapasitas standar atau pemeriksaan kepatuhan.
- Untuk validator peralatan gas, jumlah penerima manfaat yang tepat 3.000
  mengaktifkan perbandingan terhadap acuan katalog workbook yang memang
  berkonteks 3.000 penerima manfaat. Nilai lain atau belum dicatat tidak
  diekstrapolasi; statusnya tetap memerlukan verifikasi.
- Pengurutan kolom dan navigasi keyboard mengikuti perilaku Fluent UI DataGrid;
  tidak mengubah catatan.
- Kolom direktori bukan pemeriksaan kepatuhan BGN. Standar operasional tidak
  boleh disimpulkan dari daftar ini.

## Ketidakpastian dan hal yang perlu diverifikasi

- Dataset wilayah bersumber dari mirror GitHub dan memerlukan koneksi; verifikasi
  sumber/pembaruan dataset sebelum menjadikannya rujukan resmi wilayah.
- Kontrak pada proyek tetangga adalah rujukan kompatibilitas aplikasi, bukan
  sumber standar normatif. Verifikasi pemetaan bila kontrak aplikasi berubah.

## Rujukan

- `PRODUCT.md` untuk batas produk, penyimpanan lokal, dan larangan data contoh.
- `..\dashboard\src\lib\directory-data.ts` untuk pemetaan direktori yang ada.
- `..\dashboard\src\components\entity-directory.tsx` untuk kolom direktori
  yang telah digunakan.
- `..\dashboard\docs\standar-operasional-bgn.md` untuk batas interpretasi
  standar sebelum kelak menambah logika operasional.
- `..\dashboard\docs\references\Standar_Operasional_BGN.xlsx` sebagai workbook
  sumber standar operasional.
- Dataset pilihan wilayah: `https://github.com/cahyadsn/wilayah`.

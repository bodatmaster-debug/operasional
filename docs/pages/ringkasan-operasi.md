# Referensi Halaman Ringkasan Operasi

## Tujuan dan cakupan

Halaman ini menjadi titik masuk untuk aplikasi manajemen SPPG/Yayasan, aset,
dan pemeliharaan. Cakupan saat ini adalah navigasi modul dan status kosong;
halaman belum menampilkan data operasional atau membuat keputusan kepatuhan.

## Sumber data

- Belum ada sumber data aplikasi yang tersambung pada halaman awal.
- Navigasi hanya berpindah di antara tampilan kosong; tidak ada operasi tulis.
- Data nyata berikutnya harus berasal dari SQLite lokal; jangan gunakan data
  contoh atau nilai placeholder yang tampak seperti catatan produksi.
- Workbook standar BGN adalah rujukan untuk aturan operasional, bukan sumber
  angka dashboard atau izin untuk membuat data.

## Kategori dan pemetaan data

| Kategori | Arti pada halaman | Nilai awal |
| --- | --- | --- |
| SPPG dan Yayasan | Catatan direktori yang dikelola aplikasi | Belum dimuat |
| Aset | Catatan aset yang dikelola aplikasi | Belum dimuat |
| Pemeliharaan | Catatan pekerjaan atau jadwal pemeliharaan | Belum dimuat |

## Arti nilai dan satuan

- Halaman awal tidak menampilkan hitungan, status, tren, satuan, atau angka
  operasional.
- Nilai yang belum tersedia tidak boleh ditampilkan sebagai nol atau dianggap
  sebagai hasil pemenuhan standar.
- Status pemeliharaan nantinya harus berasal dari catatan aplikasi; belum ada
  ambang atau definisi status yang ditetapkan.

## Aturan kontekstual

- Hak akses Admin, Supervisor, dan User harus dibedakan. Matriks izin per
  tindakan belum ditetapkan dan tidak boleh disimpulkan dari label peran.
- Halaman tidak menyatakan kepatuhan terhadap standar BGN.
- Bila aturan BGN diperlukan, pertahankan jenis SPPG, wilayah, kapasitas,
  periode, satuan, dan ketidakpastian dari sumbernya.

## Ketidakpastian dan hal yang perlu diverifikasi

- Skema SQLite, metrik ringkasan, matriks hak akses, dan definisi status
  pemeliharaan belum ditetapkan.
- Workbook dan ringkasan standar operasional saat ini berada di proyek
  tetangga `..\dashboard\docs\references\Standar_Operasional_BGN.xlsx` dan
  `..\dashboard\docs\standar-operasional-bgn.md`; tinjau sebelum menerapkan
  logika terkait standar.

## Rujukan

- `PRODUCT.md` untuk tujuan dan batas produk yang dikonfirmasi.
- `..\dashboard\docs\standar-operasional-bgn.md` untuk konteks interpretasi
  workbook sebelum aturan operasional diterapkan.

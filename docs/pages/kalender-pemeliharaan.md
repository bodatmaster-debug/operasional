# Rujukan Pemeliharaan dan Kalender

## Tujuan dan cakupan

Halaman Pemeliharaan menyajikan tabel jadwal, kalender baca-saja, dan ekspor
laporan PDF. Kalender menandai tanggal yang memiliki agenda dan menampilkan
detailnya setelah tanggal dipilih. Ekspor menyediakan pilihan harian,
mingguan, bulanan, tahunan, dan rentang custom; pengguna menentukan tanggal
atau periode yang sesuai sebelum mengunduh PDF. Fitur kalender dan laporan
hanya memvisualisasikan rencana tersimpan; keduanya tidak mencatat
pelaksanaan, hasil pemeriksaan, atau status pekerjaan.

## Sumber data

- Jadwal, SPPG, aset, jenis rencana, catatan, tanggal awal, dan periodesasi
  berasal dari `maintenance_schedule` lokal beserta relasi petugasnya.
- Basis data SQLite lokal adalah sumber data runtime. Kalender tidak
  menggunakan data contoh atau layanan eksternal.
- Kemunculan berulang dihitung saat menampilkan kalender dan tidak disimpan
  sebagai rekaman jadwal tambahan.
- Laporan memperluas jadwal berulang pada rentang tanggal terpilih menggunakan
  `getMaintenanceOccurrences`; data jadwal tidak diubah saat ekspor.

## Kategori dan pemetaan data

| Data | Arti | Aturan |
| --- | --- | --- |
| Tanggal awal | Tanggal mulai jadwal tersimpan | Mengikuti `scheduled_date` dari jadwal. |
| Sekali | Jadwal tanpa periodesasi | Hanya tampil pada tanggal awal. |
| Mingguan | Pemeliharaan rutin mingguan | Tampil setiap 7 hari dari tanggal awal. |
| Bulanan | Pemeliharaan rutin bulanan | Mengikuti nomor hari tanggal awal; jika tidak tersedia, tampil pada hari terakhir bulan itu. |
| Tahunan | Pemeliharaan rutin tahunan | Mengikuti bulan dan hari tanggal awal; jika tidak tersedia, tampil pada hari terakhir bulan itu. |
| Interval khusus | Pemeliharaan rutin berbasis jumlah hari | Tampil setiap `recurrence_days` hari dari tanggal awal. |
| Perbaikan | Rencana satu kali | Tidak diperluas menjadi jadwal berulang. |

## Aturan kontekstual

- Penanda tanggal mengikuti kemunculan jadwal yang dihitung untuk rentang yang
  sedang ditampilkan kalender.
- Periode mingguan laporan mengikuti Senin sampai Minggu berdasarkan tanggal
  yang dipilih. Periode custom mencakup tanggal awal dan akhir secara inklusif.
- Dialog ekspor menempatkan pilihan periode di kiri dan preview tabel di
  kanan; pada layar sempit, form tampil sebelum preview.
- Laporan menampilkan satu baris per kemunculan jadwal dalam periode yang
  dipilih, dengan kolom tanggal, item pemeliharaan, petugas, dan keterangan.
  Keterangan berkala menyertakan pola pengulangan serta catatan jadwal;
  kebutuhan yang direncanakan menampilkan nama, jumlah, satuan, dan catatan
  opsional; agenda kosong menghasilkan dokumen tanpa baris agenda.
- Kebutuhan diisi pengguna per jadwal, bersifat opsional, dan dapat memuat
  hingga 50 item. Nama, jumlah lebih besar dari nol, dan satuan wajib diisi
  untuk setiap item yang ditambahkan; catatan bersifat opsional. Item
  ditambahkan satu per satu ke daftar jadwal, lalu form kosong siap untuk item
  berikutnya. Nilai kebutuhan jadwal berulang ditampilkan kembali pada tiap
  kemunculan laporan, bukan bukti pembelian, penggunaan, atau stok.
- PDF memakai identitas visual Operasional, ringkasan periode dan jumlah
  agenda, tipografi Inter tertanam dengan empat bobot, angka tabular, judul
  kolom berulang pada halaman lanjutan, serta nomor halaman. Font lokal
  bersumber dari `@fontsource/inter` dan lisensi SIL OFL 1.1 disertakan di
  `public/fonts/OFL-Inter.txt`; ekspor tidak memerlukan layanan font eksternal.
  Detail aset dan SPPG ditampilkan bersama item agar konteks rencana terbaca.
- PDF dibuat pada perangkat saat pengguna memilih Unduh PDF. Renderer dimuat
  hanya saat ekspor dimulai; tidak ada pengiriman data laporan ke layanan
  eksternal.
- Kemunculan bulanan dan tahunan dihitung dari tanggal awal setiap periode,
  bukan dari tanggal yang sudah digeser pada periode sebelumnya.
- Jika satu jadwal rutin bulanan/tahunan bertanggal 29, 30, atau 31 dan
  tanggal itu tidak tersedia, kemunculan digeser ke hari terakhir periode.
- Navigasi dan pemilihan tanggal pada pop-up bersifat baca-saja; tabel, tambah
  jadwal dan pengelolaan petugas tetap memakai alur dan hak akses yang ada.
- Detail tanggal terpilih menampilkan item aset, jenis dan periodesasi rencana,
  SPPG, kategori/aset, petugas, serta keterangan yang tersimpan. Judul panel
  menyertakan badge berformat “X agenda” untuk tanggal tersebut.
- Panel detail memiliki batas tinggi dan scroll internal agar teks panjang
  tidak mengubah susunan kalender atau dialog.
- Hak akses data dan jadwal tetap mengikuti autentikasi lokal serta validasi
  endpoint saat ini.
- Tidak ada ketentuan workbook Standar Operasional BGN yang mendefinisikan
  frekuensi atau hasil pelaksanaan pemeliharaan dalam perubahan kalender ini.
  Pilihan periodesasi yang ditampilkan mengikuti nilai yang tersimpan di
  aplikasi; kalender tidak menilainya sebagai pemenuhan standar operasional.

## Ketidakpastian dan hal yang perlu diverifikasi

- Periodesasi yang tersimpan merupakan instruksi penjadwalan aplikasi, bukan
  bukti bahwa pekerjaan telah dilakukan atau aturan normatif BGN.
- Laporan tidak membuktikan pekerjaan telah dilaksanakan dan tidak menyatakan
  pemenuhan standar operasional.
- Kalender tidak memuat durasi, jam, status, konfirmasi petugas, notifikasi,
  sinkronisasi eksternal, atau riwayat pelaksanaan.
- Perubahan definisi periodesasi aplikasi harus memperbarui pemetaan kalender
  dan ekspor.

## Rujukan

- `src/components/maintenance-management.tsx` untuk antarmuka jadwal.
- `src/components/maintenance-report-dialog.tsx` untuk pemilihan periode
  laporan dan unduhan.
- `src/components/maintenance-report-pdf.tsx` untuk tata letak PDF.
- `@react-pdf/renderer` untuk pembuatan dokumen PDF.
- `@fluentui/react-calendar-compat` untuk kalender dan penanda tanggal.
- `src/lib/maintenance.ts` untuk tipe jadwal, tanggal, dan periodesasi.
- `src/app/api/maintenance/route.ts` untuk pembacaan jadwal.
- `src/lib/local-database.ts` untuk skema jadwal pemeliharaan lokal.
- `docs/standar-operasional-bgn.md` untuk batas penggunaan rujukan
  operasional BGN.

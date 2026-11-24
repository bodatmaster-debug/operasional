# Rujukan halaman Akun Aplikasi

## Tujuan dan cakupan

Halaman Admin untuk meninjau akun lokal, menerima atau menolak pendaftaran,
menetapkan peran pada saat persetujuan, dan mengatur izin Supervisor/User.
Admin juga dapat membuat akun secara langsung. Halaman tidak mengubah data
operasional.

## Sumber data

- Akun, hash password, sesi, izin, dan pendaftaran disimpan pada SQLite lokal
  `data/operations.sqlite`.
- API `/api/accounts` mengembalikan akun aktif beserta izin dan pendaftaran
  berstatus menunggu; perubahan Admin menggunakan aksi terpisah pada endpoint
  yang sama.
- Form pendaftaran menggunakan `/api/auth` dengan aksi `register`; login
  memeriksa status pendaftaran sebelum memberikan sesi.

## Kategori dan pemetaan data

| Data | Arti | Aturan |
| --- | --- | --- |
| Username | Identitas masuk akun aplikasi | Unik sesuai validasi server. |
| Nama lengkap | Nama yang diajukan saat mendaftar | 2–100 karakter; disimpan di profil setelah persetujuan. |
| Email | Kontak pendaftar | Format diperiksa; bukan bukti verifikasi atau kanal pemulihan. |
| Peran | Cakupan akses aplikasi | Admin, Supervisor, atau User; Admin memilih saat persetujuan. |
| Izin direktori, aset, pemeliharaan | Akses pengelolaan per peran | Admin selalu penuh; Supervisor/User mulai tanpa izin dan diatur Admin. |
| Status pendaftaran | Keadaan permintaan akses | Menunggu, disetujui, atau ditolak. |
| Password | Rahasia autentikasi akun | Disimpan sebagai hash; tidak ditampilkan kembali. |

## Aturan kontekstual

- Hanya Admin yang dapat membuka halaman ini; API tetap memeriksa sesi, origin
  lokal, dan peran di server.
- Supervisor dan User tidak memperoleh izin pengelolaan sampai Admin
  mengaktifkan izin peran. Izin dikelola sebagai pengaturan peran bersama.
- Akun Admin selalu memiliki seluruh izin dan pengaturan izin Admin ditolak.
- Pendaftar yang ditolak dapat mendaftar ulang dengan username yang sama;
  batas unik pendaftaran hanya berlaku pada permintaan yang masih menunggu.
- Pendaftar belum bisa menggunakan aplikasi sebelum disetujui. Login dengan
  kredensial pendaftar yang masih menunggu membuka halaman
  `/menunggu-persetujuan`.
- Tidak ada pengiriman email otomatis dari alur pendaftaran; alamat email
  pendaftar tidak dinyatakan terverifikasi.
- Pembuatan akun langsung oleh Admin tetap tersedia dan berbeda dari alur
  pendaftaran mandiri.
- Tidak ada seed atau akun contoh yang ditambahkan.

## Ketidakpastian dan hal yang perlu diverifikasi

- Validasi username dan password mengikuti implementasi server dan dapat
  berubah secara terkoordinasi; nilai validasi tidak ditetapkan oleh standar
  operasional BGN.
- Katalog izin tetap terbatas pada izin yang saat ini tersedia dalam aplikasi:
  direktori, aset, dan pemeliharaan.
- Penghapusan akun dan perubahan peran akun aktif bukan bagian dari halaman.

## Rujukan

- `docs/pages/akses-lokal.md` untuk autentikasi lokal dan arti peran.
- `src/lib/access-types.ts` untuk tipe akun dan peran.
- `src/app/api/accounts/route.ts` untuk daftar akun, pendaftaran, dan izin
  bersama per peran.
- `src/app/api/auth/route.ts` untuk pendaftaran dan autentikasi.
- `src/components/local-auth-screen.tsx` untuk login, pendaftaran, dan
  pengalihan ke status menunggu.
- `src/app/menunggu-persetujuan/page.tsx` untuk halaman status pendaftar.
- `src/lib/local-auth.ts` untuk validasi, akun, sesi, izin, dan status
  pendaftaran.
- `src/lib/local-database.ts` untuk tabel dan versi skema SQLite.
- Tidak ada ketentuan pada workbook Standar Operasional BGN yang mengatur
  manajemen akun aplikasi.

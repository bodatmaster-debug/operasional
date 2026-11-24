# Referensi Akses Lokal

## Tujuan dan cakupan

Menyediakan setup Admin pertama, login, sesi lokal, dan pembuatan akun lokal.
Tidak ada akun, kata sandi, atau catatan operasional bawaan.

## Sumber data

- Akun dan sesi disimpan dalam SQLite lokal aplikasi.
- Password disimpan sebagai hash scrypt dengan salt unik; token sesi hanya
  disimpan dalam bentuk hash.

## Kategori dan pemetaan

| Nilai | Arti |
| --- | --- |
| Admin | Mengelola akun lokal dan selalu memiliki seluruh izin |
| Supervisor | Mendapat izin pengelolaan sesuai pengaturan Admin untuk peran |
| User | Mendapat izin pengelolaan sesuai pengaturan Admin untuk peran |

## Aturan kontekstual

- Setup pertama hanya tersedia ketika belum ada akun dan membuat akun Admin
  melalui input pengguna.
- Setelah setup, Admin yang telah login membuat akun tambahan.
- Pendaftaran mandiri berstatus menunggu sampai disetujui Admin; pendaftar
  diarahkan ke `/menunggu-persetujuan` dan belum memperoleh sesi aplikasi.
- Izin direktori, aset, dan pemeliharaan diatur bersama untuk setiap peran
  Supervisor atau User. Keduanya tidak mendapat izin secara baku.
- Admin selalu memiliki seluruh izin dan tidak dapat dibatasi melalui pengaturan
  peran.
- Username dinormalisasi menjadi huruf kecil; password tidak disimpan dalam
  bentuk teks biasa.
- Sesi menggunakan cookie `HttpOnly`, `SameSite=Strict`, berumur terbatas, dan
  harus berasal dari aplikasi localhost.
- Semua operasi yang mengubah data memvalidasi Origin dan hak akses di server.
- Tidak ada autentikasi development bypass atau pemilihan role terbuka tanpa
  login.

## Ketidakpastian dan hal yang perlu diverifikasi

- Admin pertama adalah pihak yang melakukan setup lokal pertama kali. Keamanan
  perangkat dan akses filesystem tetap tanggung jawab operator.
- Akun yang lupa kata sandi belum memiliki alur pemulihan; Admin perlu
  memastikan setidaknya satu kredensial Admin tetap tersedia.

## Rujukan

- `PRODUCT.md` untuk batas aplikasi lokal dan role.
- `docs/pages/sppg-yayasan.md` untuk izin pembuatan direktori.

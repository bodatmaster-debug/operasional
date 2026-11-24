# Rujukan halaman Akun Pribadi

## Tujuan dan cakupan

Halaman khusus Admin untuk mengelola username, avatar, dan email kontak akun
sendiri, serta mengganti password. Halaman menyediakan dua bagian:
**Profil login** untuk username, avatar, dan ringkasan email yang hanya-baca;
serta **Kredensial** untuk mengelola email dan password.

## Sumber data

- Username dan peran berasal dari akun lokal yang telah terautentikasi.
- Metode masuk menggunakan username dan password akun lokal. Pendaftaran
  mandiri tersedia dan memerlukan persetujuan Admin; Google Sign-In belum
  tersedia.
- Email kontak dan gambar avatar disimpan per akun pada SQLite lokal.
- Email adalah informasi kontak; status verifikasi disimpan terpisah dan email
  tidak digunakan sebagai username atau kanal pemulihan.
- Email lama hanya dapat diganti melalui kode verifikasi yang dikirim ke alamat
  lama, termasuk jika statusnya belum terverifikasi. Jika akun belum memiliki
  email lama, alamat baru harus diverifikasi sebelum disimpan.
- Verifikasi alamat lama menyetujui perubahan, tetapi tidak memverifikasi
  kepemilikan alamat baru; email baru tetap ditandai belum terverifikasi.
  Penghapusan email juga memerlukan kode ke alamat lama.
- Kode verifikasi berlaku 10 menit, maksimal lima percobaan per kode, dengan
  jeda kirim ulang 60 detik dan batas tiga email verifikasi per jam.
- Pengiriman kode memakai SMTP yang dikonfigurasi melalui environment
  variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
  `SMTP_PASSWORD`, dan `SMTP_FROM`. Kredensial SMTP tidak disimpan di SQLite.
  Port 587 umumnya memakai `SMTP_SECURE=false`; port 465 memakai `true`.
- Gambar avatar hanya menerima JPEG, PNG, atau WebP dengan ukuran maksimum
  5 MiB. Gambar tersimpan sebagai BLOB pada database lokal.
- Password saat ini dan password baru dikirim ke API lokal untuk verifikasi
  dan perubahan kredensial.
- Password disimpan sebagai hash di SQLite; password mentah tidak ditampilkan
  kembali atau disimpan.

## Kategori dan pemetaan data

| Data | Arti | Aturan |
| --- | --- | --- |
| Username | Identitas login Admin saat ini | Ditampilkan sebagai teks sampai aksi edit dipilih; 3–32 karakter dan perubahan memerlukan verifikasi password saat ini. |
| Metode masuk | Cara Admin mengautentikasi akun | Akun lokal dengan username dan password; bukan riwayat pembuatan akun. |
| Peran | Hak akses akun saat ini | Ditampilkan sebagai Admin; tidak dapat diubah dari halaman ini. |
| Email | Informasi kontak opsional | Perubahan memerlukan verifikasi alamat lama; jika belum ada alamat lama, verifikasi dikirim ke alamat baru. Status verifikasi dicatat terpisah. |
| Avatar | Gambar profil opsional | JPEG, PNG, atau WebP hingga 5 MiB; tidak dibagikan ke layanan eksternal. |
| Password saat ini | Bukti kepemilikan akun | Wajib diverifikasi server sebelum perubahan. |
| Password baru dan konfirmasi | Kredensial berikutnya | Harus sesuai validasi aplikasi dan saling cocok. |

## Aturan kontekstual

- Akses halaman dan perubahan password dibatasi untuk Admin yang memiliki
  sesi lokal valid; endpoint juga memeriksa origin lokal dan peran di server.
- Perubahan profil hanya berlaku pada akun yang sedang terautentikasi.
- Metode autentikasi yang tersedia adalah akun lokal. Google Sign-In belum
  dikonfigurasi; pendaftaran mandiri ditinjau melalui halaman Akun aplikasi.
- Email belum dianggap terverifikasi sampai kode pengisian awal dikonfirmasi;
  status terverifikasi tidak menjadikannya username atau kanal pemulihan.
- Endpoint penyimpanan profil menolak perubahan email langsung; kode sekali
  pakai disimpan sebagai hash scrypt, bukan teks biasa.
- Jika SMTP belum dikonfigurasi atau pengiriman gagal, perubahan email tidak
  disimpan dan API menampilkan kegagalan secara eksplisit.
- Perubahan skema profil menggunakan migrasi `PRAGMA user_version`; snapshot
  SQLite dibuat melalui `npm run db:backup` sebelum migrasi.
- Perubahan berhasil mengganti hash password dan mencabut sesi akun lainnya
  sambil mempertahankan sesi yang sedang digunakan.
- Petunjuk panjang password 16 karakter atau lebih bersifat rekomendasi; batas
  wajib tetap mengikuti validasi aktual server.
- Pemulihan akun, penghapusan akun, dan perubahan peran tidak tersedia di
  halaman ini.
- Tidak ada ketentuan workbook Standar Operasional BGN yang mengatur
  autentikasi atau password akun.

## Ketidakpastian dan hal yang perlu diverifikasi

- Batas panjang dan kebijakan password mengikuti validasi aktual aplikasi,
  bukan standar operasional SPPG.
- Email tidak digunakan untuk login atau pemulihan akun, meskipun status
  verifikasinya sudah tercatat.
- Riwayat apakah akun dibuat saat penyiapan awal atau oleh Admin tidak
  disimpan sebagai sumber akun tersendiri; halaman hanya menyatakan metode
  masuk yang benar-benar tersedia.
- Jika mekanisme sesi atau kebijakan password berubah, dokumentasi dan validasi
  endpoint harus diperbarui bersama.

## Rujukan

- `docs/pages/akses-lokal.md` untuk sesi lokal, penyimpanan password, dan role.
- `src/lib/local-database.ts` untuk tabel profil dan versi skema.
- `src/app/api/accounts/profile/route.ts` untuk validasi akses perubahan profil.
- `src/app/api/accounts/profile/email-change/route.ts`,
  `src/lib/local-email-change.ts`, dan `src/lib/email-delivery.ts` untuk alur
  verifikasi dan pengiriman SMTP.
- `src/app/api/auth/route.ts` untuk autentikasi akun lokal dan
  `src/app/api/accounts/route.ts` untuk pembuatan akun oleh Admin.
- `src/components/personal-account-management.tsx` untuk alur antarmuka.
- `src/app/api/accounts/password/route.ts` dan `src/lib/local-auth.ts` untuk
  verifikasi serta penyimpanan perubahan password.

# Rencana penyelesaian migrasi penuh SQLite → Supabase

## Ringkasan status

Branch ini **belum merupakan migrasi penuh**. Vercel berhasil membangun commit `97913a1`, tetapi build sebelumnya di commit `33b1acb` gagal TypeScript pada `/api/regions`: `requireLocalUser()` telah menjadi asynchronous pada branch dan route belum menunggunya. Perbaikan itu ada di commit ini; hasil build perlu diverifikasi kembali.

Pencarian kode GitHub dibatasi dan dapat tidak lengkap. Daftar berikut disusun dari hasil pencarian yang tersedia dan inspeksi langsung atas file runtime. Sebelum menyatakan migrasi selesai, ulangi audit literal `getLocalDatabase`, `DatabaseSync`, `node:sqlite`, `requireLocal*`, `local-auth`, `local-email-change`, dan referensi UI SQLite pada keseluruhan tree branch.

## Temuan yang masih menghalangi migrasi penuh

| Area/file | Temuan saat audit | Tindakan |
|---|---|---|
| `src/app/api/regions/route.ts` | Memanggil helper autentikasi Supabase lewat alias `requireLocalUser` tanpa `await`; menimbulkan kegagalan typecheck Vercel. | **Diperbaiki:** await sesi sebelum memeriksa respons. |
| `src/app/api/accounts/route.ts` | Masih mengimpor `local-auth` dan menjalankan CRUD akun/pendaftaran/izin terhadap SQLite. | Pindahkan daftar dan tindakan admin ke `user_profiles`, `role_permissions`, `role_page_permissions`; pembuatan akun lewat Supabase Auth Admin API yang hanya server-side. |
| `src/app/api/accounts/profile/route.ts` | Bentuk respons profil tidak sesuai kontrak UI dan ada versi endpoint yang masih memanggil fungsi profil lokal. | Baca/perbarui `user_profiles`, tampilkan profil dalam bentuk camelCase UI, pindahkan avatar ke Supabase Storage. |
| `src/app/api/accounts/profile/email-change/route.ts` | Versi lokal memakai `local-email-change`, tabel SQLite dan SMTP custom; alur Supabase Auth baru belum dipetakan end-to-end. | Gunakan `auth.updateUser({ email })`, callback/tautan konfirmasi Supabase, dan state pending yang disediakan Auth; jangan mengklaim kode OTP custom jika tidak diterapkan. |
| `src/app/api/accounts/password/route.ts` | Versi lama masih memakai hash/session SQLite; endpoint Supabase yang ditambahkan perlu diverifikasi pada tree branch terbaru dan harus konsisten dengan UI `verify-current` lalu `change`. | Implementasikan verifikasi kredensial Supabase dan `auth.updateUser({ password })`; tangani logout/re-auth dengan benar. |
| `src/app/api/maintenance/route.ts` | Masih ada implementasi SQLite untuk jadwal, relasi assignee, dan needs pada branch yang terdeteksi. | Migrasikan seluruh baca/tulis, validasi aset dan relasi, serta gunakan RPC PostgreSQL untuk transaksi multi-tabel atomik. |
| `src/app/api/maintenance/assignees/route.ts` | Versi lokal masih membaca dan menulis `maintenance_assignee`; versi branch lain hanya menyediakan GET. | Implementasikan CRUD yang dibutuhkan UI di Supabase, termasuk validasi telepon/peran dan RLS. |
| `src/app/api/maintenance/occurrences/route.ts` | Versi SQLite lama masih terdeteksi; versi Supabase harus mempertahankan filter bulan dan status occurrence. | Pastikan GET/POST/DELETE menggunakan Postgres dan perilaku kalender yang sama. |
| `src/app/api/rab/route.ts`, `src/app/api/rab/[id]/route.ts` | Pernah ada jalur SQLite; kontrak Supabase baru sedang disesuaikan dengan UI. | Validasi `parseRABInput`, simpan proposal/item secara atomik via RPC, kembalikan `items`, `item_count`, `grand_total`, serta tangani edit/delete secara konsisten. |
| `src/app/api/assets`, `vehicles`, `non-juknis-assets`, `surat-edaran-assets`, `asset-condition` | Implementasi lokal lama masih ada pada referensi/hasil code search; pastikan file aktif di branch benar-benar Supabase, bukan sekadar fungsi auth alias lokal. | Audit semua method GET/POST/PUT/PATCH/DELETE per endpoint dan test tenant/RLS. |
| `src/app/api/gas-installation`, `electrical-installation` | Implementasi SQLite lama masih terdeteksi. | Pindahkan seluruh operasi ke tabel Supabase dan verifikasi payload boolean/integer serta aturan NULL generator. |
| `src/app/api/asset-completeness` | Pastikan UI menghitung ringkasan dengan fungsi domain yang sudah ada, bukan mengembalikan kumpulan tabel mentah. | Cocokkan bentuk record detail dan ringkasan dengan komponen konsumen. |
| `src/app/api/asset-import/route.ts` | Implementasi di branch pada audit berupa placeholder `GET { ok: true }`, bukan CRUD impor; di history ada implementasi SQLite penuh. | Migrasikan batch dan rows ke tabel Supabase, pertahankan batas request 10 MiB/2.000 baris, validasi, paging, dan respons UI. |
| `src/app/api/warehouse/route.ts` | Implementasi Supabase yang ada belum mempertahankan semantik transaksi stok/alokasi dan validasi konkurensi secara penuh. | Pindahkan operasi majemuk ke RPC SQL atomik (stok masuk/keluar, allocate/transfer/return); test stok negatif, tenant, uniqueness, dan failure rollback. |
| `src/lib/local-request.ts`, `src/lib/local-auth.ts`, `src/lib/local-email-change.ts` | Utilitas lokal masih dapat menjadi jalur autentikasi/kebijakan lama. | Setelah seluruh pemanggil dialihkan, hapus helper runtime lokal atau ubah nama/import secara bertahap; jangan biarkan fallback SQLite diam-diam. |
| `src/lib/local-database.ts`, `rab-storage.ts`, `maintenance-assets.ts`, `warehouse-allocation.ts` | Modul SQLite domain masih ada. | Hapus hanya setelah tidak ada import runtime; skrip ekspor/backup terpisah boleh dipertahankan sementara sebagai utilitas migrasi. |
| `src/components/operations-dashboard.tsx`, `local-auth-screen.tsx`, `personal-account-management.tsx` | UI dan teks masih menyebut “SQLite lokal”, login lokal/Google lama, atau alur email OTP khusus. | Selaraskan label, setup/login, profil, dan alur email dengan Supabase-only; hapus UI fitur yang belum didukung daripada mengembalikan sukses palsu. |
| `PRODUCT.md`, README, `docs/pages/*.md`, `.vercelignore`, package scripts | Dokumen produk masih menetapkan SQLite aktif dan script backup lokal masih menjadi workflow utama. | Perbarui sesudah runtime benar-benar pindah; dokumentasikan migrasi data, restore, konfigurasi Auth URL, dan environment deployment. |

## Tahapan pengerjaan

### Tahap 1 — Stabilkan build dan autentikasi
- [x] Perbaiki `await requireLocalUser` pada route regions.
- [ ] Jalankan `npm run typecheck`, `npm run lint`, dan `npm run build` pada commit terbaru.
- [ ] Verifikasi callback OAuth: localhost dan 127.0.0.1, status pending/rejected/active, EULA, logout dan refresh sesi.
- [ ] Hapus jembatan sesi SQLite dan jalur login lokal hanya setelah UI login/password ikut dimigrasikan.

### Tahap 2 — Endpoint operasional
- [ ] Migrasikan dan uji seluruh endpoint aset/instalasi/kondisi.
- [ ] Migrasikan jadwal, assignee, needs dan occurrence dengan RPC atomik.
- [ ] Migrasikan RAB dengan RPC atomik untuk proposal + item serta kontrak respons UI.
- [ ] Migrasikan impor Excel batch dan rows; jangan sisakan placeholder.
- [ ] Audit gudang dan gunakan transaksi server-side/RPC untuk mencegah saldo negatif dan race condition.

### Tahap 3 — Akun, profil, dan akses
- [ ] Pindahkan CRUD admin ke Supabase Auth Admin API melalui server-only secret yang tidak pernah dikirim ke browser.
- [ ] Kelola status, role, ban/revoke, tenant Yayasan dan izin lewat RLS/RPC yang dibatasi.
- [ ] Lengkapi profile/avatar lewat `user_profiles` dan Storage private buckets.
- [ ] Pindahkan perubahan email ke proses konfirmasi Supabase Auth; selaraskan UI.
- [ ] Tambahkan kebijakan penghapusan akun tanpa menghapus akun Admin yang sedang dipakai/terakhir.

### Tahap 4 — Tutup SQLite, dokumentasi dan verifikasi
- [ ] Pencarian seluruh tree memastikan endpoint runtime tidak mengimpor `local-database`, `local-auth`, atau modul storage SQLite.
- [ ] Hapus/isolasi modul SQLite lama dan skrip backup; sediakan skrip ekspor/import lokal → Supabase dengan dry-run, validasi FK, laporan jumlah baris, dan tanpa menimpa data secara diam-diam.
- [ ] Perbarui UI dan semua dokumen supaya tidak lagi menyatakan SQLite sebagai runtime.
- [ ] Uji RLS lintas Yayasan: admin global sesuai kebijakan; user tenant tidak dapat membaca/menulis tenant lain; role/page permission diuji.
- [ ] Jalankan lint, typecheck, tests dan production build; deploy staging, smoke test CRUD/Auth/Storage sebelum produksi.

## Kriteria selesai

- Seluruh API yang digunakan UI membaca/menulis Supabase; tidak ada jalur fallback SQLite.
- Google OAuth kembali ke `/auth/callback`; Supabase Auth cookies adalah satu-satunya sesi.
- Multi-table operations yang perlu atomisitas memakai RPC/transaction PostgreSQL.
- RLS dan permission server-side melindungi tenant dan role; service role hanya server-side.
- Kontrak data seluruh endpoint cocok dengan UI dan mempunyai test.
- Migrasi data lokal memiliki dry-run, backup sumber, rekonsiliasi jumlah/foreign key, dan laporan konflik.
- Typecheck, lint, test, dan Vercel build sukses.

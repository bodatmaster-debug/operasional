# Peta Penyelesaian Migrasi SQLite ke Supabase

## Status

Migrasi masih bertahap. Commit saat ini memindahkan sebagian besar API, tetapi beberapa endpoint dan UI masih memiliki ketergantungan atau kontrak data lama.

## Masalah yang ditemukan

### 1. Direktori Yayasan

- Skema Supabase memiliki tabel `yayasan` dan `sppg`.
- UI membutuhkan `sppg_count` pada setiap record Yayasan.
- Endpoint `/api/directory?kind=yayasan` belum mengirim `sppg_count` secara konsisten.

**Penyelesaian:** endpoint menghitung jumlah SPPG dengan satu query Supabase terpisah atau menyuplai relasi yang sudah dihitung.

### 2. RAB

- Database memiliki `rab_proposal` dan `rab_proposal_item`.
- UI membutuhkan `item_count`, `grand_total`, dan `items` dalam format camelCase.
- Endpoint saat ini mengembalikan bentuk relasi mentah yang berbeda dengan kontrak UI.

**Penyelesaian:** endpoint RAB memetakan setiap proposal menjadi record UI, sekaligus mengisi grand total dari item dan item_count.

### 3. Callback Google

- Callback sudah tidak boleh membuat sesi SQLite lokal.
- Supabase session cookies adalah satu-satunya sesi runtime.
- Redirect harus kembali ke `/auth/callback` pada origin yang sesuai.

## Pemetaan endpoint

| Area | Tabel Supabase | Endpoint | Status |
|---|---|---|---|
| Direktori | `yayasan`, `sppg` | `/api/directory` | Perlu pemetaan UI lengkap |
| Aset | `asset_inventory`, `vehicle_inventory`, `non_juknis_asset_inventory`, `surat_edaran_asset_inventory` | `/api/assets`, `/api/vehicles`, aset lainnya | Supabase |
| Instalasi | `sppg_gas_installation`, `sppg_electrical_installation` | endpoint instalasi | Supabase |
| Pemeliharaan | `maintenance_schedule`, `maintenance_schedule_need`, `maintenance_schedule_assignee`, `maintenance_schedule_occurrence` | `/api/maintenance` | Supabase |
| RAB | `rab_proposal`, `rab_proposal_item` | `/api/rab`, `/api/rab/[id]` | Perlu pemetaan UI |
| Gudang | `warehouse_item`, `warehouse_movement`, tabel alokasi | `/api/warehouse` | Supabase |
| Akun | `auth.users`, `user_profiles`, tabel izin | `/api/auth`, `/api/accounts`, profil | Sebagian Supabase |
| Import aset | `asset_import_batch`, `asset_import_row` | `/api/asset-import` | Belum final |
| Pemeliharaan aset | tabel aset berdasarkan `sppg_id` | `/api/maintenance/assets` | Supabase langsung |

## Pemetaan nama data

SQLite menggunakan `snake_case`; UI menggunakan campuran `snake_case` dan camelCase. Pemetaan berikut wajib dipertahankan:

- `rab_proposal.rab_date` → `rab_date`
- `rab_proposal.sppg_name` → `sppg_name`
- `rab_proposal.assignee_name` → `assignee_name`
- `rab_proposal_item.estimated_unit_cost` → `estimatedUnitCost`
- `rab_proposal_item` list → `items`
- jumlah item → `item_count`
- jumlah biaya → `grand_total`
- jumlah SPPG Yayasan → `sppg_count`

## Urutan pengerjaan

1. Perbaiki kontrak `/api/directory` untuk `sppg_count` dan `yayasan`.
2. Perbaiki kontrak `/api/rab` dan `/api/rab/[id]`.
3. Pindahkan akun lokal dan endpoint profil sepenuhnya ke Supabase Auth/Profile.
4. Pindahkan maintenance assets dan asset import.
5. Hapus atau hentikan seluruh fungsi SQLite yang masih dipakai runtime.
6. Ganti label UI “SQLite lokal” menjadi status Supabase.
7. Jalankan `npm run typecheck` dan `npm run build`.
8. Deploy ulang dan verifikasi login Google serta fungsi CRUD.

## Kriteria selesai

- Tidak ada endpoint runtime yang membaca `operations.sqlite`.
- Tidak ada sesi SQLite pada callback Google.
- Yayasan dan RAB mengembalikan bentuk yang dapat divalidasi UI.
- Semua data operasional CRUD memakai Supabase/Postgres dan RLS.
- Build Vercel sukses.

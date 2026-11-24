BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(11);

INSERT INTO public.yayasan (
  id, nama, ketua_yayasan, created_at, updated_at
)
VALUES
  ('test-tenant-a', 'Tenant A', 'Ketua A', now()::text, now()::text),
  ('test-tenant-b', 'Tenant B', 'Ketua B', now()::text, now()::text);

INSERT INTO public.sppg (
  id, nama, yayasan_id, lokasi, kepala_sppg, pic, alamat,
  provinsi_kode, provinsi_nama, kabupaten_kode, kabupaten_nama,
  kecamatan_kode, kecamatan_nama, desa_kode, desa_nama,
  created_at, updated_at
)
VALUES
  (
    'test-sppg-a', 'SPPG A', 'test-tenant-a', 'Lokasi A', 'Kepala A',
    'PIC A', 'Alamat A', '1', 'Provinsi A', '1', 'Kabupaten A',
    '1', 'Kecamatan A', '1', 'Desa A', now()::text, now()::text
  ),
  (
    'test-sppg-b', 'SPPG B', 'test-tenant-b', 'Lokasi B', 'Kepala B',
    'PIC B', 'Alamat B', '2', 'Provinsi B', '2', 'Kabupaten B',
    '2', 'Kecamatan B', '2', 'Desa B', now()::text, now()::text
  );

INSERT INTO auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
VALUES
  (
    '00000000-0000-4000-8000-000000000001', 'authenticated',
    'authenticated', 'rls-admin@example.test', '', now(), '{}', '{}',
    now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000002', 'authenticated',
    'authenticated', 'rls-tenant-a@example.test', '', now(), '{}', '{}',
    now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000003', 'authenticated',
    'authenticated', 'rls-tenant-b@example.test', '', now(), '{}', '{}',
    now(), now()
  ),
  (
    '00000000-0000-4000-8000-000000000004', 'authenticated',
    'authenticated', 'rls-pending@example.test', '', now(), '{}', '{}',
    now(), now()
  );

UPDATE public.user_profiles
SET role = 'admin', status = 'active'
WHERE user_id = '00000000-0000-4000-8000-000000000001';

UPDATE public.user_profiles
SET status = 'active', yayasan_id = 'test-tenant-a'
WHERE user_id = '00000000-0000-4000-8000-000000000002';

UPDATE public.user_profiles
SET status = 'active', yayasan_id = 'test-tenant-b'
WHERE user_id = '00000000-0000-4000-8000-000000000003';

INSERT INTO public.role_permissions (
  role, can_manage_directory, can_manage_assets, can_manage_maintenance
)
VALUES ('user', 1, 1, 1)
ON CONFLICT (role) DO UPDATE SET
  can_manage_directory = EXCLUDED.can_manage_directory,
  can_manage_assets = EXCLUDED.can_manage_assets,
  can_manage_maintenance = EXCLUDED.can_manage_maintenance;

INSERT INTO public.role_page_permissions (role, page, can_access)
VALUES ('user', 'asset-recording', 1), ('user', 'directory', 1)
ON CONFLICT (role, page) DO UPDATE SET can_access = EXCLUDED.can_access;

INSERT INTO public.asset_inventory (
  id, sppg_id, catalog_id, quantity, created_at, updated_at
)
VALUES
  ('test-asset-a', 'test-sppg-a', 'test-catalog', 1, now()::text, now()::text),
  ('test-asset-b', 'test-sppg-b', 'test-catalog', 1, now()::text, now()::text);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000004',
  true
);

SELECT is(
  (SELECT count(*) FROM public.yayasan),
  0::bigint,
  'pending users cannot read tenant data'
);

SELECT is(
  (
    WITH updated AS (
      UPDATE public.user_profiles
      SET full_name = 'Pending User'
      WHERE user_id = '00000000-0000-4000-8000-000000000004'
      RETURNING 1
    )
    SELECT count(*) FROM updated
  ),
  0::bigint,
  'pending users cannot update their profile'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000002',
  true
);

SELECT is(
  (SELECT count(*) FROM public.yayasan WHERE id = 'test-tenant-a'),
  1::bigint,
  'tenant users can read their own foundation'
);

SELECT is(
  (SELECT count(*) FROM public.yayasan WHERE id = 'test-tenant-b'),
  0::bigint,
  'tenant users cannot read another foundation'
);

SELECT is(
  (SELECT count(*) FROM public.sppg WHERE id = 'test-sppg-a'),
  1::bigint,
  'tenant users can read their own SPPG'
);

SELECT is(
  (SELECT count(*) FROM public.sppg WHERE id = 'test-sppg-b'),
  0::bigint,
  'tenant users cannot read another SPPG'
);

SELECT is(
  (SELECT count(*) FROM public.asset_inventory WHERE id = 'test-asset-a'),
  1::bigint,
  'tenant users can read their own asset data'
);

SELECT is(
  (SELECT count(*) FROM public.asset_inventory WHERE id = 'test-asset-b'),
  0::bigint,
  'tenant users cannot read another tenant asset data'
);

SELECT set_config('app.profile_sync', 'on', true);
SELECT throws_ok(
  $$
    UPDATE public.user_profiles
    SET role = 'admin'
    WHERE user_id = '00000000-0000-4000-8000-000000000002'
  $$,
  'P0001',
  'Users cannot change authorization or account status fields',
  'custom settings cannot bypass profile authorization'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000000001',
  true
);

SELECT is(
  (SELECT count(*) FROM public.yayasan),
  2::bigint,
  'admins can read all foundations'
);

SELECT is(
  (SELECT count(*) FROM public.asset_inventory),
  2::bigint,
  'admins can read all asset data'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;

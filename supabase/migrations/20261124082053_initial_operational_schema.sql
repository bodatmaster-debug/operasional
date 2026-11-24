-- Operational tables mirrored from local SQLite schema version 40.
-- Local account credentials and authentication state are intentionally excluded.
-- API roles remain denied until tenant/role access policies are designed.

CREATE TABLE public."yayasan" (
        id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
        nama text NOT NULL CHECK (length(trim(nama)) > 0),
        ketua_yayasan text NOT NULL CHECK (length(trim(ketua_yayasan)) > 0),
        created_at text NOT NULL,
        updated_at text NOT NULL
      , alamat_yayasan text NOT NULL DEFAULT ''
          CHECK (length(alamat_yayasan) <= 1000), nomor_telepon_yayasan text NOT NULL DEFAULT ''
          CHECK (length(nomor_telepon_yayasan) <= 32), alamat_ketua_yayasan text NOT NULL DEFAULT ''
          CHECK (length(alamat_ketua_yayasan) <= 1000), nomor_telepon_ketua_yayasan text NOT NULL DEFAULT ''
          CHECK (length(nomor_telepon_ketua_yayasan) <= 32), logo_data bytea
          CHECK (
            logo_data IS NULL OR
            length(logo_data) BETWEEN 1 AND 5242880
          ), logo_mime_type text
          CHECK (
            logo_mime_type IS NULL OR
            logo_mime_type IN (
              'image/jpeg', 'image/png', 'image/webp', 'image/avif'
            )
          ), ketua_foto_data bytea
          CHECK (
            ketua_foto_data IS NULL OR
            length(ketua_foto_data) BETWEEN 1 AND 5242880
          ), ketua_foto_mime_type text
          CHECK (
            ketua_foto_mime_type IS NULL OR
            ketua_foto_mime_type IN (
              'image/jpeg', 'image/png', 'image/webp', 'image/avif'
            )
          ));

CREATE TABLE public."sppg" (
        id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
        nama text NOT NULL CHECK (length(trim(nama)) > 0),
        yayasan_id text NOT NULL REFERENCES yayasan(id) ON DELETE RESTRICT,
        lokasi text NOT NULL CHECK (length(trim(lokasi)) > 0),
        kepala_sppg text NOT NULL CHECK (length(trim(kepala_sppg)) > 0),
        pic text NOT NULL CHECK (length(trim(pic)) > 0),
        alamat text NOT NULL CHECK (length(trim(alamat)) > 0),
        provinsi_kode text NOT NULL CHECK (length(trim(provinsi_kode)) > 0),
        provinsi_nama text NOT NULL CHECK (length(trim(provinsi_nama)) > 0),
        kabupaten_kode text NOT NULL CHECK (length(trim(kabupaten_kode)) > 0),
        kabupaten_nama text NOT NULL CHECK (length(trim(kabupaten_nama)) > 0),
        kecamatan_kode text NOT NULL CHECK (length(trim(kecamatan_kode)) > 0),
        kecamatan_nama text NOT NULL CHECK (length(trim(kecamatan_nama)) > 0),
        desa_kode text NOT NULL CHECK (length(trim(desa_kode)) > 0),
        desa_nama text NOT NULL CHECK (length(trim(desa_nama)) > 0),
        created_at text NOT NULL,
        updated_at text NOT NULL
      , jumlah_penerima_manfaat integer
          CHECK (
            jumlah_penerima_manfaat IS NULL OR
            jumlah_penerima_manfaat BETWEEN 1 AND 1000000
          ));

CREATE TABLE public."asset_inventory" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id text NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          catalog_id text NOT NULL
            CHECK (length(trim(catalog_id)) BETWEEN 1 AND 120),
          quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at text NOT NULL,
          updated_at text NOT NULL, asset_type text NOT NULL DEFAULT ''
          CHECK (length(trim(asset_type)) <= 100), asset_brand text NOT NULL DEFAULT ''
          CHECK (length(trim(asset_brand)) <= 100), asset_condition text CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          ),
          UNIQUE (sppg_id, catalog_id)
        );

CREATE TABLE public."vehicle_inventory" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id text NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          vehicle_type text NOT NULL
            CHECK (vehicle_type IN ('R4', 'R3', 'R2', 'sampan', 'speedboat', 'sepeda')),
          vehicle_subtype text NOT NULL
            CHECK (length(trim(vehicle_subtype)) BETWEEN 1 AND 100),
          vehicle_make text NOT NULL
            CHECK (length(trim(vehicle_make)) BETWEEN 1 AND 100),
          vehicle_model text NOT NULL
            CHECK (length(trim(vehicle_model)) BETWEEN 1 AND 100),
          quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at text NOT NULL,
          updated_at text NOT NULL, asset_condition text CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          ),
          UNIQUE (
            sppg_id,
            vehicle_type,
            vehicle_subtype,
            vehicle_make,
            vehicle_model
          )
        );

CREATE TABLE public."sppg_gas_installation" (
          sppg_id text PRIMARY KEY NOT NULL
            REFERENCES sppg(id) ON DELETE RESTRICT,
          safety_system_present integer NOT NULL
            CHECK (safety_system_present IN (0, 1)),
          high_pressure_present integer NOT NULL
            CHECK (high_pressure_present IN (0, 1)),
          high_pressure_line_count integer,
          low_pressure_present integer NOT NULL
            CHECK (low_pressure_present IN (0, 1)),
          low_pressure_line_count integer,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          CHECK (
            (high_pressure_present = 1 AND
              high_pressure_line_count IS NOT NULL AND
              high_pressure_line_count > 0) OR
            (high_pressure_present = 0 AND
              high_pressure_line_count IS NULL)
          ),
          CHECK (
            (low_pressure_present = 1 AND
              low_pressure_line_count IS NOT NULL AND
              low_pressure_line_count > 0) OR
            (low_pressure_present = 0 AND
              low_pressure_line_count IS NULL)
          )
        );

CREATE TABLE public."sppg_electrical_installation" (
          sppg_id text PRIMARY KEY NOT NULL
            REFERENCES sppg(id) ON DELETE RESTRICT,
          pln_capacity_va integer NOT NULL
            CHECK (pln_capacity_va > 0),
          generator_present integer NOT NULL
            CHECK (generator_present IN (0, 1)),
          generator_capacity_kva double precision,
          generator_brand text,
          created_at text NOT NULL,
          updated_at text NOT NULL,
          CHECK (
            (generator_present = 1 AND
              generator_capacity_kva IS NOT NULL AND
              generator_capacity_kva > 0 AND
              generator_brand IS NOT NULL AND
              length(trim(generator_brand)) BETWEEN 1 AND 100) OR
            (generator_present = 0 AND
              generator_capacity_kva IS NULL AND
              generator_brand IS NULL)
          )
        );

CREATE TABLE public."non_juknis_asset_inventory" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id text NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          category text NOT NULL CHECK (
            category IN (
              'Peralatan dapur',
              'Peralatan operasional',
              'Peralatan kantor',
              'Instalasi gas'
            )
          ),
          item_name text NOT NULL
            CHECK (length(trim(item_name)) BETWEEN 1 AND 100),
          asset_type text NOT NULL
            CHECK (length(trim(asset_type)) BETWEEN 1 AND 100),
          asset_brand text NOT NULL
            CHECK (length(trim(asset_brand)) BETWEEN 1 AND 100),
          quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at text NOT NULL,
          updated_at text NOT NULL
        , asset_condition text CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          ));

CREATE TABLE public."surat_edaran_asset_inventory" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id text NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          category text NOT NULL CHECK (
            category IN (
              'Peralatan dapur',
              'Peralatan operasional',
              'Peralatan kantor',
              'Instalasi gas'
            )
          ),
          item_name text NOT NULL
            CHECK (length(trim(item_name)) BETWEEN 1 AND 100),
          asset_type text NOT NULL
            CHECK (length(trim(asset_type)) BETWEEN 1 AND 100),
          asset_brand text NOT NULL
            CHECK (length(trim(asset_brand)) BETWEEN 1 AND 100),
          quantity integer NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          surat_edaran_number text NOT NULL
            CHECK (length(trim(surat_edaran_number)) BETWEEN 1 AND 120),
          surat_edaran_year integer NOT NULL
            CHECK (surat_edaran_year BETWEEN 1 AND 9999),
          created_at text NOT NULL,
          updated_at text NOT NULL
        , acuan_quantity integer
          CHECK (
            acuan_quantity IS NULL OR
            acuan_quantity BETWEEN 0 AND 1000000
          ), acuan_unit text
          CHECK (
            acuan_unit IS NULL OR
            length(trim(acuan_unit)) BETWEEN 1 AND 100
          ), actual_unit text NOT NULL DEFAULT ''
          CHECK (length(trim(actual_unit)) <= 100), asset_condition text CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          ));

CREATE TABLE public."maintenance_assignee" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
          role text NOT NULL CHECK (length(trim(role)) BETWEEN 1 AND 100),
          created_at text NOT NULL, phone text NOT NULL DEFAULT ''
          CHECK (length(phone) <= 32)
        );

CREATE TABLE public."maintenance_schedule" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id text REFERENCES sppg(id) ON DELETE SET NULL,
          sppg_name text NOT NULL CHECK (length(trim(sppg_name)) BETWEEN 1 AND 160),
          asset_source text NOT NULL CHECK (
            asset_source IN (
              'juknis',
              'non-juknis',
              'surat-edaran',
              'vehicle',
              'gas-installation',
              'electrical-installation',
              'generator'
            )
          ),
          asset_record_id text NOT NULL
            CHECK (length(trim(asset_record_id)) BETWEEN 1 AND 120),
          asset_category text NOT NULL
            CHECK (length(trim(asset_category)) BETWEEN 1 AND 100),
          asset_name text NOT NULL
            CHECK (length(trim(asset_name)) BETWEEN 1 AND 160),
          asset_details text NOT NULL DEFAULT ''
            CHECK (length(asset_details) <= 500),
          maintenance_type text NOT NULL
            CHECK (maintenance_type IN ('routine', 'repair')),
          notes text NOT NULL CHECK (length(trim(notes)) BETWEEN 1 AND 1000),
          scheduled_date text NOT NULL
            CHECK (length(scheduled_date) = 10),
          recurrence text NOT NULL
            CHECK (recurrence IN ('none', 'custom', 'weekly', 'monthly', 'yearly')),
          recurrence_days integer,
          created_by text,
          created_at text NOT NULL,
          CHECK (
            (maintenance_type = 'repair' AND recurrence = 'none' AND
              recurrence_days IS NULL) OR
            (maintenance_type = 'routine' AND
              ((recurrence = 'custom' AND recurrence_days BETWEEN 1 AND 36500) OR
               (recurrence IN ('none', 'weekly', 'monthly', 'yearly') AND
                recurrence_days IS NULL)))
          )
        );

CREATE TABLE public."maintenance_schedule_assignee" (
          schedule_id text NOT NULL
            REFERENCES maintenance_schedule(id) ON DELETE CASCADE,
          assignee_id text NOT NULL
            REFERENCES maintenance_assignee(id) ON DELETE RESTRICT,
          PRIMARY KEY (schedule_id, assignee_id)
        );

CREATE TABLE public."maintenance_schedule_need" (
          schedule_id text NOT NULL
            REFERENCES maintenance_schedule(id) ON DELETE CASCADE,
          position integer NOT NULL CHECK (position >= 0),
          name text NOT NULL
            CHECK (length(trim(name)) BETWEEN 1 AND 120),
          quantity double precision NOT NULL CHECK (quantity > 0),
          unit text NOT NULL
            CHECK (length(trim(unit)) BETWEEN 1 AND 32),
          notes text NOT NULL DEFAULT ''
            CHECK (length(notes) <= 500),
          PRIMARY KEY (schedule_id, position)
        );

CREATE TABLE public."maintenance_schedule_occurrence" (
          schedule_id text NOT NULL REFERENCES maintenance_schedule(id) ON DELETE CASCADE,
          occurrence_date text NOT NULL CHECK (length(occurrence_date) = 10),
          status text NOT NULL CHECK (status IN ('completed', 'dismissed')),
          updated_by text,
          updated_at text NOT NULL,
          PRIMARY KEY (schedule_id, occurrence_date)
        );

CREATE TABLE public."warehouse_item" (
          id text PRIMARY KEY NOT NULL,
          kind text NOT NULL CHECK (kind IN ('asset', 'spare-part')),
          name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
          unit text NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 32),
          created_at text NOT NULL,
          updated_at text NOT NULL
        , asset_category text
          CHECK (
            asset_category IS NULL OR
            asset_category IN ('juknis', 'non-juknis', 'surat-edaran')
          ), asset_catalog_id text
          CHECK (
            asset_catalog_id IS NULL OR
            length(trim(asset_catalog_id)) BETWEEN 1 AND 100
          ), asset_subcategory text
          CHECK (
            asset_subcategory IS NULL OR
            asset_subcategory IN (
              'Peralatan dapur',
              'Peralatan operasional',
              'Peralatan kantor',
              'Instalasi gas'
            )
          ), asset_type text
          CHECK (
            asset_type IS NULL OR
            length(trim(asset_type)) <= 100
          ), asset_brand text
          CHECK (
            asset_brand IS NULL OR
            length(trim(asset_brand)) <= 100
          ), storage_period_months integer
          CHECK (
            storage_period_months IS NULL OR
            storage_period_months BETWEEN 1 AND 1200
          ), compatible_asset_item_id text
          REFERENCES warehouse_item(id) ON DELETE RESTRICT);

CREATE TABLE public."warehouse_movement" (
          id text PRIMARY KEY NOT NULL,
          item_id text NOT NULL
            REFERENCES warehouse_item(id) ON DELETE RESTRICT,
          movement_type text NOT NULL CHECK (movement_type IN ('in', 'out')),
          quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
          note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
          created_at text NOT NULL,
          created_by text
        , transaction_date text NOT NULL DEFAULT '');

CREATE TABLE public."rab_proposal" (
          id text PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id text REFERENCES sppg(id) ON DELETE SET NULL,
          sppg_name text NOT NULL
            CHECK (length(trim(sppg_name)) BETWEEN 1 AND 160),
          assignee_id text NOT NULL
            REFERENCES maintenance_assignee(id) ON DELETE RESTRICT,
          assignee_name text NOT NULL
            CHECK (length(trim(assignee_name)) BETWEEN 1 AND 120),
          created_by text,
          created_at text NOT NULL
        , rab_date text NOT NULL DEFAULT '1970-01-01'
          CHECK (length(rab_date) = 10), notes text NOT NULL DEFAULT ''
          CHECK (length(notes) <= 1000));

CREATE TABLE public."rab_proposal_item" (
          rab_id text NOT NULL
            REFERENCES rab_proposal(id) ON DELETE CASCADE,
          position integer NOT NULL CHECK (position >= 0),
          name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
          quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
          estimated_unit_cost integer NOT NULL
            CHECK (estimated_unit_cost > 0), unit text NOT NULL DEFAULT ''
          CHECK (length(trim(unit)) <= 40),
          PRIMARY KEY (rab_id, position)
        );

CREATE TABLE public."asset_import_batch" (
          id text PRIMARY KEY NOT NULL,
          source_filename text NOT NULL
            CHECK (length(trim(source_filename)) BETWEEN 1 AND 255),
          created_by_username text NOT NULL
            CHECK (length(trim(created_by_username)) BETWEEN 1 AND 32),
          created_at text NOT NULL
        );

CREATE TABLE public."asset_import_row" (
          id text PRIMARY KEY NOT NULL,
          batch_id text NOT NULL
            REFERENCES asset_import_batch(id) ON DELETE CASCADE,
          source_row_number integer NOT NULL
            CHECK (source_row_number BETWEEN 1 AND 100000),
          asset_name text NOT NULL
            CHECK (length(trim(asset_name)) BETWEEN 1 AND 200),
          quantity integer NOT NULL
            CHECK (quantity BETWEEN 1 AND 1000000),
          unit text NOT NULL DEFAULT ''
            CHECK (length(unit) <= 40),
          category text NOT NULL DEFAULT ''
            CHECK (length(category) <= 100),
          acquisition_value integer
            CHECK (
              acquisition_value IS NULL OR
              acquisition_value BETWEEN 0 AND 1000000000000
            ),
          notes text NOT NULL DEFAULT ''
            CHECK (length(notes) <= 1000),
          created_at text NOT NULL,
          UNIQUE (batch_id, source_row_number)
        );

CREATE TABLE public."warehouse_asset_allocation" (
          item_id text NOT NULL
            REFERENCES warehouse_item(id) ON DELETE RESTRICT,
          sppg_id text NOT NULL
            REFERENCES sppg(id) ON DELETE RESTRICT,
          quantity integer NOT NULL CHECK (quantity > 0),
          created_at text NOT NULL,
          updated_at text NOT NULL,
          PRIMARY KEY (item_id, sppg_id)
        );

CREATE TABLE public."warehouse_asset_allocation_movement" (
          id text PRIMARY KEY NOT NULL,
          item_id text NOT NULL
            REFERENCES warehouse_item(id) ON DELETE RESTRICT,
          movement_type text NOT NULL
            CHECK (movement_type IN ('allocate', 'transfer', 'return')),
          from_sppg_id text
            REFERENCES sppg(id) ON DELETE SET NULL,
          from_sppg_name text,
          to_sppg_id text
            REFERENCES sppg(id) ON DELETE SET NULL,
          to_sppg_name text,
          quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
          note text NOT NULL DEFAULT '' CHECK (length(note) <= 500),
          created_at text NOT NULL,
          created_by text, transaction_date text NOT NULL DEFAULT '',
          CHECK (
            (movement_type = 'allocate' AND from_sppg_id IS NULL AND from_sppg_name IS NULL AND to_sppg_name IS NOT NULL) OR
            (movement_type = 'transfer' AND from_sppg_name IS NOT NULL AND to_sppg_name IS NOT NULL) OR
            (movement_type = 'return' AND from_sppg_name IS NOT NULL AND to_sppg_id IS NULL AND to_sppg_name IS NULL)
          )
        );

CREATE TABLE public."role_permissions" (
          role text PRIMARY KEY NOT NULL
            CHECK (role IN ('supervisor', 'user')),
          can_manage_directory integer NOT NULL DEFAULT 0
            CHECK (can_manage_directory IN (0, 1)),
          can_manage_assets integer NOT NULL DEFAULT 0
            CHECK (can_manage_assets IN (0, 1)),
          can_manage_maintenance integer NOT NULL DEFAULT 0
            CHECK (can_manage_maintenance IN (0, 1))
        );

CREATE TABLE public."role_page_permissions" (
          role text NOT NULL
            REFERENCES role_permissions(role) ON DELETE CASCADE
            CHECK (role IN ('supervisor', 'user')),
          page text NOT NULL CHECK (
            page IN (
              'directory',
              'asset-recording',
              'asset-non-juknis',
              'asset-surat-edaran',
              'asset-completeness',
              'warehouse',
              'maintenance'
            )
          ),
          can_access integer NOT NULL DEFAULT 1
            CHECK (can_access IN (0, 1)),
          PRIMARY KEY (role, page)
        );

CREATE INDEX asset_import_row_batch_idx
          ON public."asset_import_row" (batch_id, source_row_number);
CREATE INDEX asset_inventory_sppg_id_idx
          ON public."asset_inventory" (sppg_id);
CREATE INDEX maintenance_schedule_assignee_id_idx
          ON public."maintenance_schedule_assignee" (assignee_id);
CREATE INDEX maintenance_schedule_date_idx
          ON public."maintenance_schedule" (scheduled_date);
CREATE INDEX maintenance_schedule_occurrence_date_idx
          ON public."maintenance_schedule_occurrence" (occurrence_date);
CREATE INDEX maintenance_schedule_sppg_idx
          ON public."maintenance_schedule" (sppg_id);
CREATE INDEX non_juknis_asset_sppg_id_idx
          ON public."non_juknis_asset_inventory" (sppg_id);
CREATE INDEX rab_proposal_created_at_idx
          ON public."rab_proposal" (created_at DESC);
CREATE INDEX rab_proposal_date_idx ON public."rab_proposal" (rab_date);
CREATE INDEX rab_proposal_sppg_idx ON public."rab_proposal" (sppg_id);
CREATE INDEX sppg_yayasan_id_idx ON public."sppg" (yayasan_id);
CREATE INDEX surat_edaran_asset_sppg_id_idx
          ON public."surat_edaran_asset_inventory" (sppg_id);
CREATE INDEX vehicle_inventory_sppg_id_idx
          ON public."vehicle_inventory" (sppg_id);
CREATE INDEX warehouse_asset_allocation_movement_created_idx
          ON public."warehouse_asset_allocation_movement" (created_at DESC, id DESC);
CREATE INDEX warehouse_asset_allocation_movement_item_idx
          ON public."warehouse_asset_allocation_movement" (item_id, created_at DESC);
CREATE INDEX warehouse_asset_allocation_movement_transaction_idx
          ON public."warehouse_asset_allocation_movement" (
            transaction_date DESC, created_at DESC, id DESC
          );
CREATE INDEX warehouse_asset_allocation_sppg_idx
          ON public."warehouse_asset_allocation" (sppg_id, item_id);
CREATE INDEX warehouse_item_kind_name_idx ON public.warehouse_item(kind, lower(name));
CREATE INDEX warehouse_movement_item_created_idx
          ON public."warehouse_movement" (item_id, created_at DESC);
CREATE INDEX warehouse_movement_transaction_idx
          ON public."warehouse_movement" (transaction_date DESC, created_at DESC, id DESC);
CREATE INDEX yayasan_nama_idx ON public."yayasan" (nama);
CREATE UNIQUE INDEX maintenance_assignee_name_role_ci_idx
  ON public.maintenance_assignee (lower(name), lower(role));

ALTER TABLE public."yayasan" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."yayasan" FROM anon, authenticated;
ALTER TABLE public."sppg" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."sppg" FROM anon, authenticated;
ALTER TABLE public."asset_inventory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."asset_inventory" FROM anon, authenticated;
ALTER TABLE public."vehicle_inventory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."vehicle_inventory" FROM anon, authenticated;
ALTER TABLE public."sppg_gas_installation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."sppg_gas_installation" FROM anon, authenticated;
ALTER TABLE public."sppg_electrical_installation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."sppg_electrical_installation" FROM anon, authenticated;
ALTER TABLE public."non_juknis_asset_inventory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."non_juknis_asset_inventory" FROM anon, authenticated;
ALTER TABLE public."surat_edaran_asset_inventory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."surat_edaran_asset_inventory" FROM anon, authenticated;
ALTER TABLE public."maintenance_assignee" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."maintenance_assignee" FROM anon, authenticated;
ALTER TABLE public."maintenance_schedule" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."maintenance_schedule" FROM anon, authenticated;
ALTER TABLE public."maintenance_schedule_assignee" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."maintenance_schedule_assignee" FROM anon, authenticated;
ALTER TABLE public."maintenance_schedule_need" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."maintenance_schedule_need" FROM anon, authenticated;
ALTER TABLE public."maintenance_schedule_occurrence" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."maintenance_schedule_occurrence" FROM anon, authenticated;
ALTER TABLE public."warehouse_item" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."warehouse_item" FROM anon, authenticated;
ALTER TABLE public."warehouse_movement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."warehouse_movement" FROM anon, authenticated;
ALTER TABLE public."rab_proposal" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."rab_proposal" FROM anon, authenticated;
ALTER TABLE public."rab_proposal_item" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."rab_proposal_item" FROM anon, authenticated;
ALTER TABLE public."asset_import_batch" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."asset_import_batch" FROM anon, authenticated;
ALTER TABLE public."asset_import_row" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."asset_import_row" FROM anon, authenticated;
ALTER TABLE public."warehouse_asset_allocation" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."warehouse_asset_allocation" FROM anon, authenticated;
ALTER TABLE public."warehouse_asset_allocation_movement" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."warehouse_asset_allocation_movement" FROM anon, authenticated;
ALTER TABLE public."role_permissions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."role_permissions" FROM anon, authenticated;
ALTER TABLE public."role_page_permissions" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."role_page_permissions" FROM anon, authenticated;


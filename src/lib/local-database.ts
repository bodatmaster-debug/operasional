import "server-only"

import { mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { DatabaseSync } from "node:sqlite"

const DATABASE_SCHEMA_VERSION = 40

declare global {
  var operasionalLocalDatabase: DatabaseSync | undefined
  var operasionalLocalDatabaseSchemaVersion: number | undefined
}

function initializeDatabase(db: DatabaseSync) {
  const { user_version: version } = db
    .prepare("PRAGMA user_version")
    .get() as { user_version: number }

  if (version > DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `Basis data lokal menggunakan versi skema ${version}, lebih baru dari versi aplikasi ${DATABASE_SCHEMA_VERSION}. Perbarui aplikasi tanpa menghapus file data.`,
    )
  }
  db.exec("PRAGMA foreign_keys = ON")
  if (version === DATABASE_SCHEMA_VERSION) return

  if (
    version !== 0 &&
    version !== 1 &&
    version !== 2 &&
    version !== 3 &&
    version !== 4 &&
    version !== 5 &&
    version !== 6 &&
    version !== 7 &&
    version !== 8 &&
    version !== 9 &&
    version !== 10 &&
    version !== 11 &&
    version !== 12 &&
    version !== 13 &&
    version !== 14 &&
    version !== 15 &&
    version !== 16 &&
    version !== 17 &&
    version !== 18 &&
    version !== 19 &&
    version !== 20 &&
    version !== 21 &&
    version !== 22 &&
    version !== 23 &&
    version !== 24 &&
    version !== 25 &&
    version !== 26 &&
    version !== 27 &&
    version !== 28 &&
    version !== 29 &&
    version !== 30 &&
    version !== 31 &&
    version !== 32 &&
    version !== 33 &&
    version !== 34 &&
    version !== 35 &&
    version !== 36 &&
    version !== 37 &&
    version !== 38 &&
    version !== 39
  ) {
    throw new Error(
      "Versi skema basis data lokal tidak dikenal. Data dipertahankan dan tidak diinisialisasi ulang.",
    )
  }
  if (version === 0) {
    const existingTables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1`,
      )
      .get()
    if (existingTables) {
      throw new Error(
        "Versi skema basis data lokal tidak dikenal. Data dipertahankan dan tidak diinisialisasi ulang.",
      )
    }
  }

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
  `)

  if (version === 0) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE account (
          id TEXT PRIMARY KEY NOT NULL,
          username TEXT NOT NULL COLLATE NOCASE UNIQUE
            CHECK (length(trim(username)) BETWEEN 3 AND 32),
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'user')),
          failed_login_attempts INTEGER NOT NULL DEFAULT 0
            CHECK (failed_login_attempts >= 0),
          locked_until INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE auth_session (
          token_hash TEXT PRIMARY KEY NOT NULL CHECK (length(token_hash) = 64),
          account_id TEXT NOT NULL REFERENCES account(id) ON DELETE CASCADE,
          created_at TEXT NOT NULL,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX auth_session_expiry_idx ON auth_session(expires_at);

        CREATE TABLE yayasan (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          nama TEXT NOT NULL CHECK (length(trim(nama)) > 0),
          ketua_yayasan TEXT NOT NULL CHECK (length(trim(ketua_yayasan)) > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE sppg (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          nama TEXT NOT NULL CHECK (length(trim(nama)) > 0),
          yayasan_id TEXT NOT NULL REFERENCES yayasan(id) ON DELETE RESTRICT,
          lokasi TEXT NOT NULL CHECK (length(trim(lokasi)) > 0),
          kepala_sppg TEXT NOT NULL CHECK (length(trim(kepala_sppg)) > 0),
          pic TEXT NOT NULL CHECK (length(trim(pic)) > 0),
          alamat TEXT NOT NULL CHECK (length(trim(alamat)) > 0),
          provinsi_kode TEXT NOT NULL CHECK (length(trim(provinsi_kode)) > 0),
          provinsi_nama TEXT NOT NULL CHECK (length(trim(provinsi_nama)) > 0),
          kabupaten_kode TEXT NOT NULL CHECK (length(trim(kabupaten_kode)) > 0),
          kabupaten_nama TEXT NOT NULL CHECK (length(trim(kabupaten_nama)) > 0),
          kecamatan_kode TEXT NOT NULL CHECK (length(trim(kecamatan_kode)) > 0),
          kecamatan_nama TEXT NOT NULL CHECK (length(trim(kecamatan_nama)) > 0),
          desa_kode TEXT NOT NULL CHECK (length(trim(desa_kode)) > 0),
          desa_nama TEXT NOT NULL CHECK (length(trim(desa_nama)) > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX yayasan_nama_idx ON yayasan(nama);
        CREATE INDEX sppg_yayasan_id_idx ON sppg(yayasan_id);

        PRAGMA user_version = 1;
      `)
      db.exec("COMMIT")
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }

  let { user_version: currentVersion } = db
    .prepare("PRAGMA user_version")
    .get() as { user_version: number }
  if (currentVersion === 1) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE asset_inventory (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id TEXT NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          catalog_id TEXT NOT NULL
            CHECK (length(trim(catalog_id)) BETWEEN 1 AND 120),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (sppg_id, catalog_id)
        );
        CREATE INDEX asset_inventory_sppg_id_idx
          ON asset_inventory(sppg_id);
        PRAGMA user_version = 2;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi aset lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 2
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 2) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE vehicle_inventory (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id TEXT NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          vehicle_type TEXT NOT NULL
            CHECK (vehicle_type IN ('R4', 'R3', 'R2', 'sampan', 'speedboat', 'sepeda')),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (sppg_id, vehicle_type)
        );
        CREATE INDEX vehicle_inventory_sppg_id_idx
          ON vehicle_inventory(sppg_id);
        PRAGMA user_version = 3;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi kendaraan lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 3
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 3) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE vehicle_inventory_v4 (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id TEXT NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          vehicle_type TEXT NOT NULL
            CHECK (vehicle_type IN ('R4', 'R3', 'R2', 'sampan', 'speedboat', 'sepeda')),
          vehicle_subtype TEXT NOT NULL
            CHECK (length(trim(vehicle_subtype)) BETWEEN 1 AND 100),
          vehicle_make TEXT NOT NULL
            CHECK (length(trim(vehicle_make)) BETWEEN 1 AND 100),
          vehicle_model TEXT NOT NULL
            CHECK (length(trim(vehicle_model)) BETWEEN 1 AND 100),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE (
            sppg_id,
            vehicle_type,
            vehicle_subtype,
            vehicle_make,
            vehicle_model
          )
        );
        INSERT INTO vehicle_inventory_v4 (
          id, sppg_id, vehicle_type, vehicle_subtype, vehicle_make,
          vehicle_model, quantity, created_at, updated_at
        )
        SELECT id, sppg_id, vehicle_type, 'Belum dicatat', 'Belum dicatat',
          'Belum dicatat', quantity, created_at, updated_at
        FROM vehicle_inventory;
        DROP TABLE vehicle_inventory;
        ALTER TABLE vehicle_inventory_v4 RENAME TO vehicle_inventory;
        CREATE INDEX vehicle_inventory_sppg_id_idx
          ON vehicle_inventory(sppg_id);
        PRAGMA user_version = 4;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi detail kendaraan lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 4
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 4) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE asset_inventory
          ADD COLUMN asset_type TEXT NOT NULL DEFAULT ''
          CHECK (length(trim(asset_type)) <= 100);
        ALTER TABLE asset_inventory
          ADD COLUMN asset_brand TEXT NOT NULL DEFAULT ''
          CHECK (length(trim(asset_brand)) <= 100);
        PRAGMA user_version = 5;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi detail aset lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 5
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 5) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE sppg_gas_installation (
          sppg_id TEXT PRIMARY KEY NOT NULL
            REFERENCES sppg(id) ON DELETE RESTRICT,
          safety_system_present INTEGER NOT NULL
            CHECK (safety_system_present IN (0, 1)),
          high_pressure_present INTEGER NOT NULL
            CHECK (high_pressure_present IN (0, 1)),
          high_pressure_line_count INTEGER,
          low_pressure_present INTEGER NOT NULL
            CHECK (low_pressure_present IN (0, 1)),
          low_pressure_line_count INTEGER,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
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
        PRAGMA user_version = 6;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi konfigurasi instalasi gas lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 6
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 6) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE sppg_electrical_installation (
          sppg_id TEXT PRIMARY KEY NOT NULL
            REFERENCES sppg(id) ON DELETE RESTRICT,
          pln_capacity_va INTEGER NOT NULL
            CHECK (pln_capacity_va > 0),
          generator_present INTEGER NOT NULL
            CHECK (generator_present IN (0, 1)),
          generator_capacity_kva REAL,
          generator_brand TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
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
        PRAGMA user_version = 7;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi konfigurasi instalasi listrik lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 7
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 7) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE sppg
          ADD COLUMN jumlah_penerima_manfaat INTEGER
          CHECK (
            jumlah_penerima_manfaat IS NULL OR
            jumlah_penerima_manfaat BETWEEN 1 AND 1000000
          );
        PRAGMA user_version = 8;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi jumlah penerima manfaat lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = (
        db.prepare("PRAGMA user_version").get() as { user_version: number }
      ).user_version
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 8) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE non_juknis_asset_inventory (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id TEXT NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          category TEXT NOT NULL CHECK (
            category IN (
              'Peralatan dapur',
              'Peralatan operasional',
              'Peralatan kantor',
              'Instalasi gas'
            )
          ),
          item_name TEXT NOT NULL
            CHECK (length(trim(item_name)) BETWEEN 1 AND 100),
          asset_type TEXT NOT NULL
            CHECK (length(trim(asset_type)) BETWEEN 1 AND 100),
          asset_brand TEXT NOT NULL
            CHECK (length(trim(asset_brand)) BETWEEN 1 AND 100),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX non_juknis_asset_sppg_id_idx
          ON non_juknis_asset_inventory(sppg_id);
        PRAGMA user_version = 9;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi aset non-juknis lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 9
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 9) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE surat_edaran_asset_inventory (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id TEXT NOT NULL REFERENCES sppg(id) ON DELETE RESTRICT,
          category TEXT NOT NULL CHECK (
            category IN (
              'Peralatan dapur',
              'Peralatan operasional',
              'Peralatan kantor',
              'Instalasi gas'
            )
          ),
          item_name TEXT NOT NULL
            CHECK (length(trim(item_name)) BETWEEN 1 AND 100),
          asset_type TEXT NOT NULL
            CHECK (length(trim(asset_type)) BETWEEN 1 AND 100),
          asset_brand TEXT NOT NULL
            CHECK (length(trim(asset_brand)) BETWEEN 1 AND 100),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 0 AND 1000000),
          surat_edaran_number TEXT NOT NULL
            CHECK (length(trim(surat_edaran_number)) BETWEEN 1 AND 120),
          surat_edaran_year INTEGER NOT NULL
            CHECK (surat_edaran_year BETWEEN 1 AND 9999),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX surat_edaran_asset_sppg_id_idx
          ON surat_edaran_asset_inventory(sppg_id);
        PRAGMA user_version = 10;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi aset Surat Edaran lokal menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 10
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 10) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE surat_edaran_asset_inventory
          ADD COLUMN acuan_quantity INTEGER
          CHECK (
            acuan_quantity IS NULL OR
            acuan_quantity BETWEEN 0 AND 1000000
          );
        ALTER TABLE surat_edaran_asset_inventory
          ADD COLUMN acuan_unit TEXT
          CHECK (
            acuan_unit IS NULL OR
            length(trim(acuan_unit)) BETWEEN 1 AND 100
          );
        PRAGMA user_version = 11;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi jumlah acuan Surat Edaran menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 11
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 11) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE surat_edaran_asset_inventory
          ADD COLUMN actual_unit TEXT NOT NULL DEFAULT ''
          CHECK (length(trim(actual_unit)) <= 100);
        PRAGMA user_version = 12;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi satuan aktual Surat Edaran menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 12
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 12) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE maintenance_assignee (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
          role TEXT NOT NULL CHECK (length(trim(role)) BETWEEN 1 AND 100),
          created_at TEXT NOT NULL,
          UNIQUE (name COLLATE NOCASE, role COLLATE NOCASE)
        );

        CREATE TABLE maintenance_schedule (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          sppg_id TEXT REFERENCES sppg(id) ON DELETE SET NULL,
          sppg_name TEXT NOT NULL CHECK (length(trim(sppg_name)) BETWEEN 1 AND 160),
          asset_source TEXT NOT NULL CHECK (
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
          asset_record_id TEXT NOT NULL
            CHECK (length(trim(asset_record_id)) BETWEEN 1 AND 120),
          asset_category TEXT NOT NULL
            CHECK (length(trim(asset_category)) BETWEEN 1 AND 100),
          asset_name TEXT NOT NULL
            CHECK (length(trim(asset_name)) BETWEEN 1 AND 160),
          asset_details TEXT NOT NULL DEFAULT ''
            CHECK (length(asset_details) <= 500),
          maintenance_type TEXT NOT NULL
            CHECK (maintenance_type IN ('routine', 'repair')),
          notes TEXT NOT NULL CHECK (length(trim(notes)) BETWEEN 1 AND 1000),
          scheduled_date TEXT NOT NULL
            CHECK (length(scheduled_date) = 10),
          recurrence TEXT NOT NULL
            CHECK (recurrence IN ('none', 'custom', 'weekly', 'monthly', 'yearly')),
          recurrence_days INTEGER,
          created_by TEXT REFERENCES account(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL,
          CHECK (
            (maintenance_type = 'repair' AND recurrence = 'none' AND
              recurrence_days IS NULL) OR
            (maintenance_type = 'routine' AND
              ((recurrence = 'custom' AND recurrence_days BETWEEN 1 AND 36500) OR
               (recurrence IN ('none', 'weekly', 'monthly', 'yearly') AND
                recurrence_days IS NULL)))
          )
        );
        CREATE INDEX maintenance_schedule_date_idx
          ON maintenance_schedule(scheduled_date);
        CREATE INDEX maintenance_schedule_sppg_idx
          ON maintenance_schedule(sppg_id);

        CREATE TABLE maintenance_schedule_assignee (
          schedule_id TEXT NOT NULL
            REFERENCES maintenance_schedule(id) ON DELETE CASCADE,
          assignee_id TEXT NOT NULL
            REFERENCES maintenance_assignee(id) ON DELETE RESTRICT,
          PRIMARY KEY (schedule_id, assignee_id)
        );
        CREATE INDEX maintenance_schedule_assignee_id_idx
          ON maintenance_schedule_assignee(assignee_id);

        PRAGMA user_version = 13;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi jadwal pemeliharaan menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 13
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 13) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE maintenance_assignee
          ADD COLUMN phone TEXT NOT NULL DEFAULT ''
          CHECK (length(phone) <= 32);
        PRAGMA user_version = 14;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi nomor telepon petugas menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 14
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 14) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE account_profile (
          account_id TEXT PRIMARY KEY NOT NULL
            REFERENCES account(id) ON DELETE CASCADE,
          email TEXT
            CHECK (email IS NULL OR length(email) BETWEEN 1 AND 254),
          avatar_data BLOB
            CHECK (
              avatar_data IS NULL OR
              length(avatar_data) BETWEEN 1 AND 5242880
            ),
          avatar_mime_type TEXT
            CHECK (
              avatar_mime_type IS NULL OR
              avatar_mime_type IN ('image/jpeg', 'image/png', 'image/webp')
            ),
          updated_at TEXT NOT NULL,
          CHECK (
            (avatar_data IS NULL AND avatar_mime_type IS NULL) OR
            (avatar_data IS NOT NULL AND avatar_mime_type IS NOT NULL)
          )
        );
        PRAGMA user_version = 15;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi profil akun menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 15
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 15) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE account_profile
          ADD COLUMN email_verified_at TEXT;
        CREATE TABLE account_email_change (
          account_id TEXT PRIMARY KEY NOT NULL
            REFERENCES account(id) ON DELETE CASCADE,
          previous_email TEXT
            CHECK (previous_email IS NULL OR length(previous_email) BETWEEN 1 AND 254),
          pending_email TEXT
            CHECK (pending_email IS NULL OR length(pending_email) BETWEEN 1 AND 254),
          code_salt TEXT,
          code_hash TEXT,
          expires_at TEXT,
          last_sent_at TEXT,
          attempts INTEGER NOT NULL DEFAULT 0
            CHECK (attempts BETWEEN 0 AND 5),
          window_started_at TEXT NOT NULL,
          sends_in_window INTEGER NOT NULL DEFAULT 0
            CHECK (sends_in_window BETWEEN 0 AND 3),
          status TEXT NOT NULL
            CHECK (status IN ('pending', 'completed', 'cancelled', 'locked')),
          CHECK (
            status != 'pending' OR
            (
              code_salt IS NOT NULL AND
              code_hash IS NOT NULL AND
              expires_at IS NOT NULL AND
              last_sent_at IS NOT NULL AND
              (previous_email IS NOT NULL OR pending_email IS NOT NULL)
            )
          )
        );
        PRAGMA user_version = 16;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi verifikasi email akun menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 16
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 16) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE maintenance_schedule_need (
          schedule_id TEXT NOT NULL
            REFERENCES maintenance_schedule(id) ON DELETE CASCADE,
          position INTEGER NOT NULL CHECK (position >= 0),
          name TEXT NOT NULL
            CHECK (length(trim(name)) BETWEEN 1 AND 120),
          quantity REAL NOT NULL CHECK (quantity > 0),
          unit TEXT NOT NULL
            CHECK (length(trim(unit)) BETWEEN 1 AND 32),
          notes TEXT NOT NULL DEFAULT ''
            CHECK (length(notes) <= 500),
          PRIMARY KEY (schedule_id, position)
        );
        PRAGMA user_version = 17;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi kebutuhan jadwal pemeliharaan menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 17
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 17) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE asset_inventory
          ADD COLUMN asset_condition TEXT CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          );
        ALTER TABLE vehicle_inventory
          ADD COLUMN asset_condition TEXT CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          );
        ALTER TABLE non_juknis_asset_inventory
          ADD COLUMN asset_condition TEXT CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          );
        ALTER TABLE surat_edaran_asset_inventory
          ADD COLUMN asset_condition TEXT CHECK (
            asset_condition IS NULL OR
            asset_condition IN ('good', 'service_required', 'broken')
          );
        PRAGMA user_version = 18;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi kondisi aset menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 18
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 18) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE account_profile
          ADD COLUMN full_name TEXT
          CHECK (full_name IS NULL OR length(trim(full_name)) BETWEEN 2 AND 100);

        CREATE TABLE account_permissions (
          account_id TEXT PRIMARY KEY NOT NULL
            REFERENCES account(id) ON DELETE CASCADE,
          can_manage_directory INTEGER NOT NULL DEFAULT 0
            CHECK (can_manage_directory IN (0, 1)),
          can_manage_assets INTEGER NOT NULL DEFAULT 0
            CHECK (can_manage_assets IN (0, 1)),
          can_manage_maintenance INTEGER NOT NULL DEFAULT 0
            CHECK (can_manage_maintenance IN (0, 1))
        );
        INSERT INTO account_permissions (account_id)
          SELECT id FROM account;
        UPDATE account_permissions
          SET can_manage_directory = 1,
              can_manage_assets = 1,
              can_manage_maintenance = 1
          WHERE account_id IN (SELECT id FROM account WHERE role = 'admin');

        CREATE TABLE account_registration (
          id TEXT PRIMARY KEY NOT NULL,
          full_name TEXT NOT NULL CHECK (length(trim(full_name)) BETWEEN 2 AND 100),
          username TEXT NOT NULL COLLATE NOCASE
            CHECK (length(trim(username)) BETWEEN 3 AND 32),
          email TEXT NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
          password_hash TEXT NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
          created_at TEXT NOT NULL,
          reviewed_at TEXT,
          reviewed_by TEXT REFERENCES account(id) ON DELETE SET NULL
        );
        CREATE UNIQUE INDEX account_registration_pending_username_idx
          ON account_registration(username COLLATE NOCASE)
          WHERE status = 'pending';
        CREATE UNIQUE INDEX account_registration_pending_email_idx
          ON account_registration(email COLLATE NOCASE)
          WHERE status = 'pending';
        PRAGMA user_version = 19;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi persetujuan akun menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 19
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 19) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE role_permissions (
          role TEXT PRIMARY KEY NOT NULL
            CHECK (role IN ('supervisor', 'user')),
          can_manage_directory INTEGER NOT NULL DEFAULT 0
            CHECK (can_manage_directory IN (0, 1)),
          can_manage_assets INTEGER NOT NULL DEFAULT 0
            CHECK (can_manage_assets IN (0, 1)),
          can_manage_maintenance INTEGER NOT NULL DEFAULT 0
            CHECK (can_manage_maintenance IN (0, 1))
        );
        INSERT INTO role_permissions (role) VALUES ('supervisor'), ('user');
        PRAGMA user_version = 20;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi hak akses per peran menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 20
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 20) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE account_registration
          ADD COLUMN google_sub TEXT
          CHECK (
            google_sub IS NULL OR
            length(trim(google_sub)) BETWEEN 1 AND 255
          );
        CREATE UNIQUE INDEX account_registration_pending_google_sub_idx
          ON account_registration(google_sub)
          WHERE status = 'pending' AND google_sub IS NOT NULL;
        CREATE TABLE account_google_identity (
          google_sub TEXT PRIMARY KEY NOT NULL
            CHECK (length(trim(google_sub)) BETWEEN 1 AND 255),
          account_id TEXT NOT NULL UNIQUE
            REFERENCES account(id) ON DELETE CASCADE,
          email TEXT NOT NULL
            CHECK (length(trim(email)) BETWEEN 3 AND 254),
          linked_at TEXT NOT NULL
        );
        PRAGMA user_version = 21;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi identitas Google menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 21
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 21) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE account_registration
          ADD COLUMN eula_version TEXT
          CHECK (
            eula_version IS NULL OR
            length(trim(eula_version)) BETWEEN 1 AND 32
          );
        ALTER TABLE account_registration
          ADD COLUMN eula_accepted_at TEXT
          CHECK (
            eula_accepted_at IS NULL OR
            length(trim(eula_accepted_at)) BETWEEN 20 AND 40
          );
        PRAGMA user_version = 22;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi persetujuan EULA menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 22
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 22) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE warehouse_item (
          id TEXT PRIMARY KEY NOT NULL,
          kind TEXT NOT NULL CHECK (kind IN ('asset', 'spare-part')),
          name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
          unit TEXT NOT NULL CHECK (length(trim(unit)) BETWEEN 1 AND 32),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX warehouse_item_kind_name_idx
          ON warehouse_item(kind, name COLLATE NOCASE);

        CREATE TABLE warehouse_movement (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL
            REFERENCES warehouse_item(id) ON DELETE RESTRICT,
          movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
          note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
          created_at TEXT NOT NULL,
          created_by TEXT REFERENCES account(id) ON DELETE SET NULL
        );
        CREATE INDEX warehouse_movement_item_created_idx
          ON warehouse_movement(item_id, created_at DESC);
        PRAGMA user_version = 23;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 23
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 23) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE role_page_permissions (
          role TEXT NOT NULL
            REFERENCES role_permissions(role) ON DELETE CASCADE
            CHECK (role IN ('supervisor', 'user')),
          page TEXT NOT NULL CHECK (
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
          can_access INTEGER NOT NULL DEFAULT 1
            CHECK (can_access IN (0, 1)),
          PRIMARY KEY (role, page)
        );
        INSERT INTO role_page_permissions (role, page)
        SELECT role, page FROM role_permissions
        CROSS JOIN (
          SELECT 'directory' AS page
          UNION ALL SELECT 'asset-recording'
          UNION ALL SELECT 'asset-non-juknis'
          UNION ALL SELECT 'asset-surat-edaran'
          UNION ALL SELECT 'asset-completeness'
          UNION ALL SELECT 'warehouse'
          UNION ALL SELECT 'maintenance'
        );
        PRAGMA user_version = 24;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi izin halaman menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 24
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 24) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE maintenance_schedule_occurrence (
          schedule_id TEXT NOT NULL
            REFERENCES maintenance_schedule(id) ON DELETE CASCADE,
          occurrence_date TEXT NOT NULL CHECK (length(occurrence_date) = 10),
          status TEXT NOT NULL
            CHECK (status IN ('completed', 'dismissed')),
          updated_by TEXT REFERENCES account(id) ON DELETE SET NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (schedule_id, occurrence_date)
        );
        CREATE INDEX maintenance_schedule_occurrence_date_idx
          ON maintenance_schedule_occurrence(occurrence_date);
        PRAGMA user_version = 25;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi status occurrence pemeliharaan menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 25
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 25) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE rab_proposal (
          id TEXT PRIMARY KEY NOT NULL CHECK (length(trim(id)) > 0),
          rab_date TEXT NOT NULL CHECK (length(rab_date) = 10),
          sppg_id TEXT REFERENCES sppg(id) ON DELETE SET NULL,
          sppg_name TEXT NOT NULL
            CHECK (length(trim(sppg_name)) BETWEEN 1 AND 160),
          assignee_id TEXT NOT NULL
            REFERENCES maintenance_assignee(id) ON DELETE RESTRICT,
          assignee_name TEXT NOT NULL
            CHECK (length(trim(assignee_name)) BETWEEN 1 AND 120),
          created_by TEXT REFERENCES account(id) ON DELETE SET NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX rab_proposal_created_at_idx
          ON rab_proposal(created_at DESC);
        CREATE INDEX rab_proposal_sppg_idx ON rab_proposal(sppg_id);

        CREATE TABLE rab_proposal_item (
          rab_id TEXT NOT NULL
            REFERENCES rab_proposal(id) ON DELETE CASCADE,
          position INTEGER NOT NULL CHECK (position >= 0),
          name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
          estimated_unit_cost INTEGER NOT NULL
            CHECK (estimated_unit_cost > 0),
          PRIMARY KEY (rab_id, position)
        );
        PRAGMA user_version = 26;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi RAB menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 26
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 26) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE rab_proposal
          ADD COLUMN rab_date TEXT NOT NULL DEFAULT '1970-01-01'
          CHECK (length(rab_date) = 10);
        UPDATE rab_proposal
        SET rab_date = substr(created_at, 1, 10);
        CREATE INDEX rab_proposal_date_idx ON rab_proposal(rab_date);
        PRAGMA user_version = 27;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi tanggal RAB menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 27
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 27) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE rab_proposal
          ADD COLUMN notes TEXT NOT NULL DEFAULT ''
          CHECK (length(notes) <= 1000);
        PRAGMA user_version = 28;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi keterangan RAB menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 28
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 28) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE rab_proposal_item
          ADD COLUMN unit TEXT NOT NULL DEFAULT ''
          CHECK (length(trim(unit)) <= 40);
        PRAGMA user_version = 29;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi satuan item RAB menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 29
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 29) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE asset_import_batch (
          id TEXT PRIMARY KEY NOT NULL,
          source_filename TEXT NOT NULL
            CHECK (length(trim(source_filename)) BETWEEN 1 AND 255),
          created_by_username TEXT NOT NULL
            CHECK (length(trim(created_by_username)) BETWEEN 1 AND 32),
          created_at TEXT NOT NULL
        );

        CREATE TABLE asset_import_row (
          id TEXT PRIMARY KEY NOT NULL,
          batch_id TEXT NOT NULL
            REFERENCES asset_import_batch(id) ON DELETE CASCADE,
          source_row_number INTEGER NOT NULL
            CHECK (source_row_number BETWEEN 1 AND 100000),
          asset_name TEXT NOT NULL
            CHECK (length(trim(asset_name)) BETWEEN 1 AND 200),
          quantity INTEGER NOT NULL
            CHECK (quantity BETWEEN 1 AND 1000000),
          unit TEXT NOT NULL DEFAULT ''
            CHECK (length(unit) <= 40),
          category TEXT NOT NULL DEFAULT ''
            CHECK (length(category) <= 100),
          acquisition_value INTEGER
            CHECK (
              acquisition_value IS NULL OR
              acquisition_value BETWEEN 0 AND 1000000000000
            ),
          notes TEXT NOT NULL DEFAULT ''
            CHECK (length(notes) <= 1000),
          created_at TEXT NOT NULL,
          UNIQUE (batch_id, source_row_number)
        );

        CREATE INDEX asset_import_row_batch_idx
          ON asset_import_row (batch_id, source_row_number);

        PRAGMA user_version = 30;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi staging impor aset menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 30
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 30) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        CREATE TABLE warehouse_asset_allocation (
          item_id TEXT NOT NULL
            REFERENCES warehouse_item(id) ON DELETE RESTRICT,
          sppg_id TEXT NOT NULL
            REFERENCES sppg(id) ON DELETE RESTRICT,
          quantity INTEGER NOT NULL CHECK (quantity > 0),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (item_id, sppg_id)
        );
        CREATE INDEX warehouse_asset_allocation_sppg_idx
          ON warehouse_asset_allocation(sppg_id, item_id);

        CREATE TABLE warehouse_asset_allocation_movement (
          id TEXT PRIMARY KEY NOT NULL,
          item_id TEXT NOT NULL
            REFERENCES warehouse_item(id) ON DELETE RESTRICT,
          movement_type TEXT NOT NULL
            CHECK (movement_type IN ('allocate', 'transfer', 'return')),
          from_sppg_id TEXT
            REFERENCES sppg(id) ON DELETE SET NULL,
          from_sppg_name TEXT,
          to_sppg_id TEXT
            REFERENCES sppg(id) ON DELETE SET NULL,
          to_sppg_name TEXT,
          quantity INTEGER NOT NULL CHECK (quantity BETWEEN 1 AND 1000000),
          note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
          created_at TEXT NOT NULL,
          created_by TEXT REFERENCES account(id) ON DELETE SET NULL,
          CHECK (
            (movement_type = 'allocate' AND from_sppg_id IS NULL AND from_sppg_name IS NULL AND to_sppg_name IS NOT NULL) OR
            (movement_type = 'transfer' AND from_sppg_name IS NOT NULL AND to_sppg_name IS NOT NULL) OR
            (movement_type = 'return' AND from_sppg_name IS NOT NULL AND to_sppg_id IS NULL AND to_sppg_name IS NULL)
          )
        );
        CREATE INDEX warehouse_asset_allocation_movement_created_idx
          ON warehouse_asset_allocation_movement(created_at DESC, id DESC);
        CREATE INDEX warehouse_asset_allocation_movement_item_idx
          ON warehouse_asset_allocation_movement(item_id, created_at DESC);

        PRAGMA user_version = 31;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi alokasi aset gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 31
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 31) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_item
          ADD COLUMN asset_category TEXT
          CHECK (
            asset_category IS NULL OR
            asset_category IN ('juknis', 'non-juknis', 'surat-edaran')
          );
        PRAGMA user_version = 32;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi kategori aset gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 32
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 32) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_item
          ADD COLUMN asset_catalog_id TEXT
          CHECK (
            asset_catalog_id IS NULL OR
            length(trim(asset_catalog_id)) BETWEEN 1 AND 100
          );
        PRAGMA user_version = 33;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi rujukan Juknis stok gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 33
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 33) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_item
          ADD COLUMN asset_subcategory TEXT
          CHECK (
            asset_subcategory IS NULL OR
            asset_subcategory IN (
              'Peralatan dapur',
              'Peralatan operasional',
              'Peralatan kantor',
              'Instalasi gas'
            )
          );
        PRAGMA user_version = 34;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi kategori aset gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 34
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 34) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_item
          ADD COLUMN asset_type TEXT
          CHECK (
            asset_type IS NULL OR
            length(trim(asset_type)) <= 100
          );
        ALTER TABLE warehouse_item
          ADD COLUMN asset_brand TEXT
          CHECK (
            asset_brand IS NULL OR
            length(trim(asset_brand)) <= 100
          );
        PRAGMA user_version = 35;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi tipe dan merek aset gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 35
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 35) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_item
          ADD COLUMN storage_period_months INTEGER
          CHECK (
            storage_period_months IS NULL OR
            storage_period_months BETWEEN 1 AND 1200
          );
        PRAGMA user_version = 36;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi jangka masa simpan spare part menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 36
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 36) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_item
          ADD COLUMN compatible_asset_item_id TEXT
          REFERENCES warehouse_item(id) ON DELETE RESTRICT;
        PRAGMA user_version = 37;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi relasi spare part dan item aset menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 37
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 37) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE warehouse_movement
          ADD COLUMN transaction_date TEXT NOT NULL DEFAULT '';
        UPDATE warehouse_movement
          SET transaction_date = date(created_at, 'localtime');
        CREATE INDEX warehouse_movement_transaction_idx
          ON warehouse_movement(transaction_date DESC, created_at DESC, id DESC);

        ALTER TABLE warehouse_asset_allocation_movement
          ADD COLUMN transaction_date TEXT NOT NULL DEFAULT '';
        UPDATE warehouse_asset_allocation_movement
          SET transaction_date = date(created_at, 'localtime');
        CREATE INDEX warehouse_asset_allocation_movement_transaction_idx
          ON warehouse_asset_allocation_movement(
            transaction_date DESC, created_at DESC, id DESC
          );

        PRAGMA user_version = 38;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi tanggal transaksi gudang menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 38
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 38) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE yayasan
          ADD COLUMN alamat_yayasan TEXT NOT NULL DEFAULT ''
          CHECK (length(alamat_yayasan) <= 1000);
        ALTER TABLE yayasan
          ADD COLUMN nomor_telepon_yayasan TEXT NOT NULL DEFAULT ''
          CHECK (length(nomor_telepon_yayasan) <= 32);
        ALTER TABLE yayasan
          ADD COLUMN alamat_ketua_yayasan TEXT NOT NULL DEFAULT ''
          CHECK (length(alamat_ketua_yayasan) <= 1000);
        ALTER TABLE yayasan
          ADD COLUMN nomor_telepon_ketua_yayasan TEXT NOT NULL DEFAULT ''
          CHECK (length(nomor_telepon_ketua_yayasan) <= 32);
        ALTER TABLE yayasan
          ADD COLUMN logo_data BLOB
          CHECK (
            logo_data IS NULL OR
            length(logo_data) BETWEEN 1 AND 5242880
          );
        ALTER TABLE yayasan
          ADD COLUMN logo_mime_type TEXT
          CHECK (
            logo_mime_type IS NULL OR
            logo_mime_type IN (
              'image/jpeg', 'image/png', 'image/webp', 'image/avif'
            )
          );
        ALTER TABLE yayasan
          ADD COLUMN ketua_foto_data BLOB
          CHECK (
            ketua_foto_data IS NULL OR
            length(ketua_foto_data) BETWEEN 1 AND 5242880
          );
        ALTER TABLE yayasan
          ADD COLUMN ketua_foto_mime_type TEXT
          CHECK (
            ketua_foto_mime_type IS NULL OR
            ketua_foto_mime_type IN (
              'image/jpeg', 'image/png', 'image/webp', 'image/avif'
            )
          );
        PRAGMA user_version = 39;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi detail Yayasan menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 39
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion === 39) {
    db.exec("BEGIN IMMEDIATE")
    try {
      db.exec(`
        ALTER TABLE account
          ADD COLUMN access_revoked_at TEXT;
        ALTER TABLE account
          ADD COLUMN banned_until INTEGER
          CHECK (banned_until IS NULL OR banned_until > 0);
        PRAGMA user_version = 40;
      `)
      if (db.prepare("PRAGMA foreign_key_check").all().length > 0) {
        throw new Error(
          "Migrasi status akses akun menghasilkan relasi SQLite yang tidak valid.",
        )
      }
      db.exec("COMMIT")
      currentVersion = 40
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
  }
  if (currentVersion !== DATABASE_SCHEMA_VERSION) {
    throw new Error(
      "Versi skema basis data lokal tidak dikenal. Data dipertahankan dan tidak diinisialisasi ulang.",
    )
  }
}

export function getLocalDatabase() {
  if (globalThis.operasionalLocalDatabase) {
    if (
      globalThis.operasionalLocalDatabaseSchemaVersion !==
      DATABASE_SCHEMA_VERSION
    ) {
      initializeDatabase(globalThis.operasionalLocalDatabase)
      globalThis.operasionalLocalDatabaseSchemaVersion =
        DATABASE_SCHEMA_VERSION
    }
    return globalThis.operasionalLocalDatabase
  }

  const path = join(process.cwd(), "data", "operations.sqlite")
  mkdirSync(dirname(path), { recursive: true })
  const db = new DatabaseSync(path, { timeout: 5_000 })
  try {
    initializeDatabase(db)
    globalThis.operasionalLocalDatabase = db
    globalThis.operasionalLocalDatabaseSchemaVersion = DATABASE_SCHEMA_VERSION
    return db
  } catch (error) {
    db.close()
    throw error
  }
}

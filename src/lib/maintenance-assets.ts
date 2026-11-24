import "server-only"

import type { DatabaseSync } from "node:sqlite"
import { getAssetCatalogItem } from "@/lib/asset-catalog"
import type {
  MaintenanceAssetOption,
  MaintenanceAssetSource,
} from "@/lib/maintenance"

type AssetRow = {
  id: string
  quantity: number
  asset_type: string
  asset_brand: string
  catalog_id?: string
  category?: string
  item_name?: string
  actual_unit?: string
  surat_edaran_number?: string
  surat_edaran_year?: number
  vehicle_type?: string
  vehicle_subtype?: string
  vehicle_make?: string
  vehicle_model?: string
}

function details(...values: (string | null | undefined)[]) {
  return values.map((value) => value?.trim()).filter(Boolean).join(" · ")
}

function makeOption(
  row: AssetRow,
  source: MaintenanceAssetSource,
  category: string,
  name: string,
  detail: string,
  unit = "unit",
): MaintenanceAssetOption {
  return {
    id: row.id,
    source,
    category,
    name,
    details: detail,
    quantity: Number(row.quantity),
    unit,
  }
}

export function getMaintenanceAssets(db: DatabaseSync, sppgId: string) {
  const options: MaintenanceAssetOption[] = []
  const catalogRecords = db
    .prepare(
      `SELECT id, catalog_id, quantity, asset_type, asset_brand
       FROM asset_inventory WHERE sppg_id = ? AND quantity > 0`,
    )
    .all(sppgId) as AssetRow[]
  for (const row of catalogRecords) {
    const item = row.catalog_id
      ? getAssetCatalogItem(row.catalog_id)
      : undefined
    if (!item) continue
    options.push(
      makeOption(
        row,
        "juknis",
        item.category,
        item.name,
        details(row.asset_type, row.asset_brand),
        item.unit,
      ),
    )
  }

  const nonJuknisRecords = db
    .prepare(
      `SELECT id, category, item_name, asset_type, asset_brand, quantity
       FROM non_juknis_asset_inventory
       WHERE sppg_id = ? AND quantity > 0`,
    )
    .all(sppgId) as AssetRow[]
  for (const row of nonJuknisRecords) {
    options.push(
      makeOption(
        row,
        "non-juknis",
        row.category ?? "Aset non-Juknis",
        row.item_name ?? "Aset",
        details(row.asset_type, row.asset_brand),
      ),
    )
  }

  const circularRecords = db
    .prepare(
      `SELECT id, category, item_name, asset_type, asset_brand, quantity,
              actual_unit, surat_edaran_number, surat_edaran_year
       FROM surat_edaran_asset_inventory
       WHERE sppg_id = ? AND quantity > 0`,
    )
    .all(sppgId) as AssetRow[]
  for (const row of circularRecords) {
    options.push(
      makeOption(
        row,
        "surat-edaran",
        row.category ?? "Aset Surat Edaran",
        row.item_name ?? "Aset",
        details(
          row.asset_type,
          row.asset_brand,
          row.surat_edaran_number &&
            `SE ${row.surat_edaran_number}/${row.surat_edaran_year ?? ""}`,
        ),
        row.actual_unit || "unit",
      ),
    )
  }

  const vehicles = db
    .prepare(
      `SELECT id, vehicle_type, vehicle_subtype, vehicle_make, vehicle_model,
              quantity
       FROM vehicle_inventory WHERE sppg_id = ? AND quantity > 0`,
    )
    .all(sppgId) as AssetRow[]
  for (const row of vehicles) {
    options.push(
      makeOption(
        row,
        "vehicle",
        "Kendaraan",
        `${row.vehicle_type ?? "Kendaraan"} · ${row.vehicle_subtype ?? ""}`,
        details(row.vehicle_make, row.vehicle_model),
      ),
    )
  }

  const gas = db
    .prepare(
      `SELECT sppg_id, safety_system_present, high_pressure_present,
              high_pressure_line_count, low_pressure_present,
              low_pressure_line_count
       FROM sppg_gas_installation WHERE sppg_id = ?`,
    )
    .get(sppgId) as
    | {
        sppg_id: string
        safety_system_present: number
        high_pressure_present: number
        high_pressure_line_count: number | null
        low_pressure_present: number
        low_pressure_line_count: number | null
      }
    | undefined
  if (gas) {
    options.push(
      makeOption(
        { id: gas.sppg_id, quantity: 1, asset_type: "", asset_brand: "" },
        "gas-installation",
        "Instalasi gas",
        "Konfigurasi instalasi gas",
        details(
          `Sistem keselamatan: ${gas.safety_system_present ? "tercatat" : "tidak tercatat"}`,
          gas.high_pressure_present
            ? `Tekanan tinggi: ${gas.high_pressure_line_count} jalur`
            : "Tekanan tinggi: tidak ada",
          gas.low_pressure_present
            ? `Tekanan rendah: ${gas.low_pressure_line_count} jalur`
            : "Tekanan rendah: tidak ada",
        ),
        "konfigurasi",
      ),
    )
  }

  const electrical = db
    .prepare(
      `SELECT sppg_id, pln_capacity_va, generator_present,
              generator_capacity_kva, generator_brand
       FROM sppg_electrical_installation WHERE sppg_id = ?`,
    )
    .get(sppgId) as
    | {
        sppg_id: string
        pln_capacity_va: number
        generator_present: number
        generator_capacity_kva: number | null
        generator_brand: string | null
      }
    | undefined
  if (electrical) {
    options.push(
      makeOption(
        { id: electrical.sppg_id, quantity: 1, asset_type: "", asset_brand: "" },
        "electrical-installation",
        "Instalasi listrik",
        "Konfigurasi instalasi listrik",
        `${new Intl.NumberFormat("id-ID").format(electrical.pln_capacity_va)} VA`,
        "konfigurasi",
      ),
    )
    if (electrical.generator_present) {
      options.push(
        makeOption(
          { id: electrical.sppg_id, quantity: 1, asset_type: "", asset_brand: "" },
          "generator",
          "Genset",
          "Genset",
          details(
            electrical.generator_brand,
            electrical.generator_capacity_kva
              ? `${electrical.generator_capacity_kva} kVA`
              : undefined,
          ),
        ),
      )
    }
  }

  return options.sort(
    (a, b) =>
      a.category.localeCompare(b.category, "id") ||
      a.name.localeCompare(b.name, "id") ||
      a.details.localeCompare(b.details, "id"),
  )
}

export function findMaintenanceAsset(
  db: DatabaseSync,
  sppgId: string,
  source: MaintenanceAssetSource,
  recordId: string,
) {
  return getMaintenanceAssets(db, sppgId).find(
    (asset) => asset.source === source && asset.id === recordId,
  )
}

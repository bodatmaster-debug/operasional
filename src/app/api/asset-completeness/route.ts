import { NextResponse, type NextRequest } from "next/server"
import { assetCatalog } from "@/lib/asset-catalog"
import { calculateAssetCompleteness } from "@/lib/asset-completeness"
import { getVehicleTypeLabel, type VehicleType } from "@/lib/vehicle-types"
import { getLocalDatabase } from "@/lib/local-database"
import { isResponse, requireLocalPagePermission } from "@/lib/local-request"

const assetSourceOrder = new Map([
  ["Juknis", 0],
  ["Kendaraan", 1],
  ["Non-Juknis", 2],
  ["Surat Edaran", 3],
])

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-completeness")
  if (isResponse(user)) return user

  try {
    const db = getLocalDatabase()
    const detailSppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
    if (detailSppgId) {
      const sppg = db
        .prepare("SELECT id FROM sppg WHERE id = ?")
        .get(detailSppgId)
      if (!sppg) {
        return NextResponse.json({ error: "SPPG tidak ditemukan." }, { status: 404 })
      }

      const details = [
        ...(
          db
            .prepare(
              `SELECT id, catalog_id, quantity, asset_type, asset_brand,
                      asset_condition
               FROM asset_inventory
               WHERE sppg_id = ?`,
            )
            .all(detailSppgId) as {
            id: string
            catalog_id: string
            quantity: number
            asset_type: string
            asset_brand: string
            asset_condition: "good" | "service_required" | "broken" | null
          }[]
        ).map((record) => {
          const item = assetCatalog.find(
            (catalogItem) => catalogItem.catalogId === record.catalog_id,
          )
          return {
            id: record.id,
            source: "Juknis",
            category: item?.category ?? "Katalog tidak dikenal",
            name: item?.name ?? `Aset katalog ${record.catalog_id}`,
            type: record.asset_type,
            brand: record.asset_brand,
            quantity: record.quantity,
            unit: item?.unit ?? null,
            condition: record.asset_condition,
            reference: item?.sourceLabel ?? record.catalog_id,
          }
        }),
        ...(
          db
            .prepare(
              `SELECT id, vehicle_type, vehicle_subtype, vehicle_make,
                      vehicle_model, quantity, asset_condition
               FROM vehicle_inventory
               WHERE sppg_id = ?`,
            )
            .all(detailSppgId) as {
            id: string
            vehicle_type: VehicleType
            vehicle_subtype: string
            vehicle_make: string
            vehicle_model: string
            quantity: number
            asset_condition: "good" | "service_required" | "broken" | null
          }[]
        ).map((record) => ({
          id: record.id,
          source: "Kendaraan",
          category: "Kendaraan",
          name: `${getVehicleTypeLabel(record.vehicle_type)} · ${record.vehicle_make} ${record.vehicle_model}`,
          type: record.vehicle_subtype,
          brand: record.vehicle_make,
          quantity: record.quantity,
          unit: "unit",
          condition: record.asset_condition,
        })),
        ...(
          db
            .prepare(
              `SELECT id, category, item_name, asset_type, asset_brand,
                      quantity, asset_condition
               FROM non_juknis_asset_inventory
               WHERE sppg_id = ?`,
            )
            .all(detailSppgId) as {
            id: string
            category: string
            item_name: string
            asset_type: string
            asset_brand: string
            quantity: number
            asset_condition: "good" | "service_required" | "broken" | null
          }[]
        ).map((record) => ({
          id: record.id,
          source: "Non-Juknis",
          category: record.category,
          name: record.item_name,
          type: record.asset_type,
          brand: record.asset_brand,
          quantity: record.quantity,
          unit: null,
          condition: record.asset_condition,
        })),
        ...(
          db
            .prepare(
              `SELECT id, category, item_name, asset_type, asset_brand,
                      quantity, actual_unit, surat_edaran_number,
                      surat_edaran_year, asset_condition
               FROM surat_edaran_asset_inventory
               WHERE sppg_id = ?`,
            )
            .all(detailSppgId) as {
            id: string
            category: string
            item_name: string
            asset_type: string
            asset_brand: string
            quantity: number
            actual_unit: string | null
            surat_edaran_number: string
            surat_edaran_year: number
            asset_condition: "good" | "service_required" | "broken" | null
          }[]
        ).map((record) => ({
          id: record.id,
          source: "Surat Edaran",
          category: record.category,
          name: record.item_name,
          type: record.asset_type,
          brand: record.asset_brand,
          quantity: record.quantity,
          unit: record.actual_unit,
          condition: record.asset_condition,
          reference: `${record.surat_edaran_number} (${record.surat_edaran_year})`,
        })),
      ].sort(
        (a, b) =>
          (assetSourceOrder.get(a.source) ?? 99) -
            (assetSourceOrder.get(b.source) ?? 99) ||
          a.category.localeCompare(b.category, "id") ||
          a.name.localeCompare(b.name, "id"),
      )

      return NextResponse.json(
        { assets: details },
        { headers: { "Cache-Control": "no-store" } },
      )
    }

    const sppgs = db
      .prepare(
        `SELECT id, nama, jumlah_penerima_manfaat
         FROM sppg ORDER BY nama COLLATE NOCASE`,
      )
      .all() as {
      id: string
      nama: string
      jumlah_penerima_manfaat: number | null
    }[]
    const juknisRecords = db
      .prepare("SELECT sppg_id, catalog_id, quantity FROM asset_inventory")
      .all() as {
      sppg_id: string
      catalog_id: string
      quantity: number
    }[]
    const nonJuknisRecords = db
      .prepare("SELECT sppg_id FROM non_juknis_asset_inventory")
      .all() as { sppg_id: string }[]
    const suratEdaranRecords = db
      .prepare(
        `SELECT sppg_id, quantity, actual_unit, acuan_quantity, acuan_unit
         FROM surat_edaran_asset_inventory`,
      )
      .all() as {
      sppg_id: string
      quantity: number
      actual_unit: string | null
      acuan_quantity: number | null
      acuan_unit: string | null
    }[]

    return NextResponse.json(
      {
        records: calculateAssetCompleteness(
          assetCatalog,
          sppgs,
          juknisRecords,
          nonJuknisRecords,
          suratEdaranRecords,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local asset completeness read failed.", error)
    return NextResponse.json(
      { error: "Ringkasan kelengkapan aset gagal dimuat." },
      { status: 500 },
    )
  }
}

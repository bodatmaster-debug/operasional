import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"
import { assetCatalog } from "@/lib/asset-catalog"
import { getVehicleTypeLabel } from "@/lib/vehicle-types"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId) return NextResponse.json({ error: "SPPG wajib dipilih." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const [juknis, nonJuknis, surat, vehicles, gas, electrical] = await Promise.all([
    supabase.from("asset_inventory").select("*").eq("sppg_id", sppgId).gt("quantity", 0),
    supabase.from("non_juknis_asset_inventory").select("*").eq("sppg_id", sppgId).gt("quantity", 0),
    supabase.from("surat_edaran_asset_inventory").select("*").eq("sppg_id", sppgId).gt("quantity", 0),
    supabase.from("vehicle_inventory").select("*").eq("sppg_id", sppgId).gt("quantity", 0),
    supabase.from("sppg_gas_installation").select("*").eq("sppg_id", sppgId).maybeSingle(),
    supabase.from("sppg_electrical_installation").select("*").eq("sppg_id", sppgId).maybeSingle(),
  ])
  const records = [
    ...(juknis.data ?? []).flatMap((row) => {
      const item = assetCatalog.find((entry) => entry.catalogId === row.catalog_id)
      return item ? [{ id: row.id, source: "juknis", category: item.category, name: item.name, details: [row.asset_type, row.asset_brand].filter(Boolean).join(" · "), quantity: row.quantity, unit: item.unit }] : []
    }),
    ...(nonJuknis.data ?? []).map((row) => ({ id: row.id, source: "non-juknis", category: row.category, name: row.item_name, details: [row.asset_type, row.asset_brand].filter(Boolean).join(" · "), quantity: row.quantity, unit: "unit" })),
    ...(surat.data ?? []).map((row) => ({ id: row.id, source: "surat-edaran", category: row.category, name: row.item_name, details: [row.asset_type, row.asset_brand, `SE ${row.surat_edaran_number}/${row.surat_edaran_year}`].filter(Boolean).join(" · "), quantity: row.quantity, unit: row.actual_unit || "unit" })),
    ...(vehicles.data ?? []).map((row) => ({ id: row.id, source: "vehicle", category: "Kendaraan", name: `${getVehicleTypeLabel(row.vehicle_type)} · ${row.vehicle_subtype}`, details: [row.vehicle_make, row.vehicle_model].join(" · "), quantity: row.quantity, unit: "unit" })),
  ]
  if (gas.data) records.push({ id: sppgId, source: "gas-installation", category: "Instalasi gas", name: "Konfigurasi instalasi gas", details: `Sistem keselamatan: ${gas.data.safety_system_present ? "tercatat" : "tidak tercatat"}`, quantity: 1, unit: "konfigurasi" })
  if (electrical.data) {
    records.push({ id: sppgId, source: "electrical-installation", category: "Instalasi listrik", name: "Konfigurasi instalasi listrik", details: `${electrical.data.pln_capacity_va} VA`, quantity: 1, unit: "konfigurasi" })
    if (electrical.data.generator_present) records.push({ id: sppgId, source: "generator", category: "Genset", name: "Genset", details: [electrical.data.generator_brand, electrical.data.generator_capacity_kva ? `${electrical.data.generator_capacity_kva} kVA` : ""].filter(Boolean).join(" · "), quantity: 1, unit: "unit" })
  }
  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
}

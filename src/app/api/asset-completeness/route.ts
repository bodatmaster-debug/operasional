import { NextResponse, type NextRequest } from "next/server"
import { assetCatalog } from "@/lib/asset-catalog"
import { calculateAssetCompleteness } from "@/lib/asset-completeness"
import { isResponse } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-completeness")
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  const supabase = await getSupabaseRuntimeClient()

  if (sppgId) {
    const [juknis, vehicles, nonJuknis, surat] = await Promise.all([
      supabase.from("asset_inventory").select("*").eq("sppg_id", sppgId),
      supabase.from("vehicle_inventory").select("*").eq("sppg_id", sppgId),
      supabase.from("non_juknis_asset_inventory").select("*").eq("sppg_id", sppgId),
      supabase.from("surat_edaran_asset_inventory").select("*").eq("sppg_id", sppgId),
    ])

    const details = [
      ...(juknis.data ?? []).map((record) => {
        const item = assetCatalog.find((candidate) => candidate.catalogId === record.catalog_id)
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
      ...(vehicles.data ?? []).map((record) => ({
        id: record.id,
        source: "Kendaraan",
        category: "Kendaraan",
        name: `${record.vehicle_type} · ${record.vehicle_make} ${record.vehicle_model}`,
        type: record.vehicle_subtype,
        brand: record.vehicle_make,
        quantity: record.quantity,
        unit: "unit",
        condition: record.asset_condition,
      })),
      ...(nonJuknis.data ?? []).map((record) => ({
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
      ...(surat.data ?? []).map((record) => ({
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
    ]

    return NextResponse.json({ assets: details }, { headers: { "Cache-Control": "no-store" } })
  }

  const [sppgs, juknis, nonJuknis, surat] = await Promise.all([
    supabase.from("sppg").select("id,nama,jumlah_penerima_manfaat").order("nama"),
    supabase.from("asset_inventory").select("sppg_id,catalog_id,quantity"),
    supabase.from("non_juknis_asset_inventory").select("sppg_id"),
    supabase.from("surat_edaran_asset_inventory").select("sppg_id,quantity,actual_unit,acuan_quantity,acuan_unit"),
  ])

  const records = calculateAssetCompleteness(
    assetCatalog,
    (sppgs.data ?? []) as Array<{ id: string; nama: string; jumlah_penerima_manfaat: number | null }>,
    (juknis.data ?? []) as Array<{ sppg_id: string; catalog_id: string; quantity: number }>,
    (nonJuknis.data ?? []) as Array<{ sppg_id: string }>,
    (surat.data ?? []) as Array<{ sppg_id: string; quantity: number; actual_unit: string | null; acuan_quantity: number | null; acuan_unit: string | null }>,
  )

  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
}

import { NextResponse, type NextRequest } from "next/server"
import { isResponse, requireSupabasePermission } from "@/lib/supabase-request"
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
    const assets = [
      ...(juknis.data ?? []).map((row) => ({ ...row, source: "Juknis" })),
      ...(vehicles.data ?? []).map((row) => ({ ...row, source: "Kendaraan" })),
      ...(nonJuknis.data ?? []).map((row) => ({ ...row, source: "Non-Juknis" })),
      ...(surat.data ?? []).map((row) => ({ ...row, source: "Surat Edaran" })),
    ]
    return NextResponse.json({ assets }, { headers: { "Cache-Control": "no-store" } })
  }

  const [sppgs, juknis, nonJuknis, surat] = await Promise.all([
    supabase.from("sppg").select("id,nama,jumlah_penerima_manfaat").order("nama"),
    supabase.from("asset_inventory").select("sppg_id,catalog_id,quantity"),
    supabase.from("non_juknis_asset_inventory").select("sppg_id"),
    supabase.from("surat_edaran_asset_inventory").select("sppg_id,quantity,actual_unit,acuan_quantity,acuan_unit"),
  ])
  return NextResponse.json({ records: sppgs.data ?? [], juknisRecords: juknis.data ?? [], nonJuknisRecords: nonJuknis.data ?? [], suratEdaranRecords: surat.data ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

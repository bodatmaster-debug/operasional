import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

const TABLES = { juknis: "asset_inventory", vehicle: "vehicle_inventory", "non-juknis": "non_juknis_asset_inventory", "surat-edaran": "surat_edaran_asset_inventory" } as const

export async function PATCH(request: NextRequest) {
  const body = await readJsonObject(request)
  const source = body?.source as keyof typeof TABLES | undefined
  if (!body || !source || !TABLES[source]) return NextResponse.json({ error: "Sumber aset tidak valid." }, { status: 400 })
  const page = source === "non-juknis" ? "asset-non-juknis" : source === "surat-edaran" ? "asset-surat-edaran" : "asset-recording"
  const user = await requireSupabasePermission(request, "assets", page)
  if (isResponse(user)) return user
  const table = TABLES[source]
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase.from(table).update({ asset_condition: body.assetCondition, updated_at: new Date().toISOString() }).eq("id", body.recordId).eq("sppg_id", body.sppgId).select("*").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Catatan aset tidak ditemukan." }, { status: 404 })
  return NextResponse.json({ recordId: body.recordId, source, assetCondition: body.assetCondition })
}

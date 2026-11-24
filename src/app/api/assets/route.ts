import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { isResponse, readJsonObject } from "@/lib/local-request"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-recording")
  if (isResponse(user)) return user
  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId) return NextResponse.json({ error: "SPPG wajib dipilih." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase.from("asset_inventory").select("*").eq("sppg_id", sppgId).order("catalog_id")
  if (error) return NextResponse.json({ error: "Jumlah aktual aset gagal dimuat." }, { status: 500 })
  return NextResponse.json({ records: data }, { headers: { "Cache-Control": "no-store" } })
}

export async function PUT(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-recording")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()
  const id = randomUUID()
  const row = {
    id,
    sppg_id: body.sppgId,
    catalog_id: body.catalogId,
    quantity: body.quantity,
    asset_type: body.assetType ?? "",
    asset_brand: body.assetBrand ?? "",
    created_at: now,
    updated_at: now,
  }
  const { data: existing } = await supabase.from("asset_inventory").select("id").eq("sppg_id", body.sppgId).eq("catalog_id", body.catalogId).maybeSingle()
  const { data, error } = existing
    ? await supabase.from("asset_inventory").update({ quantity: row.quantity, asset_type: row.asset_type, asset_brand: row.asset_brand, updated_at: now }).eq("id", existing.id).select("*").single()
    : await supabase.from("asset_inventory").insert(row).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data })
}

export async function DELETE(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-recording")
  if (isResponse(user)) return user
  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  const catalogId = request.nextUrl.searchParams.get("catalogId")?.trim()
  if (!sppgId || !catalogId) return NextResponse.json({ error: "SPPG dan item katalog wajib dipilih." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { error } = await supabase.from("asset_inventory").delete().eq("sppg_id", sppgId).eq("catalog_id", catalogId)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deleted: true })
}

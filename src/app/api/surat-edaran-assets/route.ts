import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-surat-edaran")
  if (isResponse(user)) return user
  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId) return NextResponse.json({ error: "SPPG wajib dipilih." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase.from("surat_edaran_asset_inventory").select("*").eq("sppg_id", sppgId).order("item_name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-surat-edaran")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()
  const row = { id: randomUUID(), sppg_id: body.sppgId, category: body.category, item_name: body.itemName, asset_type: body.assetType, asset_brand: body.assetBrand, quantity: body.quantity, actual_unit: body.actualUnit ?? "", acuan_quantity: body.acuanQuantity ?? null, acuan_unit: body.acuanUnit ?? null, surat_edaran_number: body.suratEdaranNumber, surat_edaran_year: body.suratEdaranYear, created_at: now, updated_at: now }
  const { data, error } = await supabase.from("surat_edaran_asset_inventory").insert(row).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data }, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-surat-edaran")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body?.id) return NextResponse.json({ error: "Identitas aset tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const updates = { category: body.category, item_name: body.itemName, asset_type: body.assetType, asset_brand: body.assetBrand, quantity: body.quantity, actual_unit: body.actualUnit ?? "", acuan_quantity: body.acuanQuantity ?? null, acuan_unit: body.acuanUnit ?? null, surat_edaran_number: body.suratEdaranNumber, surat_edaran_year: body.suratEdaranYear, updated_at: new Date().toISOString() }
  const { data, error } = await supabase.from("surat_edaran_asset_inventory").update(updates).eq("id", body.id).select("*").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Catatan aset tidak ditemukan." }, { status: 404 })
  return NextResponse.json({ record: data })
}

export async function DELETE(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-surat-edaran")
  if (isResponse(user)) return user
  const id = request.nextUrl.searchParams.get("id")?.trim()
  if (!id) return NextResponse.json({ error: "Identitas aset tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { error } = await supabase.from("surat_edaran_asset_inventory").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deleted: true })
}

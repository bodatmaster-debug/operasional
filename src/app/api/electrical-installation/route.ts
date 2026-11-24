import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-recording")
  if (isResponse(user)) return user
  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId) return NextResponse.json({ error: "SPPG wajib dipilih." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase.from("sppg_electrical_installation").select("*").eq("sppg_id", sppgId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ record: data }, { headers: { "Cache-Control": "no-store" } })
}

export async function PUT(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-recording")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body?.sppgId) return NextResponse.json({ error: "SPPG wajib dipilih." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()
  const row = { sppg_id: body.sppgId, pln_capacity_va: body.plnCapacityVa, generator_present: body.generatorPresent ? 1 : 0, generator_capacity_kva: body.generatorPresent ? body.generatorCapacityKva : null, generator_brand: body.generatorPresent ? body.generatorBrand : null, created_at: now, updated_at: now }
  const { data, error } = await supabase.from("sppg_electrical_installation").upsert(row, { onConflict: "sppg_id" }).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data })
}

import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function PATCH(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const id = request.nextUrl.pathname.split("/").filter(Boolean).at(-1)?.trim()
  if (!id) return NextResponse.json({ error: "ID RAB tidak valid." }, { status: 400 })
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { data: proposal, error } = await supabase.from("rab_proposal").update({ rab_date: body.rabDate, notes: body.notes ?? "" }).eq("id", id).select("*").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!proposal) return NextResponse.json({ error: "RAB tidak ditemukan." }, { status: 404 })
  await supabase.from("rab_proposal_item").delete().eq("rab_id", id)
  const items = Array.isArray(body.items) ? body.items : []
  const itemRows = items.map((item: Record<string, unknown>, position: number) => ({ rab_id: id, position, name: item.name, quantity: item.quantity, estimated_unit_cost: item.estimatedUnitCost, unit: typeof item.unit === "string" ? item.unit : "" }))
  if (itemRows.length > 0) { const { error: itemError } = await supabase.from("rab_proposal_item").insert(itemRows); if (itemError) return NextResponse.json({ error: itemError.message }, { status: 400 }) }
  const normalized = itemRows.map((item) => ({ name: String(item.name), quantity: Number(item.quantity), unit: String(item.unit), estimatedUnitCost: Number(item.estimated_unit_cost) }))
  const record = { id: proposal.id, rab_date: proposal.rab_date, sppg_id: proposal.sppg_id, sppg_name: proposal.sppg_name, assignee_id: proposal.assignee_id, assignee_name: proposal.assignee_name, notes: proposal.notes ?? "", created_by: proposal.created_by, created_at: proposal.created_at, item_count: normalized.length, grand_total: normalized.reduce((total, item) => total + item.quantity * item.estimatedUnitCost, 0), items: normalized }
  return NextResponse.json({ record })
}

export async function DELETE(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const id = request.nextUrl.pathname.split("/").filter(Boolean).at(-1)?.trim()
  if (!id) return NextResponse.json({ error: "ID RAB tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { error } = await supabase.from("rab_proposal").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deleted: true })
}

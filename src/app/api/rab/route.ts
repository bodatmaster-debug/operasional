import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

function toRABRecord(row: Record<string, unknown>, items: Array<Record<string, unknown>>) {
  const normalizedItems = items.map((item) => ({ name: String(item.name), quantity: Number(item.quantity), unit: String(item.unit ?? ""), estimatedUnitCost: Number(item.estimated_unit_cost) }))
  const itemCount = normalizedItems.length
  const grandTotal = normalizedItems.reduce((total, item) => total + item.quantity * item.estimatedUnitCost, 0)
  return { id: row.id, rab_date: row.rab_date, sppg_id: row.sppg_id, sppg_name: row.sppg_name, assignee_id: row.assignee_id, assignee_name: row.assignee_name, notes: row.notes ?? "", created_by: row.created_by, created_at: row.created_at, item_count: itemCount, grand_total: grandTotal, items: normalizedItems }
}

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const supabase = await getSupabaseRuntimeClient()
  const { data: proposals, error } = await supabase.from("rab_proposal").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: items } = await supabase.from("rab_proposal_item").select("*").order("rab_id").order("position")
  const itemsByRAB = new Map<string, Array<Record<string, unknown>>>()
  for (const item of items ?? []) {
    const row = item as unknown as Record<string, unknown>
    const rabId = String(row.rab_id)
    const list = itemsByRAB.get(rabId) ?? []
    list.push(row)
    itemsByRAB.set(rabId, list)
  }
  const records = (proposals ?? []).map((row) => toRABRecord(row as unknown as Record<string, unknown>, itemsByRAB.get(String(row.id)) ?? []))
  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const items = Array.isArray(body.items) ? body.items : []
  const supabase = await getSupabaseRuntimeClient()
  const id = randomUUID()
  const now = new Date().toISOString()
  const { data: sppg } = await supabase.from("sppg").select("id,nama").eq("id", body.sppgId).maybeSingle()
  const { data: assignee } = await supabase.from("maintenance_assignee").select("id,name").eq("id", body.assigneeId).maybeSingle()
  if (!sppg || !assignee) return NextResponse.json({ error: "SPPG atau petugas tidak ditemukan." }, { status: 404 })
  const proposal = { id, rab_date: body.rabDate, sppg_id: sppg.id, sppg_name: sppg.nama, assignee_id: assignee.id, assignee_name: assignee.name, notes: typeof body.notes === "string" ? body.notes : "", created_by: user.id, created_at: now }
  const { data, error } = await supabase.from("rab_proposal").insert(proposal).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const itemRows = items.map((item: Record<string, unknown>, position: number) => ({ rab_id: id, position, name: item.name, quantity: item.quantity, estimated_unit_cost: item.estimatedUnitCost, unit: typeof item.unit === "string" ? item.unit : "" }))
  if (itemRows.length > 0) {
    const { error: itemError } = await supabase.from("rab_proposal_item").insert(itemRows)
    if (itemError) { await supabase.from("rab_proposal").delete().eq("id", id); return NextResponse.json({ error: itemError.message }, { status: 400 }) }
  }
  const record = toRABRecord(data as unknown as Record<string, unknown>, itemRows as unknown as Array<Record<string, unknown>>)
  return NextResponse.json({ record }, { status: 201 })
}

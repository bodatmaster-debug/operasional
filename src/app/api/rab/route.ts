import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase
    .from("rab_proposal")
    .select("*, rab_proposal_item(*)")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    { records: data },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  }

  const supabase = await getSupabaseRuntimeClient()
  const id = randomUUID()
  const now = new Date().toISOString()
  const { data: sppg } = await supabase
    .from("sppg")
    .select("id,nama")
    .eq("id", body.sppgId)
    .maybeSingle()
  const { data: assignee } = await supabase
    .from("maintenance_assignee")
    .select("id,name")
    .eq("id", body.assigneeId)
    .maybeSingle()
  if (!sppg || !assignee) {
    return NextResponse.json({ error: "SPPG atau petugas tidak ditemukan." }, { status: 404 })
  }

  const proposal = {
    id,
    rab_date: body.rabDate,
    sppg_id: sppg.id,
    sppg_name: sppg.nama,
    assignee_id: assignee.id,
    assignee_name: assignee.name,
    notes: body.notes ?? "",
    created_by: user.id,
    created_at: now,
  }
  const { data, error } = await supabase
    .from("rab_proposal")
    .insert(proposal)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const items = Array.isArray(body.items) ? body.items : []
  const itemRows = items.map((item: Record<string, unknown>, position: number) => ({
    rab_id: id,
    position,
    name: item.name,
    quantity: item.quantity,
    estimated_unit_cost: item.estimatedUnitCost,
    unit: item.unit ?? "",
  }))
  if (itemRows.length > 0) {
    const { error: itemError } = await supabase
      .from("rab_proposal_item")
      .insert(itemRows)
    if (itemError) {
      await supabase.from("rab_proposal").delete().eq("id", id)
      return NextResponse.json({ error: itemError.message }, { status: 400 })
    }
  }

  return NextResponse.json({ record: data }, { status: 201 })
}

import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

function readRABId(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/").filter(Boolean).at(-1)?.trim()
  return id && id.length <= 120 ? id : null
}

export async function PATCH(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const id = readRABId(request)
  if (!id) return NextResponse.json({ error: "ID RAB tidak valid." }, { status: 400 })
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })

  const supabase = await getSupabaseRuntimeClient()
  const { data: proposal, error: proposalError } = await supabase
    .from("rab_proposal")
    .update({ rab_date: body.rabDate, notes: body.notes ?? "" })
    .eq("id", id)
    .select("*")
    .maybeSingle()
  if (proposalError) return NextResponse.json({ error: proposalError.message }, { status: 400 })
  if (!proposal) return NextResponse.json({ error: "RAB tidak ditemukan." }, { status: 404 })

  await supabase.from("rab_proposal_item").delete().eq("rab_id", id)
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
    const { error } = await supabase.from("rab_proposal_item").insert(itemRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ record: proposal })
}

export async function DELETE(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const id = readRABId(request)
  if (!id) return NextResponse.json({ error: "ID RAB tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { error } = await supabase.from("rab_proposal").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ deleted: true })
}

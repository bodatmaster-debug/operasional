import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const supabase = await getSupabaseRuntimeClient()
  const { data: schedules, error } = await supabase.from("maintenance_schedule").select("*").order("scheduled_date")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data: needs } = await supabase.from("maintenance_schedule_need").select("*").order("position")
  const { data: assignees } = await supabase.from("maintenance_schedule_assignee").select("schedule_id, maintenance_assignee(name,role)")
  const needsById = new Map<string, unknown[]>()
  for (const need of needs ?? []) {
    const rows = needsById.get(String(need.schedule_id)) ?? []
    rows.push(need)
    needsById.set(String(need.schedule_id), rows)
  }
  const records = (schedules ?? []).map((row) => ({ ...row, needs: needsById.get(String(row.id)) ?? [], assignees: "" }))
  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const id = randomUUID()
  const now = new Date().toISOString()
  const schedule = {
    id,
    sppg_id: body.sppgId,
    sppg_name: body.sppgName ?? "",
    asset_source: body.assetSource,
    asset_record_id: body.assetRecordId,
    asset_category: body.assetCategory ?? "",
    asset_name: body.assetName ?? "",
    asset_details: body.assetDetails ?? "",
    maintenance_type: body.maintenanceType,
    notes: body.notes,
    scheduled_date: body.scheduledDate,
    recurrence: body.recurrence ?? "none",
    recurrence_days: body.recurrenceDays ?? null,
    created_by: user.id,
    created_at: now,
  }
  const { data, error } = await supabase.from("maintenance_schedule").insert(schedule).select("*").single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  for (const assigneeId of body.assigneeIds ?? []) {
    await supabase.from("maintenance_schedule_assignee").insert({ schedule_id: id, assignee_id: assigneeId })
  }
  for (const [position, need] of (body.needs ?? []).entries()) {
    await supabase.from("maintenance_schedule_need").insert({ schedule_id: id, position, name: need.name, quantity: need.quantity, unit: need.unit, notes: need.notes ?? "" })
  }
  return NextResponse.json({ record: data }, { status: 201 })
}

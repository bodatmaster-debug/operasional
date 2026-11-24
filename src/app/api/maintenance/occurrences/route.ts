import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body?.scheduleId || !body?.occurrenceDate || !body?.status) {
    return NextResponse.json({ error: "Occurrence pemeliharaan tidak valid." }, { status: 400 })
  }
  if (body.status !== "completed" && body.status !== "dismissed") {
    return NextResponse.json({ error: "Status occurrence tidak valid." }, { status: 400 })
  }
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase
    .from("maintenance_schedule_occurrence")
    .upsert({
      schedule_id: body.scheduleId,
      occurrence_date: body.occurrenceDate,
      status: body.status,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "schedule_id,occurrence_date" })
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ record: data }, { status: 201 })
}

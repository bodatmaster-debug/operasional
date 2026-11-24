import { NextResponse, type NextRequest } from "next/server"
import { isResponse, requireSupabaseUser } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase
    .from("maintenance_schedule_occurrence")
    .select("*")
    .order("occurrence_date", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data }, { headers: { "Cache-Control": "no-store" } })
}

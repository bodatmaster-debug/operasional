import { NextResponse, type NextRequest } from "next/server"
import { isResponse, requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "maintenance", "maintenance")
  if (isResponse(user)) return user
  const supabase = await getSupabaseRuntimeClient()
  const { data, error } = await supabase.from("maintenance_assignee").select("*").order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ records: data }, { headers: { "Cache-Control": "no-store" } })
}

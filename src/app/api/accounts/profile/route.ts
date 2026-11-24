import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabaseUser } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const supabase = await getSupabaseRuntimeClient()
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()
  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role },
    profile,
    emailChange: null,
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 })

  const supabase = await getSupabaseRuntimeClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.fullName === "string") updates.full_name = body.fullName
  if (typeof body.username === "string") updates.username = body.username

  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ profile: data })
}

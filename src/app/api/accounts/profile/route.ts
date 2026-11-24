import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject, requireSupabaseUser } from "@/lib/supabase-request"

export async function GET(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  return NextResponse.json({
    user: { id: user.id, username: user.username, role: user.role },
    profile: null,
    emailChange: null,
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 })
  return NextResponse.json({ error: "Pembaruan profil Supabase diproses pada endpoint profil terpisah." }, { status: 501 })
}

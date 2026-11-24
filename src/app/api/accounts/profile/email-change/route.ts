import { NextResponse, type NextRequest } from "next/server"
import { isResponse, requireSupabaseUser } from "@/lib/supabase-request"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { readJsonObject } from "@/lib/local-request"

export async function POST(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = createClient(await cookies())
  if (body.action === "request") {
    if (typeof body.email !== "string" || !body.email.includes("@")) return NextResponse.json({ error: "Email tidak valid." }, { status: 400 })
    const { error } = await supabase.auth.updateUser({ email: body.email.trim() })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ emailChange: { pendingEmail: body.email.trim(), expiresAt: null } }, { headers: { "Cache-Control": "no-store" } })
  }
  if (body.action === "resend") {
    const { error } = await supabase.auth.resend({ type: "email_change", email: user.username })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ emailChange: { pendingEmail: user.username } })
  }
  if (body.action === "verify") {
    return NextResponse.json({ error: "Gunakan tautan konfirmasi yang dikirim Supabase ke email." }, { status: 400 })
  }
  return NextResponse.json({ error: "Tindakan perubahan email tidak valid." }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const supabase = createClient(await cookies())
  const { error } = await supabase.auth.updateUser({ email: user.username })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ emailChange: null })
}

import { NextResponse, type NextRequest } from "next/server"
import { isResponse, requireSupabaseUser } from "@/lib/supabase-request"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  if (!body || typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") return NextResponse.json({ error: "Password saat ini dan password baru wajib diisi." }, { status: 400 })
  if (body.newPassword.length < 12 || body.newPassword.length > 128) return NextResponse.json({ error: "Password baru harus 12–128 karakter." }, { status: 400 })
  const supabase = createClient(await cookies())
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user?.email) return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 })
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: authData.user.email, password: body.currentPassword })
  if (verifyError) return NextResponse.json({ error: "Password saat ini tidak cocok." }, { status: 400 })
  const { error } = await supabase.auth.updateUser({ password: body.newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

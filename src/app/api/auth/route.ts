import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getSupabaseSession } from "@/lib/supabase-auth"
import { EULA_ACCEPTANCE_REQUIRED_MESSAGE, EULA_VERSION } from "@/lib/eula"
import { readJsonObject } from "@/lib/local-request"

export async function GET(_request: NextRequest) {
  const user = await getSupabaseSession()
  return NextResponse.json({ setupRequired: false, user }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const body = await readJsonObject(request)
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = createClient(await cookies())

  if (body.action === "logout") {
    const { error } = await supabase.auth.signOut()
    return error ? NextResponse.json({ error: "Sesi Supabase gagal dihentikan." }, { status: 500 }) : NextResponse.json({ ok: true })
  }
  try {
    if (body.action === "login") {
      if (typeof body.username !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Email atau password tidak valid." }, { status: 400 })
      const { error } = await supabase.auth.signInWithPassword({ email: body.username.trim(), password: body.password })
      if (error) return NextResponse.json({ error: "Email atau password tidak valid." }, { status: 401 })
      const profile = await getSupabaseSession()
      if (!profile) {
        await supabase.auth.signOut()
        return NextResponse.json({ error: "Akun menunggu persetujuan Admin atau aksesnya tidak aktif.", pending: true }, { status: 403 })
      }
      return NextResponse.json({ user: profile })
    }
    if (body.action === "register") {
      if (body.eulaAccepted !== true) return NextResponse.json({ error: EULA_ACCEPTANCE_REQUIRED_MESSAGE }, { status: 400 })
      if (typeof body.fullName !== "string" || typeof body.username !== "string" || typeof body.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Data pendaftaran tidak lengkap." }, { status: 400 })
      const { error } = await supabase.auth.signUp({ email: body.email.trim(), password: body.password, options: { data: { full_name: body.fullName.trim(), username: body.username.trim(), eula_accepted: true, eula_version: EULA_VERSION } } })
      if (error) return NextResponse.json({ error: "Pendaftaran gagal. Email atau username mungkin sudah digunakan." }, { status: 409 })
      return NextResponse.json({ registration: { status: "pending" } }, { status: 201 })
    }
    return NextResponse.json({ error: "Aksi autentikasi tidak valid." }, { status: 400 })
  } catch (error) {
    console.error("Supabase authentication request failed.", error)
    return NextResponse.json({ error: "Aplikasi gagal memproses autentikasi." }, { status: 500 })
  }
}

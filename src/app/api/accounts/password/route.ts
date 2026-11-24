import { NextResponse, type NextRequest } from "next/server"
import {
  changeOwnPassword,
  LocalAuthError,
  SESSION_COOKIE,
  verifyOwnPassword,
} from "@/lib/local-auth"
import { isResponse, readJsonObject, requireLocalUser } from "@/lib/local-request"

export async function POST(request: NextRequest) {
  const user = requireLocalUser(request, true)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengelola akun lokal." },
      { status: 403 },
    )
  }

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  const sessionToken = request.cookies.get(SESSION_COOKIE)?.value
  if (!sessionToken) {
    return NextResponse.json(
      { error: "Sesi tidak valid atau telah berakhir. Masuk kembali." },
      { status: 401 },
    )
  }

  try {
    if (body.action === "verify-current") {
      await verifyOwnPassword(user.id, body.currentPassword)
      return NextResponse.json({ ok: true })
    }
    if (body.action !== undefined && body.action !== "change") {
      return NextResponse.json(
        { error: "Aksi password tidak valid." },
        { status: 400 },
      )
    }
    await changeOwnPassword(
      user.id,
      body.currentPassword,
      body.newPassword,
      sessionToken,
    )
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof LocalAuthError) {
      const status =
        error.code === "account-locked"
          ? 429
          : error.code === "account-updated"
            ? 409
            : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Local account password change failed.", error)
    return NextResponse.json(
      { error: "Aplikasi gagal memperbarui password akun." },
      { status: 500 },
    )
  }
}

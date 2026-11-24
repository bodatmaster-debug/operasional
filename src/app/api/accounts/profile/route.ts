import { NextResponse, type NextRequest } from "next/server"
import {
  getOwnAccountProfile,
  LocalAuthError,
  updateOwnAccountProfile,
} from "@/lib/local-auth"
import { getOwnEmailChangeState } from "@/lib/local-email-change"
import { isResponse, requireLocalUser } from "@/lib/local-request"

const MAX_PROFILE_REQUEST_BYTES = 7 * 1024 * 1024

type ProfileBodyResult =
  | { status: "ok"; body: Record<string, unknown> }
  | { status: "invalid" }
  | { status: "too-large" }

async function readProfileBody(request: Request): Promise<ProfileBodyResult> {
  const contentLength = request.headers.get("content-length")
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_PROFILE_REQUEST_BYTES
  ) {
    return { status: "too-large" }
  }

  const reader = request.body?.getReader()
  if (!reader) return { status: "invalid" }
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_PROFILE_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined)
        return { status: "too-large" }
      }
      chunks.push(value)
    }
  } catch {
    return { status: "invalid" }
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    const body: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? { status: "ok", body: body as Record<string, unknown> }
      : { status: "invalid" }
  } catch {
    return { status: "invalid" }
  }
}

export async function GET(request: NextRequest) {
  const user = requireLocalUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengelola akun lokal." },
      { status: 403 },
    )
  }

  return NextResponse.json(
    {
      user: { id: user.id, username: user.username, role: user.role },
      profile: getOwnAccountProfile(user.id),
      emailChange: getOwnEmailChangeState(user.id),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function PATCH(request: NextRequest) {
  const user = requireLocalUser(request, true)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengelola akun lokal." },
      { status: 403 },
    )
  }

  const bodyResult = await readProfileBody(request)
  if (bodyResult.status === "too-large") {
    return NextResponse.json(
      { error: "Permintaan terlalu besar. Ukuran maksimum foto adalah 5 MiB." },
      { status: 413 },
    )
  }
  if (bodyResult.status === "invalid") {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }
  if (Object.hasOwn(bodyResult.body, "email")) {
    return NextResponse.json(
      { error: "Email hanya dapat diubah setelah kode verifikasi dikonfirmasi." },
      { status: 400 },
    )
  }

  try {
    const result = await updateOwnAccountProfile(
      user.id,
      bodyResult.body.username,
      bodyResult.body.currentPassword,
      bodyResult.body.avatarDataUrl,
    )
    return NextResponse.json(
      {
        ...result,
        emailChange: getOwnEmailChangeState(user.id),
      },
      {
      headers: { "Cache-Control": "no-store" },
      },
    )
  } catch (error) {
    if (error instanceof LocalAuthError) {
      const status =
        error.code === "account-locked"
          ? 429
          : error.code === "account-updated" || error.code === "username-taken"
            ? 409
            : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Local account profile update failed.", error)
    return NextResponse.json(
      { error: "Aplikasi gagal memperbarui profil akun." },
      { status: 500 },
    )
  }
}

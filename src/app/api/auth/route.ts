import { NextResponse, type NextRequest } from "next/server"
import {
  authenticateGoogleAccount,
  authenticate,
  createInitialAdmin,
  deleteSession,
  hasAccounts,
  getSessionUser,
  LocalAuthError,
  SESSION_COOKIE,
  registerAccount,
  registerGoogleAccount,
} from "@/lib/local-auth"
import {
  GoogleIdentityError,
  verifyGoogleIdToken,
} from "@/lib/google-auth"
import { EULA_ACCEPTANCE_REQUIRED_MESSAGE } from "@/lib/eula"
import {
  clearSessionCookie,
  isLocalOrigin,
  readJsonObject,
  setSessionCookie,
} from "@/lib/local-request"

function deniedAccountResponse(
  result:
    | { status: "revoked" }
    | { status: "banned"; bannedUntil: number },
) {
  const error =
    result.status === "revoked"
      ? "Akses akun telah dicabut. Hubungi Admin untuk memulihkan akses."
      : `Akun diblokir sementara hingga ${new Intl.DateTimeFormat("id-ID", {
          dateStyle: "medium",
          timeStyle: "short",
          timeZone: "Asia/Jakarta",
        }).format(new Date(result.bannedUntil))} WIB.`
  return NextResponse.json({ error }, { status: 403 })
}

export async function GET(request: NextRequest) {
  if (!isLocalOrigin(request)) {
    return NextResponse.json(
      { error: "Autentikasi hanya tersedia melalui aplikasi localhost." },
      { status: 403 },
    )
  }
  return NextResponse.json(
    {
      setupRequired: !hasAccounts(),
      user: getSessionUser(request.cookies.get(SESSION_COOKIE)?.value),
    },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(request: NextRequest) {
  if (!isLocalOrigin(request, true)) {
    return NextResponse.json(
      { error: "Permintaan autentikasi harus berasal dari aplikasi localhost." },
      { status: 403 },
    )
  }
  const body = await readJsonObject(request)
  if (!body || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  if (body.action === "logout") {
    deleteSession(request.cookies.get(SESSION_COOKIE)?.value)
    const response = NextResponse.json({ ok: true })
    clearSessionCookie(response)
    return response
  }

  if (body.action === "setup" && body.password !== body.confirmPassword) {
    return NextResponse.json(
      { error: "Konfirmasi password tidak cocok." },
      { status: 400 },
    )
  }

  try {
    if (body.action === "setup") {
      const { user, token } = await createInitialAdmin(body.username, body.password)
      const response = NextResponse.json({ user }, { status: 201 })
      setSessionCookie(response, request, token)
      return response
    }
    if (body.action === "login") {
      if (!hasAccounts()) {
        return NextResponse.json(
          { error: "Setup Admin pertama perlu diselesaikan." },
          { status: 409 },
        )
      }
      const result = await authenticate(body.username, body.password)
      if (result.status === "pending") {
        return NextResponse.json(
          { error: "Pendaftaran Anda masih menunggu persetujuan Admin.", pending: true },
          { status: 403 },
        )
      }
      if (result.status === "locked") {
        return NextResponse.json(
          { error: "Terlalu banyak percobaan. Coba lagi dalam 15 menit." },
          { status: 429 },
        )
      }
      if (result.status === "revoked" || result.status === "banned") {
        return deniedAccountResponse(result)
      }
      if (result.status !== "authenticated") {
        return NextResponse.json(
          { error: "Username atau password tidak valid." },
          { status: 401 },
        )
      }
      const response = NextResponse.json({ user: result.user })
      setSessionCookie(response, request, result.token)
      return response
    }
    if (body.action === "register") {
      if (!hasAccounts()) {
        return NextResponse.json(
          { error: "Admin pertama harus menyelesaikan setup sebelum pendaftaran dibuka." },
          { status: 409 },
        )
      }
      if (body.eulaAccepted !== true) {
        return NextResponse.json(
          { error: EULA_ACCEPTANCE_REQUIRED_MESSAGE },
          { status: 400 },
        )
      }
      const registration = await registerAccount(
        body.fullName,
        body.username,
        body.email,
        body.password,
        body.eulaAccepted,
      )
      return NextResponse.json({ registration }, { status: 201 })
    }
    if (body.action === "google") {
      if (!hasAccounts()) {
        return NextResponse.json(
          { error: "Admin pertama harus menyelesaikan setup sebelum pendaftaran dibuka." },
          { status: 409 },
        )
      }
      if (body.intent !== "login" && body.intent !== "register") {
        return NextResponse.json(
          { error: "Tujuan autentikasi Google tidak valid." },
          { status: 400 },
        )
      }
      if (body.intent === "register" && body.eulaAccepted !== true) {
        return NextResponse.json(
          { error: EULA_ACCEPTANCE_REQUIRED_MESSAGE },
          { status: 400 },
        )
      }

      const identity = await verifyGoogleIdToken(body.credential)
      if (body.intent === "register") {
        const registration = await registerGoogleAccount(
          identity,
          body.eulaAccepted,
        )
        return NextResponse.json({ registration }, { status: 201 })
      }

      const result = authenticateGoogleAccount(identity.sub)
      if (result.status === "pending") {
        return NextResponse.json(
          { error: "Pendaftaran Anda masih menunggu persetujuan Admin.", pending: true },
          { status: 403 },
        )
      }
      if (result.status === "locked") {
        return NextResponse.json(
          { error: "Akun terkunci sementara. Coba lagi dalam 15 menit." },
          { status: 429 },
        )
      }
      if (result.status === "revoked" || result.status === "banned") {
        return deniedAccountResponse(result)
      }
      if (result.status !== "authenticated") {
        return NextResponse.json(
          { error: "Akun Google belum terdaftar. Pilih Daftar dengan Google terlebih dahulu." },
          { status: 401 },
        )
      }
      const response = NextResponse.json({ user: result.user })
      setSessionCookie(response, request, result.token)
      return response
    }
    return NextResponse.json({ error: "Aksi autentikasi tidak valid." }, { status: 400 })
  } catch (error) {
    if (error instanceof GoogleIdentityError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof LocalAuthError) {
      const status =
        error.code === "account-exists" ||
        error.code === "username-taken" ||
        error.code === "google-account-exists" ||
        error.code === "google-email-in-use"
        ? 409
        : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Local authentication request failed.", error)
    return NextResponse.json(
      { error: "Aplikasi gagal memproses autentikasi." },
      { status: 500 },
    )
  }
}

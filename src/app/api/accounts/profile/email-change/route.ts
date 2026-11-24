import { NextResponse, type NextRequest } from "next/server"
import { EmailDeliveryError } from "@/lib/email-delivery"
import {
  cancelOwnEmailChange,
  LocalEmailChangeError,
  getOwnEmailChangeState,
  requestOwnEmailChange,
  resendOwnEmailChangeCode,
  verifyOwnEmailChange,
} from "@/lib/local-email-change"
import { LocalAuthError } from "@/lib/local-auth"
import { isResponse, requireLocalUser } from "@/lib/local-request"

const MAX_REQUEST_BYTES = 4096

type RequestBody = Record<string, unknown>

async function readRequestBody(request: Request) {
  const contentLength = request.headers.get("content-length")
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_REQUEST_BYTES
  ) {
    return null
  }

  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined)
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
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
      ? (body as RequestBody)
      : null
  } catch {
    return null
  }
}

function getErrorStatus(error: LocalEmailChangeError | EmailDeliveryError) {
  if (error instanceof EmailDeliveryError) {
    return error.code === "email-delivery-not-configured" ? 503 : 502
  }
  switch (error.code) {
    case "email-change-not-found":
      return 404
    case "email-change-stale":
      return 409
    case "email-code-expired":
      return 410
    case "email-code-locked":
    case "email-send-cooldown":
    case "email-send-limit":
      return 429
    default:
      return 400
  }
}

function handleError(error: unknown, accountId: string) {
  if (
    error instanceof LocalEmailChangeError ||
    error instanceof EmailDeliveryError ||
    error instanceof LocalAuthError
  ) {
    if (error instanceof EmailDeliveryError && error.code === "email-delivery-failed") {
      const cause = error.cause
      const causeCode =
        typeof cause === "object" &&
        cause !== null &&
        "code" in cause &&
        typeof cause.code === "string"
          ? cause.code
          : "unknown"
      console.error("Email verification delivery failed.", { code: causeCode })
    }
    return NextResponse.json(
      {
        error: error.message,
        ...(error instanceof LocalEmailChangeError ||
        error instanceof EmailDeliveryError
          ? { emailChange: getOwnEmailChangeState(accountId) }
          : {}),
      },
      {
        status:
          error instanceof LocalEmailChangeError ||
          error instanceof EmailDeliveryError
            ? getErrorStatus(error)
            : 400,
      },
    )
  }
  console.error("Local account email change failed.", error)
  return NextResponse.json(
    { error: "Aplikasi gagal memproses perubahan email." },
    { status: 500 },
  )
}

export async function POST(request: NextRequest) {
  const user = requireLocalUser(request, true)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengelola akun lokal." },
      { status: 403 },
    )
  }

  const body = await readRequestBody(request)
  if (!body || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    if (body.action === "request") {
      const emailChange = await requestOwnEmailChange(user.id, body.email)
      return NextResponse.json(
        { emailChange },
        { headers: { "Cache-Control": "no-store" } },
      )
    }
    if (body.action === "resend") {
      const emailChange = await resendOwnEmailChangeCode(user.id)
      return NextResponse.json(
        { emailChange },
        { headers: { "Cache-Control": "no-store" } },
      )
    }
    if (body.action === "verify") {
      const profile = await verifyOwnEmailChange(user.id, body.code)
      return NextResponse.json(
        {
          user: { username: user.username },
          profile,
          emailChange: getOwnEmailChangeState(user.id),
        },
        { headers: { "Cache-Control": "no-store" } },
      )
    }
    return NextResponse.json(
      { error: "Tindakan perubahan email tidak valid." },
      { status: 400 },
    )
  } catch (error) {
    return handleError(error, user.id)
  }
}

export async function DELETE(request: NextRequest) {
  const user = requireLocalUser(request, true)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengelola akun lokal." },
      { status: 403 },
    )
  }

  try {
    cancelOwnEmailChange(user.id)
    return NextResponse.json(
      { emailChange: null },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    return handleError(error, user.id)
  }
}

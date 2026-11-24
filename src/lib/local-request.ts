import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import {
  hasLocalPagePermission,
  hasLocalPermission,
  getSessionUser,
  SESSION_COOKIE,
  type LocalUser,
} from "./local-auth"
import type { LocalPagePermission, LocalPermission } from "./access-types"

function getLocalHost(request: NextRequest) {
  const host = request.headers.get("host")
  if (!host) return null

  try {
    const url = new URL(`http://${host}`)
    if (
      url.host.toLowerCase() !== host.toLowerCase() ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname.toLowerCase())
    ) {
      return null
    }
    return url
  } catch {
    return null
  }
}

export function isLocalOrigin(request: NextRequest, mutation = false) {
  const localHost = getLocalHost(request)
  if (!localHost) return false
  if (!mutation) return true

  const origin = request.headers.get("origin")
  if (!origin) return false
  try {
    const parsedOrigin = new URL(origin)
    return (
      parsedOrigin.protocol === request.nextUrl.protocol &&
      parsedOrigin.hostname.toLowerCase() === localHost.hostname.toLowerCase() &&
      parsedOrigin.host.toLowerCase() === localHost.host.toLowerCase()
    )
  } catch {
    return false
  }
}

export function requireLocalUser(
  request: NextRequest,
  mutation = false,
): LocalUser | NextResponse {
  if (!isLocalOrigin(request, mutation)) {
    return NextResponse.json(
      { error: "Permintaan hanya diizinkan melalui aplikasi localhost." },
      { status: 403 },
    )
  }
  const user = getSessionUser(request.cookies.get(SESSION_COOKIE)?.value)
  if (!user) {
    return NextResponse.json(
      { error: "Sesi tidak valid atau telah berakhir. Masuk kembali." },
      { status: 401 },
    )
  }
  return user
}

export function requireLocalPermission(
  request: NextRequest,
  permission: LocalPermission,
  mutation = true,
  page?: LocalPagePermission,
): LocalUser | NextResponse {
  const user = requireLocalUser(request, mutation)
  if (user instanceof NextResponse) return user
  if (page && !hasLocalPagePermission(user, page)) {
    return NextResponse.json(
      { error: "Akun ini tidak memiliki akses ke halaman tersebut." },
      { status: 403 },
    )
  }
  if (!hasLocalPermission(user, permission)) {
    return NextResponse.json(
      { error: "Akun ini belum diberi izin untuk mengubah data tersebut." },
      { status: 403 },
    )
  }
  return user
}

export function requireLocalPagePermission(
  request: NextRequest,
  page: LocalPagePermission,
  mutation = false,
): LocalUser | NextResponse {
  const user = requireLocalUser(request, mutation)
  if (user instanceof NextResponse) return user
  if (!hasLocalPagePermission(user, page)) {
    return NextResponse.json(
      { error: "Akun ini tidak memiliki akses ke halaman tersebut." },
      { status: 403 },
    )
  }
  return user
}

export function isResponse(value: LocalUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

export async function readJsonObject(request: Request) {
  try {
    const body: unknown = await request.json()
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function setSessionCookie(
  response: NextResponse,
  request: NextRequest,
  token: string,
) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 12,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })
}

import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import type { LocalPagePermission, LocalPermission, LocalUser } from "@/lib/access-types"
import { requireSupabaseUser, requireSupabasePermission, isResponse } from "@/lib/supabase-request"

export async function requireLocalUser(request: NextRequest, _mutation = false): Promise<LocalUser | NextResponse> {
  return requireSupabaseUser(request)
}

export async function requireLocalPermission(request: NextRequest, permission: LocalPermission, _mutation = true, page?: LocalPagePermission): Promise<LocalUser | NextResponse> {
  return requireSupabasePermission(request, permission, page)
}

export async function requireLocalPagePermission(request: NextRequest, page: LocalPagePermission, _mutation = false): Promise<LocalUser | NextResponse> {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  if (!user.pagePermissions?.[page]) return NextResponse.json({ error: "Akun ini tidak memiliki akses ke halaman tersebut." }, { status: 403 })
  return user
}

export { isResponse }

export async function readJsonObject(request: Request) {
  try {
    const body: unknown = await request.json()
    return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : null
  } catch {
    return null
  }
}

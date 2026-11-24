import "server-only"

import { NextResponse, type NextRequest } from "next/server"
import type { LocalPagePermission, LocalPermission, LocalUser } from "@/lib/access-types"
import { getSupabaseSession } from "@/lib/supabase-auth"

export async function requireSupabaseUser(_request: NextRequest): Promise<LocalUser | NextResponse> {
  const user = await getSupabaseSession()
  if (!user) return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir. Masuk kembali." }, { status: 401 })
  return user
}

export async function requireSupabasePermission(
  request: NextRequest,
  permission: LocalPermission,
  page?: LocalPagePermission,
): Promise<LocalUser | NextResponse> {
  const user = await requireSupabaseUser(request)
  if (user instanceof NextResponse) return user
  if (page && !user.pagePermissions?.[page]) return NextResponse.json({ error: "Akun ini tidak memiliki akses ke halaman tersebut." }, { status: 403 })
  if (!user.permissions?.[permission]) return NextResponse.json({ error: "Akun ini belum diberi izin untuk mengubah data tersebut." }, { status: 403 })
  return user
}

export function isResponse(value: LocalUser | NextResponse): value is NextResponse {
  return value instanceof NextResponse
}

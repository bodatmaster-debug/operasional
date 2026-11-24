import { NextResponse, type NextRequest } from "next/server"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "asset-completeness")
  if (isResponse(user)) return user
  const body = request.nextUrl
  return NextResponse.json({ ok: true, href: body.pathname })
}

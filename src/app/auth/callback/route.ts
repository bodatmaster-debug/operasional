import { NextResponse, type NextRequest } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL("/", request.url)
  url.searchParams.set("auth_error", error)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl
  if (callbackUrl.searchParams.has("error")) {
    return loginRedirect(request, callbackUrl.searchParams.get("error") === "access_denied" ? "cancelled" : "provider")
  }
  const code = callbackUrl.searchParams.get("code")
  if (!code) return loginRedirect(request, "missing_code")

  const supabase = createClient(await cookies())
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return loginRedirect(request, "exchange")
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user?.id) return loginRedirect(request, "identity")
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("user_id,status,access_revoked_at,banned_until,role,eula_version,eula_accepted_at")
    .eq("user_id", user.id)
    .maybeSingle()
  if (profileError || !profile || profile.user_id !== user.id) return loginRedirect(request, "profile")
  if (profile.access_revoked_at || (profile.banned_until && Date.parse(profile.banned_until) > Date.now())) {
    await supabase.auth.signOut()
    return loginRedirect(request, "denied")
  }
  if (profile.status === "rejected") {
    await supabase.auth.signOut()
    return loginRedirect(request, "rejected")
  }
  if (profile.status !== "active") return NextResponse.redirect(new URL("/menunggu-persetujuan", request.url))
  if (profile.role !== "admin" && (!profile.eula_version || !profile.eula_accepted_at)) {
    return loginRedirect(request, "eula")
  }
  return NextResponse.redirect(new URL("/", request.url))
}

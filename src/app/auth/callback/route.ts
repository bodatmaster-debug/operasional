import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseGoogleSession, isLocalRole } from "@/lib/local-auth"
import { createClient } from "@/utils/supabase/server"
import { setSessionCookie } from "@/lib/local-request"

function loginRedirect(request: NextRequest, error: string) {
  const url = new URL("/", request.url)
  url.searchParams.set("auth_error", error)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const callbackUrl = request.nextUrl
  if (callbackUrl.searchParams.has("error")) {
    return loginRedirect(
      request,
      callbackUrl.searchParams.get("error") === "access_denied"
        ? "cancelled"
        : "provider",
    )
  }

  const code = callbackUrl.searchParams.get("code")
  if (!code) return loginRedirect(request, "missing_code")

  const supabase = createClient(await cookies())
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) return loginRedirect(request, "exchange")

  const { data: userData, error: userError } = await supabase.auth.getUser()
  const user = userData.user
  if (userError || !user?.id || !user.email) {
    return loginRedirect(request, "identity")
  }

  const googleIdentity = user.identities?.find(
    (identity) => identity.provider === "google",
  )
  const googleSub = googleIdentity?.identity_data?.sub
  if (typeof googleSub !== "string" || !googleSub.trim()) {
    return loginRedirect(request, "identity")
  }

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id,email,username,full_name,role,status,access_revoked_at,banned_until,eula_version,eula_accepted_at",
    )
    .eq("user_id", user.id)
    .maybeSingle()

  if (profileError || !profile || profile.user_id !== user.id) {
    return loginRedirect(request, "profile")
  }
  if (
    typeof profile.email !== "string" ||
    profile.email.toLowerCase() !== user.email.toLowerCase() ||
    typeof profile.username !== "string" ||
    typeof profile.full_name !== "string" ||
    !isLocalRole(profile.role)
  ) {
    return loginRedirect(request, "profile")
  }
  if (profile.access_revoked_at) return loginRedirect(request, "denied")

  const bannedUntil =
    typeof profile.banned_until === "string"
      ? Date.parse(profile.banned_until)
      : Number.NaN
  if (Number.isFinite(bannedUntil) && bannedUntil > Date.now()) {
    return loginRedirect(request, "denied")
  }
  if (profile.status === "rejected") return loginRedirect(request, "rejected")
  if (profile.status !== "active") {
    return NextResponse.redirect(new URL("/menunggu-persetujuan", request.url))
  }
  if (
    profile.role !== "admin" &&
    (!profile.eula_version || !profile.eula_accepted_at)
  ) {
    return loginRedirect(request, "eula")
  }

  try {
    const bridge = await createSupabaseGoogleSession({
      userId: user.id,
      googleSub,
      email: profile.email,
      emailVerifiedAt: user.email_confirmed_at ?? null,
      eulaVersion: profile.eula_version,
      eulaAcceptedAt: profile.eula_accepted_at,
      username: profile.username,
      fullName: profile.full_name,
      role: profile.role,
    })
    const response = NextResponse.redirect(new URL("/", request.url))
    setSessionCookie(response, request, bridge.token)
    return response
  } catch (error) {
    console.error("Supabase Google-to-local session bridge failed.", error)
    return loginRedirect(request, "unexpected")
  }
}

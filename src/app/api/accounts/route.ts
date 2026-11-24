import { NextResponse, type NextRequest } from "next/server"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"
import { requireSupabaseUser } from "@/lib/supabase-request"
import { isResponse, readJsonObject } from "@/lib/local-request"

export async function GET(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang dapat mengelola akun." }, { status: 403 })
  const supabase = await getSupabaseRuntimeClient()

  const [accounts, pending, rolePermissions, rolePagePermissions] = await Promise.all([
    supabase.from("user_profiles").select("*").order("username"),
    supabase.from("user_profiles").select("*").eq("status", "pending"),
    supabase.from("role_permissions").select("*"),
    supabase.from("role_page_permissions").select("*"),
  ])

  return NextResponse.json({
    currentAccountId: user.id,
    accounts: accounts.data ?? [],
    pendingRegistrations: pending.data ?? [],
    rolePermissions: rolePermissions.data ?? [],
    rolePagePermissions: rolePagePermissions.data ?? [],
  }, { headers: { "Cache-Control": "no-store" } })
}

export async function PATCH(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin") return NextResponse.json({ error: "Hanya Admin yang dapat mengelola akun." }, { status: 403 })
  const body = await readJsonObject(request)
  if (!body || typeof body.action !== "string") return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()

  if (body.action === "approve") {
    const { error } = await supabase.from("user_profiles").update({ status: "active", role: body.role ?? "user", yayasan_id: body.yayasanId ?? null, updated_at: new Date().toISOString() }).eq("user_id", body.registrationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "reject") {
    const { error } = await supabase.from("user_profiles").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("user_id", body.registrationId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "role-permissions") {
    const permissions = body.permissions as Record<string, unknown> | undefined
    const pagePermissions = body.pagePermissions as Record<string, boolean> | undefined
    const role = body.role as string
    const { error } = await supabase.from("role_permissions").update({
      can_manage_directory: permissions?.directory ? 1 : 0,
      can_manage_assets: permissions?.assets ? 1 : 0,
      can_manage_maintenance: permissions?.maintenance ? 1 : 0,
    }).eq("role", role)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (pagePermissions) {
      for (const [page, canAccess] of Object.entries(pagePermissions)) {
        await supabase.from("role_page_permissions").update({ can_access: canAccess ? 1 : 0 }).eq("role", role).eq("page", page)
      }
    }
    return NextResponse.json({ ok: true })
  }
  if (body.action === "account-role") {
    const { error } = await supabase.from("user_profiles").update({ role: body.role, updated_at: new Date().toISOString() }).eq("user_id", body.accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "revoke-access") {
    const { error } = await supabase.from("user_profiles").update({ access_revoked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("user_id", body.accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "restore-access") {
    const { error } = await supabase.from("user_profiles").update({ access_revoked_at: null, updated_at: new Date().toISOString() }).eq("user_id", body.accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "ban-account") {
    const durationDays = Number(body.durationDays)
    const bannedUntil = new Date(Date.now() + (Number.isFinite(durationDays) ? durationDays : 0) * 86400000).toISOString()
    const { error } = await supabase.from("user_profiles").update({ banned_until: bannedUntil, updated_at: new Date().toISOString() }).eq("user_id", body.accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ bannedUntil })
  }
  if (body.action === "unban-account") {
    const { error } = await supabase.from("user_profiles").update({ banned_until: null, updated_at: new Date().toISOString() }).eq("user_id", body.accountId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  }
  if (body.action === "delete-account") {
    return NextResponse.json({ error: "Penghapusan akun Auth memerlukan Supabase Admin API/service role." }, { status: 501 })
  }
  return NextResponse.json({ error: "Aksi akun tidak valid." }, { status: 400 })
}

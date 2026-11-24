import { NextResponse, type NextRequest } from "next/server"
import {
  createAccount,
  isLocalRole,
  listAccounts,
  listRolePagePermissions,
  listRolePermissions,
  LocalAuthError,
  approveRegistration,
  listPendingRegistrations,
  rejectRegistration,
  updateRolePermissions,
  updateManagedAccountRole,
  setManagedAccountAccessRevoked,
  setManagedAccountBan,
  clearManagedAccountBan,
  deleteManagedAccount,
} from "@/lib/local-auth"
import { isResponse, readJsonObject, requireLocalUser } from "@/lib/local-request"

export function GET(request: NextRequest) {
  const user = requireLocalUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat mengelola akun lokal." },
      { status: 403 },
    )
  }
  return NextResponse.json({
    currentAccountId: user.id,
    accounts: listAccounts(),
    pendingRegistrations: listPendingRegistrations(),
    rolePermissions: listRolePermissions(),
    rolePagePermissions: listRolePagePermissions(),
  }, {
    headers: { "Cache-Control": "no-store" },
  })
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
  const body = await readJsonObject(request)
  if (!body || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    if (body.action === "approve") {
      approveRegistration(body.registrationId, body.role, user.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "reject") {
      rejectRegistration(body.registrationId, user.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "role-permissions") {
      const permissions = updateRolePermissions(
        body.role,
        body.permissions,
        body.pagePermissions,
      )
      return NextResponse.json(permissions)
    }
    if (body.action === "account-role") {
      updateManagedAccountRole(body.accountId, body.role, user.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "revoke-access") {
      setManagedAccountAccessRevoked(body.accountId, user.id, true)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "restore-access") {
      setManagedAccountAccessRevoked(body.accountId, user.id, false)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "ban-account") {
      const bannedUntil = setManagedAccountBan(
        body.accountId,
        user.id,
        body.durationDays,
      )
      return NextResponse.json({ bannedUntil })
    }
    if (body.action === "unban-account") {
      clearManagedAccountBan(body.accountId, user.id)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "delete-account") {
      deleteManagedAccount(body.accountId, user.id)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "Aksi akun tidak valid." }, { status: 400 })
  } catch (error) {
    if (error instanceof LocalAuthError) {
      if (error.code === "account-not-found") {
        return NextResponse.json({ error: error.message }, { status: 404 })
      }
      if (
        error.code === "admin-access-required"
      ) {
        return NextResponse.json({ error: error.message }, { status: 403 })
      }
      if (
        error.code === "cannot-manage-self" ||
        error.code === "last-admin" ||
        error.code === "account-status-conflict"
      ) {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
      const status =
        error.code === "username-taken" ||
        error.code === "email-taken" ||
        error.code === "registration-not-found"
          ? 409
          : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Local account update failed.", error)
    return NextResponse.json(
      { error: "Aplikasi gagal memperbarui akun lokal." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireLocalUser(request, true)
  if (isResponse(user)) return user
  if (user.role !== "admin") {
    return NextResponse.json(
      { error: "Hanya Admin yang dapat membuat akun lokal." },
      { status: 403 },
    )
  }

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }
  if (!isLocalRole(body.role)) {
    return NextResponse.json({ error: "Peran akun tidak valid." }, { status: 400 })
  }

  try {
    const account = await createAccount(body.username, body.password, body.role)
    return NextResponse.json({ account }, { status: 201 })
  } catch (error) {
    if (error instanceof LocalAuthError) {
      const status = error.code === "username-taken" ? 409 : 400
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error("Local account creation failed.", error)
    return NextResponse.json(
      { error: "Aplikasi gagal membuat akun lokal." },
      { status: 500 },
    )
  }
}

import "server-only"

import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import { getLocalDatabase } from "./local-database.ts"
import {
  LOCAL_PAGE_PERMISSION_KEYS,
  isLocalPagePermission,
  isLocalPagePermissions,
} from "./access-types"
import type {
  LocalAccountProfile,
  LocalPermission,
  LocalPermissions,
  LocalPagePermission,
  LocalPagePermissions,
  LocalRole,
  LocalUser,
  ManagedLocalAccount,
} from "./access-types"
import {
  EULA_ACCEPTANCE_REQUIRED_MESSAGE,
  EULA_VERSION,
} from "./eula"

export const SESSION_COOKIE = "operasional_local_session"
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12
const PASSWORD_HASH_COST = 16_384
const PASSWORD_HASH_LENGTH = 64
const LOGIN_FAILURE_LIMIT = 5
const LOGIN_LOCK_MS = 15 * 60 * 1000
const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024
const PROFILE_AVATAR_MAX_DATA_URL_LENGTH =
  Math.ceil(PROFILE_AVATAR_MAX_BYTES / 3) * 4 + 64

export type { LocalRole, LocalUser } from "@/lib/access-types"

type AccountRow = LocalUser & {
  password_hash: string
  failed_login_attempts: number
  locked_until: number | null
}

type AccountAccessStatus = {
  access_revoked_at: string | null
  banned_until: number | null
}

export class LocalAuthError extends Error {
  readonly code:
    | "account-exists"
    | "account-not-found"
    | "account-status-conflict"
    | "invalid-role"
    | "invalid-account-id"
    | "invalid-ban-duration"
    | "invalid-username"
    | "invalid-email"
    | "invalid-avatar"
    | "invalid-password"
    | "username-taken"
    | "incorrect-current-password"
    | "account-locked"
    | "account-updated"
    | "invalid-full-name"
    | "email-taken"
    | "registration-not-found"
    | "invalid-google-identity"
    | "google-account-exists"
    | "google-email-in-use"
    | "eula-required"
    | "cannot-manage-self"
    | "admin-access-required"
    | "last-admin"

  constructor(
    message: string,
    code:
      | "account-exists"
      | "account-not-found"
      | "account-status-conflict"
      | "invalid-role"
      | "invalid-account-id"
      | "invalid-ban-duration"
      | "invalid-username"
      | "invalid-email"
      | "invalid-avatar"
      | "invalid-password"
      | "username-taken"
      | "incorrect-current-password"
      | "account-locked"
      | "account-updated"
      | "invalid-full-name"
      | "email-taken"
      | "registration-not-found"
      | "invalid-google-identity"
      | "google-account-exists"
      | "google-email-in-use"
      | "eula-required"
      | "cannot-manage-self"
      | "admin-access-required"
      | "last-admin",
  ) {
    super(message)
    this.code = code
  }
}

function requireEulaAcceptance(accepted: unknown) {
  if (accepted !== true) {
    throw new LocalAuthError(
      EULA_ACCEPTANCE_REQUIRED_MESSAGE,
      "eula-required",
    )
  }
  return {
    version: EULA_VERSION,
    acceptedAt: new Date().toISOString(),
  }
}

export function validateUsername(value: unknown) {
  if (typeof value !== "string") return null
  const username = value.trim().toLowerCase()
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) ? username : null
}

export function validatePassword(value: unknown) {
  return typeof value === "string" && value.length >= 12 && value.length <= 128
    ? value
    : null
}

export function isLocalRole(value: unknown): value is LocalRole {
  return value === "admin" || value === "supervisor" || value === "user"
}

export function validateFullName(value: unknown) {
  if (typeof value !== "string") return null
  const fullName = value.trim()
  return fullName.length >= 2 &&
    fullName.length <= 100 &&
    !/[\u0000-\u001f\u007f]/.test(fullName)
    ? fullName
    : null
}

export function getAccountPermissions(
  role: LocalRole,
): LocalPermissions {
  if (role === "admin") {
    return { directory: true, assets: true, maintenance: true }
  }
  const row = getLocalDatabase()
    .prepare(
      `SELECT can_manage_directory, can_manage_assets, can_manage_maintenance
       FROM role_permissions WHERE role = ?`,
    )
    .get(role) as
    | {
        can_manage_directory: number
        can_manage_assets: number
        can_manage_maintenance: number
      }
    | undefined
  if (!row) {
    throw new Error(`Konfigurasi hak akses untuk peran ${role} tidak ditemukan.`)
  }
  return {
    directory: row.can_manage_directory === 1,
    assets: row.can_manage_assets === 1,
    maintenance: row.can_manage_maintenance === 1,
  }
}

export function getAccountPagePermissions(
  role: LocalRole,
): LocalPagePermissions {
  const permissions: LocalPagePermissions = {
    directory: role === "admin",
    "asset-recording": role === "admin",
    "asset-non-juknis": role === "admin",
    "asset-surat-edaran": role === "admin",
    "asset-completeness": role === "admin",
    warehouse: role === "admin",
    maintenance: role === "admin",
  }
  if (role === "admin") return permissions

  const rows = getLocalDatabase()
    .prepare(
      `SELECT page, can_access
       FROM role_page_permissions WHERE role = ?`,
    )
    .all(role) as Array<{ page: string; can_access: number }>
  if (rows.length !== LOCAL_PAGE_PERMISSION_KEYS.length) {
    throw new Error(
      `Konfigurasi akses halaman untuk peran ${role} tidak lengkap.`,
    )
  }
  for (const row of rows) {
    if (!isLocalPagePermission(row.page)) {
      throw new Error(
        `Konfigurasi akses halaman untuk peran ${role} tidak valid.`,
      )
    }
    permissions[row.page] = row.can_access === 1
  }
  return permissions
}

export function hasLocalPermission(
  user: Pick<LocalUser, "id" | "role">,
  permission: LocalPermission,
) {
  return user.role === "admin" || getAccountPermissions(user.role)[permission]
}

export function hasLocalPagePermission(
  user: Pick<LocalUser, "id" | "role">,
  permission: LocalPagePermission,
) {
  return (
    user.role === "admin" ||
    getAccountPagePermissions(user.role)[permission]
  )
}

export function normalizeProfileEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new LocalAuthError("Email tidak valid.", "invalid-email")
  }
  const email = value.trim()
  if (!email) return null
  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    throw new LocalAuthError(
      "Masukkan alamat email dengan format yang valid.",
      "invalid-email",
    )
  }
  return email
}

type ProfileAvatar = {
  data: Buffer
  mimeType: "image/jpeg" | "image/png" | "image/webp"
}

function parseProfileAvatar(value: unknown): ProfileAvatar | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (
    typeof value !== "string" ||
    value.length > PROFILE_AVATAR_MAX_DATA_URL_LENGTH
  ) {
    throw new LocalAuthError(
      "Foto profil harus berukuran maksimal 5 MiB.",
      "invalid-avatar",
    )
  }

  const match =
    /^data:(image\/jpeg|image\/png|image\/webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    )
  if (!match) {
    throw new LocalAuthError(
      "Foto profil harus berformat JPEG, PNG, atau WebP.",
      "invalid-avatar",
    )
  }

  const mimeType = match[1] as ProfileAvatar["mimeType"]
  const data = Buffer.from(match[2], "base64")
  const isPng =
    data.length >= 8 &&
    data.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  const isJpeg =
    data.length >= 3 &&
    data[0] === 0xff &&
    data[1] === 0xd8 &&
    data[2] === 0xff
  const isWebp =
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  const matchesMime =
    (mimeType === "image/jpeg" && isJpeg) ||
    (mimeType === "image/png" && isPng) ||
    (mimeType === "image/webp" && isWebp)

  if (
    data.length === 0 ||
    data.length > PROFILE_AVATAR_MAX_BYTES ||
    data.toString("base64") !== match[2] ||
    !matchesMime
  ) {
    throw new LocalAuthError(
      "Data foto profil tidak valid atau ukurannya melebihi 5 MiB.",
      "invalid-avatar",
    )
  }
  return { data, mimeType }
}

function toAvatarDataUrl(
  data: Uint8Array | null,
  mimeType: string | null,
) {
  if (!data || !mimeType) return null
  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`
}

function deriveScrypt(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      password,
      salt,
      PASSWORD_HASH_LENGTH,
      { N: PASSWORD_HASH_COST, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })
}

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await deriveScrypt(password, salt)
  return `scrypt$${PASSWORD_HASH_COST}$${salt.toString("base64url")}$${hash.toString("base64url")}`
}

async function verifyPassword(password: string, encoded: string) {
  if (password.length > 128) return false
  const [algorithm, costText, saltText, hashText] = encoded.split("$")
  if (
    algorithm !== "scrypt" ||
    Number(costText) !== PASSWORD_HASH_COST ||
    !saltText ||
    !hashText
  ) {
    return false
  }
  const salt = Buffer.from(saltText, "base64url")
  const expected = Buffer.from(hashText, "base64url")
  if (salt.length !== 16 || expected.length !== PASSWORD_HASH_LENGTH) {
    return false
  }
  const actual = await deriveScrypt(password, salt)
  return timingSafeEqual(actual, expected)
}

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

function insertSession(token: string, accountId: string) {
  const db = getLocalDatabase()
  const now = new Date()
  db.prepare("DELETE FROM auth_session WHERE expires_at <= ?").run(now.getTime())
  db.prepare(
    `INSERT INTO auth_session (token_hash, account_id, created_at, expires_at)
     VALUES (?, ?, ?, ?)`,
  ).run(
    hashToken(token),
    accountId,
    now.toISOString(),
    now.getTime() + SESSION_MAX_AGE_SECONDS * 1000,
  )
}

function createToken() {
  return randomBytes(32).toString("base64url")
}

export function hasAccounts() {
  return Boolean(
    getLocalDatabase().prepare("SELECT 1 AS present FROM account LIMIT 1").get(),
  )
}

export function getSessionUser(token: string | undefined): LocalUser | null {
  if (!token || token.length > 128) return null
  const db = getLocalDatabase()
  const row = db
    .prepare(
      `SELECT a.id, a.username, a.role, a.access_revoked_at, a.banned_until,
              s.expires_at
       FROM auth_session s JOIN account a ON a.id = s.account_id
       WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as
    | (LocalUser & AccountAccessStatus & { expires_at: number })
    | undefined

  if (!row) return null
  if (row.expires_at <= Date.now()) {
    db.prepare("DELETE FROM auth_session WHERE token_hash = ?").run(hashToken(token))
    return null
  }
  if (
    row.access_revoked_at !== null ||
    (row.banned_until !== null && row.banned_until > Date.now())
  ) {
    db.prepare("DELETE FROM auth_session WHERE account_id = ?").run(row.id)
    return null
  }
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    permissions: getAccountPermissions(row.role),
    pagePermissions: getAccountPagePermissions(row.role),
  }
}

export async function createInitialAdmin(usernameInput: unknown, passwordInput: unknown) {
  const username = validateUsername(usernameInput)
  if (!username) {
    throw new LocalAuthError(
      "Username harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
      "invalid-username",
    )
  }
  const password = validatePassword(passwordInput)
  if (!password) {
    throw new LocalAuthError("Password harus berisi 12–128 karakter.", "invalid-password")
  }

  const passwordHash = await hashPassword(password)
  const user: LocalUser = {
    id: randomUUID(),
    username,
    role: "admin",
    permissions: { directory: true, assets: true, maintenance: true },
  }
  const token = createToken()
  const now = new Date().toISOString()
  const db = getLocalDatabase()

  db.exec("BEGIN IMMEDIATE")
  try {
    if (hasAccounts()) {
      throw new LocalAuthError("Setup Admin sudah diselesaikan.", "account-exists")
    }
    db.prepare(
      `INSERT INTO account (id, username, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
    ).run(user.id, username, passwordHash, now, now)
    db.prepare(
      `INSERT INTO account_permissions (
        account_id, can_manage_directory, can_manage_assets, can_manage_maintenance
      ) VALUES (?, 1, 1, 1)`,
    ).run(user.id)
    insertSession(token, user.id)
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new LocalAuthError("Username sudah digunakan.", "username-taken")
    }
    throw error
  }
  return { user, token }
}

export async function createAccount(
  usernameInput: unknown,
  passwordInput: unknown,
  roleInput: unknown,
) {
  const username = validateUsername(usernameInput)
  if (!username) {
    throw new LocalAuthError(
      "Username harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
      "invalid-username",
    )
  }
  const password = validatePassword(passwordInput)
  if (!password) {
    throw new LocalAuthError("Password harus berisi 12–128 karakter.", "invalid-password")
  }
  if (!isLocalRole(roleInput)) {
    throw new LocalAuthError("Peran akun tidak valid.", "invalid-role")
  }

  const passwordHash = await hashPassword(password)
  const user: LocalUser = {
    id: randomUUID(),
    username,
    role: roleInput,
    permissions: getAccountPermissions(roleInput),
    pagePermissions: getAccountPagePermissions(roleInput),
  }
  const now = new Date().toISOString()
  try {
    getLocalDatabase()
      .prepare(
        `INSERT INTO account (id, username, password_hash, role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(user.id, username, passwordHash, roleInput, now, now)
    getLocalDatabase()
      .prepare("INSERT INTO account_permissions (account_id) VALUES (?)")
      .run(user.id)
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new LocalAuthError("Username sudah digunakan.", "username-taken")
    }
    throw error
  }
  return user
}

export function listAccounts(): ManagedLocalAccount[] {
  const accounts = getLocalDatabase()
    .prepare(
      `SELECT id, username, role, access_revoked_at, banned_until
       FROM account ORDER BY username COLLATE NOCASE`,
    )
    .all() as unknown as Array<
      Pick<ManagedLocalAccount, "id" | "username" | "role"> &
        AccountAccessStatus
    >
  return accounts.map((account) => ({
    ...account,
    permissions: getAccountPermissions(account.role),
    pagePermissions: getAccountPagePermissions(account.role),
    accessRevokedAt: account.access_revoked_at,
    bannedUntil:
      account.banned_until !== null && account.banned_until > Date.now()
        ? account.banned_until
        : null,
  }))
}

function withAccountManagementTransaction<T>(operation: () => T): T {
  const db = getLocalDatabase()
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = operation()
    db.exec("COMMIT")
    return result
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    throw error
  }
}

type ManagedAccountRow = {
  id: string
  role: LocalRole
  access_revoked_at: string | null
}

function requireManagedAccount(
  accountIdInput: unknown,
  actingAccountId: string,
): ManagedAccountRow {
  const actor = getLocalDatabase()
    .prepare(
      "SELECT role, access_revoked_at, banned_until FROM account WHERE id = ?",
    )
    .get(actingAccountId) as
    | (Pick<ManagedAccountRow, "role" | "access_revoked_at"> & {
        banned_until: number | null
      })
    | undefined
  if (
    !actor ||
    actor.role !== "admin" ||
    actor.access_revoked_at !== null ||
    (actor.banned_until !== null && actor.banned_until > Date.now())
  ) {
    throw new LocalAuthError(
      "Hak akses Admin tidak lagi aktif. Masuk kembali dengan akun Admin yang aktif.",
      "admin-access-required",
    )
  }
  if (
    typeof accountIdInput !== "string" ||
    accountIdInput.length < 1 ||
    accountIdInput.length > 128
  ) {
    throw new LocalAuthError("ID akun tidak valid.", "invalid-account-id")
  }
  if (accountIdInput === actingAccountId) {
    throw new LocalAuthError(
      "Admin tidak dapat mengubah atau menghapus akun yang sedang digunakan.",
      "cannot-manage-self",
    )
  }

  const account = getLocalDatabase()
    .prepare("SELECT id, role, access_revoked_at FROM account WHERE id = ?")
    .get(accountIdInput) as ManagedAccountRow | undefined
  if (!account) {
    throw new LocalAuthError("Akun tidak ditemukan.", "account-not-found")
  }
  return account
}

function requireAnotherActiveAdmin(account: ManagedAccountRow) {
  if (account.role !== "admin") return
  const otherAdmins = getLocalDatabase()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM account
       WHERE id <> ? AND role = 'admin' AND access_revoked_at IS NULL
         AND (banned_until IS NULL OR banned_until <= ?)`,
    )
    .get(account.id, Date.now()) as { count: number }
  if (otherAdmins.count === 0) {
    throw new LocalAuthError(
      "Akun ini adalah Admin aktif terakhir. Tambahkan Admin lain sebelum mencabut akses, memban, menghapus, atau menurunkan perannya.",
      "last-admin",
    )
  }
}

export function updateManagedAccountRole(
  accountIdInput: unknown,
  roleInput: unknown,
  actingAccountId: string,
) {
  if (!isLocalRole(roleInput)) {
    throw new LocalAuthError("Peran akun tidak valid.", "invalid-role")
  }
  withAccountManagementTransaction(() => {
    const account = requireManagedAccount(accountIdInput, actingAccountId)
    if (account.role === "admin" && roleInput !== "admin") {
      requireAnotherActiveAdmin(account)
    }
    if (account.role !== roleInput) {
      const db = getLocalDatabase()
      db.prepare("UPDATE account SET role = ?, updated_at = ? WHERE id = ?").run(
        roleInput,
        new Date().toISOString(),
        account.id,
      )
      db.prepare("DELETE FROM auth_session WHERE account_id = ?").run(account.id)
    }
  })
}

export function setManagedAccountAccessRevoked(
  accountIdInput: unknown,
  actingAccountId: string,
  revoked: boolean,
) {
  withAccountManagementTransaction(() => {
    const account = requireManagedAccount(accountIdInput, actingAccountId)
    if (revoked && account.access_revoked_at === null) {
      requireAnotherActiveAdmin(account)
    }
    const db = getLocalDatabase()
    db.prepare(
      "UPDATE account SET access_revoked_at = ?, updated_at = ? WHERE id = ?",
    ).run(revoked ? new Date().toISOString() : null, new Date().toISOString(), account.id)
    if (revoked) {
      db.prepare("DELETE FROM auth_session WHERE account_id = ?").run(account.id)
    }
  })
}

export function setManagedAccountBan(
  accountIdInput: unknown,
  actingAccountId: string,
  durationDaysInput: unknown,
) {
  if (
    durationDaysInput !== 1 &&
    durationDaysInput !== 7 &&
    durationDaysInput !== 30
  ) {
    throw new LocalAuthError(
      "Durasi ban harus 1, 7, atau 30 hari.",
      "invalid-ban-duration",
    )
  }
  let bannedUntil = 0
  withAccountManagementTransaction(() => {
    const account = requireManagedAccount(accountIdInput, actingAccountId)
    if (account.access_revoked_at !== null) {
      throw new LocalAuthError(
        "Pulihkan akses akun terlebih dahulu sebelum memberikan ban sementara.",
        "account-status-conflict",
      )
    }
    requireAnotherActiveAdmin(account)
    bannedUntil = Date.now() + durationDaysInput * 24 * 60 * 60 * 1000
    const db = getLocalDatabase()
    db.prepare(
      "UPDATE account SET banned_until = ?, updated_at = ? WHERE id = ?",
    ).run(bannedUntil, new Date().toISOString(), account.id)
    db.prepare("DELETE FROM auth_session WHERE account_id = ?").run(account.id)
  })
  return bannedUntil
}

export function clearManagedAccountBan(
  accountIdInput: unknown,
  actingAccountId: string,
) {
  withAccountManagementTransaction(() => {
    const account = requireManagedAccount(accountIdInput, actingAccountId)
    getLocalDatabase()
      .prepare("UPDATE account SET banned_until = NULL, updated_at = ? WHERE id = ?")
      .run(new Date().toISOString(), account.id)
  })
}

export function deleteManagedAccount(
  accountIdInput: unknown,
  actingAccountId: string,
) {
  withAccountManagementTransaction(() => {
    const account = requireManagedAccount(accountIdInput, actingAccountId)
    requireAnotherActiveAdmin(account)
    getLocalDatabase().prepare("DELETE FROM account WHERE id = ?").run(account.id)
  })
}

export function listRolePermissions(): Record<
  Exclude<LocalRole, "admin">,
  LocalPermissions
> {
  return {
    supervisor: getAccountPermissions("supervisor"),
    user: getAccountPermissions("user"),
  }
}

export function listRolePagePermissions(): Record<
  Exclude<LocalRole, "admin">,
  LocalPagePermissions
> {
  return {
    supervisor: getAccountPagePermissions("supervisor"),
    user: getAccountPagePermissions("user"),
  }
}

export function listPendingRegistrations() {
  return getLocalDatabase()
    .prepare(
      `SELECT id, full_name AS fullName, username, email, created_at AS createdAt,
              CASE WHEN google_sub IS NULL THEN 'local' ELSE 'google' END AS provider
       FROM account_registration WHERE status = 'pending'
       ORDER BY created_at`,
    )
    .all() as Array<{
      id: string
      fullName: string
      username: string
      email: string
      createdAt: string
      provider: "local" | "google"
    }>
}

export async function registerAccount(
  fullNameInput: unknown,
  usernameInput: unknown,
  emailInput: unknown,
  passwordInput: unknown,
  eulaAcceptedInput: unknown,
) {
  const eula = requireEulaAcceptance(eulaAcceptedInput)
  const fullName = validateFullName(fullNameInput)
  if (!fullName) {
    throw new LocalAuthError("Nama lengkap harus berisi 2–100 karakter.", "invalid-full-name")
  }
  const username = validateUsername(usernameInput)
  if (!username) {
    throw new LocalAuthError(
      "Username harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
      "invalid-username",
    )
  }
  const email = normalizeProfileEmail(emailInput)
  if (!email) {
    throw new LocalAuthError("Email wajib diisi untuk pendaftaran.", "invalid-email")
  }
  const password = validatePassword(passwordInput)
  if (!password) {
    throw new LocalAuthError("Password harus berisi 12–128 karakter.", "invalid-password")
  }

  const passwordHash = await hashPassword(password)
  const db = getLocalDatabase()
  const id = randomUUID()
  const now = new Date().toISOString()
  try {
    db.exec("BEGIN IMMEDIATE")
    if (db.prepare("SELECT 1 FROM account WHERE username = ? COLLATE NOCASE").get(username)) {
      throw new LocalAuthError("Username sudah digunakan.", "username-taken")
    }
    db.prepare(
      `INSERT INTO account_registration (
        id, full_name, username, email, password_hash, status, created_at,
        eula_version, eula_accepted_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
    ).run(
      id,
      fullName,
      username,
      email,
      passwordHash,
      now,
      eula.version,
      eula.acceptedAt,
    )
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      throw new LocalAuthError(
        "Username atau email sudah memiliki pendaftaran yang menunggu persetujuan.",
        "email-taken",
      )
    }
    throw error
  }
  return { id, status: "pending" as const }
}

export async function registerGoogleAccount(
  identity: {
    sub: unknown
    email: unknown
    fullName: unknown
  },
  eulaAcceptedInput: unknown,
) {
  const eula = requireEulaAcceptance(eulaAcceptedInput)
  if (
    typeof identity.sub !== "string" ||
    identity.sub.length < 1 ||
    identity.sub.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(identity.sub)
  ) {
    throw new LocalAuthError("Identitas Google tidak valid.", "invalid-google-identity")
  }
  const fullName = validateFullName(identity.fullName)
  if (!fullName) {
    throw new LocalAuthError("Nama dari akun Google tidak valid.", "invalid-full-name")
  }
  const normalizedEmail = normalizeProfileEmail(identity.email)
  if (!normalizedEmail) {
    throw new LocalAuthError("Akun Google tidak memiliki email yang valid.", "invalid-email")
  }
  const email = normalizedEmail.toLowerCase()
  const googleSub = identity.sub
  const db = getLocalDatabase()
  const existingPending = db
    .prepare(
      `SELECT id, eula_version, eula_accepted_at FROM account_registration
       WHERE google_sub = ? AND status = 'pending'`,
    )
    .get(googleSub) as
    | { id: string; eula_version: string | null; eula_accepted_at: string | null }
    | undefined
  if (existingPending) {
    if (!existingPending.eula_version || !existingPending.eula_accepted_at) {
      db.prepare(
        `UPDATE account_registration
         SET eula_version = ?, eula_accepted_at = ?
         WHERE id = ? AND (eula_version IS NULL OR eula_accepted_at IS NULL)`,
      ).run(eula.version, eula.acceptedAt, existingPending.id)
    }
    return { id: existingPending.id, status: "pending" as const }
  }

  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"))
  const id = randomUUID()
  const now = new Date().toISOString()
  try {
    db.exec("BEGIN IMMEDIATE")
    const pending = db
      .prepare(
        `SELECT id, eula_version, eula_accepted_at FROM account_registration
         WHERE google_sub = ? AND status = 'pending'`,
      )
      .get(googleSub) as
      | { id: string; eula_version: string | null; eula_accepted_at: string | null }
      | undefined
    if (pending) {
      if (!pending.eula_version || !pending.eula_accepted_at) {
        db.prepare(
          `UPDATE account_registration
           SET eula_version = ?, eula_accepted_at = ?
           WHERE id = ? AND (eula_version IS NULL OR eula_accepted_at IS NULL)`,
        ).run(eula.version, eula.acceptedAt, pending.id)
      }
      db.exec("COMMIT")
      return { id: pending.id, status: "pending" as const }
    }
    if (
      db
        .prepare("SELECT 1 FROM account_google_identity WHERE google_sub = ?")
        .get(googleSub)
    ) {
      throw new LocalAuthError(
        "Akun Google ini sudah terhubung. Gunakan tombol Masuk dengan Google.",
        "google-account-exists",
      )
    }
    if (
      db
        .prepare("SELECT 1 FROM account_profile WHERE email = ? COLLATE NOCASE")
        .get(email) ||
      db
        .prepare(
          `SELECT 1 FROM account_registration
           WHERE email = ? COLLATE NOCASE AND status = 'pending'`,
        )
        .get(email)
    ) {
      throw new LocalAuthError(
        "Email ini sudah digunakan akun lain. Masuk dengan metode akun tersebut; akun tidak ditautkan otomatis.",
        "google-email-in-use",
      )
    }

    let username = ""
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = `google-${randomBytes(5).toString("hex")}`
      const accountExists = db
        .prepare("SELECT 1 FROM account WHERE username = ? COLLATE NOCASE")
        .get(candidate)
      const registrationExists = db
        .prepare(
          `SELECT 1 FROM account_registration
           WHERE username = ? COLLATE NOCASE AND status = 'pending'`,
        )
        .get(candidate)
      if (!accountExists && !registrationExists) {
        username = candidate
        break
      }
    }
    if (!username) {
      throw new LocalAuthError(
        "Username Google tidak dapat dibuat. Coba lagi.",
        "username-taken",
      )
    }

    db.prepare(
      `INSERT INTO account_registration (
        id, full_name, username, email, password_hash, status, created_at,
        google_sub, eula_version, eula_accepted_at
      ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    ).run(
      id,
      fullName,
      username,
      email,
      passwordHash,
      now,
      googleSub,
      eula.version,
      eula.acceptedAt,
    )
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      throw new LocalAuthError(
        "Akun Google atau email ini sudah memiliki pendaftaran yang menunggu persetujuan.",
        "google-email-in-use",
      )
    }
    throw error
  }
  return { id, status: "pending" as const }
}

export function rejectRegistration(registrationId: unknown, reviewerId: string) {
  if (typeof registrationId !== "string" || !registrationId) {
    throw new LocalAuthError("Pendaftaran tidak ditemukan.", "registration-not-found")
  }
  const result = getLocalDatabase()
    .prepare(
      `UPDATE account_registration
       SET status = 'rejected', reviewed_at = ?, reviewed_by = ?
       WHERE id = ? AND status = 'pending'`,
    )
    .run(new Date().toISOString(), reviewerId, registrationId)
  if (result.changes !== 1) {
    throw new LocalAuthError("Pendaftaran tidak ditemukan atau sudah diproses.", "registration-not-found")
  }
}

export function approveRegistration(
  registrationId: unknown,
  roleInput: unknown,
  reviewerId: string,
) {
  if (typeof registrationId !== "string" || !registrationId) {
    throw new LocalAuthError("Pendaftaran tidak ditemukan.", "registration-not-found")
  }
  if (!isLocalRole(roleInput)) {
    throw new LocalAuthError("Peran akun tidak valid.", "invalid-role")
  }

  const db = getLocalDatabase()
  db.exec("BEGIN IMMEDIATE")
  try {
    const registration = db
      .prepare(
        `SELECT id, full_name, username, email, password_hash, google_sub
         FROM account_registration WHERE id = ? AND status = 'pending'`,
      )
      .get(registrationId) as
      | {
          id: string
          full_name: string
          username: string
          email: string
          password_hash: string
          google_sub: string | null
        }
      | undefined
    if (!registration) {
      throw new LocalAuthError("Pendaftaran tidak ditemukan atau sudah diproses.", "registration-not-found")
    }

    const accountId = randomUUID()
    const now = new Date().toISOString()
    db.prepare(
      `INSERT INTO account (id, username, password_hash, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(accountId, registration.username, registration.password_hash, roleInput, now, now)
    db.prepare("INSERT INTO account_permissions (account_id) VALUES (?)").run(accountId)
    db.prepare(
      `INSERT INTO account_profile (account_id, email, full_name, updated_at)
       VALUES (?, ?, ?, ?)`,
    ).run(accountId, registration.email, registration.full_name, now)
    if (registration.google_sub) {
      db.prepare(
        `INSERT INTO account_google_identity (google_sub, account_id, email, linked_at)
         VALUES (?, ?, ?, ?)`,
      ).run(registration.google_sub, accountId, registration.email, now)
    }
    db.prepare(
      `UPDATE account_registration
       SET status = 'approved', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
    ).run(now, reviewerId, registrationId)
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new LocalAuthError("Username sudah digunakan.", "username-taken")
    }
    throw error
  }
}

export function updateRolePermissions(
  roleInput: unknown,
  permissionsInput: unknown,
  pagePermissionsInput?: unknown,
) {
  if (roleInput !== "supervisor" && roleInput !== "user") {
    throw new LocalAuthError(
      "Izin hanya dapat dikonfigurasi untuk Supervisor atau User.",
      "invalid-role",
    )
  }
  if (
    typeof permissionsInput !== "object" ||
    permissionsInput === null ||
    !("directory" in permissionsInput) ||
    !("assets" in permissionsInput) ||
    !("maintenance" in permissionsInput) ||
    typeof permissionsInput.directory !== "boolean" ||
    typeof permissionsInput.assets !== "boolean" ||
    typeof permissionsInput.maintenance !== "boolean"
  ) {
    throw new LocalAuthError("Hak akses peran tidak valid.", "invalid-role")
  }
  const permissions = permissionsInput as LocalPermissions
  const pagePermissions =
    pagePermissionsInput === undefined
      ? getAccountPagePermissions(roleInput)
      : pagePermissionsInput
  if (!isLocalPagePermissions(pagePermissions)) {
    throw new LocalAuthError(
      "Daftar akses halaman untuk peran tidak valid.",
      "invalid-role",
    )
  }

  const validatedPagePermissions = pagePermissions
  const db = getLocalDatabase()
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = db
      .prepare(
        `UPDATE role_permissions
         SET can_manage_directory = ?,
             can_manage_assets = ?,
             can_manage_maintenance = ?
         WHERE role = ?`,
      )
      .run(
        Number(permissions.directory),
        Number(permissions.assets),
        Number(permissions.maintenance),
        roleInput,
      )
    if (result.changes !== 1) {
      throw new Error(
        `Konfigurasi hak akses untuk peran ${roleInput} tidak ditemukan.`,
      )
    }

    const updatePagePermission = db.prepare(
      `UPDATE role_page_permissions
       SET can_access = ?
       WHERE role = ? AND page = ?`,
    )
    for (const page of LOCAL_PAGE_PERMISSION_KEYS) {
      const pageResult = updatePagePermission.run(
        Number(validatedPagePermissions[page]),
        roleInput,
        page,
      )
      if (pageResult.changes !== 1) {
        throw new Error(
          `Konfigurasi akses halaman ${page} untuk peran ${roleInput} tidak ditemukan.`,
        )
      }
    }
    db.exec("COMMIT")
    return { permissions, pagePermissions: validatedPagePermissions }
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    throw error
  }
}

export function getOwnAccountProfile(accountId: string): LocalAccountProfile {
  const profile = getLocalDatabase()
    .prepare(
      `SELECT email, email_verified_at, avatar_data, avatar_mime_type
       FROM account_profile WHERE account_id = ?`,
    )
    .get(accountId) as
    | {
        email: string | null
        email_verified_at: string | null
        avatar_data: Uint8Array | null
        avatar_mime_type: string | null
      }
    | undefined

  return {
    email: profile?.email ?? null,
    emailVerifiedAt: profile?.email_verified_at ?? null,
    avatarDataUrl: toAvatarDataUrl(
      profile?.avatar_data ?? null,
      profile?.avatar_mime_type ?? null,
    ),
  }
}

async function verifyCurrentPassword(
  account: AccountRow,
  currentPasswordInput: unknown,
) {
  if (
    typeof currentPasswordInput !== "string" ||
    currentPasswordInput.length === 0 ||
    currentPasswordInput.length > 128
  ) {
    throw new LocalAuthError(
      "Masukkan password saat ini.",
      "incorrect-current-password",
    )
  }
  if (account.locked_until !== null && account.locked_until > Date.now()) {
    throw new LocalAuthError(
      "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
      "account-locked",
    )
  }

  if (!(await verifyPassword(currentPasswordInput, account.password_hash))) {
    const attempts = account.failed_login_attempts + 1
    const lockedUntil =
      attempts >= LOGIN_FAILURE_LIMIT ? Date.now() + LOGIN_LOCK_MS : null
    getLocalDatabase()
      .prepare(
        `UPDATE account SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
         WHERE id = ? AND password_hash = ?`,
      )
      .run(
        lockedUntil === null ? attempts : 0,
        lockedUntil,
        new Date().toISOString(),
        account.id,
        account.password_hash,
      )
    throw new LocalAuthError(
      lockedUntil
        ? "Terlalu banyak percobaan. Coba lagi dalam 15 menit."
        : "Password saat ini tidak sesuai.",
      lockedUntil ? "account-locked" : "incorrect-current-password",
    )
  }
}

export async function updateOwnAccountProfile(
  accountId: string,
  usernameInput: unknown,
  currentPasswordInput: unknown,
  avatarDataUrlInput: unknown,
) {
  const username = validateUsername(usernameInput)
  if (!username) {
    throw new LocalAuthError(
      "Username harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.",
      "invalid-username",
    )
  }
  const avatarUpdate = parseProfileAvatar(avatarDataUrlInput)
  const db = getLocalDatabase()
  const account = db
    .prepare(
      `SELECT id, username, role, password_hash, failed_login_attempts, locked_until
       FROM account WHERE id = ?`,
    )
    .get(accountId) as AccountRow | undefined
  if (!account) throw new Error("The authenticated account no longer exists.")

  const usernameChanged = username !== account.username
  if (usernameChanged) {
    await verifyCurrentPassword(account, currentPasswordInput)
  }

  const currentProfile = db
    .prepare(
      `SELECT avatar_data, avatar_mime_type
       FROM account_profile WHERE account_id = ?`,
    )
    .get(accountId) as
    | { avatar_data: Uint8Array | null; avatar_mime_type: string | null }
    | undefined
  const avatarData =
    avatarUpdate === undefined
      ? currentProfile?.avatar_data
        ? Buffer.from(currentProfile.avatar_data)
        : null
      : avatarUpdate?.data ?? null
  const avatarMimeType =
    avatarUpdate === undefined
      ? currentProfile?.avatar_mime_type ?? null
      : avatarUpdate?.mimeType ?? null
  const updatedAt = new Date().toISOString()

  db.exec("BEGIN IMMEDIATE")
  try {
    if (usernameChanged) {
      const result = db
        .prepare(
          `UPDATE account
           SET username = ?, failed_login_attempts = 0, locked_until = NULL,
               updated_at = ?
           WHERE id = ? AND username = ? AND password_hash = ?`,
        )
        .run(username, updatedAt, account.id, account.username, account.password_hash)
      if (result.changes !== 1) {
        throw new LocalAuthError(
          "Data akun berubah. Muat ulang halaman lalu coba lagi.",
          "account-updated",
        )
      }
    }

    db.prepare(
      `INSERT INTO account_profile (
         account_id, email, avatar_data, avatar_mime_type, updated_at
       ) VALUES (?, NULL, ?, ?, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         avatar_data = excluded.avatar_data,
         avatar_mime_type = excluded.avatar_mime_type,
         updated_at = excluded.updated_at`,
    ).run(accountId, avatarData, avatarMimeType, updatedAt)
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      throw new LocalAuthError("Username sudah digunakan.", "username-taken")
    }
    throw error
  }

  return {
    user: { id: account.id, username, role: account.role },
    profile: getOwnAccountProfile(accountId),
  }
}

export async function changeOwnPassword(
  accountId: string,
  currentPasswordInput: unknown,
  newPasswordInput: unknown,
  sessionToken: string,
) {
  if (
    typeof currentPasswordInput !== "string" ||
    currentPasswordInput.length === 0 ||
    currentPasswordInput.length > 128
  ) {
    throw new LocalAuthError(
      "Masukkan password saat ini.",
      "incorrect-current-password",
    )
  }
  const newPassword = validatePassword(newPasswordInput)
  if (!newPassword) {
    throw new LocalAuthError(
      "Password baru harus berisi 12–128 karakter.",
      "invalid-password",
    )
  }
  if (!sessionToken || sessionToken.length > 128) {
    throw new Error("The authenticated session token is unavailable.")
  }

  const db = getLocalDatabase()
  const account = db
    .prepare(
      `SELECT id, username, role, password_hash, failed_login_attempts, locked_until
       FROM account WHERE id = ?`,
    )
    .get(accountId) as AccountRow | undefined
  if (!account) throw new Error("The authenticated account no longer exists.")
  await verifyCurrentPassword(account, currentPasswordInput)

  const newPasswordHash = await hashPassword(newPassword)
  const updatedAt = new Date().toISOString()
  const currentTokenHash = hashToken(sessionToken)
  db.exec("BEGIN IMMEDIATE")
  try {
    const result = db
      .prepare(
        `UPDATE account
         SET password_hash = ?, failed_login_attempts = 0, locked_until = NULL, updated_at = ?
         WHERE id = ? AND password_hash = ?`,
      )
      .run(newPasswordHash, updatedAt, account.id, account.password_hash)
    if (result.changes !== 1) {
      throw new LocalAuthError(
        "Data akun berubah. Muat ulang halaman lalu coba lagi.",
        "account-updated",
      )
    }

    db.prepare(
      "DELETE FROM auth_session WHERE account_id = ? AND token_hash <> ?",
    ).run(account.id, currentTokenHash)
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    throw error
  }
}

export async function verifyOwnPassword(
  accountId: string,
  currentPasswordInput: unknown,
) {
  const account = getLocalDatabase()
    .prepare(
      `SELECT id, username, role, password_hash, failed_login_attempts, locked_until
       FROM account WHERE id = ?`,
    )
    .get(accountId) as AccountRow | undefined
  if (!account) throw new Error("The authenticated account no longer exists.")
  await verifyCurrentPassword(account, currentPasswordInput)
}

export async function authenticate(usernameInput: unknown, passwordInput: unknown) {
  if (typeof usernameInput !== "string" || typeof passwordInput !== "string") {
    return { status: "invalid" as const }
  }
  const username = usernameInput.trim().toLowerCase()
  const password = passwordInput
  if (username.length < 3 || username.length > 32 || !password || password.length > 128) {
    return { status: "invalid" as const }
  }

  const db = getLocalDatabase()
  const row = db
    .prepare(
      `SELECT id, username, role, password_hash, failed_login_attempts, locked_until,
              access_revoked_at, banned_until
       FROM account WHERE username = ? COLLATE NOCASE`,
    )
    .get(username) as (AccountRow & AccountAccessStatus) | undefined
  if (!row) {
    const pending = db
      .prepare(
        `SELECT password_hash FROM account_registration
         WHERE username = ? COLLATE NOCASE AND status = 'pending'`,
      )
      .get(username) as { password_hash: string } | undefined
    if (pending && (await verifyPassword(password, pending.password_hash))) {
      return { status: "pending" as const }
    }
    return { status: "invalid" as const }
  }
  if (row.locked_until !== null && row.locked_until > Date.now()) {
    return { status: "locked" as const }
  }

  if (!(await verifyPassword(password, row.password_hash))) {
    const attempts = row.failed_login_attempts + 1
    const lockedUntil = attempts >= LOGIN_FAILURE_LIMIT ? Date.now() + LOGIN_LOCK_MS : null
    db.prepare(
      `UPDATE account SET failed_login_attempts = ?, locked_until = ?, updated_at = ?
       WHERE id = ? AND password_hash = ?`,
    ).run(
      lockedUntil === null ? attempts : 0,
      lockedUntil,
      new Date().toISOString(),
      row.id,
      row.password_hash,
    )
    return { status: lockedUntil ? ("locked" as const) : ("invalid" as const) }
  }

  db.prepare(
    "UPDATE account SET failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?",
  ).run(new Date().toISOString(), row.id)
  if (row.access_revoked_at !== null) {
    return { status: "revoked" as const }
  }
  if (row.banned_until !== null && row.banned_until > Date.now()) {
    return { status: "banned" as const, bannedUntil: row.banned_until }
  }
  const token = createToken()
  insertSession(token, row.id)
  return {
    status: "authenticated" as const,
    token,
    user: {
      id: row.id,
      username: row.username,
      role: row.role,
      permissions: getAccountPermissions(row.role),
      pagePermissions: getAccountPagePermissions(row.role),
    },
  }
}

export function authenticateGoogleAccount(googleSubInput: unknown) {
  if (
    typeof googleSubInput !== "string" ||
    googleSubInput.length < 1 ||
    googleSubInput.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(googleSubInput)
  ) {
    return { status: "invalid" as const }
  }

  const db = getLocalDatabase()
  const row = db
    .prepare(
      `SELECT a.id, a.username, a.role, a.locked_until,
              a.access_revoked_at, a.banned_until
       FROM account_google_identity identity
       JOIN account a ON a.id = identity.account_id
       WHERE identity.google_sub = ?`,
    )
    .get(googleSubInput) as
    | (Pick<LocalUser, "id" | "username" | "role"> & {
        locked_until: number | null
      } & AccountAccessStatus)
    | undefined

  if (!row) {
    const pending = db
      .prepare(
        `SELECT 1 FROM account_registration
         WHERE google_sub = ? AND status = 'pending'`,
      )
      .get(googleSubInput)
    return pending
      ? { status: "pending" as const }
      : { status: "not-found" as const }
  }
  if (row.locked_until !== null && row.locked_until > Date.now()) {
    return { status: "locked" as const }
  }
  if (row.access_revoked_at !== null) {
    return { status: "revoked" as const }
  }
  if (row.banned_until !== null && row.banned_until > Date.now()) {
    return { status: "banned" as const, bannedUntil: row.banned_until }
  }

  const token = createToken()
  insertSession(token, row.id)
  return {
    status: "authenticated" as const,
    token,
    user: {
      id: row.id,
      username: row.username,
      role: row.role,
      permissions: getAccountPermissions(row.role),
      pagePermissions: getAccountPagePermissions(row.role),
    },
  }
}

export function deleteSession(token: string | undefined) {
  if (!token || token.length > 128) return
  getLocalDatabase()
    .prepare("DELETE FROM auth_session WHERE token_hash = ?")
    .run(hashToken(token))
}

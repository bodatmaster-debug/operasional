import "server-only"

import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto"
import { getLocalDatabase } from "./local-database.ts"
import {
  getOwnAccountProfile,
  LocalAuthError,
  normalizeProfileEmail,
} from "./local-auth.ts"
import {
  assertSmtpConfigured,
  sendEmailVerificationCode,
} from "./email-delivery.ts"

const CODE_LENGTH = 64
const CODE_COST = 16_384
const CODE_TTL_MS = 10 * 60 * 1000
const CODE_ATTEMPT_LIMIT = 5
const RESEND_COOLDOWN_MS = 60 * 1000
const SEND_WINDOW_MS = 60 * 60 * 1000
const SEND_WINDOW_LIMIT = 3

type EmailChangeRow = {
  account_id: string
  previous_email: string | null
  pending_email: string | null
  code_salt: string | null
  code_hash: string | null
  expires_at: string | null
  last_sent_at: string | null
  attempts: number
  window_started_at: string
  sends_in_window: number
  status: "pending" | "completed" | "cancelled" | "locked"
}

export class LocalEmailChangeError extends Error {
  readonly code:
    | "invalid-email"
    | "email-unchanged"
    | "email-already-empty"
    | "email-change-not-found"
    | "email-change-stale"
    | "email-code-expired"
    | "email-code-invalid"
    | "email-code-locked"
    | "email-send-cooldown"
    | "email-send-limit"

  constructor(
    message: string,
    code: LocalEmailChangeError["code"],
  ) {
    super(message)
    this.code = code
  }
}

function deriveCode(code: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(
      code,
      salt,
      CODE_LENGTH,
      { N: CODE_COST, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, key) => (error ? reject(error) : resolve(key)),
    )
  })
}

function getPendingChange(accountId: string) {
  return getLocalDatabase()
    .prepare(
      `SELECT account_id, previous_email, pending_email, code_salt, code_hash,
              expires_at, last_sent_at, attempts, window_started_at,
              sends_in_window, status
       FROM account_email_change
       WHERE account_id = ? AND status = 'pending'`,
    )
    .get(accountId) as EmailChangeRow | undefined
}

export function getOwnEmailChangeState(accountId: string) {
  const pending = getPendingChange(accountId)
  if (!pending || !pending.expires_at) return null

  return {
    pendingEmail: pending.pending_email,
    verificationTarget: pending.previous_email ? "current" as const : "new" as const,
    expiresAt: pending.expires_at,
  }
}

function getCurrentEmail(accountId: string) {
  const profile = getLocalDatabase()
    .prepare("SELECT email FROM account_profile WHERE account_id = ?")
    .get(accountId) as { email: string | null } | undefined
  return profile?.email ?? null
}

function normalizeRequestedEmail(value: unknown) {
  if (value !== null && typeof value !== "string") {
    throw new LocalEmailChangeError(
      "Masukkan alamat email dengan format yang valid.",
      "invalid-email",
    )
  }
  try {
    return normalizeProfileEmail(value ?? "")
  } catch (error) {
    if (!(error instanceof LocalAuthError)) throw error
    throw new LocalEmailChangeError(
      "Masukkan alamat email dengan format yang valid.",
      "invalid-email",
    )
  }
}

function addressesMatch(left: string | null, right: string | null) {
  return left?.toLowerCase() === right?.toLowerCase()
}

function assertSendAllowed(row: EmailChangeRow | undefined, now: number) {
  if (!row) return

  const lastSentAt = row.last_sent_at ? Date.parse(row.last_sent_at) : NaN
  if (Number.isFinite(lastSentAt) && now - lastSentAt < RESEND_COOLDOWN_MS) {
    throw new LocalEmailChangeError(
      "Tunggu 60 detik sebelum meminta kode verifikasi baru.",
      "email-send-cooldown",
    )
  }

  const windowStartedAt = Date.parse(row.window_started_at)
  const windowIsActive =
    Number.isFinite(windowStartedAt) &&
    now - windowStartedAt < SEND_WINDOW_MS
  if (windowIsActive && row.sends_in_window >= SEND_WINDOW_LIMIT) {
    throw new LocalEmailChangeError(
      "Batas tiga email verifikasi per jam tercapai. Coba lagi nanti.",
      "email-send-limit",
    )
  }
}

async function createCode() {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0")
  const salt = randomBytes(16)
  const hash = await deriveCode(code, salt)
  return { code, salt: salt.toString("base64url"), hash: hash.toString("base64url") }
}

function savePendingCode(
  accountId: string,
  previousEmail: string | null,
  pendingEmail: string | null,
  codeSalt: string,
  codeHash: string,
  now: number,
) {
  const db = getLocalDatabase()
  const nowText = new Date(now).toISOString()
  db.exec("BEGIN IMMEDIATE")
  try {
    const existing = db
      .prepare(
        `SELECT account_id, previous_email, pending_email, code_salt, code_hash,
                expires_at, last_sent_at, attempts, window_started_at,
                sends_in_window, status
         FROM account_email_change WHERE account_id = ?`,
      )
      .get(accountId) as EmailChangeRow | undefined
    assertSendAllowed(existing, now)

    const windowStartedAt = existing
      ? Date.parse(existing.window_started_at)
      : NaN
    const windowIsActive =
      Number.isFinite(windowStartedAt) &&
      now - windowStartedAt < SEND_WINDOW_MS
    const newWindowStart = windowIsActive
      ? existing!.window_started_at
      : nowText
    const sendsInWindow = windowIsActive
      ? existing!.sends_in_window + 1
      : 1

    db.prepare(
      `INSERT INTO account_email_change (
         account_id, previous_email, pending_email, code_salt, code_hash,
         expires_at, last_sent_at, attempts, window_started_at,
         sends_in_window, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')
       ON CONFLICT(account_id) DO UPDATE SET
         previous_email = excluded.previous_email,
         pending_email = excluded.pending_email,
         code_salt = excluded.code_salt,
         code_hash = excluded.code_hash,
         expires_at = excluded.expires_at,
         last_sent_at = excluded.last_sent_at,
         attempts = 0,
         window_started_at = excluded.window_started_at,
         sends_in_window = excluded.sends_in_window,
         status = 'pending'`,
    ).run(
      accountId,
      previousEmail,
      pendingEmail,
      codeSalt,
      codeHash,
      new Date(now + CODE_TTL_MS).toISOString(),
      nowText,
      newWindowStart,
      sendsInWindow,
    )
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    throw error
  }
}

async function sendReservedCode(
  recipient: string,
  code: string,
  purpose: "previous-address" | "new-address",
) {
  await sendEmailVerificationCode(recipient, code, purpose)
}

export async function requestOwnEmailChange(
  accountId: string,
  emailInput: unknown,
) {
  const pendingEmail = normalizeRequestedEmail(emailInput)
  const previousEmail = getCurrentEmail(accountId)
  if (!previousEmail && !pendingEmail) {
    throw new LocalEmailChangeError(
      "Belum ada email yang dapat dihapus.",
      "email-already-empty",
    )
  }
  if (previousEmail && addressesMatch(previousEmail, pendingEmail)) {
    throw new LocalEmailChangeError(
      "Alamat email baru sama dengan email yang sedang digunakan.",
      "email-unchanged",
    )
  }

  const recipient = previousEmail ?? pendingEmail
  if (!recipient) {
    throw new LocalEmailChangeError(
      "Masukkan alamat email yang akan diverifikasi.",
      "invalid-email",
    )
  }
  assertSmtpConfigured()
  const { code, salt, hash } = await createCode()
  const now = Date.now()
  savePendingCode(accountId, previousEmail, pendingEmail, salt, hash, now)
  await sendReservedCode(
    recipient,
    code,
    previousEmail ? "previous-address" : "new-address",
  )

  return getOwnEmailChangeState(accountId)
}

export async function resendOwnEmailChangeCode(accountId: string) {
  const pending = getPendingChange(accountId)
  if (!pending) {
    throw new LocalEmailChangeError(
      "Tidak ada perubahan email yang menunggu verifikasi.",
      "email-change-not-found",
    )
  }
  if (!addressesMatch(pending.previous_email, getCurrentEmail(accountId))) {
    throw new LocalEmailChangeError(
      "Email akun berubah. Mulai kembali proses perubahan email.",
      "email-change-stale",
    )
  }

  const recipient = pending.previous_email ?? pending.pending_email
  if (!recipient) {
    throw new LocalEmailChangeError(
      "Alamat penerima kode verifikasi tidak tersedia.",
      "email-change-stale",
    )
  }

  assertSmtpConfigured()
  const { code, salt, hash } = await createCode()
  const now = Date.now()
  savePendingCode(
    accountId,
    pending.previous_email,
    pending.pending_email,
    salt,
    hash,
    now,
  )
  await sendReservedCode(
    recipient,
    code,
    pending.previous_email ? "previous-address" : "new-address",
  )

  return getOwnEmailChangeState(accountId)
}

export async function verifyOwnEmailChange(
  accountId: string,
  codeInput: unknown,
) {
  if (typeof codeInput !== "string" || !/^\d{6}$/.test(codeInput)) {
    throw new LocalEmailChangeError(
      "Masukkan kode verifikasi 6 digit.",
      "email-code-invalid",
    )
  }

  const db = getLocalDatabase()
  const pending = getPendingChange(accountId)
  if (!pending || !pending.code_salt || !pending.code_hash || !pending.expires_at) {
    throw new LocalEmailChangeError(
      "Tidak ada perubahan email yang menunggu verifikasi.",
      "email-change-not-found",
    )
  }
  if (Date.parse(pending.expires_at) <= Date.now()) {
    throw new LocalEmailChangeError(
      "Kode verifikasi kedaluwarsa. Kirim ulang kode untuk melanjutkan.",
      "email-code-expired",
    )
  }
  if (pending.attempts >= CODE_ATTEMPT_LIMIT) {
    throw new LocalEmailChangeError(
      "Batas percobaan kode tercapai. Minta kode baru untuk melanjutkan.",
      "email-code-locked",
    )
  }

  const salt = Buffer.from(pending.code_salt, "base64url")
  const expected = Buffer.from(pending.code_hash, "base64url")
  if (salt.length !== 16 || expected.length !== CODE_LENGTH) {
    throw new Error("Stored email verification code is invalid.")
  }
  const actual = await deriveCode(codeInput, salt)
  const matches = timingSafeEqual(actual, expected)

  db.exec("BEGIN IMMEDIATE")
  try {
    const currentPending = getPendingChange(accountId)
    if (
      !currentPending ||
      currentPending.code_hash !== pending.code_hash ||
      currentPending.code_salt !== pending.code_salt ||
      Date.parse(currentPending.expires_at ?? "") <= Date.now()
    ) {
      throw new LocalEmailChangeError(
        "Kode verifikasi sudah berubah atau kedaluwarsa. Muat ulang lalu coba lagi.",
        "email-change-stale",
      )
    }

    if (!matches) {
      const attempts = currentPending.attempts + 1
      if (attempts >= CODE_ATTEMPT_LIMIT) {
        db.prepare(
          `UPDATE account_email_change
           SET attempts = ?, status = 'locked', previous_email = NULL,
               pending_email = NULL, code_salt = NULL, code_hash = NULL,
               expires_at = NULL
           WHERE account_id = ?`,
        ).run(attempts, accountId)
      } else {
        db.prepare(
          `UPDATE account_email_change
           SET attempts = ?, code_salt = ?, code_hash = ?
           WHERE account_id = ?`,
        ).run(
          attempts,
          currentPending.code_salt,
          currentPending.code_hash,
          accountId,
        )
      }
      db.exec("COMMIT")
      throw new LocalEmailChangeError(
        attempts >= CODE_ATTEMPT_LIMIT
          ? "Batas percobaan kode tercapai. Minta kode baru untuk melanjutkan."
          : "Kode verifikasi tidak sesuai.",
        attempts >= CODE_ATTEMPT_LIMIT
          ? "email-code-locked"
          : "email-code-invalid",
      )
    }

    const currentEmail = getCurrentEmail(accountId)
    if (!addressesMatch(currentPending.previous_email, currentEmail)) {
      db.prepare(
        `UPDATE account_email_change
         SET status = 'cancelled', previous_email = NULL, pending_email = NULL,
             code_salt = NULL, code_hash = NULL, expires_at = NULL
         WHERE account_id = ?`,
      ).run(accountId)
      db.exec("COMMIT")
      throw new LocalEmailChangeError(
        "Email akun berubah selama proses verifikasi. Mulai kembali.",
        "email-change-stale",
      )
    }

    const now = new Date().toISOString()
    const emailVerifiedAt =
      currentPending.previous_email === null && currentPending.pending_email
        ? now
        : null
    db.prepare(
      `INSERT INTO account_profile (
         account_id, email, email_verified_at, avatar_data,
         avatar_mime_type, updated_at
       ) VALUES (?, ?, ?, NULL, NULL, ?)
       ON CONFLICT(account_id) DO UPDATE SET
         email = excluded.email,
         email_verified_at = excluded.email_verified_at,
         updated_at = excluded.updated_at`,
    ).run(accountId, currentPending.pending_email, emailVerifiedAt, now)
    db.prepare(
      `UPDATE account_email_change
       SET status = 'completed', previous_email = NULL, pending_email = NULL,
         code_salt = NULL, code_hash = NULL, expires_at = NULL,
         attempts = 0
       WHERE account_id = ?`,
    ).run(accountId)
    db.exec("COMMIT")
  } catch (error) {
    if (db.isTransaction) db.exec("ROLLBACK")
    throw error
  }

  return getOwnAccountProfile(accountId)
}

export function cancelOwnEmailChange(accountId: string) {
  const db = getLocalDatabase()
  db.prepare(
    `UPDATE account_email_change
     SET status = 'cancelled', previous_email = NULL, pending_email = NULL,
         code_salt = NULL, code_hash = NULL, expires_at = NULL,
         attempts = 0
     WHERE account_id = ? AND status = 'pending'`,
  ).run(accountId)
}

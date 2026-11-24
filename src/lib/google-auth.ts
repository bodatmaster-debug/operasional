import "server-only"

import { OAuth2Client } from "google-auth-library"

const googleOAuthClient = new OAuth2Client()

export type VerifiedGoogleIdentity = {
  sub: string
  email: string
  fullName: string
}

export class GoogleIdentityError extends Error {
  readonly status: 400 | 401 | 503

  constructor(
    message: string,
    status: 400 | 401 | 503,
  ) {
    super(message)
    this.status = status
  }
}

export async function verifyGoogleIdToken(
  credential: unknown,
): Promise<VerifiedGoogleIdentity> {
  if (
    typeof credential !== "string" ||
    credential.length > 8192 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(credential)
  ) {
    throw new GoogleIdentityError("Kredensial Google tidak valid.", 400)
  }
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()
  if (!clientId) {
    throw new GoogleIdentityError(
      "Google Sign-In belum dikonfigurasi untuk aplikasi ini.",
      503,
    )
  }

  let payload
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    })
    payload = ticket.getPayload()
  } catch (error) {
    if (error instanceof Error && error.name === "GaxiosError") {
      throw new GoogleIdentityError(
        "Layanan validasi Google sedang tidak tersedia. Coba lagi nanti.",
        503,
      )
    }
    throw new GoogleIdentityError(
      "Token Google tidak valid atau sudah kedaluwarsa.",
      401,
    )
  }

  const audienceMatches = Array.isArray(payload?.aud)
    ? payload.aud.includes(clientId)
    : payload?.aud === clientId
  const email = payload?.email?.trim().toLowerCase()
  const fullName = payload?.name?.trim()
  if (
    !payload ||
    !audienceMatches ||
    (payload.iss !== "accounts.google.com" &&
      payload.iss !== "https://accounts.google.com") ||
    typeof payload.sub !== "string" ||
    payload.sub.length < 1 ||
    payload.sub.length > 255 ||
    /[\u0000-\u001f\u007f]/.test(payload.sub) ||
    payload.email_verified !== true ||
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !fullName ||
    fullName.length < 2 ||
    fullName.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(fullName)
  ) {
    throw new GoogleIdentityError(
      "Profil Google tidak lengkap atau alamat email belum terverifikasi.",
      401,
    )
  }

  return { sub: payload.sub, email, fullName }
}

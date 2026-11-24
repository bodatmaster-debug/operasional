import "server-only"

import nodemailer from "nodemailer"

export class EmailDeliveryError extends Error {
  readonly code: "email-delivery-not-configured" | "email-delivery-failed"

  constructor(
    message: string,
    code: "email-delivery-not-configured" | "email-delivery-failed",
    cause?: unknown,
  ) {
    super(message, { cause })
    this.code = code
  }
}

function getSmtpConfiguration() {
  const host = process.env.SMTP_HOST?.trim()
  const port = Number(process.env.SMTP_PORT)
  const secureValue = process.env.SMTP_SECURE?.trim().toLowerCase()
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const from = process.env.SMTP_FROM?.trim()

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    (secureValue !== "true" && secureValue !== "false") ||
    !user ||
    !password ||
    !from ||
    /[\r\n]/.test(from)
  ) {
    throw new EmailDeliveryError(
      "Pengiriman email belum dikonfigurasi. Atur SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASSWORD, dan SMTP_FROM.",
      "email-delivery-not-configured",
    )
  }

  return {
    host,
    port,
    secure: secureValue === "true",
    user,
    password,
    from,
  }
}

export function assertSmtpConfigured() {
  getSmtpConfiguration()
}

export async function sendEmailVerificationCode(
  recipient: string,
  code: string,
  purpose: "previous-address" | "new-address",
) {
  const configuration = getSmtpConfiguration()
  const transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTLS: !configuration.secure,
    auth: { user: configuration.user, pass: configuration.password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  })

  const isPreviousAddress = purpose === "previous-address"
  try {
    await transporter.sendMail({
      from: configuration.from,
      to: recipient,
      subject: isPreviousAddress
        ? "Konfirmasi perubahan email akun Operasional"
        : "Verifikasi email akun Operasional",
      text: [
        isPreviousAddress
          ? "Kode ini digunakan untuk menyetujui perubahan alamat email akun Operasional."
          : "Kode ini digunakan untuk memverifikasi alamat email akun Operasional.",
        "",
        `Kode verifikasi: ${code}`,
        "",
        "Kode berlaku selama 10 menit dan hanya dapat digunakan sekali.",
        isPreviousAddress
          ? "Jika Anda tidak meminta perubahan email, abaikan pesan ini. Email akun belum diubah."
          : "Jika Anda tidak meminta verifikasi, abaikan pesan ini.",
      ].join("\n"),
    })
  } catch (error) {
    throw new EmailDeliveryError(
      "Kode verifikasi gagal dikirim. Periksa konfigurasi dan koneksi SMTP, lalu coba lagi.",
      "email-delivery-failed",
      error,
    )
  }
}

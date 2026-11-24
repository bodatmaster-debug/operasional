import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  isValidMaintenancePhone,
  MAINTENANCE_ASSIGNEE_ROLES,
} from "@/lib/maintenance"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class AssigneeValidationError extends Error {}

function readText(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string") {
    throw new AssigneeValidationError(`${label} wajib diisi.`)
  }
  const text = value.trim()
  if (!text || text.length > maximum || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new AssigneeValidationError(
      `${label} wajib diisi dan maksimal ${maximum} karakter.`,
    )
  }
  return text
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "maintenance")
  if (isResponse(user)) return user

  try {
    const records = getLocalDatabase()
      .prepare(
        `SELECT id, name, role, phone FROM maintenance_assignee
         ORDER BY name COLLATE NOCASE, role COLLATE NOCASE`,
      )
      .all()
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local maintenance assignee list failed.", error)
    return NextResponse.json(
      { error: "Daftar petugas lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireLocalPermission(
    request,
    "maintenance",
    true,
    "maintenance",
  )
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const name = readText(body.name, "Nama", 100)
    const role = MAINTENANCE_ASSIGNEE_ROLES.find(
      (candidate) => candidate === body.role,
    )
    if (!role) {
      throw new AssigneeValidationError("Pilih jabatan petugas yang tersedia.")
    }
    const phone = readText(body.phone, "Nomor telepon", 32)
    if (!isValidMaintenancePhone(phone)) {
      throw new AssigneeValidationError(
        "Nomor telepon harus berisi 8–15 digit dan hanya menggunakan angka, spasi, tanda kurung, titik, tanda hubung, atau awalan +.",
      )
    }

    const id = randomUUID()
    const now = new Date().toISOString()
    getLocalDatabase()
      .prepare(
        `INSERT INTO maintenance_assignee (id, name, role, phone, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, name, role, phone, now)

    return NextResponse.json(
      { record: { id, name, role, phone } },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof AssigneeValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      return NextResponse.json(
        { error: "Petugas dengan nama dan jabatan tersebut sudah terdaftar." },
        { status: 409 },
      )
    }
    console.error("Local maintenance assignee creation failed.", error)
    return NextResponse.json(
      { error: "Petugas lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

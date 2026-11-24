import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"
import {
  GasInstallationValidationError,
  readGasInstallationInput,
} from "@/lib/gas-installation"

class GasInstallationNotFoundError extends Error {}

function requireGasInstallationManager(request: NextRequest) {
  return requireLocalPermission(
    request,
    "assets",
    true,
    "asset-recording",
  )
}

function withImmediateTransaction<T>(db: DatabaseSync, operation: () => T): T {
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

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-recording")
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId || sppgId.length > 120) {
    return NextResponse.json(
      { error: "SPPG wajib dipilih untuk membaca konfigurasi instalasi gas." },
      { status: 400 },
    )
  }

  try {
    const db = getLocalDatabase()
    const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(sppgId)
    if (!sppg) {
      return NextResponse.json({ error: "SPPG tidak ditemukan." }, { status: 404 })
    }

    const record = db
      .prepare(
        `SELECT sppg_id, safety_system_present, high_pressure_present,
                high_pressure_line_count, low_pressure_present,
                low_pressure_line_count, created_at, updated_at
         FROM sppg_gas_installation
         WHERE sppg_id = ?`,
      )
      .get(sppgId)

    return NextResponse.json(
      { record: record ?? null },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local gas installation read failed.", error)
    return NextResponse.json(
      { error: "Kondisi instalasi gas lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = requireGasInstallationManager(request)
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const input = readGasInstallationInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db
        .prepare("SELECT id FROM sppg WHERE id = ?")
        .get(input.sppgId)
      if (!sppg) {
        throw new GasInstallationNotFoundError("SPPG tidak ditemukan.")
      }

      db.prepare(
        `INSERT INTO sppg_gas_installation (
           sppg_id, safety_system_present, high_pressure_present,
           high_pressure_line_count, low_pressure_present,
           low_pressure_line_count, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (sppg_id) DO UPDATE SET
           safety_system_present = excluded.safety_system_present,
           high_pressure_present = excluded.high_pressure_present,
           high_pressure_line_count = excluded.high_pressure_line_count,
           low_pressure_present = excluded.low_pressure_present,
           low_pressure_line_count = excluded.low_pressure_line_count,
           updated_at = excluded.updated_at`,
      ).run(
        input.sppgId,
        Number(input.safetySystemPresent),
        Number(input.highPressurePresent),
        input.highPressureLineCount,
        Number(input.lowPressurePresent),
        input.lowPressureLineCount,
        now,
        now,
      )

      return db
        .prepare(
          `SELECT sppg_id, safety_system_present, high_pressure_present,
                  high_pressure_line_count, low_pressure_present,
                  low_pressure_line_count, created_at, updated_at
           FROM sppg_gas_installation
           WHERE sppg_id = ?`,
        )
        .get(input.sppgId)
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof GasInstallationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof GasInstallationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local gas installation write failed.", error)
    return NextResponse.json(
      { error: "Kondisi instalasi gas lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

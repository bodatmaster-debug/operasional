import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class ElectricalInstallationValidationError extends Error {}
class ElectricalInstallationNotFoundError extends Error {}

type ElectricalInstallationInput = {
  sppgId: string
  plnCapacityVa: number
  generatorPresent: boolean
  generatorCapacityKva: number | null
  generatorBrand: string | null
}

function requireElectricalInstallationManager(request: NextRequest) {
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

function readElectricalInstallationInput(
  body: Record<string, unknown>,
): ElectricalInstallationInput {
  const sppgId = typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  if (!sppgId || sppgId.length > 120) {
    throw new ElectricalInstallationValidationError("SPPG wajib dipilih.")
  }

  const plnCapacityVa = body.plnCapacityVa
  if (
    typeof plnCapacityVa !== "number" ||
    !Number.isSafeInteger(plnCapacityVa) ||
    plnCapacityVa < 1
  ) {
    throw new ElectricalInstallationValidationError(
      "Daya PLN harus berupa bilangan bulat VA yang positif.",
    )
  }

  const generatorPresent = body.generatorPresent
  if (typeof generatorPresent !== "boolean") {
    throw new ElectricalInstallationValidationError(
      "Pilih Ya atau Tidak untuk genset cadangan.",
    )
  }

  if (!generatorPresent) {
    return {
      sppgId,
      plnCapacityVa,
      generatorPresent,
      generatorCapacityKva: null,
      generatorBrand: null,
    }
  }

  const generatorCapacityKva = body.generatorCapacityKva
  if (
    typeof generatorCapacityKva !== "number" ||
    !Number.isFinite(generatorCapacityKva) ||
    generatorCapacityKva <= 0
  ) {
    throw new ElectricalInstallationValidationError(
      "Kapasitas genset harus berupa angka kVA yang positif.",
    )
  }

  const generatorBrand =
    typeof body.generatorBrand === "string" ? body.generatorBrand.trim() : ""
  if (!generatorBrand || generatorBrand.length > 100) {
    throw new ElectricalInstallationValidationError(
      "Merek genset wajib diisi dan maksimal 100 karakter.",
    )
  }

  return {
    sppgId,
    plnCapacityVa,
    generatorPresent,
    generatorCapacityKva,
    generatorBrand,
  }
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-recording")
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId || sppgId.length > 120) {
    return NextResponse.json(
      {
        error:
          "SPPG wajib dipilih untuk membaca konfigurasi instalasi listrik.",
      },
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
        `SELECT sppg_id, pln_capacity_va, generator_present,
                generator_capacity_kva, generator_brand, created_at, updated_at
         FROM sppg_electrical_installation
         WHERE sppg_id = ?`,
      )
      .get(sppgId)

    return NextResponse.json(
      { record: record ?? null },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local electrical installation read failed.", error)
    return NextResponse.json(
      { error: "Konfigurasi instalasi listrik lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = requireElectricalInstallationManager(request)
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const input = readElectricalInstallationInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db
        .prepare("SELECT id FROM sppg WHERE id = ?")
        .get(input.sppgId)
      if (!sppg) {
        throw new ElectricalInstallationNotFoundError("SPPG tidak ditemukan.")
      }

      db.prepare(
        `INSERT INTO sppg_electrical_installation (
           sppg_id, pln_capacity_va, generator_present,
           generator_capacity_kva, generator_brand, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (sppg_id) DO UPDATE SET
           pln_capacity_va = excluded.pln_capacity_va,
           generator_present = excluded.generator_present,
           generator_capacity_kva = excluded.generator_capacity_kva,
           generator_brand = excluded.generator_brand,
           updated_at = excluded.updated_at`,
      ).run(
        input.sppgId,
        input.plnCapacityVa,
        Number(input.generatorPresent),
        input.generatorCapacityKva,
        input.generatorBrand,
        now,
        now,
      )

      return db
        .prepare(
          `SELECT sppg_id, pln_capacity_va, generator_present,
                  generator_capacity_kva, generator_brand, created_at, updated_at
           FROM sppg_electrical_installation
           WHERE sppg_id = ?`,
        )
        .get(input.sppgId)
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof ElectricalInstallationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof ElectricalInstallationNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local electrical installation write failed.", error)
    return NextResponse.json(
      { error: "Konfigurasi instalasi listrik lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

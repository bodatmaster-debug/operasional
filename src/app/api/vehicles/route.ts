import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"
import { isVehicleType } from "@/lib/vehicle-types"

class VehicleValidationError extends Error {}
class VehicleNotFoundError extends Error {}
class VehicleConflictError extends Error {}

function requireVehicleManager(request: NextRequest, mutation = false) {
  return requireLocalPermission(
    request,
    "assets",
    mutation,
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

function readVehicleInput(body: Record<string, unknown>) {
  const sppgId = typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  const vehicleType = body.vehicleType
  const quantity = body.quantity
  const recordId =
    typeof body.recordId === "string" ? body.recordId.trim() : ""
  const vehicleSubtype =
    typeof body.vehicleSubtype === "string" ? body.vehicleSubtype.trim() : ""
  const vehicleMake =
    typeof body.vehicleMake === "string" ? body.vehicleMake.trim() : ""
  const vehicleModel =
    typeof body.vehicleModel === "string" ? body.vehicleModel.trim() : ""

  if (!sppgId || sppgId.length > 120) {
    throw new VehicleValidationError("SPPG wajib dipilih.")
  }
  if (
    "recordId" in body &&
    (typeof body.recordId !== "string" || !recordId || recordId.length > 120)
  ) {
    throw new VehicleValidationError("Identitas catatan kendaraan tidak valid.")
  }
  for (const [value, label] of [
    [vehicleSubtype, "Tipe kendaraan"],
    [vehicleMake, "Merek kendaraan"],
    [vehicleModel, "Model kendaraan"],
  ] as const) {
    if (
      !value ||
      value.length > 100 ||
      /[\u0000-\u001f\u007f]/.test(value)
    ) {
      throw new VehicleValidationError(`${label} wajib diisi dengan benar.`)
    }
  }
  if (!isVehicleType(vehicleType)) {
    throw new VehicleValidationError("Jenis kendaraan tidak valid.")
  }
  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > 1_000_000
  ) {
    throw new VehicleValidationError(
      "Jumlah kendaraan harus berupa bilangan bulat antara 0 dan 1.000.000.",
    )
  }

  return {
    sppgId,
    vehicleType,
    vehicleSubtype,
    vehicleMake,
    vehicleModel,
    quantity,
    recordId: recordId || null,
  }
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-recording")
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId) {
    return NextResponse.json(
      { error: "SPPG wajib dipilih untuk membaca data kendaraan." },
      { status: 400 },
    )
  }

  try {
    const db = getLocalDatabase()
    const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(sppgId)
    if (!sppg) {
      return NextResponse.json({ error: "SPPG tidak ditemukan." }, { status: 404 })
    }

    const records = db
      .prepare(
        `SELECT id, sppg_id, vehicle_type, vehicle_subtype, vehicle_make,
                asset_condition,
                vehicle_model, quantity, created_at, updated_at
         FROM vehicle_inventory
         WHERE sppg_id = ?
         ORDER BY CASE vehicle_type
           WHEN 'R4' THEN 1
           WHEN 'R3' THEN 2
           WHEN 'R2' THEN 3
           WHEN 'sampan' THEN 4
           WHEN 'speedboat' THEN 5
           WHEN 'sepeda' THEN 6
           ELSE 7
         END, vehicle_subtype, vehicle_make, vehicle_model`,
      )
      .all(sppgId)
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local vehicle inventory read failed.", error)
    return NextResponse.json(
      { error: "Data kendaraan lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = requireVehicleManager(request, true)
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const {
      sppgId,
      vehicleType,
      vehicleSubtype,
      vehicleMake,
      vehicleModel,
      quantity,
      recordId,
    } = readVehicleInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(sppgId)
      if (!sppg) throw new VehicleNotFoundError("SPPG tidak ditemukan.")

      if (recordId) {
        const existing = db
          .prepare(
            "SELECT id FROM vehicle_inventory WHERE id = ? AND sppg_id = ?",
          )
          .get(recordId, sppgId)
        if (!existing) {
          throw new VehicleNotFoundError("Catatan kendaraan tidak ditemukan.")
        }
        const duplicate = db
          .prepare(
            `SELECT id FROM vehicle_inventory
             WHERE sppg_id = ? AND vehicle_type = ? AND vehicle_subtype = ?
               AND vehicle_make = ? AND vehicle_model = ? AND id != ?`,
          )
          .get(
            sppgId,
            vehicleType,
            vehicleSubtype,
            vehicleMake,
            vehicleModel,
            recordId,
          )
        if (duplicate) {
          throw new VehicleConflictError(
            "Kombinasi kendaraan tersebut sudah tercatat. Ubah jumlah pada catatan yang ada.",
          )
        }
        db.prepare(
          `UPDATE vehicle_inventory
           SET vehicle_type = ?, vehicle_subtype = ?, vehicle_make = ?,
               vehicle_model = ?, quantity = ?, updated_at = ?
           WHERE id = ? AND sppg_id = ?`,
        ).run(
          vehicleType,
          vehicleSubtype,
          vehicleMake,
          vehicleModel,
          quantity,
          now,
          recordId,
          sppgId,
        )
        return db
          .prepare(
            `SELECT id, sppg_id, vehicle_type, vehicle_subtype, vehicle_make,
                    asset_condition,
                    vehicle_model, quantity, created_at, updated_at
             FROM vehicle_inventory WHERE id = ? AND sppg_id = ?`,
          )
          .get(recordId, sppgId)
      }

      db.prepare(
        `INSERT INTO vehicle_inventory (
           id, sppg_id, vehicle_type, vehicle_subtype, vehicle_make,
           vehicle_model, quantity, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (
           sppg_id, vehicle_type, vehicle_subtype, vehicle_make, vehicle_model
         ) DO UPDATE SET
           quantity = excluded.quantity,
           updated_at = excluded.updated_at`,
      ).run(
        randomUUID(),
        sppgId,
        vehicleType,
        vehicleSubtype,
        vehicleMake,
        vehicleModel,
        quantity,
        now,
        now,
      )

      return db
        .prepare(
          `SELECT id, sppg_id, vehicle_type, vehicle_subtype, vehicle_make,
                  asset_condition,
                  vehicle_model, quantity, created_at, updated_at
           FROM vehicle_inventory
           WHERE sppg_id = ? AND vehicle_type = ? AND vehicle_subtype = ?
             AND vehicle_make = ? AND vehicle_model = ?`,
        )
        .get(sppgId, vehicleType, vehicleSubtype, vehicleMake, vehicleModel)
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof VehicleValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof VehicleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof VehicleConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error("Local vehicle inventory write failed.", error)
    return NextResponse.json(
      { error: "Data kendaraan lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

export function DELETE(request: NextRequest) {
  const user = requireVehicleManager(request, true)
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim() ?? ""
  const recordId = request.nextUrl.searchParams.get("recordId")?.trim() ?? ""
  const invalidIdentifier = (value: string) =>
    !value || value.length > 120 || /[\u0000-\u001f\u007f]/.test(value)

  if (invalidIdentifier(sppgId) || invalidIdentifier(recordId)) {
    return NextResponse.json(
      { error: "SPPG dan identitas catatan kendaraan wajib diisi dengan benar." },
      { status: 400 },
    )
  }

  try {
    const result = getLocalDatabase()
      .prepare("DELETE FROM vehicle_inventory WHERE id = ? AND sppg_id = ?")
      .run(recordId, sppgId)
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Catatan kendaraan tidak ditemukan." },
        { status: 404 },
      )
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Local vehicle inventory delete failed.", error)
    return NextResponse.json(
      { error: "Catatan kendaraan gagal dihapus." },
      { status: 500 },
    )
  }
}

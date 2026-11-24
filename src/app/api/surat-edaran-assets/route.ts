import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  readSuratEdaranAssetInput,
  SuratEdaranAssetValidationError,
} from "@/lib/surat-edaran-asset-input"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class SuratEdaranAssetNotFoundError extends Error {}

function requireAssetManager(request: NextRequest, mutation = false) {
  return requireLocalPermission(
    request,
    "assets",
    mutation,
    "asset-surat-edaran",
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

function readRecordId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : ""
  if (!id || id.length > 120) {
    throw new SuratEdaranAssetValidationError("Catatan aset wajib dipilih.")
  }
  return id
}

function readSppgId(value: string | null) {
  const sppgId = value?.trim() ?? ""
  if (!sppgId || sppgId.length > 120) {
    throw new SuratEdaranAssetValidationError("SPPG wajib dipilih.")
  }
  return sppgId
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-surat-edaran")
  if (isResponse(user)) return user

  let sppgId: string
  try {
    sppgId = readSppgId(request.nextUrl.searchParams.get("sppgId"))
  } catch (error) {
    if (error instanceof SuratEdaranAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  try {
    const db = getLocalDatabase()
    const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(sppgId)
    if (!sppg) {
      return NextResponse.json({ error: "SPPG tidak ditemukan." }, { status: 404 })
    }
    const records = db
      .prepare(
        `SELECT id, sppg_id, category, item_name, asset_type, asset_brand,
                asset_condition,
                quantity, actual_unit, acuan_quantity, acuan_unit,
                surat_edaran_number, surat_edaran_year,
                created_at, updated_at
         FROM surat_edaran_asset_inventory
         WHERE sppg_id = ?
         ORDER BY category, item_name COLLATE NOCASE, asset_type COLLATE NOCASE,
                  asset_brand COLLATE NOCASE, surat_edaran_year DESC,
                  surat_edaran_number COLLATE NOCASE, id`,
      )
      .all(sppgId)
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local Surat Edaran asset read failed.", error)
    return NextResponse.json(
      { error: "Catatan aset Surat Edaran gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireAssetManager(request, true)
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const input = readSuratEdaranAssetInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db
        .prepare("SELECT id FROM sppg WHERE id = ?")
        .get(input.sppgId)
      if (!sppg) throw new SuratEdaranAssetNotFoundError("SPPG tidak ditemukan.")
      const id = randomUUID()
      db.prepare(
        `INSERT INTO surat_edaran_asset_inventory (
           id, sppg_id, category, item_name, asset_type, asset_brand, quantity,
           actual_unit, acuan_quantity, acuan_unit,
           surat_edaran_number, surat_edaran_year,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.sppgId,
        input.category,
        input.itemName,
        input.assetType,
        input.assetBrand,
        input.quantity,
        input.actualUnit,
        input.acuanQuantity,
        input.acuanUnit,
        input.suratEdaranNumber,
        input.suratEdaranYear,
        now,
        now,
      )
      return db
        .prepare(
          `SELECT id, sppg_id, category, item_name, asset_type, asset_brand,
                  asset_condition,
                  quantity, actual_unit, acuan_quantity, acuan_unit,
                  surat_edaran_number, surat_edaran_year,
                  created_at, updated_at
           FROM surat_edaran_asset_inventory
           WHERE id = ?`,
        )
        .get(id)
    })
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (error instanceof SuratEdaranAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof SuratEdaranAssetNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local Surat Edaran asset write failed.", error)
    return NextResponse.json(
      { error: "Catatan aset Surat Edaran gagal disimpan." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = requireAssetManager(request, true)
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const id = readRecordId(body.id)
    const input = readSuratEdaranAssetInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db
        .prepare("SELECT id FROM sppg WHERE id = ?")
        .get(input.sppgId)
      if (!sppg) throw new SuratEdaranAssetNotFoundError("SPPG tidak ditemukan.")
      const result = db
        .prepare(
          `UPDATE surat_edaran_asset_inventory
           SET category = ?, item_name = ?, asset_type = ?, asset_brand = ?,
               quantity = ?, actual_unit = ?, acuan_quantity = ?, acuan_unit = ?,
               surat_edaran_number = ?, surat_edaran_year = ?, updated_at = ?
           WHERE id = ? AND sppg_id = ?`,
        )
        .run(
          input.category,
          input.itemName,
          input.assetType,
          input.assetBrand,
          input.quantity,
          input.actualUnit,
          input.acuanQuantity,
          input.acuanUnit,
          input.suratEdaranNumber,
          input.suratEdaranYear,
          now,
          id,
          input.sppgId,
        )
      if (result.changes === 0) {
        throw new SuratEdaranAssetNotFoundError(
          "Catatan aset Surat Edaran tidak ditemukan.",
        )
      }
      return db
        .prepare(
          `SELECT id, sppg_id, category, item_name, asset_type, asset_brand,
                  asset_condition,
                  quantity, actual_unit, acuan_quantity, acuan_unit,
                  surat_edaran_number, surat_edaran_year,
                  created_at, updated_at
           FROM surat_edaran_asset_inventory
           WHERE id = ? AND sppg_id = ?`,
        )
        .get(id, input.sppgId)
    })
    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof SuratEdaranAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof SuratEdaranAssetNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local Surat Edaran asset update failed.", error)
    return NextResponse.json(
      { error: "Catatan aset Surat Edaran gagal diperbarui." },
      { status: 500 },
    )
  }
}

export function DELETE(request: NextRequest) {
  const user = requireAssetManager(request, true)
  if (isResponse(user)) return user

  let id: string
  let sppgId: string
  try {
    id = readRecordId(request.nextUrl.searchParams.get("id"))
    sppgId = readSppgId(request.nextUrl.searchParams.get("sppgId"))
  } catch (error) {
    if (error instanceof SuratEdaranAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  try {
    const result = getLocalDatabase()
      .prepare(
        "DELETE FROM surat_edaran_asset_inventory WHERE id = ? AND sppg_id = ?",
      )
      .run(id, sppgId)
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Catatan aset Surat Edaran tidak ditemukan." },
        { status: 404 },
      )
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Local Surat Edaran asset delete failed.", error)
    return NextResponse.json(
      { error: "Catatan aset Surat Edaran gagal dihapus." },
      { status: 500 },
    )
  }
}

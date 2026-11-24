import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { ASSET_CATEGORIES } from "@/lib/asset-catalog"
import { getLocalDatabase } from "@/lib/local-database"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class NonJuknisAssetValidationError extends Error {}
class NonJuknisAssetNotFoundError extends Error {}

function requireAssetManager(request: NextRequest, mutation = false) {
  return requireLocalPermission(
    request,
    "assets",
    mutation,
    "asset-non-juknis",
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

function readRequiredText(
  body: Record<string, unknown>,
  key: string,
  label: string,
) {
  const value = body[key]
  if (typeof value !== "string") {
    throw new NonJuknisAssetValidationError(`${label} wajib berupa teks.`)
  }
  const text = value.trim()
  if (text.length === 0 || text.length > 100) {
    throw new NonJuknisAssetValidationError(
      `${label} wajib diisi dan maksimal 100 karakter.`,
    )
  }
  return text
}

function readInput(body: Record<string, unknown>) {
  const sppgId = typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  const category = ASSET_CATEGORIES.find(
    (candidate) => candidate === body.category,
  )
  const quantity = body.quantity

  if (!sppgId || sppgId.length > 120) {
    throw new NonJuknisAssetValidationError("SPPG wajib dipilih.")
  }
  if (!category) {
    throw new NonJuknisAssetValidationError("Kategori aset tidak valid.")
  }
  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > 1_000_000
  ) {
    throw new NonJuknisAssetValidationError(
      "Jumlah harus berupa bilangan bulat antara 0 dan 1.000.000.",
    )
  }

  return {
    sppgId,
    category,
    itemName: readRequiredText(body, "itemName", "Nama barang"),
    assetType: readRequiredText(body, "assetType", "Tipe"),
    assetBrand: readRequiredText(body, "assetBrand", "Merek"),
    quantity,
  }
}

function readRecordId(value: unknown) {
  const id = typeof value === "string" ? value.trim() : ""
  if (!id || id.length > 120) {
    throw new NonJuknisAssetValidationError("Catatan aset wajib dipilih.")
  }
  return id
}

function readSppgId(value: string | null) {
  const sppgId = value?.trim() ?? ""
  if (!sppgId || sppgId.length > 120) {
    throw new NonJuknisAssetValidationError("SPPG wajib dipilih.")
  }
  return sppgId
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-non-juknis")
  if (isResponse(user)) return user

  let sppgId: string
  try {
    sppgId = readSppgId(request.nextUrl.searchParams.get("sppgId"))
  } catch (error) {
    if (error instanceof NonJuknisAssetValidationError) {
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
                quantity, created_at, updated_at
         FROM non_juknis_asset_inventory
         WHERE sppg_id = ?
         ORDER BY category, item_name COLLATE NOCASE, asset_type COLLATE NOCASE,
                  asset_brand COLLATE NOCASE, id`,
      )
      .all(sppgId)
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local non-juknis asset read failed.", error)
    return NextResponse.json(
      { error: "Catatan peralatan non-juknis gagal dimuat." },
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
    const input = readInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(input.sppgId)
      if (!sppg) throw new NonJuknisAssetNotFoundError("SPPG tidak ditemukan.")
      const id = randomUUID()
      db.prepare(
        `INSERT INTO non_juknis_asset_inventory (
           id, sppg_id, category, item_name, asset_type, asset_brand, quantity,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        input.sppgId,
        input.category,
        input.itemName,
        input.assetType,
        input.assetBrand,
        input.quantity,
        now,
        now,
      )
      return db
        .prepare(
          `SELECT id, sppg_id, category, item_name, asset_type, asset_brand,
                  asset_condition,
                  quantity, created_at, updated_at
           FROM non_juknis_asset_inventory
           WHERE id = ?`,
        )
        .get(id)
    })
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (error instanceof NonJuknisAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof NonJuknisAssetNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local non-juknis asset write failed.", error)
    return NextResponse.json(
      { error: "Catatan peralatan non-juknis gagal disimpan." },
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
    const input = readInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(input.sppgId)
      if (!sppg) throw new NonJuknisAssetNotFoundError("SPPG tidak ditemukan.")
      const result = db
        .prepare(
          `UPDATE non_juknis_asset_inventory
           SET category = ?, item_name = ?, asset_type = ?, asset_brand = ?,
               quantity = ?, updated_at = ?
           WHERE id = ? AND sppg_id = ?`,
        )
        .run(
          input.category,
          input.itemName,
          input.assetType,
          input.assetBrand,
          input.quantity,
          now,
          id,
          input.sppgId,
        )
      if (result.changes === 0) {
        throw new NonJuknisAssetNotFoundError(
          "Catatan peralatan non-juknis tidak ditemukan.",
        )
      }
      return db
        .prepare(
          `SELECT id, sppg_id, category, item_name, asset_type, asset_brand,
                  asset_condition,
                  quantity, created_at, updated_at
           FROM non_juknis_asset_inventory
           WHERE id = ? AND sppg_id = ?`,
        )
        .get(id, input.sppgId)
    })
    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof NonJuknisAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof NonJuknisAssetNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local non-juknis asset update failed.", error)
    return NextResponse.json(
      { error: "Catatan peralatan non-juknis gagal diperbarui." },
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
    if (error instanceof NonJuknisAssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  try {
    const result = getLocalDatabase()
      .prepare(
        "DELETE FROM non_juknis_asset_inventory WHERE id = ? AND sppg_id = ?",
      )
      .run(id, sppgId)
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Catatan peralatan non-juknis tidak ditemukan." },
        { status: 404 },
      )
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Local non-juknis asset delete failed.", error)
    return NextResponse.json(
      { error: "Catatan peralatan non-juknis gagal dihapus." },
      { status: 500 },
    )
  }
}

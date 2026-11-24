import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import { getAssetCatalogItem } from "@/lib/asset-catalog"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class AssetValidationError extends Error {}
class AssetNotFoundError extends Error {}

function requireAssetManager(request: NextRequest, mutation = false) {
  return requireLocalPermission(request, "assets", mutation, "asset-recording")
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

function readOptionalAssetText(
  body: Record<string, unknown>,
  key: string,
  label: string,
) {
  const value = body[key]
  if (value === undefined) return ""
  if (typeof value !== "string") {
    throw new AssetValidationError(`${label} harus berupa teks.`)
  }

  const text = value.trim()
  if (text.length > 100) {
    throw new AssetValidationError(`${label} maksimal 100 karakter.`)
  }
  return text
}

function readAssetInput(body: Record<string, unknown>) {
  const sppgId =
    typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  const catalogId =
    typeof body.catalogId === "string" ? body.catalogId.trim() : ""
  const assetType = readOptionalAssetText(body, "assetType", "Tipe aset")
  const assetBrand = readOptionalAssetText(body, "assetBrand", "Merek aset")
  const quantity = body.quantity

  if (!sppgId || sppgId.length > 120) {
    throw new AssetValidationError("SPPG wajib dipilih.")
  }
  const catalogItem = getAssetCatalogItem(catalogId)
  if (!catalogItem) {
    throw new AssetValidationError("Item katalog aset tidak valid.")
  }
  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > 1_000_000
  ) {
    throw new AssetValidationError(
      "Jumlah aktual harus berupa bilangan bulat antara 0 dan 1.000.000.",
    )
  }

  return { sppgId, catalogItem, quantity, assetType, assetBrand }
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-recording")
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId) {
    return NextResponse.json(
      { error: "SPPG wajib dipilih untuk membaca jumlah aktual aset." },
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
        `SELECT id, sppg_id, catalog_id, quantity, asset_type, asset_brand,
                asset_condition,
                created_at, updated_at
         FROM asset_inventory
         WHERE sppg_id = ?
         ORDER BY catalog_id`,
      )
      .all(sppgId)
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local asset inventory read failed.", error)
    return NextResponse.json(
      { error: "Jumlah aktual aset lokal gagal dimuat." },
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
    const { sppgId, catalogItem, quantity, assetType, assetBrand } =
      readAssetInput(body)
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(sppgId)
      if (!sppg) throw new AssetNotFoundError("SPPG tidak ditemukan.")

      db.prepare(
        `INSERT INTO asset_inventory (
           id, sppg_id, catalog_id, quantity, asset_type, asset_brand,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (sppg_id, catalog_id) DO UPDATE SET
           quantity = excluded.quantity,
           asset_type = excluded.asset_type,
           asset_brand = excluded.asset_brand,
           updated_at = excluded.updated_at`,
      ).run(
        randomUUID(),
        sppgId,
        catalogItem.catalogId,
        quantity,
        assetType,
        assetBrand,
        now,
        now,
      )

      return db
        .prepare(
          `SELECT id, sppg_id, catalog_id, quantity, asset_type, asset_brand,
                  asset_condition,
                  created_at, updated_at
           FROM asset_inventory
           WHERE sppg_id = ? AND catalog_id = ?`,
        )
        .get(sppgId, catalogItem.catalogId)
    })

    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof AssetValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof AssetNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local asset inventory write failed.", error)
    return NextResponse.json(
      { error: "Jumlah aktual aset lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  const user = requireAssetManager(request, true)
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  const catalogId = request.nextUrl.searchParams.get("catalogId")?.trim()
  if (!sppgId || sppgId.length > 120 || !catalogId) {
    return NextResponse.json(
      { error: "SPPG dan item katalog wajib dipilih." },
      { status: 400 },
    )
  }
  if (!getAssetCatalogItem(catalogId)) {
    return NextResponse.json(
      { error: "Item katalog aset tidak valid." },
      { status: 400 },
    )
  }

  try {
    const result = getLocalDatabase()
      .prepare(
        "DELETE FROM asset_inventory WHERE sppg_id = ? AND catalog_id = ?",
      )
      .run(sppgId, catalogId)
    if (result.changes === 0) {
      return NextResponse.json(
        { error: "Catatan jumlah aktual aset tidak ditemukan." },
        { status: 404 },
      )
    }
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error("Local asset inventory delete failed.", error)
    return NextResponse.json(
      { error: "Catatan jumlah aktual aset gagal dihapus." },
      { status: 500 },
    )
  }
}

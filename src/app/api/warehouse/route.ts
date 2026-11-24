import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  ASSET_CATEGORIES,
  getAssetCatalogItem,
} from "@/lib/asset-catalog"
import {
  applyWarehouseAssetAllocation,
  WarehouseAllocationError,
  type WarehouseAssetAllocationCommand,
} from "@/lib/warehouse-allocation"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"
import {
  isWarehouseAssetCategory,
  type WarehouseAssetCategory,
  type WarehouseKind,
} from "@/lib/warehouse-types"
import type { AssetCategory } from "@/lib/asset-categories"
import { isDateOnly } from "@/lib/maintenance"

class WarehouseValidationError extends Error {}
class WarehouseConflictError extends Error {}
class WarehouseNotFoundError extends Error {}

function isWarehouseKind(value: string | null): value is WarehouseKind {
  return value === "asset" || value === "spare-part"
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

function readText(value: unknown, label: string, maximum: number) {
  if (typeof value !== "string") {
    throw new WarehouseValidationError(`${label} wajib diisi.`)
  }
  const text = value.trim()
  if (!text || text.length > maximum || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new WarehouseValidationError(
      `${label} wajib diisi dan maksimal ${maximum} karakter.`,
    )
  }
  return text
}

function readRequiredAssetText(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new WarehouseValidationError(`${label} wajib diisi.`)
  }
  const text = value.trim()
  if (
    !text ||
    text.length > 100 ||
    /[\u0000-\u001f\u007f]/.test(text)
  ) {
    throw new WarehouseValidationError(
      `${label} wajib diisi dan maksimal 100 karakter.`,
    )
  }
  return text
}

function readQuantity(value: unknown, allowZero = false) {
  const minimum = allowZero ? 0 : 1
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > 1_000_000
  ) {
    throw new WarehouseValidationError(
      `Jumlah harus berupa bilangan bulat antara ${minimum} dan 1.000.000.`,
    )
  }
  return value
}

function readStoragePeriod(value: unknown) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 1200
  ) {
    throw new WarehouseValidationError(
      "Jangka masa simpan harus berupa bilangan bulat antara 1 dan 1.200 bulan.",
    )
  }
  return value
}

function readTransactionDate(value: unknown, fallback: string) {
  if (value === undefined) return fallback
  if (!isDateOnly(value)) {
    throw new WarehouseValidationError("Tanggal transaksi tidak valid.")
  }
  return value
}

function readAssetCategory(value: unknown): WarehouseAssetCategory {
  if (!isWarehouseAssetCategory(value)) {
    throw new WarehouseValidationError("Jenis item aset wajib dipilih.")
  }
  return value
}

function readAssetSubcategory(value: unknown): AssetCategory {
  const category = ASSET_CATEGORIES.find((candidate) => candidate === value)
  if (!category) {
    throw new WarehouseValidationError("Kategori aset wajib dipilih.")
  }
  return category
}

function readJuknisReference(
  value: unknown,
  category: AssetCategory | null,
) {
  if (!category) {
    throw new WarehouseValidationError("Kategori aset wajib dipilih.")
  }
  if (typeof value !== "string") {
    throw new WarehouseValidationError("Rujukan Juknis wajib dipilih.")
  }
  const item = getAssetCatalogItem(value)
  if (!item) {
    throw new WarehouseValidationError("Rujukan Juknis tidak valid.")
  }
  if (item.category !== category) {
    throw new WarehouseValidationError(
      "Rujukan Juknis tidak sesuai dengan kategori yang dipilih.",
    )
  }
  return item
}

function readCompatibleAssetItemId(db: DatabaseSync, value: unknown) {
  const itemId = readText(value, "Item aset terkait", 120)
  const item = db
    .prepare("SELECT id FROM warehouse_item WHERE id = ? AND kind = 'asset'")
    .get(itemId)
  if (!item) {
    throw new WarehouseValidationError(
      "Pilih item aset yang sudah terdaftar di gudang.",
    )
  }
  return itemId
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "warehouse")
  if (isResponse(user)) return user

  const kind = request.nextUrl.searchParams.get("kind")
  if (!isWarehouseKind(kind)) {
    return NextResponse.json({ error: "Jenis stok tidak valid." }, { status: 400 })
  }

  try {
    const db = getLocalDatabase()
    const items = db
      .prepare(
        `SELECT i.id, i.kind, i.asset_category AS assetCategory,
                i.asset_subcategory AS assetSubcategory,
                i.asset_catalog_id AS assetCatalogId,
               i.asset_type AS assetType, i.asset_brand AS assetBrand,
               i.storage_period_months AS storagePeriodMonths,
               i.compatible_asset_item_id AS compatibleAssetItemId,
               compatible.name AS compatibleAssetItemName, i.name, i.unit,
                COALESCE(SUM(
                  CASE m.movement_type
                    WHEN 'in' THEN m.quantity
                    WHEN 'out' THEN -m.quantity
                    ELSE 0
                  END
                ), 0) AS stock
         FROM warehouse_item i
         LEFT JOIN warehouse_item compatible
           ON compatible.id = i.compatible_asset_item_id
         LEFT JOIN warehouse_movement m ON m.item_id = i.id
         WHERE i.kind = ?
         GROUP BY i.id, compatible.name
         ORDER BY i.name COLLATE NOCASE`,
      )
      .all(kind)
      .map((row) => ({ ...row, stock: Number(row.stock) }))
    const compatibleAssetItems =
      kind === "spare-part"
        ? db
            .prepare(
              `SELECT id, name, asset_type AS assetType,
                      asset_brand AS assetBrand
               FROM warehouse_item
               WHERE kind = 'asset'
               ORDER BY name COLLATE NOCASE`,
            )
            .all()
        : []
    const movements = db
      .prepare(
        `SELECT m.id, m.item_id AS itemId, i.name AS itemName,
                i.asset_subcategory AS assetSubcategory,
                m.movement_type AS movementType, m.quantity, i.unit, m.note,
                m.created_at AS createdAt,
                COALESCE(NULLIF(m.transaction_date, ''),
                         substr(m.created_at, 1, 10)) AS transactionDate
         FROM warehouse_movement m
         JOIN warehouse_item i ON i.id = m.item_id
         WHERE i.kind = ?
         ORDER BY transactionDate DESC, m.created_at DESC, m.id DESC
         LIMIT 30`,
      )
      .all(kind)

    const sppgs =
      kind === "asset"
        ? db
            .prepare("SELECT id, nama FROM sppg ORDER BY nama COLLATE NOCASE")
            .all()
        : []
    const allocations =
      kind === "asset"
        ? db
            .prepare(
              `SELECT a.item_id AS itemId, i.name AS itemName,
                      a.sppg_id AS sppgId, s.nama AS sppgName,
                      a.quantity, i.unit
               FROM warehouse_asset_allocation a
               JOIN warehouse_item i ON i.id = a.item_id
               JOIN sppg s ON s.id = a.sppg_id
               WHERE i.kind = 'asset' AND a.quantity > 0
               ORDER BY i.name COLLATE NOCASE, s.nama COLLATE NOCASE`,
            )
            .all()
            .map((row) => ({ ...row, quantity: Number(row.quantity) }))
        : []
    const allocationMovements =
      kind === "asset"
        ? db
            .prepare(
              `SELECT m.id, m.item_id AS itemId, i.name AS itemName,
                      m.movement_type AS movementType,
                      m.from_sppg_id AS fromSppgId,
                      m.from_sppg_name AS fromSppgName,
                      m.to_sppg_id AS toSppgId,
                      m.to_sppg_name AS toSppgName,
                      m.quantity, i.unit, m.note, m.created_at AS createdAt,
                      COALESCE(NULLIF(m.transaction_date, ''),
                               substr(m.created_at, 1, 10)) AS transactionDate,
                      a.username AS createdByUsername
               FROM warehouse_asset_allocation_movement m
               JOIN warehouse_item i ON i.id = m.item_id
               LEFT JOIN account a ON a.id = m.created_by
               WHERE i.kind = 'asset'
               ORDER BY transactionDate DESC, m.created_at DESC, m.id DESC
               LIMIT 50`,
            )
            .all()
            .map((row) => ({ ...row, quantity: Number(row.quantity) }))
        : []

    return NextResponse.json(
      {
        items,
        compatibleAssetItems,
        movements,
        sppgs,
        allocations,
        allocationMovements,
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local warehouse inventory read failed.", error)
    return NextResponse.json(
      { error: "Stok gudang lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireLocalPermission(request, "assets", true, "warehouse")
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body || typeof body.action !== "string") {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    if (body.action === "create-item") {
      const kind = typeof body.kind === "string" ? body.kind : null
      if (!isWarehouseKind(kind)) {
        throw new WarehouseValidationError("Jenis stok tidak valid.")
      }
      const assetCategory =
        kind === "asset" ? readAssetCategory(body.assetCategory) : null
      const assetSubcategory =
        kind === "asset" ? readAssetSubcategory(body.assetSubcategory) : null
      const juknisItem =
        kind === "asset" && assetCategory === "juknis"
          ? readJuknisReference(body.assetCatalogId, assetSubcategory)
          : null
      const assetType =
        kind === "asset"
          ? readRequiredAssetText(body.assetType, "Tipe aset")
          : null
      const assetBrand =
        kind === "asset"
          ? readRequiredAssetText(body.assetBrand, "Merek aset")
          : null
      const storagePeriodMonths =
        kind === "spare-part"
          ? readStoragePeriod(body.storagePeriodMonths)
          : null
      const compatibleAssetItemId =
        kind === "spare-part"
          ? readCompatibleAssetItemId(db, body.compatibleAssetItemId)
          : null
      if (
        !juknisItem &&
        body.assetCatalogId !== undefined &&
        body.assetCatalogId !== null
      ) {
        throw new WarehouseValidationError(
          "Rujukan Juknis hanya berlaku untuk item Juknis.",
        )
      }
      const name =
        kind === "asset"
          ? juknisItem?.name ??
            (assetCategory === "non-juknis"
              ? readText(body.name, "Nama item", 160)
              : [assetType, assetBrand].filter(Boolean).join(" · "))
          : readText(body.name, "Nama item", 160)
      const unit = juknisItem
        ? juknisItem.unit
        : readText(body.unit, "Satuan", 32)
      const initialStock = readQuantity(body.initialStock, true)
      const itemId = randomUUID()

      withImmediateTransaction(db, () => {
        db.prepare(
          `INSERT INTO warehouse_item
             (id, kind, asset_category, asset_subcategory, asset_catalog_id,
              asset_type, asset_brand, storage_period_months,
              compatible_asset_item_id, name, unit,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
        ).run(
          itemId,
          kind,
          assetCategory,
          assetSubcategory,
          juknisItem?.catalogId ?? null,
          assetType,
          assetBrand,
          storagePeriodMonths,
          compatibleAssetItemId,
          name,
          unit,
          now,
          now,
        )
        if (initialStock > 0) {
          db.prepare(
            `INSERT INTO warehouse_movement
               (id, item_id, movement_type, quantity, note, created_at,
                created_by, transaction_date)
             VALUES (?, ?, 'in', ?, 'Stok awal', ?, ?, ?)`,
          ).run(
            randomUUID(),
            itemId,
            initialStock,
            now,
            user.id,
            now.slice(0, 10),
          )
        }
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (
      body.action === "allocate" ||
      body.action === "transfer" ||
      body.action === "return"
    ) {
      if (body.kind !== "asset") {
        throw new WarehouseValidationError(
          "Alokasi SPPG hanya tersedia untuk stok aset.",
        )
      }
      const itemId = readText(body.itemId, "Item", 120)
      const quantity = readQuantity(body.quantity)
      const note =
        body.note === undefined || body.note === ""
          ? ""
          : readText(body.note, "Catatan", 500)
      const transactionDate = readTransactionDate(
        body.transactionDate,
        now.slice(0, 10),
      )
      const command: WarehouseAssetAllocationCommand =
        body.action === "allocate"
          ? {
              action: body.action,
              itemId,
              toSppgId: readText(body.toSppgId, "SPPG tujuan", 120),
              quantity,
              note,
              createdAt: now,
              transactionDate,
              createdBy: user.id,
            }
          : body.action === "transfer"
            ? {
                action: body.action,
                itemId,
                fromSppgId: readText(body.fromSppgId, "SPPG asal", 120),
                toSppgId: readText(body.toSppgId, "SPPG tujuan", 120),
                quantity,
                note,
                createdAt: now,
                transactionDate,
                createdBy: user.id,
              }
            : {
                action: body.action,
                itemId,
                fromSppgId: readText(body.fromSppgId, "SPPG asal", 120),
                quantity,
                note,
                createdAt: now,
                transactionDate,
                createdBy: user.id,
              }
      applyWarehouseAssetAllocation(db, command)
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (body.action === "movement") {
      const kind = typeof body.kind === "string" ? body.kind : null
      if (!isWarehouseKind(kind)) {
        throw new WarehouseValidationError("Jenis stok tidak valid.")
      }
      const itemId = readText(body.itemId, "Item", 120)
      const movementType = body.movementType
      if (movementType !== "in" && movementType !== "out") {
        throw new WarehouseValidationError("Pilih barang masuk atau keluar.")
      }
      const quantity = readQuantity(body.quantity)
      const note =
        body.note === undefined || body.note === ""
          ? ""
          : readText(body.note, "Catatan", 500)

      withImmediateTransaction(db, () => {
        const item = db
          .prepare("SELECT id FROM warehouse_item WHERE id = ? AND kind = ?")
          .get(itemId, kind)
        if (!item) throw new WarehouseNotFoundError()

        if (movementType === "out") {
          const balance = db
            .prepare(
              `SELECT COALESCE(SUM(
                 CASE movement_type WHEN 'in' THEN quantity ELSE -quantity END
               ), 0) AS stock
               FROM warehouse_movement WHERE item_id = ?`,
            )
            .get(itemId) as { stock: number }
          if (quantity > Number(balance.stock)) {
            throw new WarehouseConflictError(
              "Jumlah barang keluar melebihi stok yang tersedia.",
            )
          }
        }

        db.prepare(
          `INSERT INTO warehouse_movement
             (id, item_id, movement_type, quantity, note, created_at, created_by,
              transaction_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(
          randomUUID(),
          itemId,
          movementType,
          quantity,
          note,
          now,
          user.id,
          now.slice(0, 10),
        )
        db.prepare("UPDATE warehouse_item SET updated_at = ? WHERE id = ?").run(
          now,
          itemId,
        )
      })
      return NextResponse.json({ ok: true }, { status: 201 })
    }

    return NextResponse.json(
      { error: "Aksi gudang tidak valid." },
      { status: 400 },
    )
  } catch (error) {
    if (error instanceof WarehouseValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof WarehouseNotFoundError) {
      return NextResponse.json({ error: "Item gudang tidak ditemukan." }, { status: 404 })
    }
    if (error instanceof WarehouseAllocationError) {
      const status =
        error.code === "insufficient-stock" ||
        error.code === "insufficient-allocation"
          ? 409
          : error.code === "same-sppg"
            ? 400
            : 404
      return NextResponse.json({ error: error.message }, { status })
    }
    if (error instanceof WarehouseConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return NextResponse.json(
        { error: "Item dengan data tersebut sudah terdaftar." },
        { status: 409 },
      )
    }
    console.error("Local warehouse inventory update failed.", error)
    return NextResponse.json(
      { error: "Stok gudang lokal gagal diperbarui." },
      { status: 500 },
    )
  }
}

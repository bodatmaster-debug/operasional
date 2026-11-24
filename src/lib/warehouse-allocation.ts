import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"

export type WarehouseAssetAllocationCommand =
  | {
      action: "allocate"
      itemId: string
      toSppgId: string
      quantity: number
      note: string
      createdAt: string
      transactionDate: string
      createdBy: string
    }
  | {
      action: "transfer"
      itemId: string
      fromSppgId: string
      toSppgId: string
      quantity: number
      note: string
      createdAt: string
      transactionDate: string
      createdBy: string
    }
  | {
      action: "return"
      itemId: string
      fromSppgId: string
      quantity: number
      note: string
      createdAt: string
      transactionDate: string
      createdBy: string
    }

export type WarehouseAllocationErrorCode =
  | "item-not-found"
  | "sppg-not-found"
  | "same-sppg"
  | "insufficient-stock"
  | "insufficient-allocation"

const errorMessages: Record<WarehouseAllocationErrorCode, string> = {
  "item-not-found": "Item gudang tidak ditemukan.",
  "sppg-not-found": "SPPG tidak ditemukan.",
  "same-sppg": "SPPG asal dan tujuan harus berbeda.",
  "insufficient-stock": "Jumlah alokasi melebihi stok gudang yang tersedia.",
  "insufficient-allocation":
    "Jumlah mutasi melebihi saldo aset pada SPPG asal.",
}

export class WarehouseAllocationError extends Error {
  readonly code: WarehouseAllocationErrorCode

  constructor(code: WarehouseAllocationErrorCode) {
    super(errorMessages[code])
    this.code = code
  }
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

export function applyWarehouseAssetAllocation(
  db: DatabaseSync,
  command: WarehouseAssetAllocationCommand,
) {
  return withImmediateTransaction(db, () => {
    const item = db
      .prepare("SELECT id FROM warehouse_item WHERE id = ? AND kind = 'asset'")
      .get(command.itemId)
    if (!item) throw new WarehouseAllocationError("item-not-found")

    const fromSppgId =
      command.action === "allocate" ? null : command.fromSppgId
    const toSppgId = command.action === "return" ? null : command.toSppgId
    if (
      command.action === "transfer" &&
      command.fromSppgId === command.toSppgId
    ) {
      throw new WarehouseAllocationError("same-sppg")
    }

    const fromSppg =
      fromSppgId === null
        ? null
        : (db
            .prepare("SELECT nama FROM sppg WHERE id = ?")
            .get(fromSppgId) as { nama: string } | undefined)
    const toSppg =
      toSppgId === null
        ? null
        : (db
            .prepare("SELECT nama FROM sppg WHERE id = ?")
            .get(toSppgId) as { nama: string } | undefined)
    if (
      (fromSppgId !== null && !fromSppg) ||
      (toSppgId !== null && !toSppg)
    ) {
      throw new WarehouseAllocationError("sppg-not-found")
    }

    if (command.action === "allocate") {
      const balance = db
        .prepare(
          `SELECT COALESCE(SUM(
             CASE movement_type WHEN 'in' THEN quantity ELSE -quantity END
           ), 0) AS stock
           FROM warehouse_movement WHERE item_id = ?`,
        )
        .get(command.itemId) as { stock: number }
      if (command.quantity > Number(balance.stock)) {
        throw new WarehouseAllocationError("insufficient-stock")
      }
    }

    if (fromSppgId !== null) {
      const balance = db
        .prepare(
          "SELECT quantity FROM warehouse_asset_allocation WHERE item_id = ? AND sppg_id = ?",
        )
        .get(command.itemId, fromSppgId) as
        | { quantity: number }
        | undefined
      if (!balance || command.quantity > balance.quantity) {
        throw new WarehouseAllocationError("insufficient-allocation")
      }
      if (command.quantity === balance.quantity) {
        db.prepare(
          "DELETE FROM warehouse_asset_allocation WHERE item_id = ? AND sppg_id = ?",
        ).run(command.itemId, fromSppgId)
      } else {
        db.prepare(
          `UPDATE warehouse_asset_allocation
           SET quantity = quantity - ?, updated_at = ?
           WHERE item_id = ? AND sppg_id = ?`,
        ).run(
          command.quantity,
          command.createdAt,
          command.itemId,
          fromSppgId,
        )
      }
    }

    if (toSppgId !== null) {
      db.prepare(
        `INSERT INTO warehouse_asset_allocation
           (item_id, sppg_id, quantity, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (item_id, sppg_id) DO UPDATE SET
           quantity = quantity + excluded.quantity,
           updated_at = excluded.updated_at`,
      ).run(
        command.itemId,
        toSppgId,
        command.quantity,
        command.createdAt,
        command.createdAt,
      )
    }

    if (command.action === "allocate" || command.action === "return") {
      const movementType = command.action === "allocate" ? "out" : "in"
      db.prepare(
        `INSERT INTO warehouse_movement
         (id, item_id, movement_type, quantity, note, created_at, created_by,
          transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        command.itemId,
        movementType,
        command.quantity,
        command.note,
        command.createdAt,
        command.createdBy,
        command.transactionDate,
      )
    }

    db.prepare(
      `INSERT INTO warehouse_asset_allocation_movement
         (id, item_id, movement_type, from_sppg_id, from_sppg_name,
          to_sppg_id, to_sppg_name, quantity, note, created_at, created_by,
          transaction_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      command.itemId,
      command.action,
      fromSppgId,
      fromSppg?.nama ?? null,
      toSppgId,
      toSppg?.nama ?? null,
      command.quantity,
      command.note,
      command.createdAt,
      command.createdBy,
      command.transactionDate,
    )
    db.prepare("UPDATE warehouse_item SET updated_at = ? WHERE id = ?").run(
      command.createdAt,
      command.itemId,
    )
  })
}

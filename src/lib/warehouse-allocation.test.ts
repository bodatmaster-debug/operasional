import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import test from "node:test"
import {
  applyWarehouseAssetAllocation,
  WarehouseAllocationError,
  type WarehouseAssetAllocationCommand,
} from "./warehouse-allocation.ts"

type TestCommand = WarehouseAssetAllocationCommand extends infer T
  ? T extends WarehouseAssetAllocationCommand
    ? Omit<T, "createdAt" | "createdBy" | "transactionDate"> & {
        transactionDate?: string
      }
    : never
  : never

function createDatabase() {
  const db = new DatabaseSync(":memory:")
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE account (id TEXT PRIMARY KEY, username TEXT NOT NULL);
    CREATE TABLE sppg (id TEXT PRIMARY KEY, nama TEXT NOT NULL);
    CREATE TABLE warehouse_item (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE warehouse_movement (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES warehouse_item(id),
      movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out')),
      quantity INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT REFERENCES account(id),
      transaction_date TEXT NOT NULL
    );
    CREATE TABLE warehouse_asset_allocation (
      item_id TEXT NOT NULL REFERENCES warehouse_item(id),
      sppg_id TEXT NOT NULL REFERENCES sppg(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (item_id, sppg_id)
    );
    CREATE TABLE warehouse_asset_allocation_movement (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES warehouse_item(id),
      movement_type TEXT NOT NULL
        CHECK (movement_type IN ('allocate', 'transfer', 'return')),
      from_sppg_id TEXT REFERENCES sppg(id) ON DELETE SET NULL,
      from_sppg_name TEXT,
      to_sppg_id TEXT REFERENCES sppg(id) ON DELETE SET NULL,
      to_sppg_name TEXT,
      quantity INTEGER NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT REFERENCES account(id),
      transaction_date TEXT NOT NULL,
      CHECK (
        (movement_type = 'allocate' AND from_sppg_id IS NULL AND from_sppg_name IS NULL AND to_sppg_name IS NOT NULL) OR
        (movement_type = 'transfer' AND from_sppg_name IS NOT NULL AND to_sppg_name IS NOT NULL) OR
        (movement_type = 'return' AND from_sppg_name IS NOT NULL AND to_sppg_id IS NULL AND to_sppg_name IS NULL)
      )
    );
    INSERT INTO account VALUES ('actor', 'operator');
    INSERT INTO sppg VALUES ('sppg-a', 'SPPG A'), ('sppg-b', 'SPPG B');
    INSERT INTO warehouse_item VALUES ('item', 'asset', '2026-01-01T00:00:00.000Z');
    INSERT INTO warehouse_movement
      (id, item_id, movement_type, quantity, note, created_at, created_by, transaction_date)
      VALUES ('stock-in', 'item', 'in', 10, '', '2026-01-01T00:00:00.000Z', 'actor', '2026-01-01');
  `)
  return db
}

function runCommand(
  db: DatabaseSync,
  command: TestCommand,
) {
  applyWarehouseAssetAllocation(db, {
    ...command,
    createdAt: "2026-02-01T00:00:00.000Z",
    transactionDate: command.transactionDate ?? "2026-02-01",
    createdBy: "actor",
  })
}

test("allocation, transfer, and return keep balances and logs consistent", () => {
  const db = createDatabase()
  try {
    runCommand(db, {
      action: "allocate",
      itemId: "item",
      toSppgId: "sppg-a",
      quantity: 4,
      note: "Penyaluran awal",
      transactionDate: "2026-01-15",
    })
    runCommand(db, {
      action: "transfer",
      itemId: "item",
      fromSppgId: "sppg-a",
      toSppgId: "sppg-b",
      quantity: 2,
      note: "",
    })
    runCommand(db, {
      action: "transfer",
      itemId: "item",
      fromSppgId: "sppg-a",
      toSppgId: "sppg-b",
      quantity: 2,
      note: "",
    })
    runCommand(db, {
      action: "return",
      itemId: "item",
      fromSppgId: "sppg-b",
      quantity: 1,
      note: "Kembali ke gudang",
    })

    assert.deepEqual(
      db
        .prepare(
          "SELECT sppg_id, quantity FROM warehouse_asset_allocation ORDER BY sppg_id",
        )
        .all()
        .map((row) => ({ ...row })),
      [{ sppg_id: "sppg-b", quantity: 3 }],
    )
    assert.equal(
      db
        .prepare(
          `SELECT SUM(CASE movement_type WHEN 'in' THEN quantity ELSE -quantity END) AS stock
           FROM warehouse_movement WHERE item_id = 'item'`,
        )
        .get()?.stock,
      7,
    )
    assert.equal(
      db
        .prepare("SELECT count(*) AS count FROM warehouse_asset_allocation_movement")
        .get()?.count,
      4,
    )
    assert.deepEqual(
      {
        ...db.prepare(
          `SELECT created_at, transaction_date
           FROM warehouse_asset_allocation_movement
           WHERE movement_type = 'allocate'`,
        ).get(),
      },
      {
        created_at: "2026-02-01T00:00:00.000Z",
        transaction_date: "2026-01-15",
      },
    )
    assert.deepEqual(
      {
        ...db.prepare(
          `SELECT created_at, transaction_date
           FROM warehouse_movement
           WHERE movement_type = 'out'`,
        ).get(),
      },
      {
        created_at: "2026-02-01T00:00:00.000Z",
        transaction_date: "2026-01-15",
      },
    )
    assert.deepEqual(
      db
        .prepare(
          `SELECT movement_type, from_sppg_name, to_sppg_name
           FROM warehouse_asset_allocation_movement
           ORDER BY rowid`,
        )
        .all()
        .map((row) => ({ ...row })),
      [
        {
          movement_type: "allocate",
          from_sppg_name: null,
          to_sppg_name: "SPPG A",
        },
        {
          movement_type: "transfer",
          from_sppg_name: "SPPG A",
          to_sppg_name: "SPPG B",
        },
        {
          movement_type: "transfer",
          from_sppg_name: "SPPG A",
          to_sppg_name: "SPPG B",
        },
        {
          movement_type: "return",
          from_sppg_name: "SPPG B",
          to_sppg_name: null,
        },
      ],
    )
  } finally {
    db.close()
  }
})

test("insufficient stock, insufficient allocation, and same-SPPG transfer roll back", () => {
  const db = createDatabase()
  try {
    runCommand(db, {
      action: "allocate",
      itemId: "item",
      toSppgId: "sppg-a",
      quantity: 4,
      note: "",
    })

    assert.throws(
      () =>
        runCommand(db, {
          action: "allocate",
          itemId: "item",
          toSppgId: "sppg-b",
          quantity: 11,
          note: "",
        }),
      (error: unknown) =>
        error instanceof WarehouseAllocationError &&
        error.code === "insufficient-stock",
    )
    assert.throws(
      () =>
        runCommand(db, {
          action: "transfer",
          itemId: "item",
          fromSppgId: "sppg-a",
          toSppgId: "sppg-b",
          quantity: 5,
          note: "",
        }),
      (error: unknown) =>
        error instanceof WarehouseAllocationError &&
        error.code === "insufficient-allocation",
    )
    assert.throws(
      () =>
        runCommand(db, {
          action: "transfer",
          itemId: "item",
          fromSppgId: "sppg-a",
          toSppgId: "sppg-a",
          quantity: 1,
          note: "",
        }),
      (error: unknown) =>
        error instanceof WarehouseAllocationError &&
        error.code === "same-sppg",
    )

    assert.deepEqual(
      db
        .prepare(
          "SELECT sppg_id, quantity FROM warehouse_asset_allocation ORDER BY sppg_id",
        )
        .all()
        .map((row) => ({ ...row })),
      [{ sppg_id: "sppg-a", quantity: 4 }],
    )
    assert.equal(
      db
        .prepare("SELECT count(*) AS count FROM warehouse_asset_allocation_movement")
        .get()?.count,
      1,
    )
  } finally {
    db.close()
  }
})

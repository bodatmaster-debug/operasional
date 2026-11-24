import assert from "node:assert/strict"
import { DatabaseSync } from "node:sqlite"
import test from "node:test"
import { parseRABInput, terbilangRupiah } from "./rab.ts"
import { updateRABRecord } from "./rab-storage.ts"

test("normalizes RAB items and calculates total from quantity times unit cost", () => {
  assert.deepEqual(
    parseRABInput({
      rabDate: "2026-11-21",
      sppgId: " sppg-1 ",
      assigneeId: " person-1 ",
      items: [
        { name: "  Beras  ", quantity: 3, unit: " kg ", estimatedUnitCost: 12500 },
        { name: "Gas", quantity: 2, unit: "tabung", estimatedUnitCost: 200000 },
      ],
    }),
    {
      ok: true,
      input: {
        rabDate: "2026-11-21",
        sppgId: "sppg-1",
        assigneeId: "person-1",
        notes: "",
        items: [
          { name: "Beras", quantity: 3, unit: "kg", estimatedUnitCost: 12500 },
          { name: "Gas", quantity: 2, unit: "tabung", estimatedUnitCost: 200000 },
        ],
        grandTotal: 437500,
      },
    },
  )
})

test("normalizes optional RAB notes and enforces the length limit", () => {
  const parsed = parseRABInput({
    rabDate: "2026-11-21",
    sppgId: "sppg-1",
    assigneeId: "person-1",
    notes: "  Untuk pengadaan bulan depan.  ",
    items: [{ name: "Kompor", quantity: 1, unit: "unit", estimatedUnitCost: 1000 }],
  })

  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.equal(parsed.input.notes, "Untuk pengadaan bulan depan.")
  assert.equal(
    parseRABInput({
      rabDate: "2026-11-21",
      sppgId: "sppg-1",
      assigneeId: "person-1",
      notes: "a".repeat(1001),
      items: [{ name: "Kompor", quantity: 1, unit: "unit", estimatedUnitCost: 1000 }],
    }).ok,
    false,
  )
})

test("rejects empty or oversized RAB lists and unsafe amounts", () => {
  assert.equal(
    parseRABInput({
      rabDate: "2026-11-21",
      sppgId: "sppg-1",
      assigneeId: "person-1",
      items: [],
    }).ok,
    false,
  )
  assert.equal(
    parseRABInput({
      rabDate: "2026-11-21",
      sppgId: "sppg-1",
      assigneeId: "person-1",
      items: [
        {
          name: "Item",
          quantity: Number.MAX_SAFE_INTEGER,
          unit: "unit",
          estimatedUnitCost: Number.MAX_SAFE_INTEGER,
        },
      ],
    }).ok,
    false,
  )
})

test("converts safe rupiah totals to Indonesian words", () => {
  assert.equal(terbilangRupiah(0), "Nol rupiah")
  assert.equal(terbilangRupiah(19), "Sembilan belas rupiah")
  assert.equal(terbilangRupiah(101), "Seratus satu rupiah")
  assert.equal(terbilangRupiah(1000), "Seribu rupiah")
  assert.equal(terbilangRupiah(1001), "Seribu satu rupiah")
  assert.equal(terbilangRupiah(1_000_001), "Satu juta satu rupiah")
  assert.equal(
    terbilangRupiah(20_060_000),
    "Dua puluh juta enam puluh ribu rupiah",
  )
  assert.equal(
    terbilangRupiah(Number.MAX_SAFE_INTEGER),
    "Sembilan kuadriliun tujuh triliun seratus sembilan puluh sembilan miliar dua ratus lima puluh empat juta tujuh ratus empat puluh ribu sembilan ratus sembilan puluh satu rupiah",
  )
  assert.throws(() => terbilangRupiah(-1), RangeError)
  assert.throws(() => terbilangRupiah(Number.MAX_SAFE_INTEGER + 1), RangeError)
})

test("rejects invalid quantities, costs, and item names", () => {
  for (const item of [
    { name: "Item", quantity: 0, unit: "unit", estimatedUnitCost: 1 },
    { name: "Item", quantity: 1.5, unit: "unit", estimatedUnitCost: 1 },
    { name: "Item", quantity: 1, unit: "unit", estimatedUnitCost: 0 },
    { name: "  ", quantity: 1, unit: "unit", estimatedUnitCost: 1 },
    { name: "Item", quantity: 1, unit: "", estimatedUnitCost: 1 },
    { name: "Item", quantity: 1, unit: "u".repeat(41), estimatedUnitCost: 1 },
    { name: "Item", quantity: 1, unit: "unit\u0000", estimatedUnitCost: 1 },
  ]) {
    assert.equal(
      parseRABInput({
        rabDate: "2026-11-21",
        sppgId: "sppg-1",
        assigneeId: "person-1",
        items: [item],
      }).ok,
      false,
    )
  }
})

test("rejects malformed or impossible RAB dates", () => {
  for (const rabDate of ["", "21-11-2026", "2026-02-30"]) {
    assert.equal(
      parseRABInput({
        rabDate,
        sppgId: "sppg-1",
        assigneeId: "person-1",
        items: [{ name: "Item", quantity: 1, unit: "unit", estimatedUnitCost: 1 }],
      }).ok,
      false,
    )
  }
})

function createRABDatabase() {
  const db = new DatabaseSync(":memory:")
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE sppg (id TEXT PRIMARY KEY, nama TEXT NOT NULL);
    CREATE TABLE maintenance_assignee (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE rab_proposal (
      id TEXT PRIMARY KEY,
      rab_date TEXT NOT NULL,
      sppg_id TEXT,
      sppg_name TEXT NOT NULL,
      assignee_id TEXT NOT NULL,
      assignee_name TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_by TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE rab_proposal_item (
      rab_id TEXT NOT NULL REFERENCES rab_proposal(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit TEXT NOT NULL,
      estimated_unit_cost INTEGER NOT NULL,
      PRIMARY KEY (rab_id, position)
    );
    INSERT INTO sppg VALUES ('sppg-1', 'SPPG Baru');
    INSERT INTO maintenance_assignee VALUES ('person-1', 'Nama Petugas');
    INSERT INTO rab_proposal VALUES (
      'rab-1', '2026-01-01', 'sppg-old', 'SPPG Lama',
      'person-old', 'Petugas Lama', 'Catatan lama', 'creator-1',
      '2026-01-01T00:00:00.000Z'
    );
    INSERT INTO rab_proposal_item VALUES (
      'rab-1', 0, 'Item lama', 1, 'unit', 100
    );
  `)
  return db
}

test("updates a saved RAB and replaces its items without changing its creator", () => {
  const db = createRABDatabase()
  try {
    const parsed = parseRABInput({
      rabDate: "2026-11-21",
      sppgId: "sppg-1",
      assigneeId: "person-1",
      notes: "Catatan baru",
      items: [
        { name: "Kompor", quantity: 2, unit: "unit", estimatedUnitCost: 1500 },
        { name: "Selang", quantity: 3, unit: "meter", estimatedUnitCost: 500 },
      ],
    })
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return

    const updated = updateRABRecord(db, "rab-1", parsed.input)

    assert.equal(updated.rab_date, "2026-11-21")
    assert.equal(updated.sppg_name, "SPPG Baru")
    assert.equal(updated.assignee_name, "Nama Petugas")
    assert.equal(updated.notes, "Catatan baru")
    assert.equal(updated.created_by, "creator-1")
    assert.equal(updated.item_count, 2)
    assert.equal(updated.grand_total, 4500)
    assert.deepEqual(
      updated.items.map((item) => ({ ...item })),
      parsed.input.items,
    )
  } finally {
    db.close()
  }
})

test("does not alter a saved RAB when its selected assignee is unavailable", () => {
  const db = createRABDatabase()
  try {
    const parsed = parseRABInput({
      rabDate: "2026-11-21",
      sppgId: "sppg-1",
      assigneeId: "missing-person",
      items: [
        { name: "Kompor", quantity: 2, unit: "unit", estimatedUnitCost: 1500 },
      ],
    })
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return

    assert.throws(
      () => updateRABRecord(db, "rab-1", parsed.input),
      /Petugas yang dipilih tidak lagi tersedia/,
    )
    assert.equal(
      (db.prepare("SELECT rab_date FROM rab_proposal WHERE id = 'rab-1'").get() as { rab_date: string }).rab_date,
      "2026-01-01",
    )
    assert.equal(
      (db.prepare("SELECT name FROM rab_proposal_item WHERE rab_id = 'rab-1'").get() as { name: string }).name,
      "Item lama",
    )
  } finally {
    db.close()
  }
})

import assert from "node:assert/strict"
import test from "node:test"
import {
  isDateOnly,
  isValidMaintenancePhone,
  MAX_MAINTENANCE_NEEDS,
  parseMaintenanceNeeds,
  sortMaintenanceSchedules,
  type MaintenanceSchedule,
} from "./maintenance.ts"

function schedule(id: string, scheduled_date: string): MaintenanceSchedule {
  return {
    id,
    sppg_id: "sppg-id",
    sppg_name: "SPPG",
    asset_source: "juknis",
    asset_category: "Peralatan dapur",
    asset_name: "Kompor",
    asset_details: "",
    maintenance_type: "routine",
    notes: "Pemeriksaan",
    scheduled_date,
    recurrence: "none",
    recurrence_days: null,
    assignees: "Petugas (Teknisi)",
    needs: [],
    created_at: "2026-01-01T00:00:00.000Z",
  }
}

test("date-only validation rejects impossible calendar dates", () => {
  assert.equal(isDateOnly("2026-02-28"), true)
  assert.equal(isDateOnly("2026-02-29"), false)
  assert.equal(isDateOnly("2024-02-29"), true)
  assert.equal(isDateOnly("2026-13-01"), false)
})

test("phone validation accepts local and international numbers", () => {
  assert.equal(isValidMaintenancePhone("0812 3456 7890"), true)
  assert.equal(isValidMaintenancePhone("+62 (812) 3456-7890"), true)
  assert.equal(isValidMaintenancePhone("1234567"), false)
  assert.equal(isValidMaintenancePhone("0812-ABC-7890"), false)
  assert.equal(isValidMaintenancePhone("+1234567890123456"), false)
})

test("maintenance needs are normalized while optional notes may be blank", () => {
  assert.deepEqual(
    parseMaintenanceNeeds([
      {
        name: "  Oli mesin ",
        quantity: 2,
        unit: " L ",
        notes: "",
      },
    ]),
    {
      ok: true,
      needs: [{ name: "Oli mesin", quantity: 2, unit: "L", notes: "" }],
    },
  )
  assert.deepEqual(parseMaintenanceNeeds([]), { ok: true, needs: [] })
})

test("maintenance needs reject incomplete, nonpositive, and oversized input", () => {
  assert.deepEqual(
    parseMaintenanceNeeds([
      { name: "Oli", quantity: 0, unit: "L", notes: "" },
    ]),
    {
      ok: false,
      error: "Jumlah kebutuhan ke-1 harus lebih besar dari 0.",
    },
  )
  assert.equal(
    parseMaintenanceNeeds([
      { name: "Oli", quantity: 1, unit: "", notes: "" },
    ]).ok,
    false,
  )
  assert.equal(
    parseMaintenanceNeeds(
      Array.from({ length: MAX_MAINTENANCE_NEEDS + 1 }, () => ({
        name: "Oli",
        quantity: 1,
        unit: "L",
        notes: "",
      })),
    ).ok,
    false,
  )
})

test("schedules sort upcoming dates first and overdue dates newest-first", () => {
  const sorted = sortMaintenanceSchedules(
    [
      schedule("old", "2026-10-28"),
      schedule("soon", "2026-11-17"),
      schedule("today", "2026-11-16"),
      schedule("recent-past", "2026-11-15"),
      schedule("later", "2026-12-01"),
    ],
    "2026-11-16",
  )

  assert.deepEqual(
    sorted.map(({ id }) => id),
    ["today", "soon", "later", "recent-past", "old"],
  )
})

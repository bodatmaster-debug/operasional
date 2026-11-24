import assert from "node:assert/strict"
import test from "node:test"
import {
  getMaintenanceOccurrences,
  getMaintenanceOccurrencesForMonth,
  isMaintenanceOccurrenceListed,
} from "./maintenance.ts"

function schedule(id, scheduled_date, recurrence, recurrence_days = null) {
  return {
    id,
    sppg_id: "sppg-1",
    sppg_name: "SPPG",
    asset_source: "juknis",
    asset_category: "Peralatan",
    asset_name: `Aset ${id}`,
    asset_details: "",
    maintenance_type: recurrence === "none" ? "repair" : "routine",
    notes: "Pemeliharaan",
    scheduled_date,
    recurrence,
    recurrence_days,
    assignees: "Petugas",
    created_at: "2026-01-01T00:00:00.000Z",
  }
}

test("expands one-time, weekly, and custom schedules only within the visible range", () => {
  const schedules = [
    schedule("once", "2026-04-04", "none"),
    schedule("weekly", "2026-03-30", "weekly"),
    schedule("custom", "2026-04-01", "custom", 3),
  ]

  assert.deepEqual(
    getMaintenanceOccurrences(schedules, "2026-04-01", "2026-04-08").map(
      ({ schedule: item, date }) => `${item.id}:${date}`,
    ),
    [
      "custom:2026-04-01",
      "custom:2026-04-04",
      "once:2026-04-04",
      "weekly:2026-04-06",
      "custom:2026-04-07",
    ],
  )
})

test("clamps monthly recurrences to short months without shifting the original day", () => {
  const monthly = schedule("monthly", "2026-01-31", "monthly")

  assert.deepEqual(
    getMaintenanceOccurrences(
      [monthly],
      "2026-02-01",
      "2026-04-30",
    ).map(({ date }) => date),
    ["2026-02-28", "2026-03-31", "2026-04-30"],
  )
})

test("lists only this month's occurrences, including recurring schedule dates", () => {
  const schedules = [
    schedule("monthly", "2026-01-31", "monthly"),
    schedule("custom", "2026-11-01", "custom", 7),
    schedule("weekly", "2026-10-30", "weekly"),
    schedule("once-before", "2026-10-31", "none"),
    schedule("once-this-month", "2026-11-15", "none"),
    schedule("yearly-next-month", "2025-12-10", "yearly"),
  ]

  assert.deepEqual(
    getMaintenanceOccurrencesForMonth(schedules, "2026-11-21").map(
      ({ schedule: item, date }) => `${item.id}:${date}`,
    ),
    [
      "custom:2026-11-01",
      "weekly:2026-11-06",
      "custom:2026-11-08",
      "weekly:2026-11-13",
      "custom:2026-11-15",
      "once-this-month:2026-11-15",
      "weekly:2026-11-20",
      "custom:2026-11-22",
      "weekly:2026-11-27",
      "custom:2026-11-29",
      "monthly:2026-11-30",
    ],
  )
})

test("hiding a schedule occurrence does not hide completed occurrences", () => {
  assert.equal(isMaintenanceOccurrenceListed(null), true)
  assert.equal(isMaintenanceOccurrenceListed("completed"), true)
  assert.equal(isMaintenanceOccurrenceListed("dismissed"), false)
})

test("clamps yearly leap-day recurrences and restores February 29 in leap years", () => {
  const yearly = schedule("yearly", "2024-02-29", "yearly")

  assert.deepEqual(
    getMaintenanceOccurrences([yearly], "2027-01-01", "2028-12-31").map(
      ({ date }) => date,
    ),
    ["2027-02-28", "2028-02-29"],
  )
})

test("returns no occurrence for invalid ranges or invalid custom intervals", () => {
  const invalidInterval = schedule("invalid", "2026-04-01", "custom", 0)

  assert.deepEqual(
    getMaintenanceOccurrences(
      [invalidInterval],
      "2026-04-02",
      "2026-04-01",
    ),
    [],
  )
  assert.deepEqual(
    getMaintenanceOccurrences([invalidInterval], "2026-04-01", "2026-04-03"),
    [],
  )
})

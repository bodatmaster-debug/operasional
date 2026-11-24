import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  getMaintenanceOccurrences,
  isDateOnly,
  type MaintenanceRecurrence,
} from "@/lib/maintenance"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

const RECURRENCES: MaintenanceRecurrence[] = [
  "none",
  "custom",
  "weekly",
  "monthly",
  "yearly",
]
const OCCURRENCE_STATUSES = ["completed", "dismissed"] as const

class OccurrenceNotFoundError extends Error {}
class OccurrenceValidationError extends Error {}

function isMonth(value: string | null): value is string {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
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

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "maintenance")
  if (isResponse(user)) return user

  const month = request.nextUrl.searchParams.get("month")
  if (!isMonth(month)) {
    return NextResponse.json(
      { error: "Bulan occurrence pemeliharaan tidak valid." },
      { status: 400 },
    )
  }

  try {
    const records = getLocalDatabase()
      .prepare(
        `SELECT schedule_id, occurrence_date, status, updated_at
         FROM maintenance_schedule_occurrence
         WHERE substr(occurrence_date, 1, 7) = ?
         ORDER BY occurrence_date, schedule_id`,
      )
      .all(month)
    return NextResponse.json(
      { records },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local maintenance occurrence status list failed.", error)
    return NextResponse.json(
      { error: "Status jadwal pemeliharaan lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireLocalPermission(request, "maintenance", true, "maintenance")
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  const scheduleId =
    typeof body.scheduleId === "string" ? body.scheduleId.trim() : ""
  const occurrenceDate = body.occurrenceDate
  const status = OCCURRENCE_STATUSES.find(
    (candidate) => candidate === body.status,
  )
  if (
    !scheduleId ||
    scheduleId.length > 120 ||
    /[\u0000-\u001f\u007f]/.test(scheduleId) ||
    !isDateOnly(occurrenceDate) ||
    !status
  ) {
    return NextResponse.json(
      { error: "Occurrence pemeliharaan tidak valid." },
      { status: 400 },
    )
  }

  try {
    const db = getLocalDatabase()
    const record = withImmediateTransaction(db, () => {
      const schedule = db
        .prepare(
          `SELECT id, scheduled_date, recurrence, recurrence_days, asset_name
           FROM maintenance_schedule
           WHERE id = ?`,
        )
        .get(scheduleId) as
        | {
            id: string
            scheduled_date: string
            recurrence: string
            recurrence_days: number | null
            asset_name: string
          }
        | undefined
      if (!schedule) {
        throw new OccurrenceNotFoundError("Jadwal pemeliharaan tidak ditemukan.")
      }

      const recurrence = RECURRENCES.find(
        (candidate) => candidate === schedule.recurrence,
      )
      if (
        !recurrence ||
        getMaintenanceOccurrences(
          [{ ...schedule, recurrence }],
          occurrenceDate,
          occurrenceDate,
        ).length === 0
      ) {
        throw new OccurrenceValidationError(
          "Tanggal tersebut bukan occurrence dari jadwal pemeliharaan.",
        )
      }

      const updatedAt = new Date().toISOString()
      db.prepare(
        `INSERT INTO maintenance_schedule_occurrence (
           schedule_id, occurrence_date, status, updated_by, updated_at
         ) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (schedule_id, occurrence_date) DO UPDATE SET
           status = excluded.status,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`,
      ).run(scheduleId, occurrenceDate, status, user.id, updatedAt)

      return {
        schedule_id: scheduleId,
        occurrence_date: occurrenceDate,
        status,
        updated_at: updatedAt,
      }
    })
    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof OccurrenceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof OccurrenceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local maintenance occurrence status update failed.", error)
    return NextResponse.json(
      { error: "Status jadwal pemeliharaan lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

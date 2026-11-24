import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import { findMaintenanceAsset } from "@/lib/maintenance-assets"
import {
  isDateOnly,
  parseMaintenanceNeeds,
  type MaintenanceAssetSource,
  type MaintenanceNeed,
  type MaintenanceRecurrence,
  type MaintenanceType,
} from "@/lib/maintenance"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class MaintenanceValidationError extends Error {}
class MaintenanceNotFoundError extends Error {}

const ASSET_SOURCES: MaintenanceAssetSource[] = [
  "juknis",
  "non-juknis",
  "surat-edaran",
  "vehicle",
  "gas-installation",
  "electrical-installation",
  "generator",
]
const RECURRENCES: MaintenanceRecurrence[] = [
  "none",
  "custom",
  "weekly",
  "monthly",
  "yearly",
]

function requireMaintenanceManager(request: NextRequest, mutation = false) {
  return requireLocalPermission(request, "maintenance", mutation, "maintenance")
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
    throw new MaintenanceValidationError(`${label} wajib diisi.`)
  }
  const text = value.trim()
  if (!text || text.length > maximum || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new MaintenanceValidationError(
      `${label} wajib diisi dan maksimal ${maximum} karakter.`,
    )
  }
  return text
}

function readIdList(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > 100) {
    throw new MaintenanceValidationError(`${label} tidak valid.`)
  }
  const ids = value.map((id) =>
    typeof id === "string" ? id.trim() : "",
  )
  if (ids.some((id) => !id || id.length > 120) || new Set(ids).size !== ids.length) {
    throw new MaintenanceValidationError(`${label} tidak valid.`)
  }
  return ids
}

function readInput(body: Record<string, unknown>) {
  const sppgId = readText(body.sppgId, "SPPG", 120)
  const assetRecordId = readText(body.assetRecordId, "Item aset", 120)
  const assetSource = ASSET_SOURCES.find((source) => source === body.assetSource)
  if (!assetSource) {
    throw new MaintenanceValidationError("Sumber item aset tidak valid.")
  }
  const maintenanceType = body.maintenanceType
  if (maintenanceType !== "routine" && maintenanceType !== "repair") {
    throw new MaintenanceValidationError("Pilih jenis rencana pemeliharaan.")
  }
  const parsedNeeds = parseMaintenanceNeeds(body.needs ?? [])
  if (!parsedNeeds.ok) {
    throw new MaintenanceValidationError(parsedNeeds.error)
  }
  const notes = readText(body.notes, "Keterangan", 1000)
  if (!isDateOnly(body.scheduledDate)) {
    throw new MaintenanceValidationError("Tanggal penugasan tidak valid.")
  }

  let recurrence: MaintenanceRecurrence = "none"
  let recurrenceDays: number | null = null
  if (maintenanceType === "routine") {
    const selected = RECURRENCES.find(
      (candidate) => candidate === body.recurrence,
    )
    if (!selected) {
      throw new MaintenanceValidationError("Pilihan periodesasi tidak valid.")
    }
    recurrence = selected
    if (recurrence === "custom") {
      const days = body.recurrenceDays
      if (
        typeof days !== "number" ||
        !Number.isSafeInteger(days) ||
        days < 1 ||
        days > 36500
      ) {
        throw new MaintenanceValidationError(
          "Periode khusus harus berupa jumlah hari antara 1 dan 36.500.",
        )
      }
      recurrenceDays = days
    }
  } else if (body.recurrence !== undefined && body.recurrence !== "none") {
    throw new MaintenanceValidationError(
      "Rencana perbaikan hanya dapat dijadwalkan satu kali.",
    )
  }

  const assigneeIds = readIdList(body.assigneeIds, "Daftar petugas")
  if (assigneeIds.length === 0) {
    throw new MaintenanceValidationError(
      "Pilih minimal satu petugas dari roster terdaftar.",
    )
  }
  if (assigneeIds.length > 100) {
    throw new MaintenanceValidationError("Jumlah petugas melewati batas.")
  }

  return {
    sppgId,
    assetRecordId,
    assetSource,
    maintenanceType: maintenanceType as MaintenanceType,
    needs: parsedNeeds.needs,
    notes,
    scheduledDate: body.scheduledDate,
    recurrence,
    recurrenceDays,
    assigneeIds,
  }
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "maintenance")
  if (isResponse(user)) return user

  try {
    const db = getLocalDatabase()
    const records = db
      .prepare(
        `SELECT m.id, m.sppg_id, m.sppg_name, m.asset_source,
                m.asset_category, m.asset_name, m.asset_details,
                m.maintenance_type, m.notes, m.scheduled_date,
                m.recurrence, m.recurrence_days, m.created_at,
                COALESCE((
                  SELECT group_concat(name || ' (' || role || ')', ', ')
                  FROM (
                    SELECT a.name, a.role
                    FROM maintenance_schedule_assignee sa
                    JOIN maintenance_assignee a ON a.id = sa.assignee_id
                    WHERE sa.schedule_id = m.id
                    ORDER BY a.name COLLATE NOCASE
                  )
                ), '') AS assignees
         FROM maintenance_schedule m
         ORDER BY m.scheduled_date, m.created_at`,
      )
      .all()
    const needsBySchedule = new Map<string, MaintenanceNeed[]>()
    const needs = db
      .prepare(
        `SELECT schedule_id, name, quantity, unit, notes
         FROM maintenance_schedule_need
         ORDER BY schedule_id, position`,
      )
      .all() as Array<{
      schedule_id: string
      name: string
      quantity: number
      unit: string
      notes: string
    }>
    for (const { schedule_id, ...need } of needs) {
      const scheduleNeeds = needsBySchedule.get(schedule_id) ?? []
      scheduleNeeds.push(need)
      needsBySchedule.set(schedule_id, scheduleNeeds)
    }
    const recordsWithNeeds = records.map((record) => ({
      ...record,
      needs: needsBySchedule.get(String(record.id)) ?? [],
    }))
    return NextResponse.json(
      { records: recordsWithNeeds },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local maintenance schedule list failed.", error)
    return NextResponse.json(
      { error: "Jadwal pemeliharaan lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireMaintenanceManager(request, true)
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
    const id = randomUUID()
    const now = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db
        .prepare("SELECT id, nama FROM sppg WHERE id = ?")
        .get(input.sppgId) as { id: string; nama: string } | undefined
      if (!sppg) throw new MaintenanceNotFoundError("SPPG tidak ditemukan.")

      const asset = findMaintenanceAsset(
        db,
        input.sppgId,
        input.assetSource,
        input.assetRecordId,
      )
      if (!asset) {
        throw new MaintenanceNotFoundError(
          "Item aset tidak ditemukan pada SPPG yang dipilih.",
        )
      }

      if (input.assigneeIds.length > 0) {
        const placeholders = input.assigneeIds.map(() => "?").join(", ")
        const rows = db
          .prepare(
            `SELECT id FROM maintenance_assignee
             WHERE id IN (${placeholders})`,
          )
          .all(...input.assigneeIds) as { id: string }[]
        if (rows.length !== input.assigneeIds.length) {
          throw new MaintenanceNotFoundError(
            "Salah satu petugas yang dipilih tidak lagi tersedia.",
          )
        }
      }

      db.prepare(
        `INSERT INTO maintenance_schedule (
           id, sppg_id, sppg_name, asset_source, asset_record_id,
           asset_category, asset_name, asset_details, maintenance_type,
           notes, scheduled_date, recurrence, recurrence_days,
           created_by, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        sppg.id,
        sppg.nama,
        asset.source,
        asset.id,
        asset.category,
        asset.name,
        asset.details,
        input.maintenanceType,
        input.notes,
        input.scheduledDate,
        input.recurrence,
        input.recurrenceDays,
        user.id,
        now,
      )
      const addAssignee = db.prepare(
        `INSERT INTO maintenance_schedule_assignee (schedule_id, assignee_id)
         VALUES (?, ?)`,
      )
      for (const assigneeId of input.assigneeIds) {
        addAssignee.run(id, assigneeId)
      }
      const addNeed = db.prepare(
        `INSERT INTO maintenance_schedule_need (
           schedule_id, position, name, quantity, unit, notes
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      for (const [position, need] of input.needs.entries()) {
        addNeed.run(
          id,
          position,
          need.name,
          need.quantity,
          need.unit,
          need.notes,
        )
      }

      return { id }
    })

    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (error instanceof MaintenanceValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof MaintenanceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local maintenance schedule creation failed.", error)
    return NextResponse.json(
      { error: "Jadwal pemeliharaan lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

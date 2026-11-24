import { randomUUID } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import { parseRABInput, type RABRecord } from "@/lib/rab"
import { readRABRecord, withImmediateTransaction } from "@/lib/rab-storage"
import {
  isResponse,
  readJsonObject,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

class RABNotFoundError extends Error {}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "maintenance")
  if (isResponse(user)) return user

  try {
    const db = getLocalDatabase()
    const records = db
      .prepare(
        `SELECT r.id, r.rab_date, r.sppg_id, r.sppg_name, r.assignee_id, r.assignee_name,
                r.created_by, r.created_at,
                COUNT(i.position) AS item_count,
                COALESCE(SUM(i.quantity * i.estimated_unit_cost), 0)
                  AS grand_total
         FROM rab_proposal r
         LEFT JOIN rab_proposal_item i ON i.rab_id = r.id
         GROUP BY r.id
         ORDER BY r.created_at DESC, r.id`,
      )
      .all()
    const recordsWithItems = records.map((record) =>
      readRABRecord(db, String((record as { id: string }).id)),
    ).filter((record): record is RABRecord => Boolean(record))
    return NextResponse.json(
      { records: recordsWithItems },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local RAB list failed.", error)
    return NextResponse.json(
      { error: "Daftar RAB lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireLocalPermission(
    request,
    "maintenance",
    true,
    "maintenance",
  )
  if (isResponse(user)) return user

  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  const parsed = parseRABInput(body)
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 })
  }

  try {
    const db = getLocalDatabase()
    const id = randomUUID()
    const createdAt = new Date().toISOString()
    const record = withImmediateTransaction(db, () => {
      const sppg = db
        .prepare("SELECT id, nama FROM sppg WHERE id = ?")
        .get(parsed.input.sppgId) as { id: string; nama: string } | undefined
      if (!sppg) throw new RABNotFoundError("SPPG tidak ditemukan.")

      const assignee = db
        .prepare("SELECT id, name FROM maintenance_assignee WHERE id = ?")
        .get(parsed.input.assigneeId) as
        | { id: string; name: string }
        | undefined
      if (!assignee) {
        throw new RABNotFoundError(
          "Petugas yang dipilih tidak lagi tersedia.",
        )
      }

      db.prepare(
        `INSERT INTO rab_proposal (
           id, rab_date, sppg_id, sppg_name, assignee_id, assignee_name,
           notes, created_by, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        parsed.input.rabDate,
        sppg.id,
        sppg.nama,
        assignee.id,
        assignee.name,
        parsed.input.notes,
        user.id,
        createdAt,
      )
      const addItem = db.prepare(
        `INSERT INTO rab_proposal_item (
           rab_id, position, name, quantity, unit, estimated_unit_cost
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      for (const [position, item] of parsed.input.items.entries()) {
        addItem.run(
          id,
          position,
          item.name,
          item.quantity,
          item.unit,
          item.estimatedUnitCost,
        )
      }

      const saved = readRABRecord(db, id)
      if (!saved) throw new Error("Saved RAB record could not be read.")
      return saved
    })
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (error instanceof RABNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local RAB creation failed.", error)
    return NextResponse.json(
      { error: "RAB lokal gagal disimpan." },
      { status: 500 },
    )
  }
}

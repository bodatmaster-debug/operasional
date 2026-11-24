import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  isResponse,
  readJsonObject,
  requireLocalPermission,
} from "@/lib/local-request"
import { parseRABInput } from "@/lib/rab"
import { RABNotFoundError, updateRABRecord } from "@/lib/rab-storage"

function readRABId(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/").filter(Boolean).at(-1)?.trim()
  return id && id.length <= 120 && !/[\u0000-\u001f\u007f]/.test(id)
    ? id
    : null
}

export async function PATCH(request: NextRequest) {
  const user = requireLocalPermission(
    request,
    "maintenance",
    true,
    "maintenance",
  )
  if (isResponse(user)) return user

  const id = readRABId(request)
  if (!id) {
    return NextResponse.json({ error: "ID RAB tidak valid." }, { status: 400 })
  }
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
    const record = updateRABRecord(db, id, parsed.input)
    return NextResponse.json(
      { record },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof RABNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local RAB update failed.", error)
    return NextResponse.json(
      { error: "RAB lokal gagal diperbarui." },
      { status: 500 },
    )
  }
}

export function DELETE(request: NextRequest) {
  const user = requireLocalPermission(
    request,
    "maintenance",
    true,
    "maintenance",
  )
  if (isResponse(user)) return user

  const id = readRABId(request)
  if (!id) {
    return NextResponse.json(
      { error: "ID RAB tidak valid." },
      { status: 400 },
    )
  }

  try {
    const db = getLocalDatabase()
    db.exec("BEGIN IMMEDIATE")
    try {
      const existing = db
        .prepare("SELECT id FROM rab_proposal WHERE id = ?")
        .get(id)
      if (!existing) {
        db.exec("ROLLBACK")
        return NextResponse.json(
          { error: "RAB tidak ditemukan." },
          { status: 404 },
        )
      }
      db.prepare("DELETE FROM rab_proposal WHERE id = ?").run(id)
      db.exec("COMMIT")
    } catch (error) {
      if (db.isTransaction) db.exec("ROLLBACK")
      throw error
    }
    return NextResponse.json(
      { deleted: true },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local RAB deletion failed.", error)
    return NextResponse.json(
      { error: "RAB lokal gagal dihapus." },
      { status: 500 },
    )
  }
}

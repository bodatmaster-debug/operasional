import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import {
  AssetImportValidationError,
  parseAssetImportFilename,
  parseAssetImportRows,
} from "@/lib/asset-import-input"
import {
  isResponse,
  requireLocalPagePermission,
  requireLocalPermission,
} from "@/lib/local-request"

const MAX_BODY_BYTES = 10 * 1024 * 1024

type BoundedJsonResult =
  | { kind: "ok"; value: Record<string, unknown> }
  | { kind: "invalid" }
  | { kind: "too-large" }

async function readBoundedJsonObject(
  request: Request,
): Promise<BoundedJsonResult> {
  if (!request.body) return { kind: "invalid" }
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel()
        return { kind: "too-large" }
      }
      chunks.push(value)
    }

    const body = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
      body.set(chunk, offset)
      offset += chunk.byteLength
    }
    const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body))
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return { kind: "invalid" }
    }
    return { kind: "ok", value: parsed as Record<string, unknown> }
  } catch {
    return { kind: "invalid" }
  } finally {
    reader.releaseLock()
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

function getBatchRows(db: DatabaseSync, batchId: string) {
  return db
    .prepare(
      `SELECT id, batch_id AS batchId,
              source_row_number AS sourceRowNumber,
              asset_name AS assetName, quantity, unit, category,
              acquisition_value AS acquisitionValue, notes, created_at AS createdAt
       FROM asset_import_row
       WHERE batch_id = ?
       ORDER BY source_row_number`,
    )
    .all(batchId)
}

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "asset-recording")
  if (isResponse(user)) return user

  try {
    const db = getLocalDatabase()
    const batchId = request.nextUrl.searchParams.get("batchId")?.trim()
    if (batchId) {
      if (batchId.length > 100) {
        return NextResponse.json({ error: "Batch impor tidak valid." }, { status: 400 })
      }
      const batch = db
        .prepare(
          `SELECT id, source_filename AS sourceFilename,
                  created_by_username AS createdByUsername,
                  created_at AS createdAt
           FROM asset_import_batch WHERE id = ?`,
        )
        .get(batchId)
      if (!batch) {
        return NextResponse.json({ error: "Impor Excel tidak ditemukan." }, { status: 404 })
      }
      return NextResponse.json(
        { batch, rows: getBatchRows(db, batchId) },
        { headers: { "Cache-Control": "no-store" } },
      )
    }

    const batches = db
      .prepare(
        `SELECT b.id, b.source_filename AS sourceFilename,
                b.created_by_username AS createdByUsername,
                b.created_at AS createdAt,
                COUNT(r.id) AS rowCount
         FROM asset_import_batch b
         LEFT JOIN asset_import_row r ON r.batch_id = b.id
         GROUP BY b.id
         ORDER BY b.created_at DESC
         LIMIT 100`,
      )
      .all()
    return NextResponse.json(
      { batches },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local asset import read failed.", error)
    return NextResponse.json(
      { error: "Daftar impor Excel lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireLocalPermission(
    request,
    "assets",
    true,
    "asset-recording",
  )
  if (isResponse(user)) return user

  const contentLength = request.headers.get("content-length")
  if (
    contentLength !== null &&
    (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)
  ) {
    return NextResponse.json(
      { error: "Ukuran data impor terlalu besar. Kurangi jumlah baris atau catatan." },
      { status: 413 },
    )
  }

  const parsedBody = await readBoundedJsonObject(request)
  if (parsedBody.kind === "too-large") {
    return NextResponse.json(
      { error: "Ukuran data impor terlalu besar. Kurangi jumlah baris atau catatan." },
      { status: 413 },
    )
  }
  if (parsedBody.kind === "invalid") {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  try {
    const body = parsedBody.value
    const sourceFilename = parseAssetImportFilename(body.sourceFilename)
    const rows = parseAssetImportRows(body.rows)
    const db = getLocalDatabase()
    const id = randomUUID()
    const now = new Date().toISOString()

    withImmediateTransaction(db, () => {
      db.prepare(
        `INSERT INTO asset_import_batch (
           id, source_filename, created_by_username, created_at
         ) VALUES (?, ?, ?, ?)`,
      ).run(id, sourceFilename, user.username, now)

      const insertRow = db.prepare(
        `INSERT INTO asset_import_row (
           id, batch_id, source_row_number, asset_name, quantity, unit,
           category, acquisition_value, notes, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      for (const row of rows) {
        insertRow.run(
          randomUUID(),
          id,
          row.sourceRowNumber,
          row.assetName,
          row.quantity,
          row.unit,
          row.category,
          row.acquisitionValue,
          row.notes,
          now,
        )
      }
    })

    return NextResponse.json(
      {
        batch: {
          id,
          sourceFilename,
          createdByUsername: user.username,
          createdAt: now,
          rowCount: rows.length,
        },
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof AssetImportValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("Local asset import write failed.", error)
    return NextResponse.json(
      { error: "Data impor Excel gagal disimpan secara lokal." },
      { status: 500 },
    )
  }
}

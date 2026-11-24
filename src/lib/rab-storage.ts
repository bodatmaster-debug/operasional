import type { DatabaseSync } from "node:sqlite"
import type { RABInput, RABItemInput, RABRecord } from "./rab.ts"

export class RABNotFoundError extends Error {}

export function withImmediateTransaction<T>(
  db: DatabaseSync,
  operation: () => T,
): T {
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

export function readRABRecord(db: DatabaseSync, id: string) {
  const record = db
    .prepare(
      `SELECT r.id, r.rab_date, r.sppg_id, r.sppg_name, r.assignee_id, r.assignee_name,
              r.notes, r.created_by, r.created_at,
              COUNT(i.position) AS item_count,
              COALESCE(SUM(i.quantity * i.estimated_unit_cost), 0)
                AS grand_total
       FROM rab_proposal r
       LEFT JOIN rab_proposal_item i ON i.rab_id = r.id
       WHERE r.id = ?
       GROUP BY r.id`,
    )
    .get(id) as Omit<RABRecord, "items"> | undefined
  if (!record) return undefined
  const items = db
    .prepare(
      `SELECT name, quantity, unit, estimated_unit_cost AS estimatedUnitCost
       FROM rab_proposal_item
       WHERE rab_id = ?
       ORDER BY position`,
    )
    .all(id) as RABItemInput[]
  return { ...record, items } satisfies RABRecord
}

export function updateRABRecord(
  db: DatabaseSync,
  id: string,
  input: RABInput,
) {
  return withImmediateTransaction(db, () => {
    if (!db.prepare("SELECT id FROM rab_proposal WHERE id = ?").get(id)) {
      throw new RABNotFoundError("RAB tidak ditemukan.")
    }

    const sppg = db
      .prepare("SELECT id, nama FROM sppg WHERE id = ?")
      .get(input.sppgId) as { id: string; nama: string } | undefined
    if (!sppg) throw new RABNotFoundError("SPPG tidak ditemukan.")

    const assignee = db
      .prepare("SELECT id, name FROM maintenance_assignee WHERE id = ?")
      .get(input.assigneeId) as { id: string; name: string } | undefined
    if (!assignee) {
      throw new RABNotFoundError("Petugas yang dipilih tidak lagi tersedia.")
    }

    db.prepare(
      `UPDATE rab_proposal
       SET rab_date = ?, sppg_id = ?, sppg_name = ?,
           assignee_id = ?, assignee_name = ?, notes = ?
       WHERE id = ?`,
    ).run(
      input.rabDate,
      sppg.id,
      sppg.nama,
      assignee.id,
      assignee.name,
      input.notes,
      id,
    )
    db.prepare("DELETE FROM rab_proposal_item WHERE rab_id = ?").run(id)
    const addItem = db.prepare(
      `INSERT INTO rab_proposal_item (
         rab_id, position, name, quantity, unit, estimated_unit_cost
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    for (const [position, item] of input.items.entries()) {
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
    if (!saved) throw new Error("Updated RAB record could not be read.")
    return saved
  })
}

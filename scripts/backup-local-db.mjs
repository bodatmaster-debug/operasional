import { mkdir, stat } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { backup, DatabaseSync } from "node:sqlite"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const databasePath = join(projectRoot, "data", "operations.sqlite")
const backupDirectory = join(projectRoot, "data", "backups")

function readDatabaseSummary(path) {
  const db = new DatabaseSync(path, { readOnly: true, timeout: 5_000 })
  try {
    const integrity = db.prepare("PRAGMA quick_check").get()?.quick_check
    if (integrity !== "ok") {
      throw new Error(`Pemeriksaan integritas SQLite gagal: ${path}`)
    }

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`,
      )
      .all()
      .map((row) => row.name)
    const rowCounts = Object.fromEntries(
      tables.map((table) => {
        const escapedTable = table.replaceAll('"', '""')
        const { count } = db
          .prepare(`SELECT count(*) AS count FROM "${escapedTable}"`)
          .get()
        return [table, Number(count)]
      }),
    )
    const { user_version: schemaVersion } = db
      .prepare("PRAGMA user_version")
      .get()

    return { schemaVersion: Number(schemaVersion), rowCounts }
  } finally {
    db.close()
  }
}

async function main() {
  try {
    await stat(databasePath)
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new Error("Database lokal belum dibuat; tidak ada snapshot untuk dibuat.")
    }
    throw error
  }

  await mkdir(backupDirectory, { recursive: true })
  const timestamp = new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(".", "")
  const destination = join(
    backupDirectory,
    `operations-${timestamp}-${randomUUID()}.sqlite`,
  )
  const sourceDb = new DatabaseSync(databasePath, {
    readOnly: true,
    timeout: 5_000,
  })

  try {
    const before = readDatabaseSummary(databasePath)
    await backup(sourceDb, destination)
    const after = readDatabaseSummary(destination)
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error(
        `Snapshot dibuat tetapi verifikasinya berbeda; file dipertahankan: ${destination}`,
      )
    }

    const file = await stat(destination)
    console.log(
      `Snapshot terverifikasi: ${destination} (${after.schemaVersion} skema, ${file.size} bytes).`,
    )
  } finally {
    sourceDb.close()
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Snapshot database lokal gagal dibuat.",
  )
  process.exitCode = 1
})

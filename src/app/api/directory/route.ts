import { randomUUID } from "node:crypto"
import type { DatabaseSync } from "node:sqlite"
import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import { hasLocalPagePermission } from "@/lib/local-auth"
import { isResponse, readJsonObject, requireLocalPermission, requireLocalUser } from "@/lib/local-request"
import type { DirectoryKind } from "@/lib/directory-types"
import { normalizeDirectoryPhone } from "@/lib/directory-phone"
import {
  RegionDataError,
  RegionInputError,
  validateSppgLocation,
  type SppgLocation,
} from "@/lib/regions"

class DirectoryValidationError extends Error {}
class DirectoryNotFoundError extends Error {}
class DirectoryConflictError extends Error {}

const directoryImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
const maxDirectoryImageBytes = 5 * 1024 * 1024

type DirectoryImage = { data: Buffer; mimeType: string } | null

function isDirectoryKind(value: string | null): value is DirectoryKind {
  return value === "sppg" || value === "yayasan"
}

function requireDirectoryManager(request: NextRequest) {
  return requireLocalPermission(request, "directory", true, "directory")
}

function readDirectoryTarget(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind")
  const id = request.nextUrl.searchParams.get("id")?.trim()
  if (!isDirectoryKind(kind) || !id) return null
  return { kind, id }
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

function readText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== "string") {
    throw new DirectoryValidationError(`${label} wajib diisi.`)
  }
  const text = value.trim()
  if (!text || text.length > maxLength) {
    throw new DirectoryValidationError(
      `${label} wajib diisi (maksimal ${maxLength} karakter).`,
    )
  }
  return text
}

function readDirectoryPhone(value: unknown, label: string) {
  if (typeof value !== "string") {
    throw new DirectoryValidationError(`${label} wajib diisi.`)
  }
  const text = value.trim()
  if (!text || text.length > 32) {
    throw new DirectoryValidationError(
      `${label} wajib diisi (maksimal 32 karakter).`,
    )
  }
  const normalized = normalizeDirectoryPhone(text)
  if (!normalized) {
    throw new DirectoryValidationError(
      `${label} tidak valid. Periksa nomor dan kode negaranya.`,
    )
  }
  return normalized
}

function readBeneficiaryCount(value: unknown) {
  if (value === undefined || value === null) return null
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 1 ||
    value > 1_000_000
  ) {
    throw new DirectoryValidationError(
      "Jumlah penerima manfaat harus berupa bilangan bulat positif hingga 1.000.000.",
    )
  }
  return value
}

function readDirectoryImage(value: unknown, label: string): DirectoryImage {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") {
    throw new DirectoryValidationError(`${label} tidak valid.`)
  }
  const match =
    /^data:(image\/(?:jpeg|png|webp|avif));base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      value,
    )
  if (!match || !directoryImageTypes.has(match[1])) {
    throw new DirectoryValidationError(
      `${label} harus berformat PNG, WebP, JPEG, atau AVIF.`,
    )
  }
  const data = Buffer.from(match[2], "base64")
  if (
    data.length === 0 ||
    data.length > maxDirectoryImageBytes ||
    data.toString("base64") !== match[2]
  ) {
    throw new DirectoryValidationError(
      `${label} maksimal berukuran 5 MiB dan harus berupa gambar yang valid.`,
    )
  }
  return { data, mimeType: match[1] }
}

function directoryImageDataUrl(
  data: Uint8Array | null,
  mimeType: string | null,
) {
  if (!data || !mimeType) return null
  return `data:${mimeType};base64,${Buffer.from(data).toString("base64")}`
}

function locationString(location: SppgLocation) {
  return [
    location.alamat,
    location.desa.nama,
    location.kecamatan.nama,
    location.kabupaten.nama,
    location.provinsi.nama,
  ].join(", ")
}

export function GET(request: NextRequest) {
  const user = requireLocalUser(request)
  if (isResponse(user)) return user

  const kind = request.nextUrl.searchParams.get("kind")
  if (!isDirectoryKind(kind)) {
    return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
  }
  const canRead = kind === "yayasan"
    ? hasLocalPagePermission(user, "directory")
    : (
        hasLocalPagePermission(user, "directory") ||
        hasLocalPagePermission(user, "asset-recording") ||
        hasLocalPagePermission(user, "asset-non-juknis") ||
        hasLocalPagePermission(user, "asset-surat-edaran") ||
        hasLocalPagePermission(user, "asset-completeness") ||
        hasLocalPagePermission(user, "maintenance")
      )
  if (!canRead) {
    return NextResponse.json(
      { error: "Akun ini tidak memiliki akses ke data tersebut." },
      { status: 403 },
    )
  }

  try {
    const db = getLocalDatabase()
    const id = request.nextUrl.searchParams.get("id")?.trim()
    if (kind === "yayasan" && id) {
      const row = db
        .prepare(
          `SELECT id, nama, alamat_yayasan, nomor_telepon_yayasan,
                  ketua_yayasan, alamat_ketua_yayasan,
                  nomor_telepon_ketua_yayasan, logo_data, logo_mime_type,
                  ketua_foto_data, ketua_foto_mime_type,
                  (SELECT COUNT(*) FROM sppg s WHERE s.yayasan_id = yayasan.id)
                    AS sppg_count
           FROM yayasan WHERE id = ?`,
        )
        .get(id) as
        | {
            id: string
            nama: string
            alamat_yayasan: string
            nomor_telepon_yayasan: string
            ketua_yayasan: string
            alamat_ketua_yayasan: string
            nomor_telepon_ketua_yayasan: string
            logo_data: Uint8Array | null
            logo_mime_type: string | null
            ketua_foto_data: Uint8Array | null
            ketua_foto_mime_type: string | null
            sppg_count: number
          }
        | undefined
      if (!row) {
        return NextResponse.json(
          { error: "Data Yayasan tidak ditemukan." },
          { status: 404 },
        )
      }
      return NextResponse.json(
        {
          record: {
            id: row.id,
            nama: row.nama,
            alamat_yayasan: row.alamat_yayasan,
            nomor_telepon_yayasan: row.nomor_telepon_yayasan,
            ketua_yayasan: row.ketua_yayasan,
            alamat_ketua_yayasan: row.alamat_ketua_yayasan,
            nomor_telepon_ketua_yayasan: row.nomor_telepon_ketua_yayasan,
            logo_data_url: directoryImageDataUrl(
              row.logo_data,
              row.logo_mime_type,
            ),
            foto_ketua_data_url: directoryImageDataUrl(
              row.ketua_foto_data,
              row.ketua_foto_mime_type,
            ),
            sppg_count: row.sppg_count,
          },
        },
        { headers: { "Cache-Control": "no-store" } },
      )
    }
    const rows = kind === "yayasan"
      ? db.prepare(
          `SELECT y.id, y.nama, y.alamat_yayasan, y.nomor_telepon_yayasan,
                  y.ketua_yayasan, y.alamat_ketua_yayasan,
                  y.nomor_telepon_ketua_yayasan,
                  (SELECT COUNT(*) FROM sppg s WHERE s.yayasan_id = y.id) AS sppg_count
           FROM yayasan y ORDER BY y.nama COLLATE NOCASE`,
        ).all()
      : db.prepare(
          `SELECT s.id, s.nama, s.yayasan_id, y.nama AS yayasan,
                  s.lokasi, s.kepala_sppg, s.pic, s.alamat,
                  s.jumlah_penerima_manfaat,
                  s.provinsi_kode, s.provinsi_nama,
                  s.kabupaten_kode, s.kabupaten_nama,
                  s.kecamatan_kode, s.kecamatan_nama,
                  s.desa_kode, s.desa_nama
           FROM sppg s JOIN yayasan y ON y.id = s.yayasan_id
           ORDER BY s.nama COLLATE NOCASE`,
        ).all()
    return NextResponse.json(
      { records: rows },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local directory read failed.", error)
    return NextResponse.json(
      { error: "Data direktori lokal gagal dimuat." },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = requireDirectoryManager(request)
  if (isResponse(user)) return user

  const kind = request.nextUrl.searchParams.get("kind")
  if (!isDirectoryKind(kind)) {
    return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
  }
  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, {
      status: 400,
    })
  }

  try {
    const db = getLocalDatabase()
    const id = randomUUID()
    const now = new Date().toISOString()
    if (kind === "yayasan") {
      const nama = readText(body.nama, "Nama Yayasan", 200)
      const alamatYayasan = readText(
        body.alamat_yayasan,
        "Alamat Yayasan",
        1000,
      )
      const nomorTeleponYayasan = readDirectoryPhone(
        body.nomor_telepon_yayasan,
        "Nomor telepon Yayasan",
      )
      const ketua = readText(body.ketua_yayasan, "Ketua Yayasan", 200)
      const alamatKetua = readText(
        body.alamat_ketua_yayasan,
        "Alamat Ketua Yayasan",
        1000,
      )
      const nomorTeleponKetua = readDirectoryPhone(
        body.nomor_telepon_ketua_yayasan,
        "Nomor telepon Ketua Yayasan",
      )
      const logo = readDirectoryImage(body.logo_data_url, "Logo Yayasan")
      const fotoKetua = readDirectoryImage(
        body.foto_ketua_data_url,
        "Foto Ketua Yayasan",
      )
      db.prepare(
        `INSERT INTO yayasan (
           id, nama, alamat_yayasan, nomor_telepon_yayasan, ketua_yayasan,
           alamat_ketua_yayasan, nomor_telepon_ketua_yayasan,
           logo_data, logo_mime_type, ketua_foto_data, ketua_foto_mime_type,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        nama,
        alamatYayasan,
        nomorTeleponYayasan,
        ketua,
        alamatKetua,
        nomorTeleponKetua,
        logo?.data ?? null,
        logo?.mimeType ?? null,
        fotoKetua?.data ?? null,
        fotoKetua?.mimeType ?? null,
        now,
        now,
      )
      return NextResponse.json(
        {
          record: {
            id,
            nama,
            alamat_yayasan: alamatYayasan,
            nomor_telepon_yayasan: nomorTeleponYayasan,
            ketua_yayasan: ketua,
            alamat_ketua_yayasan: alamatKetua,
            nomor_telepon_ketua_yayasan: nomorTeleponKetua,
            sppg_count: 0,
          },
        },
        { status: 201 },
      )
    }

    const nama = readText(body.nama, "Nama SPPG", 200)
    const yayasanId = readText(body.yayasan_id, "Yayasan", 100)
    const kepala = readText(body.kepala_sppg, "Kepala SPPG", 200)
    const pic = readText(body.pic, "PIC", 200)
    const beneficiaryCount = readBeneficiaryCount(
      body.jumlah_penerima_manfaat,
    )
    const location = await validateSppgLocation(body.location)
    db.prepare(
      `INSERT INTO sppg (
        id, nama, yayasan_id, lokasi, kepala_sppg, pic, alamat,
        provinsi_kode, provinsi_nama, kabupaten_kode, kabupaten_nama,
        kecamatan_kode, kecamatan_nama, desa_kode, desa_nama,
        jumlah_penerima_manfaat, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      nama,
      yayasanId,
      locationString(location),
      kepala,
      pic,
      location.alamat,
      location.provinsi.kode,
      location.provinsi.nama,
      location.kabupaten.kode,
      location.kabupaten.nama,
      location.kecamatan.kode,
      location.kecamatan.nama,
      location.desa.kode,
      location.desa.nama,
      beneficiaryCount,
      now,
      now,
    )
    const record = db.prepare(
      `SELECT s.id, s.nama, s.yayasan_id, y.nama AS yayasan,
              s.lokasi, s.kepala_sppg, s.pic, s.alamat,
              s.jumlah_penerima_manfaat,
              s.provinsi_kode, s.provinsi_nama,
              s.kabupaten_kode, s.kabupaten_nama,
              s.kecamatan_kode, s.kecamatan_nama,
              s.desa_kode, s.desa_nama
       FROM sppg s JOIN yayasan y ON y.id = s.yayasan_id
       WHERE s.id = ?`,
    ).get(id)
    return NextResponse.json({ record }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      return NextResponse.json({ error: "Yayasan yang dipilih tidak ditemukan." }, {
        status: 400,
      })
    }
    if (error instanceof RegionDataError) {
      console.error("SPPG location validation could not load region data.", error)
      return NextResponse.json(
        { error: "Daftar wilayah tidak dapat diverifikasi. Coba lagi." },
        { status: 502 },
      )
    }
    if (error instanceof DirectoryValidationError || error instanceof RegionInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes("CHECK constraint failed")) {
      return NextResponse.json(
        { error: "Data tidak memenuhi struktur penyimpanan lokal." },
        { status: 400 },
      )
    }
    console.error("Local directory creation failed.", error)
    return NextResponse.json(
      { error: "Penyimpanan lokal gagal menambahkan data." },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  const user = requireDirectoryManager(request)
  if (isResponse(user)) return user

  const target = readDirectoryTarget(request)
  if (!target) {
    return NextResponse.json(
      { error: "Jenis direktori atau ID data tidak valid." },
      { status: 400 },
    )
  }
  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, {
      status: 400,
    })
  }

  try {
    const db = getLocalDatabase()
    const now = new Date().toISOString()
    if (target.kind === "yayasan") {
      const nama = readText(body.nama, "Nama Yayasan", 200)
      const alamatYayasan = readText(
        body.alamat_yayasan,
        "Alamat Yayasan",
        1000,
      )
      const nomorTeleponYayasan = readDirectoryPhone(
        body.nomor_telepon_yayasan,
        "Nomor telepon Yayasan",
      )
      const ketua = readText(body.ketua_yayasan, "Ketua Yayasan", 200)
      const alamatKetua = readText(
        body.alamat_ketua_yayasan,
        "Alamat Ketua Yayasan",
        1000,
      )
      const nomorTeleponKetua = readDirectoryPhone(
        body.nomor_telepon_ketua_yayasan,
        "Nomor telepon Ketua Yayasan",
      )
      const logo = readDirectoryImage(body.logo_data_url, "Logo Yayasan")
      const fotoKetua = readDirectoryImage(
        body.foto_ketua_data_url,
        "Foto Ketua Yayasan",
      )
      withImmediateTransaction(db, () => {
        const foundation = db
          .prepare("SELECT id, nama FROM yayasan WHERE id = ?")
          .get(target.id) as { id: string; nama: string } | undefined
        if (!foundation) throw new DirectoryNotFoundError()
        const { count } = db
          .prepare("SELECT COUNT(*) AS count FROM sppg WHERE yayasan_id = ?")
          .get(target.id) as { count: number }
        const savedName = count > 0 ? foundation.nama : nama
        db.prepare(
          `UPDATE yayasan
           SET nama = ?, alamat_yayasan = ?, nomor_telepon_yayasan = ?,
               ketua_yayasan = ?, alamat_ketua_yayasan = ?,
               nomor_telepon_ketua_yayasan = ?, logo_data = ?,
               logo_mime_type = ?, ketua_foto_data = ?,
               ketua_foto_mime_type = ?, updated_at = ?
           WHERE id = ?`,
        ).run(
          savedName,
          alamatYayasan,
          nomorTeleponYayasan,
          ketua,
          alamatKetua,
          nomorTeleponKetua,
          logo?.data ?? null,
          logo?.mimeType ?? null,
          fotoKetua?.data ?? null,
          fotoKetua?.mimeType ?? null,
          now,
          target.id,
        )
      })
      const record = db.prepare(
        `SELECT y.id, y.nama, y.alamat_yayasan, y.nomor_telepon_yayasan,
                y.ketua_yayasan, y.alamat_ketua_yayasan,
                y.nomor_telepon_ketua_yayasan,
                (SELECT COUNT(*) FROM sppg s WHERE s.yayasan_id = y.id) AS sppg_count
         FROM yayasan y WHERE y.id = ?`,
      ).get(target.id)
      return NextResponse.json({ record })
    }

    const nama = readText(body.nama, "Nama SPPG", 200)
    const yayasanId = readText(body.yayasan_id, "Yayasan", 100)
    const kepala = readText(body.kepala_sppg, "Kepala SPPG", 200)
    const pic = readText(body.pic, "PIC", 200)
    const existingSppg = db
      .prepare(
        "SELECT jumlah_penerima_manfaat FROM sppg WHERE id = ?",
      )
      .get(target.id) as { jumlah_penerima_manfaat: number | null } | undefined
    if (!existingSppg) throw new DirectoryNotFoundError()
    const beneficiaryCount = Object.prototype.hasOwnProperty.call(
      body,
      "jumlah_penerima_manfaat",
    )
      ? readBeneficiaryCount(body.jumlah_penerima_manfaat)
      : existingSppg.jumlah_penerima_manfaat
    const location = await validateSppgLocation(body.location)
    const result = db.prepare(
      `UPDATE sppg SET
        nama = ?, yayasan_id = ?, lokasi = ?, kepala_sppg = ?, pic = ?,
        alamat = ?, provinsi_kode = ?, provinsi_nama = ?,
        kabupaten_kode = ?, kabupaten_nama = ?,
        kecamatan_kode = ?, kecamatan_nama = ?, desa_kode = ?, desa_nama = ?,
        jumlah_penerima_manfaat = ?,
        updated_at = ?
       WHERE id = ?`,
    ).run(
      nama,
      yayasanId,
      locationString(location),
      kepala,
      pic,
      location.alamat,
      location.provinsi.kode,
      location.provinsi.nama,
      location.kabupaten.kode,
      location.kabupaten.nama,
      location.kecamatan.kode,
      location.kecamatan.nama,
      location.desa.kode,
      location.desa.nama,
      beneficiaryCount,
      now,
      target.id,
    )
    if (result.changes === 0) throw new DirectoryNotFoundError()
    const record = db.prepare(
      `SELECT s.id, s.nama, s.yayasan_id, y.nama AS yayasan,
              s.lokasi, s.kepala_sppg, s.pic, s.alamat,
              s.jumlah_penerima_manfaat,
              s.provinsi_kode, s.provinsi_nama,
              s.kabupaten_kode, s.kabupaten_nama,
              s.kecamatan_kode, s.kecamatan_nama,
              s.desa_kode, s.desa_nama
       FROM sppg s JOIN yayasan y ON y.id = s.yayasan_id
       WHERE s.id = ?`,
    ).get(target.id)
    return NextResponse.json({ record })
  } catch (error) {
    if (error instanceof DirectoryNotFoundError) {
      return NextResponse.json({ error: "Data direktori tidak ditemukan." }, {
        status: 404,
      })
    }
    if (error instanceof DirectoryConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      return NextResponse.json({ error: "Yayasan yang dipilih tidak ditemukan." }, {
        status: 400,
      })
    }
    if (error instanceof RegionDataError) {
      console.error("SPPG location validation could not load region data.", error)
      return NextResponse.json(
        { error: "Daftar wilayah tidak dapat diverifikasi. Coba lagi." },
        { status: 502 },
      )
    }
    if (error instanceof DirectoryValidationError || error instanceof RegionInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Error && error.message.includes("CHECK constraint failed")) {
      return NextResponse.json(
        { error: "Data tidak memenuhi struktur penyimpanan lokal." },
        { status: 400 },
      )
    }
    console.error("Local directory update failed.", error)
    return NextResponse.json(
      { error: "Penyimpanan lokal gagal memperbarui data." },
      { status: 500 },
    )
  }
}

export function DELETE(request: NextRequest) {
  const user = requireDirectoryManager(request)
  if (isResponse(user)) return user

  const target = readDirectoryTarget(request)
  if (!target) {
    return NextResponse.json(
      { error: "Jenis direktori atau ID data tidak valid." },
      { status: 400 },
    )
  }

  try {
    const db = getLocalDatabase()
    withImmediateTransaction(db, () => {
      const table = target.kind === "yayasan" ? "yayasan" : "sppg"
      const exists = db
        .prepare(`SELECT id FROM ${table} WHERE id = ?`)
        .get(target.id)
      if (!exists) throw new DirectoryNotFoundError()
      if (target.kind === "yayasan") {
        const { count } = db
          .prepare("SELECT COUNT(*) AS count FROM sppg WHERE yayasan_id = ?")
          .get(target.id) as { count: number }
        if (count > 0) {
          throw new DirectoryConflictError(
            `Yayasan ini masih terhubung dengan ${count} SPPG dan tidak dapat dihapus.`,
          )
        }
      }
      db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(target.id)
    })
    return NextResponse.json({ deleted: true })
  } catch (error) {
    if (error instanceof DirectoryNotFoundError) {
      return NextResponse.json({ error: "Data direktori tidak ditemukan." }, {
        status: 404,
      })
    }
    if (error instanceof DirectoryConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    if (error instanceof Error && error.message.includes("FOREIGN KEY constraint failed")) {
      return NextResponse.json(
        { error: "Yayasan masih digunakan oleh SPPG dan tidak dapat dihapus." },
        { status: 409 },
      )
    }
    console.error("Local directory deletion failed.", error)
    return NextResponse.json(
      { error: "Penyimpanan lokal gagal menghapus data." },
      { status: 500 },
    )
  }
}

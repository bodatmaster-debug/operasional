import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import { isAssetCondition } from "@/lib/asset-condition"
import { isResponse, readJsonObject, requireLocalPermission } from "@/lib/local-request"

const ASSET_TABLES = {
  juknis: "asset_inventory",
  vehicle: "vehicle_inventory",
  "non-juknis": "non_juknis_asset_inventory",
  "surat-edaran": "surat_edaran_asset_inventory",
} as const

type AssetSource = keyof typeof ASSET_TABLES

class AssetConditionNotFoundError extends Error {}

export async function PATCH(request: NextRequest) {
  const body = await readJsonObject(request)
  if (!body) {
    return NextResponse.json(
      { error: "Isi permintaan bukan JSON yang valid." },
      { status: 400 },
    )
  }

  const source = body.source
  const recordId =
    typeof body.recordId === "string" ? body.recordId.trim() : ""
  const sppgId = typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  if (
    typeof source !== "string" ||
    !Object.hasOwn(ASSET_TABLES, source) ||
    !recordId ||
    recordId.length > 120 ||
    !sppgId ||
    sppgId.length > 120 ||
    !isAssetCondition(body.assetCondition)
  ) {
    return NextResponse.json(
      { error: "Identitas aset dan kondisi yang valid wajib dipilih." },
      { status: 400 },
    )
  }

  const page =
    source === "non-juknis"
      ? "asset-non-juknis"
      : source === "surat-edaran"
        ? "asset-surat-edaran"
        : "asset-recording"
  const user = requireLocalPermission(request, "assets", true, page)
  if (isResponse(user)) return user

  try {
    const table = ASSET_TABLES[source as AssetSource]
    const db = getLocalDatabase()
    const result = db
      .prepare(
        `UPDATE ${table}
         SET asset_condition = ?, updated_at = ?
         WHERE id = ? AND sppg_id = ?`,
      )
      .run(body.assetCondition, new Date().toISOString(), recordId, sppgId)
    if (result.changes === 0) {
      throw new AssetConditionNotFoundError("Catatan aset tidak ditemukan.")
    }

    return NextResponse.json({
      recordId,
      source,
      assetCondition: body.assetCondition,
    })
  } catch (error) {
    if (error instanceof AssetConditionNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("Local asset condition update failed.", error)
    return NextResponse.json(
      { error: "Kondisi aset gagal disimpan." },
      { status: 500 },
    )
  }
}

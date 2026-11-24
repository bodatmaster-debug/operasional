import { NextResponse, type NextRequest } from "next/server"
import { getLocalDatabase } from "@/lib/local-database"
import { getMaintenanceAssets } from "@/lib/maintenance-assets"
import { isResponse, requireLocalPagePermission } from "@/lib/local-request"

export function GET(request: NextRequest) {
  const user = requireLocalPagePermission(request, "maintenance")
  if (isResponse(user)) return user

  const sppgId = request.nextUrl.searchParams.get("sppgId")?.trim()
  if (!sppgId || sppgId.length > 120) {
    return NextResponse.json({ error: "SPPG wajib dipilih." }, { status: 400 })
  }

  try {
    const db = getLocalDatabase()
    const sppg = db.prepare("SELECT id FROM sppg WHERE id = ?").get(sppgId)
    if (!sppg) {
      return NextResponse.json({ error: "SPPG tidak ditemukan." }, { status: 404 })
    }
    return NextResponse.json(
      { records: getMaintenanceAssets(db, sppgId) },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Local maintenance asset list failed.", error)
    return NextResponse.json(
      { error: "Daftar aset untuk jadwal pemeliharaan gagal dimuat." },
      { status: 500 },
    )
  }
}

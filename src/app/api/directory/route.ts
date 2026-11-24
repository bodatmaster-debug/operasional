import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission, requireSupabaseUser } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const kind = request.nextUrl.searchParams.get("kind")
  const id = request.nextUrl.searchParams.get("id")?.trim()
  if (kind !== "yayasan" && kind !== "sppg") {
    return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
  }
  const supabase = await getSupabaseRuntimeClient()

  if (kind === "yayasan") {
    if (id) {
      const [yayasanResult, sppgCountResult] = await Promise.all([
        supabase.from("yayasan").select("*").eq("id", id).maybeSingle(),
        supabase.from("sppg").select("id", { count: "exact", head: true }).eq("yayasan_id", id),
      ])
      if (yayasanResult.error) return NextResponse.json({ error: "Data Yayasan gagal dimuat." }, { status: 500 })
      if (!yayasanResult.data) return NextResponse.json({ error: "Data Yayasan tidak ditemukan." }, { status: 404 })
      return NextResponse.json({ record: { ...yayasanResult.data, sppg_count: sppgCountResult.count ?? 0 } }, { headers: { "Cache-Control": "no-store" } })
    }
    const [yayasanResult, sppgResult] = await Promise.all([
      supabase.from("yayasan").select("*").order("nama", { ascending: true }),
      supabase.from("sppg").select("yayasan_id"),
    ])
    if (yayasanResult.error) return NextResponse.json({ error: "Data Yayasan gagal dimuat." }, { status: 500 })
    const counts = new Map<string, number>()
    for (const row of sppgResult.data ?? []) {
      const yayasanId = String(row.yayasan_id ?? "")
      counts.set(yayasanId, (counts.get(yayasanId) ?? 0) + 1)
    }
    const records = (yayasanResult.data ?? []).map((row) => ({ ...row, sppg_count: counts.get(row.id) ?? 0 }))
    return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
  }

  if (id) {
    const { data, error } = await supabase.from("sppg").select("*, yayasan(nama)").eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: "Data SPPG gagal dimuat." }, { status: 500 })
    if (!data) return NextResponse.json({ error: "Data SPPG tidak ditemukan." }, { status: 404 })
    const row = data as unknown as { yayasan?: { nama?: string } | null }
    return NextResponse.json({ record: { ...data, yayasan: row.yayasan?.nama ?? "" } }, { headers: { "Cache-Control": "no-store" } })
  }
  const { data, error } = await supabase.from("sppg").select("*, yayasan(nama)").order("nama", { ascending: true })
  if (error) return NextResponse.json({ error: "Data SPPG gagal dimuat." }, { status: 500 })
  const records = (data ?? []).map((row) => {
    const rel = row as unknown as { yayasan?: { nama?: string } | null }
    return { ...row, yayasan: rel.yayasan?.nama ?? "" }
  })
  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "directory", "directory")
  if (isResponse(user)) return user
  const kind = request.nextUrl.searchParams.get("kind")
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()

  if (kind === "yayasan") {
    if (typeof body.nama !== "string" || typeof body.ketua_yayasan !== "string") return NextResponse.json({ error: "Nama dan ketua Yayasan wajib diisi." }, { status: 400 })
    const row = { id: randomUUID(), nama: body.nama.trim(), ketua_yayasan: body.ketua_yayasan.trim(), alamat_yayasan: typeof body.alamat_yayasan === "string" ? body.alamat_yayasan : "", nomor_telepon_yayasan: typeof body.nomor_telepon_yayasan === "string" ? body.nomor_telepon_yayasan : "", alamat_ketua_yayasan: typeof body.alamat_ketua_yayasan === "string" ? body.alamat_ketua_yayasan : "", nomor_telepon_ketua_yayasan: typeof body.nomor_telepon_ketua_yayasan === "string" ? body.nomor_telepon_ketua_yayasan : "", logo_data: body.logo_data_url ? Buffer.from(String(body.logo_data_url).split(",")[1] ?? "", "base64") : null, logo_mime_type: typeof body.logo_data_url === "string" && body.logo_data_url.startsWith("data:") ? body.logo_data_url.split(";")[0].slice(5) : null, ketua_foto_data: body.foto_ketua_data_url ? Buffer.from(String(body.foto_ketua_data_url).split(",")[1] ?? "", "base64") : null, ketua_foto_mime_type: typeof body.foto_ketua_data_url === "string" && body.foto_ketua_data_url.startsWith("data:") ? body.foto_ketua_data_url.split(";")[0].slice(5) : null, created_at: now, updated_at: now }
    const { data, error } = await supabase.from("yayasan").insert(row).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: { ...data, sppg_count: 0 } }, { status: 201 })
  }
  if (kind === "sppg") {
    if (typeof body.nama !== "string" || typeof body.yayasan_id !== "string" || typeof body.kepala_sppg !== "string" || typeof body.pic !== "string") return NextResponse.json({ error: "Data SPPG tidak lengkap." }, { status: 400 })
    const location = typeof body.location === "object" && body.location !== null ? body.location as Record<string, unknown> : null
    const provinsi = typeof location?.provinsi === "object" && location?.provinsi !== null ? location.provinsi as Record<string, unknown> : null
    const kabupaten = typeof location?.kabupaten === "object" && location?.kabupaten !== null ? location.kabupaten as Record<string, unknown> : null
    const kecamatan = typeof location?.kecamatan === "object" && location?.kecamatan !== null ? location.kecamatan as Record<string, unknown> : null
    const desa = typeof location?.desa === "object" && location?.desa !== null ? location.desa as Record<string, unknown> : null
    const alamat = typeof location?.alamat === "string" ? location.alamat : typeof body.alamat === "string" ? body.alamat : ""
    const row = { id: randomUUID(), nama: body.nama.trim(), yayasan_id: body.yayasan_id.trim(), lokasi: [alamat, desa?.nama, kecamatan?.nama, kabupaten?.nama, provinsi?.nama].filter(Boolean).join(", "), kepala_sppg: body.kepala_sppg.trim(), pic: body.pic.trim(), alamat, provinsi_kode: String(provinsi?.kode ?? ""), provinsi_nama: String(provinsi?.nama ?? ""), kabupaten_kode: String(kabupaten?.kode ?? ""), kabupaten_nama: String(kabupaten?.nama ?? ""), kecamatan_kode: String(kecamatan?.kode ?? ""), kecamatan_nama: String(kecamatan?.nama ?? ""), desa_kode: String(desa?.kode ?? ""), desa_nama: String(desa?.nama ?? ""), jumlah_penerima_manfaat: typeof body.jumlah_penerima_manfaat === "number" ? body.jumlah_penerima_manfaat : null, created_at: now, updated_at: now }
    const { data, error } = await supabase.from("sppg").insert(row).select("*, yayasan(nama)").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    const rel = data as unknown as { yayasan?: { nama?: string } | null }
    return NextResponse.json({ record: { ...data, yayasan: rel.yayasan?.nama ?? "" } }, { status: 201 })
  }
  return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
}

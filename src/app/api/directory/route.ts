import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabaseUser } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  const kind = request.nextUrl.searchParams.get("kind")
  if (kind !== "yayasan" && kind !== "sppg") {
    return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
  }
  const id = request.nextUrl.searchParams.get("id")?.trim()
  const supabase = await getSupabaseRuntimeClient()

  if (kind === "yayasan") {
    if (id) {
      const { data, error } = await supabase.from("yayasan").select("*").eq("id", id).maybeSingle()
      if (error) return NextResponse.json({ error: "Data Yayasan gagal dimuat." }, { status: 500 })
      return NextResponse.json({ record: data }, { headers: { "Cache-Control": "no-store" } })
    }
    const { data, error } = await supabase.from("yayasan").select("*").order("nama", { ascending: true })
    if (error) return NextResponse.json({ error: "Data Yayasan gagal dimuat." }, { status: 500 })
    return NextResponse.json({ records: data }, { headers: { "Cache-Control": "no-store" } })
  }

  if (id) {
    const { data, error } = await supabase.from("sppg").select("*, yayasan(nama)").eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: "Data SPPG gagal dimuat." }, { status: 500 })
    const record = data && typeof data === "object" ? { ...data, yayasan: (data as { yayasan?: { nama?: string } }).yayasan?.nama ?? "" } : data
    return NextResponse.json({ record }, { headers: { "Cache-Control": "no-store" } })
  }
  const { data, error } = await supabase.from("sppg").select("*, yayasan(nama)").order("nama", { ascending: true })
  if (error) return NextResponse.json({ error: "Data SPPG gagal dimuat." }, { status: 500 })
  const records = (data ?? []).map((row) => ({ ...row, yayasan: (row as { yayasan?: { nama?: string } }).yayasan?.nama ?? "" }))
  return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin" && !user.permissions?.directory) {
    return NextResponse.json({ error: "Akun ini tidak memiliki izin mengelola direktori." }, { status: 403 })
  }
  const kind = request.nextUrl.searchParams.get("kind")
  const body = await readJsonObject(request)
  if (!body) return NextResponse.json({ error: "Isi permintaan bukan JSON yang valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()

  if (kind === "yayasan") {
    const { data, error } = await supabase.from("yayasan").insert({
      id: randomUUID(), nama: body.nama, ketua_yayasan: body.ketua_yayasan,
      alamat_yayasan: body.alamat_yayasan ?? "", nomor_telepon_yayasan: body.nomor_telepon_yayasan ?? "",
      alamat_ketua_yayasan: body.alamat_ketua_yayasan ?? "", nomor_telepon_ketua_yayasan: body.nomor_telepon_ketua_yayasan ?? "",
      created_at: now, updated_at: now,
    }).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: data }, { status: 201 })
  }

  if (kind === "sppg") {
    const location = body.location as Record<string, any> | undefined
    const { data, error } = await supabase.from("sppg").insert({
      id: randomUUID(), nama: body.nama, yayasan_id: body.yayasan_id,
      lokasi: location?.lokasi ?? body.lokasi ?? "", kepala_sppg: body.kepala_sppg,
      pic: body.pic, alamat: location?.alamat ?? body.alamat ?? "",
      provinsi_kode: location?.provinsi?.kode ?? body.provinsi_kode ?? "",
      provinsi_nama: location?.provinsi?.nama ?? body.provinsi_nama ?? "",
      kabupaten_kode: location?.kabupaten?.kode ?? body.kabupaten_kode ?? "",
      kabupaten_nama: location?.kabupaten?.nama ?? body.kabupaten_nama ?? "",
      kecamatan_kode: location?.kecamatan?.kode ?? body.kecamatan_kode ?? "",
      kecamatan_nama: location?.kecamatan?.nama ?? body.kecamatan_nama ?? "",
      desa_kode: location?.desa?.kode ?? body.desa_kode ?? "",
      desa_nama: location?.desa?.nama ?? body.desa_nama ?? "",
      jumlah_penerima_manfaat: body.jumlah_penerima_manfaat ?? null,
      created_at: now, updated_at: now,
    }).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ record: data }, { status: 201 })
  }
  return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
}

export async function PUT(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin" && !user.permissions?.directory) {
    return NextResponse.json({ error: "Akun ini tidak memiliki izin mengelola direktori." }, { status: 403 })
  }
  const target = request.nextUrl.searchParams
  const kind = target.get("kind")
  const id = target.get("id")
  const body = await readJsonObject(request)
  if (!kind || !id || !body) return NextResponse.json({ error: "Target direktori tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const table = kind === "yayasan" ? "yayasan" : kind === "sppg" ? "sppg" : null
  if (!table) return NextResponse.json({ error: "Jenis direktori tidak valid." }, { status: 400 })
  const updates = { ...body, updated_at: new Date().toISOString() }
  delete (updates as Record<string, unknown>).location
  delete (updates as Record<string, unknown>).id
  const { data, error } = await supabase.from(table).update(updates).eq("id", id).select("*").maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!data) return NextResponse.json({ error: "Data direktori tidak ditemukan." }, { status: 404 })
  return NextResponse.json({ record: data })
}

export async function DELETE(request: NextRequest) {
  const user = await requireSupabaseUser(request)
  if (isResponse(user)) return user
  if (user.role !== "admin" && !user.permissions?.directory) {
    return NextResponse.json({ error: "Akun ini tidak memiliki izin mengelola direktori." }, { status: 403 })
  }
  const kind = request.nextUrl.searchParams.get("kind")
  const id = request.nextUrl.searchParams.get("id")
  const table = kind === "yayasan" ? "yayasan" : kind === "sppg" ? "sppg" : null
  if (!table || !id) return NextResponse.json({ error: "Target direktori tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const { error } = await supabase.from(table).delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 409 })
  return NextResponse.json({ deleted: true })
}

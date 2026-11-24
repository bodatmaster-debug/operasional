import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0
}

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "warehouse")
  if (isResponse(user)) return user
  const kind = request.nextUrl.searchParams.get("kind")
  if (kind !== "asset" && kind !== "spare-part") return NextResponse.json({ error: "Jenis stok tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const [items, movements] = await Promise.all([
    supabase.from("warehouse_item").select("*").eq("kind", kind).order("name"),
    supabase.from("warehouse_movement").select("*, warehouse_item(name,unit,asset_subcategory)").order("transaction_date", { ascending: false }).limit(30),
  ])
  if (items.error) return NextResponse.json({ error: items.error.message }, { status: 500 })
  const allocations = kind === "asset" ? await supabase.from("warehouse_asset_allocation").select("*").order("item_id") : { data: [] }
  const allocationMovements = kind === "asset" ? await supabase.from("warehouse_asset_allocation_movement").select("*").order("created_at", { ascending: false }).limit(50) : { data: [] }
  const sppgs = kind === "asset" ? await supabase.from("sppg").select("id,nama").order("nama") : { data: [] }
  return NextResponse.json({ items: items.data ?? [], movements: movements.data ?? [], sppgs: sppgs.data ?? [], allocations: allocations.data ?? [], allocationMovements: allocationMovements.data ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "warehouse")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body || !isText(body.action)) return NextResponse.json({ error: "Aksi gudang tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()

  if (body.action === "create-item") {
    if (!isText(body.kind) || !isText(body.name) || !isText(body.unit)) return NextResponse.json({ error: "Data item stok tidak valid." }, { status: 400 })
    const id = randomUUID()
    const { error } = await supabase.from("warehouse_item").insert({ id, kind: body.kind, name: body.name, unit: body.unit, asset_category: body.assetCategory ?? null, asset_catalog_id: body.assetCatalogId ?? null, asset_subcategory: body.assetSubcategory ?? null, asset_type: body.assetType ?? null, asset_brand: body.assetBrand ?? null, storage_period_months: body.storagePeriodMonths ?? null, compatible_asset_item_id: body.compatibleAssetItemId ?? null, created_at: now, updated_at: now })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (Number(body.initialStock ?? 0) > 0) {
      await supabase.from("warehouse_movement").insert({ id: randomUUID(), item_id: id, movement_type: "in", quantity: body.initialStock, note: "Stok awal", created_at: now, created_by: user.id, transaction_date: now.slice(0, 10) })
    }
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (body.action === "movement") {
    if (!isText(body.itemId)) return NextResponse.json({ error: "Item gudang tidak valid." }, { status: 400 })
    const movementType = body.movementType
    if (movementType !== "in" && movementType !== "out") return NextResponse.json({ error: "Jenis pergerakan stok tidak valid." }, { status: 400 })
    const quantity = Number(body.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "Jumlah stok tidak valid." }, { status: 400 })
    const { error } = await supabase.from("warehouse_movement").insert({ id: randomUUID(), item_id: body.itemId, movement_type: movementType, quantity, note: typeof body.note === "string" ? body.note : "", created_at: now, created_by: user.id, transaction_date: typeof body.transactionDate === "string" ? body.transactionDate : now.slice(0, 10) })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (body.action === "allocate" || body.action === "transfer" || body.action === "return") {
    if (!isText(body.itemId)) return NextResponse.json({ error: "Item gudang tidak valid." }, { status: 400 })
    const movementType = body.action
    const fromSppgId = movementType === "allocate" ? null : isText(body.fromSppgId) ? body.fromSppgId : null
    const toSppgId = movementType === "return" ? null : isText(body.toSppgId) ? body.toSppgId : null
    const row = { id: randomUUID(), item_id: body.itemId, movement_type: movementType, from_sppg_id: fromSppgId, from_sppg_name: movementType === "allocate" ? null : (typeof body.fromSppgName === "string" ? body.fromSppgName : ""), to_sppg_id: toSppgId, to_sppg_name: movementType === "return" ? null : (typeof body.toSppgName === "string" ? body.toSppgName : ""), quantity: Number(body.quantity), note: typeof body.note === "string" ? body.note : "", created_at: now, created_by: user.id, transaction_date: typeof body.transactionDate === "string" ? body.transactionDate : now.slice(0, 10) }
    const { error } = await supabase.from("warehouse_asset_allocation_movement").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  return NextResponse.json({ error: "Aksi gudang tidak valid." }, { status: 400 })
}

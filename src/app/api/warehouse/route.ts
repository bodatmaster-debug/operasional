import { NextResponse, type NextRequest } from "next/server"
import { randomUUID } from "node:crypto"
import { isResponse, readJsonObject } from "@/lib/local-request"
import { requireSupabasePermission } from "@/lib/supabase-request"
import { getSupabaseRuntimeClient } from "@/lib/supabase-runtime"

export async function GET(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "warehouse")
  if (isResponse(user)) return user
  const kind = request.nextUrl.searchParams.get("kind")
  if (kind !== "asset" && kind !== "spare-part") return NextResponse.json({ error: "Jenis stok tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const [items, movements, allocations, allocationMovements] = await Promise.all([
    supabase.from("warehouse_item").select("*").eq("kind", kind).order("name"),
    supabase.from("warehouse_movement").select("*, warehouse_item(name,unit,asset_subcategory)").order("transaction_date", { ascending: false }).limit(30),
    kind === "asset" ? supabase.from("warehouse_asset_allocation").select("*").order("item_id") : Promise.resolve({ data: [] }),
    kind === "asset" ? supabase.from("warehouse_asset_allocation_movement").select("*").order("created_at", { ascending: false }).limit(50) : Promise.resolve({ data: [] }),
  ])
  if (items.error) return NextResponse.json({ error: items.error.message }, { status: 500 })
  const { data: sppgs } = kind === "asset"
    ? await supabase.from("sppg").select("id,nama").order("nama")
    : { data: [] }
  return NextResponse.json({ items: items.data ?? [], movements: movements.data ?? [], sppgs: sppgs ?? [], allocations: allocations.data ?? [], allocationMovements: allocationMovements.data ?? [] }, { headers: { "Cache-Control": "no-store" } })
}

export async function POST(request: NextRequest) {
  const user = await requireSupabasePermission(request, "assets", "warehouse")
  if (isResponse(user)) return user
  const body = await readJsonObject(request)
  if (!body?.action) return NextResponse.json({ error: "Aksi gudang tidak valid." }, { status: 400 })
  const supabase = await getSupabaseRuntimeClient()
  const now = new Date().toISOString()

  if (body.action === "create-item") {
    const id = randomUUID()
    const { error } = await supabase.from("warehouse_item").insert({ id, kind: body.kind, name: body.name, unit: body.unit, asset_category: body.assetCategory ?? null, asset_catalog_id: body.assetCatalogId ?? null, asset_subcategory: body.assetSubcategory ?? null, asset_type: body.assetType ?? null, asset_brand: body.assetBrand ?? null, storage_period_months: body.storagePeriodMonths ?? null, compatible_asset_item_id: body.compatibleAssetItemId ?? null, created_at: now, updated_at: now })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (Number(body.initialStock ?? 0) > 0) {
      await supabase.from("warehouse_movement").insert({ id: randomUUID(), item_id: id, movement_type: "in", quantity: body.initialStock, note: "Stok awal", created_at: now, created_by: user.id, transaction_date: now.slice(0, 10) })
    }
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (body.action === "movement") {
    const quantity = Number(body.quantity)
    if (!body.itemId || !["in", "out"].includes(body.movementType) || !Number.isFinite(quantity)) return NextResponse.json({ error: "Data pergerakan stok tidak valid." }, { status: 400 })
    const { error } = await supabase.from("warehouse_movement").insert({ id: randomUUID(), item_id: body.itemId, movement_type: body.movementType, quantity, note: body.note ?? "", created_at: now, created_by: user.id, transaction_date: body.transactionDate ?? now.slice(0, 10) })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 201 })
  }

  if (["allocate", "transfer", "return"].includes(body.action)) {
    const row = { id: randomUUID(), item_id: body.itemId, movement_type: body.action, from_sppg_id: body.action === "allocate" ? null : body.fromSppgId, from_sppg_name: body.action === "allocate" ? null : body.fromSppgName ?? null, to_sppg_id: body.action === "return" ? null : body.toSppgId, to_sppg_name: body.action === "return" ? null : body.toSppgName ?? null, quantity: body.quantity, note: body.note ?? "", created_at: now, created_by: user.id, transaction_date: body.transactionDate ?? now.slice(0, 10) }
    const { error } = await supabase.from("warehouse_asset_allocation_movement").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true }, { status: 201 })
  }
  return NextResponse.json({ error: "Aksi gudang tidak valid." }, { status: 400 })
}

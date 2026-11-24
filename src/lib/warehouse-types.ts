import type { AssetCategory } from "@/lib/asset-categories"

export type WarehouseKind = "asset" | "spare-part"

export const WAREHOUSE_ASSET_CATEGORIES = [
  "juknis",
  "non-juknis",
  "surat-edaran",
] as const

export type WarehouseAssetCategory =
  (typeof WAREHOUSE_ASSET_CATEGORIES)[number]

export function isWarehouseAssetCategory(
  value: unknown,
): value is WarehouseAssetCategory {
  return WAREHOUSE_ASSET_CATEGORIES.some((category) => category === value)
}

export type WarehouseItem = {
  id: string
  kind: WarehouseKind
  assetCategory: WarehouseAssetCategory | null
  assetSubcategory: AssetCategory | null
  assetCatalogId: string | null
  assetType: string | null
  assetBrand: string | null
  storagePeriodMonths: number | null
  compatibleAssetItemId: string | null
  compatibleAssetItemName: string | null
  name: string
  unit: string
  stock: number
}

export type WarehouseCompatibleAsset = {
  id: string
  name: string
  assetType: string | null
  assetBrand: string | null
}

export type WarehouseMovement = {
  id: string
  itemId: string
  itemName: string
  assetSubcategory: AssetCategory | null
  movementType: "in" | "out"
  quantity: number
  unit: string
  note: string
  createdAt: string
  transactionDate: string
}

export type WarehouseSppg = {
  id: string
  nama: string
}

export type WarehouseAssetAllocation = {
  itemId: string
  itemName: string
  sppgId: string
  sppgName: string
  quantity: number
  unit: string
}

export type WarehouseAssetAllocationMovement = {
  id: string
  itemId: string
  itemName: string
  movementType: "allocate" | "transfer" | "return"
  fromSppgId: string | null
  fromSppgName: string | null
  toSppgId: string | null
  toSppgName: string | null
  quantity: number
  unit: string
  note: string
  createdAt: string
  transactionDate: string
  createdByUsername: string | null
}

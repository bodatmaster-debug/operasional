import kitchenCatalog from "@/lib/asset-catalog-data/kitchen-equipment-catalog.json"
import officeCatalog from "@/lib/asset-catalog-data/office-equipment-catalog.json"
import uniformCatalog from "@/lib/asset-catalog-data/uniform-equipment-catalog.json"
import type { AssetCategory } from "@/lib/asset-categories"

export { ASSET_CATEGORIES } from "@/lib/asset-categories"
export type { AssetCategory } from "@/lib/asset-categories"

const kitchenAssets = kitchenCatalog.map((item) => {
  const category: AssetCategory =
    item.standardNo === 76
      ? "Instalasi gas"
      : item.groupCode === "F" || item.groupCode === "G"
        ? "Peralatan operasional"
        : "Peralatan dapur"
  return {
    ...item,
    catalogId: `dapur:${item.standardNo}`,
    category,
    sourceLabel: `Lampiran 7 no. ${item.standardNo}`,
  }
})

const officeAssets = officeCatalog.map((item) => ({
  ...item,
  catalogId: `kantor:${item.standardNo}`,
  category: "Peralatan kantor" as const,
}))

const uniformAssets = uniformCatalog.map((item) => ({
  ...item,
  catalogId: `seragam:${item.standardNo}`,
  category: "Peralatan operasional" as const,
}))

export const assetCatalog = [
  ...kitchenAssets,
  ...officeAssets,
  ...uniformAssets,
]

export type AssetCatalogItem = (typeof assetCatalog)[number]

export function getAssetCatalogItem(catalogId: string) {
  return assetCatalog.find((item) => item.catalogId === catalogId)
}

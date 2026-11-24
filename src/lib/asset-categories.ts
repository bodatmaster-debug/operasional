export const ASSET_CATEGORIES = [
  "Peralatan dapur",
  "Peralatan operasional",
  "Peralatan kantor",
  "Instalasi gas",
] as const

export type AssetCategory = (typeof ASSET_CATEGORIES)[number]

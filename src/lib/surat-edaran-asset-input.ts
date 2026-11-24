import {
  ASSET_CATEGORIES,
  type AssetCategory,
} from "./asset-categories.ts"

export class SuratEdaranAssetValidationError extends Error {}

export type SuratEdaranAssetInput = {
  sppgId: string
  category: AssetCategory
  itemName: string
  assetType: string
  assetBrand: string
  quantity: number
  actualUnit: string
  acuanQuantity: number
  acuanUnit: string
  suratEdaranNumber: string
  suratEdaranYear: number
}

function readRequiredText(
  body: Record<string, unknown>,
  key: string,
  label: string,
  maxLength = 100,
) {
  const value = body[key]
  if (typeof value !== "string") {
    throw new SuratEdaranAssetValidationError(`${label} wajib berupa teks.`)
  }
  const text = value.trim()
  if (text.length === 0 || text.length > maxLength) {
    throw new SuratEdaranAssetValidationError(
      `${label} wajib diisi dan maksimal ${maxLength} karakter.`,
    )
  }
  return text
}

export function readSuratEdaranAssetInput(
  body: Record<string, unknown>,
): SuratEdaranAssetInput {
  const sppgId = typeof body.sppgId === "string" ? body.sppgId.trim() : ""
  const category = ASSET_CATEGORIES.find(
    (candidate) => candidate === body.category,
  )
  const quantity = body.quantity
  const acuanQuantity = body.acuanQuantity
  const year = body.suratEdaranYear

  if (!sppgId || sppgId.length > 120) {
    throw new SuratEdaranAssetValidationError("SPPG wajib dipilih.")
  }
  if (!category) {
    throw new SuratEdaranAssetValidationError("Kategori aset tidak valid.")
  }
  if (
    typeof quantity !== "number" ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    quantity > 1_000_000
  ) {
    throw new SuratEdaranAssetValidationError(
      "Jumlah harus berupa bilangan bulat antara 0 dan 1.000.000.",
    )
  }
  if (
    typeof acuanQuantity !== "number" ||
    !Number.isSafeInteger(acuanQuantity) ||
    acuanQuantity < 0 ||
    acuanQuantity > 1_000_000
  ) {
    throw new SuratEdaranAssetValidationError(
      "Jumlah acuan harus berupa bilangan bulat antara 0 dan 1.000.000.",
    )
  }
  if (
    typeof year !== "number" ||
    !Number.isSafeInteger(year) ||
    year < 1 ||
    year > 9999
  ) {
    throw new SuratEdaranAssetValidationError(
      "Tahun Surat Edaran harus berupa bilangan bulat antara 1 dan 9.999.",
    )
  }

  return {
    sppgId,
    category,
    itemName: readRequiredText(body, "itemName", "Nama barang"),
    assetType: readRequiredText(body, "assetType", "Tipe"),
    assetBrand: readRequiredText(body, "assetBrand", "Merek"),
    quantity,
    actualUnit: readRequiredText(body, "actualUnit", "Satuan aktual"),
    acuanQuantity,
    acuanUnit: readRequiredText(body, "acuanUnit", "Satuan acuan"),
    suratEdaranNumber: readRequiredText(
      body,
      "suratEdaranNumber",
      "Nomor Surat Edaran",
      120,
    ),
    suratEdaranYear: year,
  }
}

export const MAX_ASSET_IMPORT_ROWS = 2_000

export class AssetImportValidationError extends Error {}

export type AssetImportRowInput = {
  sourceRowNumber: number
  assetName: string
  quantity: number
  unit: string
  category: string
  acquisitionValue: number | null
  notes: string
}

function readText(
  value: unknown,
  label: string,
  maximum: number,
  allowEmpty = false,
) {
  if (typeof value !== "string") {
    throw new AssetImportValidationError(`${label} harus berupa teks.`)
  }
  const text = value.trim()
  if (
    (!allowEmpty && !text) ||
    text.length > maximum ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)
  ) {
    throw new AssetImportValidationError(
      `${label} wajib berupa teks valid maksimal ${maximum} karakter.`,
    )
  }
  return text
}

export function parseAssetImportFilename(value: unknown) {
  const filename = readText(value, "Nama file", 255)
  if (!filename.toLowerCase().endsWith(".xlsx")) {
    throw new AssetImportValidationError("File yang didukung adalah Excel .xlsx.")
  }
  return filename
}

export function parseAssetImportRows(value: unknown): AssetImportRowInput[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_ASSET_IMPORT_ROWS
  ) {
    throw new AssetImportValidationError(
      `Impor harus berisi 1 sampai ${MAX_ASSET_IMPORT_ROWS.toLocaleString("id-ID")} baris.`,
    )
  }

  const sourceRows = new Set<number>()
  return value.map((entry, index) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new AssetImportValidationError(
        `Data pada baris ${index + 1} tidak valid.`,
      )
    }
    const row = entry as Record<string, unknown>
    const sourceRowNumber = row.sourceRowNumber
    const quantity = row.quantity
    const acquisitionValue = row.acquisitionValue

    if (
      typeof sourceRowNumber !== "number" ||
      !Number.isSafeInteger(sourceRowNumber) ||
      sourceRowNumber < 1 ||
      sourceRowNumber > 100_000 ||
      sourceRows.has(sourceRowNumber)
    ) {
      throw new AssetImportValidationError(
        `Nomor baris sumber pada data ${index + 1} tidak valid atau duplikat.`,
      )
    }
    sourceRows.add(sourceRowNumber)
    if (
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 1_000_000
    ) {
      throw new AssetImportValidationError(
        `Jumlah pada baris Excel ${sourceRowNumber} harus bilangan bulat 1–1.000.000.`,
      )
    }
    if (
      acquisitionValue !== null &&
      (typeof acquisitionValue !== "number" ||
        !Number.isSafeInteger(acquisitionValue) ||
        acquisitionValue < 0 ||
        acquisitionValue > 1_000_000_000_000)
    ) {
      throw new AssetImportValidationError(
        `Nilai perolehan pada baris Excel ${sourceRowNumber} tidak valid.`,
      )
    }

    return {
      sourceRowNumber,
      assetName: readText(row.assetName, `Nama aset baris ${sourceRowNumber}`, 200),
      quantity,
      unit: readText(row.unit, `Satuan baris ${sourceRowNumber}`, 40, true),
      category: readText(
        row.category,
        `Kategori baris ${sourceRowNumber}`,
        100,
        true,
      ),
      acquisitionValue,
      notes: readText(row.notes, `Catatan baris ${sourceRowNumber}`, 1000, true),
    }
  })
}

import {
  assetQuantityNeedsVerification,
  assetReferenceNeedsVerification,
  getAssetStatus,
  usesThreeThousandCapacityReference,
} from "./asset-status.ts"
import type { AssetCatalogItem } from "./asset-catalog.ts"

export type CompletenessSppg = {
  id: string
  nama: string
  jumlah_penerima_manfaat: number | null
}

export type CompletenessJuknisRecord = {
  sppg_id: string
  catalog_id: string
  quantity: number
}

export type CompletenessRecordRef = {
  sppg_id: string
}

export type CompletenessSuratEdaranRecord = {
  sppg_id: string
  quantity: number
  actual_unit: string | null
  acuan_quantity: number | null
  acuan_unit: string | null
}

export type AssetCompletenessRecord = {
  id: string
  nama: string
  juknisRecordCount: number
  juknisItemsAtReference: number
  juknisComparableItemCount: number
  juknisItemsNeedingVerification: number
  nonJuknisRecordCount: number
  suratEdaranRecordCount: number
  itemsAtReference: number
  comparableItemCount: number
  itemsNeedingVerification: number
  percentage: number | null
}

export function isJuknisItemComparable(
  item: AssetCatalogItem,
  beneficiaryCount: number | null,
) {
  const contextMatchesReference =
    !usesThreeThousandCapacityReference(item) ||
    beneficiaryCount === 3_000

  return (
    item.quantity !== null &&
    !assetQuantityNeedsVerification(item) &&
    (!assetReferenceNeedsVerification(item) || contextMatchesReference)
  )
}

function recordsBySppg<T extends CompletenessRecordRef>(records: T[]) {
  const grouped = new Map<string, T[]>()
  for (const record of records) {
    const group = grouped.get(record.sppg_id)
    if (group) group.push(record)
    else grouped.set(record.sppg_id, [record])
  }
  return grouped
}

function unitsMatch(actualUnit: string | null, referenceUnit: string | null) {
  return (
    typeof actualUnit === "string" &&
    typeof referenceUnit === "string" &&
    actualUnit.trim() !== "" &&
    referenceUnit.trim() !== "" &&
    actualUnit.trim().toLocaleLowerCase("id-ID") ===
      referenceUnit.trim().toLocaleLowerCase("id-ID")
  )
}

export function calculateAssetCompleteness(
  catalog: readonly AssetCatalogItem[],
  sppgs: CompletenessSppg[],
  juknisRecords: CompletenessJuknisRecord[],
  nonJuknisRecords: CompletenessRecordRef[],
  suratEdaranRecords: CompletenessSuratEdaranRecord[],
): AssetCompletenessRecord[] {
  const juknisBySppg = recordsBySppg(juknisRecords)
  const nonJuknisBySppg = recordsBySppg(nonJuknisRecords)
  const suratEdaranBySppg = recordsBySppg(suratEdaranRecords)

  return sppgs.map((sppg) => {
    const actualByCatalogId = new Map(
      (juknisBySppg.get(sppg.id) ?? []).map((record) => [
        record.catalog_id,
        record.quantity,
      ]),
    )
    let itemsAtReference = 0
    let comparableItemCount = 0
    let itemsNeedingVerification = 0
    let juknisItemsAtReference = 0
    let juknisComparableItemCount = 0
    let juknisItemsNeedingVerification = 0

    for (const item of catalog) {
      if (!isJuknisItemComparable(item, sppg.jumlah_penerima_manfaat)) {
        itemsNeedingVerification += 1
        juknisItemsNeedingVerification += 1
        continue
      }

      const actualQuantity = actualByCatalogId.get(item.catalogId) ?? null
      const status = getAssetStatus(actualQuantity, item.quantity, false)
      comparableItemCount += 1
      juknisComparableItemCount += 1
      if (status === "Terpenuhi") {
        itemsAtReference += 1
        juknisItemsAtReference += 1
      }
    }

    for (const record of suratEdaranBySppg.get(sppg.id) ?? []) {
      if (
        record.acuan_quantity === null ||
        !unitsMatch(record.actual_unit, record.acuan_unit)
      ) {
        itemsNeedingVerification += 1
        continue
      }

      comparableItemCount += 1
      if (record.quantity >= record.acuan_quantity) itemsAtReference += 1
    }

    return {
      id: sppg.id,
      nama: sppg.nama,
      juknisRecordCount: (juknisBySppg.get(sppg.id) ?? []).length,
      juknisItemsAtReference,
      juknisComparableItemCount,
      juknisItemsNeedingVerification,
      nonJuknisRecordCount: (nonJuknisBySppg.get(sppg.id) ?? []).length,
      suratEdaranRecordCount: (suratEdaranBySppg.get(sppg.id) ?? []).length,
      itemsAtReference,
      comparableItemCount,
      itemsNeedingVerification,
      percentage:
        comparableItemCount === 0
          ? null
          : Math.round((itemsAtReference / comparableItemCount) * 1000) / 10,
    }
  })
}

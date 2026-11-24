import assert from "node:assert/strict"
import test from "node:test"
import { calculateAssetCompleteness } from "./asset-completeness.ts"
import type { AssetCatalogItem } from "./asset-catalog.ts"

const catalog: AssetCatalogItem[] = [
  {
    standardNo: 1001,
    sourceNo: 1,
    sourceLabel: "Alsintor no. 1",
    name: "Komputer",
    groupCode: "A",
    groupName: "Alat Mesin Kantor",
    quantityText: "2 unit",
    quantity: 2,
    unit: "unit",
    note: "",
    quantityUncertain: false,
    catalogId: "kantor:1001",
    category: "Peralatan kantor",
  },
  {
    standardNo: 1,
    sourceRow: 6,
    name: "Rak sepatu",
    groupCode: "A",
    groupName: "Penyimpanan",
    quantityText: "1 unit",
    quantity: 1,
    unit: "unit",
    note: "Angka perlu verifikasi.",
    quantityUncertain: true,
    catalogId: "dapur:1",
    category: "Peralatan dapur",
    sourceLabel: "Lampiran 7 no. 1",
  },
]

test("missing comparable Juknis records stay in the percentage denominator", () => {
  const [record] = calculateAssetCompleteness(
    catalog,
    [
      {
        id: "sppg-1",
        nama: "SPPG Satu",
        jumlah_penerima_manfaat: null,
      },
    ],
    [],
    [],
    [],
  )

  assert.equal(record.juknisRecordCount, 0)
  assert.equal(record.juknisComparableItemCount, 1)
  assert.equal(record.juknisItemsAtReference, 0)
  assert.equal(record.juknisItemsNeedingVerification, 1)
  assert.equal(record.comparableItemCount, 1)
  assert.equal(record.itemsAtReference, 0)
  assert.equal(record.percentage, 0)
  assert.equal(record.itemsNeedingVerification, 1)
})

test("counts asset rows and compares only Surat Edaran records with matching units", () => {
  const [record] = calculateAssetCompleteness(
    catalog,
    [
      {
        id: "sppg-1",
        nama: "SPPG Satu",
        jumlah_penerima_manfaat: null,
      },
    ],
    [
      {
        sppg_id: "sppg-1",
        catalog_id: "kantor:1001",
        quantity: 4,
      },
    ],
    [{ sppg_id: "sppg-1" }, { sppg_id: "sppg-1" }],
    [
      {
        sppg_id: "sppg-1",
        quantity: 3,
        actual_unit: " PAKET ",
        acuan_quantity: 3,
        acuan_unit: "paket",
      },
      {
        sppg_id: "sppg-1",
        quantity: 10,
        actual_unit: "unit",
        acuan_quantity: 5,
        acuan_unit: "paket",
      },
    ],
  )

  assert.equal(record.juknisRecordCount, 1)
  assert.equal(record.juknisItemsAtReference, 1)
  assert.equal(record.juknisComparableItemCount, 1)
  assert.equal(record.juknisItemsNeedingVerification, 1)
  assert.equal(record.nonJuknisRecordCount, 2)
  assert.equal(record.suratEdaranRecordCount, 2)
  assert.equal(record.itemsAtReference, 2)
  assert.equal(record.comparableItemCount, 2)
  assert.equal(record.percentage, 100)
  assert.equal(record.itemsNeedingVerification, 2)
})

test("compares capacity-specific Juknis items using recorded beneficiary count and actual quantities", () => {
  const kitchenItem: AssetCatalogItem = {
    standardNo: 2,
    sourceRow: 7,
    sourceLabel: "Lampiran 7 no. 2",
    name: "Rak bahan makanan",
    groupCode: "A",
    groupName: "Penyimpanan",
    quantityText: "3 unit",
    quantity: 3,
    unit: "unit",
    note: "",
    quantityUncertain: false,
    catalogId: "dapur:2",
    category: "Peralatan dapur",
  }
  const [record] = calculateAssetCompleteness(
    [...catalog, kitchenItem],
    [
      {
        id: "sppg-1",
        nama: "SPPG Satu",
        jumlah_penerima_manfaat: 3_000,
      },
    ],
    [
      { sppg_id: "sppg-1", catalog_id: "kantor:1001", quantity: 2 },
      { sppg_id: "sppg-1", catalog_id: "dapur:2", quantity: 2 },
    ],
    [],
    [],
  )

  assert.equal(record.juknisRecordCount, 2)
  assert.equal(record.juknisItemsAtReference, 1)
  assert.equal(record.juknisComparableItemCount, 2)
  assert.equal(record.juknisItemsNeedingVerification, 1)
  assert.equal(record.percentage, 50)
})

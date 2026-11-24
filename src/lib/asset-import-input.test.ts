import assert from "node:assert/strict"
import test from "node:test"
import {
  AssetImportValidationError,
  parseAssetImportFilename,
  parseAssetImportRows,
} from "./asset-import-input.ts"

test("accepts a valid Excel filename and asset import row", () => {
  assert.equal(parseAssetImportFilename("Inventaris.xlsx"), "Inventaris.xlsx")
  assert.deepEqual(
    parseAssetImportRows([
      {
        sourceRowNumber: 4,
        assetName: "Lemari",
        quantity: 2,
        unit: "unit",
        category: "Peralatan kantor",
        acquisitionValue: 1_250_000,
        notes: "Ruang administrasi",
      },
    ]),
    [
      {
        sourceRowNumber: 4,
        assetName: "Lemari",
        quantity: 2,
        unit: "unit",
        category: "Peralatan kantor",
        acquisitionValue: 1_250_000,
        notes: "Ruang administrasi",
      },
    ],
  )
})

test("rejects unsupported workbooks, duplicate source rows, and invalid quantities", () => {
  assert.throws(
    () => parseAssetImportFilename("inventaris.xls"),
    AssetImportValidationError,
  )
  assert.throws(
    () =>
      parseAssetImportRows([
        {
          sourceRowNumber: 2,
          assetName: "Kursi",
          quantity: 1,
          unit: "",
          category: "",
          acquisitionValue: null,
          notes: "",
        },
        {
          sourceRowNumber: 2,
          assetName: "Meja",
          quantity: 1,
          unit: "",
          category: "",
          acquisitionValue: null,
          notes: "",
        },
      ]),
    /duplikat/,
  )
  assert.throws(
    () =>
      parseAssetImportRows([
        {
          sourceRowNumber: 3,
          assetName: "Kursi",
          quantity: 1.5,
          unit: "",
          category: "",
          acquisitionValue: null,
          notes: "",
        },
      ]),
    /bilangan bulat/,
  )
})

test("rejects empty names and notes that exceed the storage limit", () => {
  assert.throws(
    () =>
      parseAssetImportRows([
        {
          sourceRowNumber: 5,
          assetName: " ",
          quantity: 1,
          unit: "",
          category: "",
          acquisitionValue: null,
          notes: "",
        },
      ]),
    /Nama aset/,
  )
  assert.throws(
    () =>
      parseAssetImportRows([
        {
          sourceRowNumber: 5,
          assetName: "Papan tulis",
          quantity: 1,
          unit: "",
          category: "",
          acquisitionValue: null,
          notes: "x".repeat(1_001),
        },
      ]),
    /Catatan/,
  )
})

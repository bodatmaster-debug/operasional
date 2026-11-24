import assert from "node:assert/strict"
import test from "node:test"
import {
  readSuratEdaranAssetInput,
  SuratEdaranAssetValidationError,
} from "./surat-edaran-asset-input.ts"

const validInput = {
  sppgId: "sppg-1",
  category: "Peralatan dapur",
  itemName: "Peralatan",
  assetType: "Model",
  assetBrand: "Merek",
  quantity: 2,
  actualUnit: "unit",
  acuanQuantity: 3,
  acuanUnit: "paket",
  suratEdaranNumber: "SE/123/BGN",
  suratEdaranYear: 2026,
}

test("Surat Edaran asset input trims text and keeps its source citation", () => {
  const result = readSuratEdaranAssetInput({
    ...validInput,
    sppgId: " sppg-1 ",
    itemName: " Peralatan ",
    suratEdaranNumber: " SE/123/BGN ",
  })

  assert.equal(result.sppgId, "sppg-1")
  assert.equal(result.itemName, "Peralatan")
  assert.equal(result.acuanQuantity, 3)
  assert.equal(result.acuanUnit, "paket")
  assert.equal(result.actualUnit, "unit")
  assert.equal(result.suratEdaranNumber, "SE/123/BGN")
  assert.equal(result.suratEdaranYear, 2026)
})

test("Surat Edaran asset input requires a valid reference amount and unit", () => {
  assert.throws(
    () => readSuratEdaranAssetInput({ ...validInput, acuanQuantity: -1 }),
    SuratEdaranAssetValidationError,
  )
  assert.throws(
    () =>
      readSuratEdaranAssetInput({ ...validInput, acuanQuantity: 2.5 }),
    SuratEdaranAssetValidationError,
  )
  assert.throws(
    () => readSuratEdaranAssetInput({ ...validInput, acuanUnit: " " }),
    SuratEdaranAssetValidationError,
  )
})

test("Surat Edaran asset input requires and trims the actual unit", () => {
  const result = readSuratEdaranAssetInput({
    ...validInput,
    actualUnit: " unit ",
  })

  assert.equal(result.actualUnit, "unit")
  assert.throws(
    () => readSuratEdaranAssetInput({ ...validInput, actualUnit: " " }),
    SuratEdaranAssetValidationError,
  )
})

test("Surat Edaran asset input rejects invalid years and missing citation numbers", () => {
  assert.throws(
    () => readSuratEdaranAssetInput({ ...validInput, suratEdaranYear: 0 }),
    SuratEdaranAssetValidationError,
  )
  assert.throws(
    () =>
      readSuratEdaranAssetInput({
        ...validInput,
        suratEdaranYear: 2026.5,
      }),
    SuratEdaranAssetValidationError,
  )
  assert.throws(
    () =>
      readSuratEdaranAssetInput({
        ...validInput,
        suratEdaranNumber: " ",
      }),
    SuratEdaranAssetValidationError,
  )
})

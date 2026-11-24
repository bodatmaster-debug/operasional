import assert from "node:assert/strict"
import test from "node:test"
import {
  getAssetQuantityFeedback,
  getAssetQuantityShortfall,
  getAssetStatus,
} from "./asset-status.ts"

test("unrecorded quantities remain distinct from zero", () => {
  assert.equal(getAssetStatus(null, 2, false), "Belum dicatat")
  assert.equal(getAssetStatus(0, 2, false), "Belum terpenuhi")
})

test("clear numeric references compare against the minimum quantity", () => {
  assert.equal(getAssetStatus(2, 2, false), "Terpenuhi")
  assert.equal(getAssetStatus(3, 2, false), "Terpenuhi")
  assert.equal(getAssetStatus(1, 2, false), "Belum terpenuhi")
})

test("missing or uncertain references require verification", () => {
  assert.equal(getAssetStatus(2, null, false), "Perlu verifikasi")
  assert.equal(getAssetStatus(2, 2, true), "Perlu verifikasi")
})

test("capacity-specific references require a matching beneficiary context", () => {
  assert.equal(getAssetStatus(2, 2, false, false), "Perlu verifikasi")
  assert.equal(getAssetStatus(1, 2, false, true), "Belum terpenuhi")
  assert.equal(getAssetStatus(2, 2, false, true), "Terpenuhi")
  assert.equal(getAssetStatus(null, 2, false, false), "Belum dicatat")
})

test("shortfall is reported only for comparable quantities below the reference", () => {
  assert.equal(getAssetQuantityShortfall(3, 8, false), 5)
  assert.equal(getAssetQuantityShortfall(0, 8, false), 8)
  assert.equal(getAssetQuantityShortfall(8, 8, false), null)
  assert.equal(getAssetQuantityShortfall(9, 8, false), null)
  assert.equal(getAssetQuantityShortfall(3, null, false), null)
  assert.equal(getAssetQuantityShortfall(3, 8, true), null)
  assert.equal(getAssetQuantityShortfall(null, 8, false), null)
  assert.equal(getAssetQuantityShortfall(3, 8, false, false), null)
})

test("quantity feedback explains uncertain-reference shortfalls without asserting compliance", () => {
  const feedback = getAssetQuantityFeedback(1, 2, "unit", true)
  assert.equal(feedback.tone, "warning")
  assert.match(feedback.message, /selisih 1 unit/)
  assert.match(feedback.message, /perlu verifikasi/)
  assert.doesNotMatch(feedback.message, /bersifat opsional/)
  assert.match(feedback.message, /bukan penilaian kepatuhan/)
})

test("quantity feedback gives relevant success only for a comparable quantity", () => {
  const feedback = getAssetQuantityFeedback(2, 2, "unit", true)
  assert.equal(feedback.tone, "success")
  assert.match(feedback.message, /telah mencapai angka acuan/)
  assert.match(feedback.message, /perlu verifikasi/)
})

test("quantity feedback identifies optional items without calling them uncertain", () => {
  const feedback = getAssetQuantityFeedback(1, 1, "unit", false, true, "", true)
  assert.equal(feedback.tone, "success")
  assert.match(feedback.message, /telah mencapai angka acuan/)
  assert.match(feedback.message, /Item ini opsional/)
  assert.doesNotMatch(feedback.message, /perlu verifikasi/)
})

test("quantity feedback withholds comparison when its context does not match", () => {
  const feedback = getAssetQuantityFeedback(
    3,
    2,
    "unit",
    false,
    false,
    "Acuan ini berlaku untuk SPPG 3.000 penerima manfaat.",
  )
  assert.equal(feedback.tone, "warning")
  assert.match(feedback.message, /perlu verifikasi sebelum dibandingkan/)
  assert.doesNotMatch(feedback.message, /telah mencapai/)
})

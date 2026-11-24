import assert from "node:assert/strict"
import test from "node:test"
import {
  maxDirectoryNationalPhoneDigits,
  normalizeDirectoryPhone,
} from "./directory-phone.ts"

test("directory phone numbers normalize local and international input to E.164", () => {
  assert.equal(normalizeDirectoryPhone("0812 3456 7890"), "+6281234567890")
  assert.equal(normalizeDirectoryPhone("+1 202 555 0123"), "+12025550123")
})

test("directory phone normalization rejects invalid or incomplete numbers", () => {
  assert.equal(normalizeDirectoryPhone("1234567"), null)
  assert.equal(normalizeDirectoryPhone("12345"), null)
  assert.equal(normalizeDirectoryPhone("0812-ABC-7890"), null)
  assert.equal(normalizeDirectoryPhone(""), null)
})

test("directory phone digit limit includes the selected country calling code", () => {
  assert.equal(maxDirectoryNationalPhoneDigits("+62"), 13)
  assert.equal(maxDirectoryNationalPhoneDigits("+1"), 14)
  assert.equal(maxDirectoryNationalPhoneDigits("+358"), 12)
})

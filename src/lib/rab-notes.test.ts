import assert from "node:assert/strict"
import test from "node:test"
import { parseRABNotes, rabNotesPlainText } from "./rab-notes.ts"

test("parses bold, underline, italic, and escaped literal markers", () => {
  assert.deepEqual(parseRABNotes("**tebal** ++garis bawah++ *miring* \\*literal\\*"), [
    {
      indent: 0,
      marker: "",
      runs: [
        { text: "tebal", bold: true, underline: false, italic: false },
        { text: " ", bold: false, underline: false, italic: false },
        { text: "garis bawah", bold: false, underline: true, italic: false },
        { text: " ", bold: false, underline: false, italic: false },
        { text: "miring", bold: false, underline: false, italic: true },
        { text: " *literal*", bold: false, underline: false, italic: false },
      ],
    },
  ])
})

test("parses nested formatting exported by the rich-text editor", () => {
  assert.deepEqual(parseRABNotes("**Tebal dan *miring***"), [
    {
      indent: 0,
      marker: "",
      runs: [
        { text: "Tebal dan ", bold: true, underline: false, italic: false },
        { text: "miring", bold: true, underline: false, italic: true },
      ],
    },
  ])
})

test("parses numeric, alphabetic, roman, and indented symbol list markers", () => {
  assert.deepEqual(
    parseRABNotes("1. angka\na) huruf\nii. romawi\n• bullet\n  ◦ nested"),
    [
      { indent: 0, marker: "1.", runs: [{ text: "angka", bold: false, underline: false, italic: false }] },
      { indent: 0, marker: "a)", runs: [{ text: "huruf", bold: false, underline: false, italic: false }] },
      { indent: 0, marker: "ii.", runs: [{ text: "romawi", bold: false, underline: false, italic: false }] },
      { indent: 0, marker: "•", runs: [{ text: "bullet", bold: false, underline: false, italic: false }] },
      { indent: 1, marker: "◦", runs: [{ text: "nested", bold: false, underline: false, italic: false }] },
    ],
  )
})

test("creates a readable plain-text version for notes", () => {
  assert.equal(
    rabNotesPlainText("**Beras**\n• *Utama*\n  1. ++Catatan++"),
    "Beras\n• Utama\n  1. Catatan",
  )
})

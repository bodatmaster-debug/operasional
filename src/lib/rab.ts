import { isDateOnly } from "./maintenance.ts"

export type RABItemInput = {
  name: string
  quantity: number
  unit: string
  estimatedUnitCost: number
}

export type RABInput = {
  rabDate: string
  sppgId: string
  assigneeId: string
  notes: string
  items: RABItemInput[]
  grandTotal: number
}

export type RABRecord = {
  id: string
  rab_date: string
  sppg_id: string | null
  sppg_name: string
  assignee_id: string
  assignee_name: string
  notes: string
  created_by: string | null
  created_at: string
  item_count: number
  grand_total: number
  items: RABItemInput[]
}

export const MAX_RAB_ITEMS = 100
export const MAX_RAB_ITEM_QUANTITY = 1_000_000
export const MAX_RAB_ITEM_UNIT_LENGTH = 40
export const MAX_RAB_NOTES_LENGTH = 1000

const numberWords = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
]

const numberScales = ["", "ribu", "juta", "miliar", "triliun", "kuadriliun"]

function wordsUnderThousand(value: number) {
  const words: string[] = []
  if (value >= 100) {
    const hundreds = Math.floor(value / 100)
    words.push(hundreds === 1 ? "seratus" : `${numberWords[hundreds]} ratus`)
    value %= 100
  }

  if (value >= 20) {
    const tens = Math.floor(value / 10)
    words.push(`${numberWords[tens]} puluh`)
    value %= 10
  } else if (value >= 10) {
    words.push(
      value === 10
        ? "sepuluh"
        : value === 11
          ? "sebelas"
          : `${numberWords[value - 10]} belas`,
    )
    value = 0
  }

  if (value > 0) words.push(numberWords[value])
  return words.join(" ")
}

export function terbilangRupiah(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("Jumlah rupiah harus bilangan bulat yang aman.")
  }
  if (value === 0) return "Nol rupiah"

  const groups: string[] = []
  let scale = 0
  while (value > 0) {
    const group = value % 1000
    if (group > 0) {
      const words =
        scale === 1 && group === 1
          ? "seribu"
          : wordsUnderThousand(group) +
            (scale === 1 ? " ribu" : scale > 1 ? ` ${numberScales[scale]}` : "")
      groups.unshift(words)
    }
    value = Math.floor(value / 1000)
    scale += 1
  }

  const result = `${groups.join(" ")} rupiah`
  return result.charAt(0).toUpperCase() + result.slice(1)
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readId(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.trim().length <= 120 &&
    !/[\u0000-\u001f\u007f]/.test(value)
  )
}

export function parseRABInput(
  value: unknown,
):
  | { ok: true; input: RABInput }
  | { ok: false; error: string } {
  if (
    !isObject(value) ||
    !isDateOnly(value.rabDate) ||
    typeof value.sppgId !== "string" ||
    !readId(value.sppgId) ||
    typeof value.assigneeId !== "string" ||
    !readId(value.assigneeId)
  ) {
    return {
      ok: false,
      error: "Pilih tanggal, SPPG, dan petugas terlebih dahulu.",
    }
  }
  const notes = value.notes === undefined ? "" : value.notes
  if (
    typeof notes !== "string" ||
    notes.trim().length > MAX_RAB_NOTES_LENGTH ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(notes)
  ) {
    return {
      ok: false,
      error: `Keterangan RAB tidak valid atau melebihi ${MAX_RAB_NOTES_LENGTH.toLocaleString("id-ID")} karakter.`,
    }
  }
  if (
    !Array.isArray(value.items) ||
    value.items.length < 1 ||
    value.items.length > MAX_RAB_ITEMS
  ) {
    return {
      ok: false,
      error: `RAB harus memiliki 1–${MAX_RAB_ITEMS} item.`,
    }
  }

  const items: RABItemInput[] = []
  let grandTotal = 0
  for (const [index, rawItem] of value.items.entries()) {
    if (!isObject(rawItem)) {
      return { ok: false, error: `Item ke-${index + 1} tidak valid.` }
    }
    const name =
      typeof rawItem.name === "string" ? rawItem.name.trim() : ""
    const quantity = rawItem.quantity
    const unit = typeof rawItem.unit === "string" ? rawItem.unit.trim() : ""
    const estimatedUnitCost = rawItem.estimatedUnitCost
    if (
      !name ||
      name.length > 160 ||
      /[\u0000-\u001f\u007f]/.test(name) ||
      typeof quantity !== "number" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_RAB_ITEM_QUANTITY ||
      !unit ||
      unit.length > MAX_RAB_ITEM_UNIT_LENGTH ||
      /[\u0000-\u001f\u007f]/.test(unit) ||
      typeof estimatedUnitCost !== "number" ||
      !Number.isSafeInteger(estimatedUnitCost) ||
      estimatedUnitCost < 1
    ) {
      return {
        ok: false,
        error: `Nama, kuantitas, satuan, atau perkiraan biaya item ke-${index + 1} tidak valid.`,
      }
    }

    const lineTotal = quantity * estimatedUnitCost
    if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(grandTotal + lineTotal)) {
      return {
        ok: false,
        error: "Total perkiraan biaya melebihi batas perhitungan yang aman.",
      }
    }

    grandTotal += lineTotal
    items.push({ name, quantity, unit, estimatedUnitCost })
  }

  return {
    ok: true,
    input: {
      rabDate: value.rabDate,
      sppgId: value.sppgId.trim(),
      assigneeId: value.assigneeId.trim(),
      notes: notes.trim(),
      items,
      grandTotal,
    },
  }
}

export type MaintenanceType = "routine" | "repair"
export type MaintenanceRecurrence = "none" | "custom" | "weekly" | "monthly" | "yearly"
export type MaintenanceAssetSource =
  | "juknis"
  | "non-juknis"
  | "surat-edaran"
  | "vehicle"
  | "gas-installation"
  | "electrical-installation"
  | "generator"

export type MaintenanceAssetOption = {
  id: string
  source: MaintenanceAssetSource
  category: string
  name: string
  details: string
  quantity: number
  unit: string
}

export type MaintenanceAssignee = {
  id: string
  name: string
  role: MaintenanceAssigneeRole | string
  phone: string
}

export type MaintenanceAssigneeRole = "Teknisi" | "Staff Yayasan"

export type MaintenanceNeed = {
  name: string
  quantity: number
  unit: string
  notes: string
}

export type MaintenanceNeedDraft = {
  name: string
  quantity: string
  unit: string
  notes: string
}

export type MaintenanceSchedule = {
  id: string
  sppg_id: string | null
  sppg_name: string
  asset_source: MaintenanceAssetSource
  asset_category: string
  asset_name: string
  asset_details: string
  maintenance_type: MaintenanceType
  notes: string
  scheduled_date: string
  recurrence: MaintenanceRecurrence
  recurrence_days: number | null
  assignees: string
  needs: MaintenanceNeed[]
  created_at: string
}

type MaintenanceOccurrenceSchedule = Pick<
  MaintenanceSchedule,
  "id" | "scheduled_date" | "recurrence" | "recurrence_days" | "asset_name"
>

export type MaintenanceOccurrence<
  TSchedule extends MaintenanceOccurrenceSchedule = MaintenanceSchedule,
> = {
  date: string
  schedule: TSchedule
}

export type MaintenanceOccurrenceStatus = "completed" | "dismissed"

export type MaintenanceOccurrenceState = {
  schedule_id: string
  occurrence_date: string
  status: MaintenanceOccurrenceStatus
  updated_at: string
}

export function isMaintenanceOccurrenceListed(
  status: MaintenanceOccurrenceStatus | null | undefined,
) {
  return status !== "dismissed"
}

export const MAX_MAINTENANCE_NEEDS = 50

export function parseMaintenanceNeeds(
  value: unknown,
):
  | { ok: true; needs: MaintenanceNeed[] }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > MAX_MAINTENANCE_NEEDS) {
    return {
      ok: false,
      error: `Daftar kebutuhan maksimal ${MAX_MAINTENANCE_NEEDS} item.`,
    }
  }

  const needs: MaintenanceNeed[] = []
  for (const [index, entry] of value.entries()) {
    const itemNumber = index + 1
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      return { ok: false, error: `Kebutuhan ke-${itemNumber} tidak valid.` }
    }

    const candidate = entry as Record<string, unknown>
    const name =
      typeof candidate.name === "string" ? candidate.name.trim() : ""
    const unit =
      typeof candidate.unit === "string" ? candidate.unit.trim() : ""
    const notes =
      typeof candidate.notes === "string" ? candidate.notes.trim() : ""
    const quantity = candidate.quantity

    if (
      !name ||
      name.length > 120 ||
      /[\u0000-\u001f\u007f]/.test(name)
    ) {
      return {
        ok: false,
        error: `Nama kebutuhan ke-${itemNumber} wajib diisi (maksimal 120 karakter).`,
      }
    }
    if (
      typeof quantity !== "number" ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      return {
        ok: false,
        error: `Jumlah kebutuhan ke-${itemNumber} harus lebih besar dari 0.`,
      }
    }
    if (
      !unit ||
      unit.length > 32 ||
      /[\u0000-\u001f\u007f]/.test(unit)
    ) {
      return {
        ok: false,
        error: `Satuan kebutuhan ke-${itemNumber} wajib diisi (maksimal 32 karakter).`,
      }
    }
    if (notes.length > 500 || /[\u0000-\u001f\u007f]/.test(notes)) {
      return {
        ok: false,
        error: `Catatan kebutuhan ke-${itemNumber} maksimal 500 karakter.`,
      }
    }

    needs.push({ name, quantity, unit, notes })
  }

  return { ok: true, needs }
}

export function getMaintenanceRecurrenceLabel(
  recurrence: MaintenanceRecurrence,
  days: number | null,
) {
  if (recurrence === "none") return "Sekali"
  if (recurrence === "custom") return `Setiap ${days ?? "—"} hari`
  if (recurrence === "weekly") return "Setiap minggu"
  if (recurrence === "monthly") return "Setiap bulan"
  return "Setiap tahun"
}

export const MAINTENANCE_ASSIGNEE_ROLES: MaintenanceAssigneeRole[] = [
  "Teknisi",
  "Staff Yayasan",
]

export function isValidMaintenancePhone(value: string) {
  const phone = value.trim()
  if (!/^\+?[0-9][0-9\s().-]*$/.test(phone)) return false
  const digitCount = phone.replace(/\D/g, "").length
  return digitCount >= 8 && digitCount <= 15
}

export function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const [year, month, day] = value.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function dateOrdinal(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000)
}

function dateFromOrdinal(value: number) {
  return new Date(value * 86_400_000).toISOString().slice(0, 10)
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

function recurrenceDate(
  year: number,
  monthIndex: number,
  day: number,
) {
  return `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(
    Math.min(day, daysInMonth(year, monthIndex)),
  ).padStart(2, "0")}`
}

export function getMaintenanceOccurrences<
  TSchedule extends MaintenanceOccurrenceSchedule,
>(
  schedules: readonly TSchedule[],
  rangeStart: string,
  rangeEnd: string,
): MaintenanceOccurrence<TSchedule>[] {
  if (
    !isDateOnly(rangeStart) ||
    !isDateOnly(rangeEnd) ||
    rangeStart > rangeEnd
  ) {
    return []
  }

  const firstDay = dateOrdinal(rangeStart)
  const lastDay = dateOrdinal(rangeEnd)
  const occurrences: MaintenanceOccurrence<TSchedule>[] = []

  for (const schedule of schedules) {
    if (!isDateOnly(schedule.scheduled_date)) continue
    const anchor = schedule.scheduled_date
    const anchorDay = dateOrdinal(anchor)

    if (schedule.recurrence === "none") {
      if (anchorDay >= firstDay && anchorDay <= lastDay) {
        occurrences.push({ date: anchor, schedule })
      }
      continue
    }

    if (schedule.recurrence === "custom" || schedule.recurrence === "weekly") {
      const intervalDays =
        schedule.recurrence === "weekly" ? 7 : schedule.recurrence_days
      if (!Number.isSafeInteger(intervalDays) || !intervalDays || intervalDays < 1) {
        continue
      }
      const firstInterval = Math.max(
        0,
        Math.ceil((firstDay - anchorDay) / intervalDays),
      )
      for (
        let occurrenceDay = anchorDay + firstInterval * intervalDays;
        occurrenceDay <= lastDay;
        occurrenceDay += intervalDays
      ) {
        occurrences.push({
          date: dateFromOrdinal(occurrenceDay),
          schedule,
        })
      }
      continue
    }

    const [anchorYear, anchorMonth, anchorDate] = anchor.split("-").map(Number)
    if (schedule.recurrence === "monthly") {
      const anchorMonthIndex = anchorYear * 12 + anchorMonth - 1
      const firstMonthIndex = Math.max(
        anchorMonthIndex,
        new Date(firstDay * 86_400_000).getUTCFullYear() * 12 +
          new Date(firstDay * 86_400_000).getUTCMonth(),
      )
      const lastDate = new Date(lastDay * 86_400_000)
      const lastMonthIndex =
        lastDate.getUTCFullYear() * 12 + lastDate.getUTCMonth()
      for (
        let monthIndex = firstMonthIndex;
        monthIndex <= lastMonthIndex;
        monthIndex += 1
      ) {
        const year = Math.floor(monthIndex / 12)
        const month = monthIndex % 12
        const date = recurrenceDate(year, month, anchorDate)
        if (date >= anchor && date >= rangeStart && date <= rangeEnd) {
          occurrences.push({ date, schedule })
        }
      }
      continue
    }

    if (schedule.recurrence === "yearly") {
      const firstYear = Math.max(
        anchorYear,
        new Date(firstDay * 86_400_000).getUTCFullYear(),
      )
      const lastYear = new Date(lastDay * 86_400_000).getUTCFullYear()
      for (let year = firstYear; year <= lastYear; year += 1) {
        const date = recurrenceDate(year, anchorMonth - 1, anchorDate)
        if (date >= anchor && date >= rangeStart && date <= rangeEnd) {
          occurrences.push({ date, schedule })
        }
      }
    }
  }

  return occurrences.sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.schedule.asset_name.localeCompare(right.schedule.asset_name) ||
      left.schedule.id.localeCompare(right.schedule.id),
  )
}

export function getMaintenanceOccurrencesForMonth<
  TSchedule extends MaintenanceOccurrenceSchedule,
>(
  schedules: readonly TSchedule[],
  dateInMonth: string,
): MaintenanceOccurrence<TSchedule>[] {
  if (!isDateOnly(dateInMonth)) return []

  const [year, month] = dateInMonth.split("-").map(Number)
  const rangeStart = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-01`
  const rangeEnd = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(
    daysInMonth(year, month - 1),
  ).padStart(2, "0")}`

  return getMaintenanceOccurrences(schedules, rangeStart, rangeEnd)
}

export function sortMaintenanceSchedules(
  schedules: readonly MaintenanceSchedule[],
  today: string,
) {
  return [...schedules].sort((a, b) => {
    const aUpcoming = a.scheduled_date >= today
    const bUpcoming = b.scheduled_date >= today
    if (aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1
    return aUpcoming
      ? a.scheduled_date.localeCompare(b.scheduled_date)
      : b.scheduled_date.localeCompare(a.scheduled_date)
  })
}

"use client"

import * as React from "react"
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import { DatePicker } from "@fluentui/react-datepicker-compat"
import {
  DayOfWeek,
  type CalendarStrings,
} from "@fluentui/react-calendar-compat"
import {
  getMaintenanceRecurrenceLabel,
  getMaintenanceOccurrences,
  isDateOnly,
  localDateString,
  type MaintenanceSchedule,
} from "@/lib/maintenance"

type ReportPeriod = "daily" | "weekly" | "monthly" | "yearly" | "custom"
type DateRange = { startDate: string; endDate: string }

const periodLabels: Record<ReportPeriod, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  yearly: "Tahunan",
  custom: "Custom",
}

function isReportPeriod(value: string | undefined): value is ReportPeriod {
  return value !== undefined && Object.hasOwn(periodLabels, value)
}

const useStyles = makeStyles({
  surface: {
    width: "min(1120px, calc(100vw - 32px))",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 32px)",
  },
  content: {
    minHeight: 0,
    overflowY: "auto",
  },
  layout: {
    display: "grid",
    gridTemplateColumns: "minmax(280px, 340px) minmax(0, 1fr)",
    alignItems: "start",
    gap: "24px",
    minWidth: 0,
    "@media (max-width: 860px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "16px",
    },
  },
  formSection: {
    display: "grid",
    alignContent: "start",
    gap: "16px",
    minWidth: 0,
    paddingRight: "20px",
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 860px)": {
      paddingRight: 0,
      paddingBottom: "16px",
      borderRight: 0,
      borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  previewSection: {
    display: "grid",
    alignContent: "start",
    gap: "12px",
    minWidth: 0,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: "12px",
  },
  sectionDescription: {
    color: tokens.colorNeutralForeground2,
  },
  periodHint: {
    color: tokens.colorNeutralForeground2,
  },
  fields: {
    display: "grid",
    gap: "12px",
  },
  datePicker: {
    width: "100%",
    minWidth: 0,
  },
  customRange: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "12px",
  },
  rangeSummary: {
    display: "grid",
    gap: "4px",
    padding: "12px",
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  previewMeta: {
    color: tokens.colorNeutralForeground2,
  },
  tableContainer: {
    maxHeight: "min(52vh, 480px)",
    overflow: "auto",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    "@media (max-width: 860px)": {
      maxHeight: "min(40vh, 320px)",
    },
  },
  previewTable: {
    width: "100%",
    minWidth: "740px",
    tableLayout: "fixed",
    borderCollapse: "separate",
    borderSpacing: 0,
  },
  tableHeading: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    padding: "9px 10px",
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: "left",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  tableCell: {
    padding: "9px 10px",
    color: tokens.colorNeutralForeground1,
    verticalAlign: "top",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    overflowWrap: "anywhere",
  },
  dateColumn: {
    width: "13%",
  },
  itemColumn: {
    width: "25%",
  },
  assigneeColumn: {
    width: "16%",
  },
  needsColumn: {
    width: "22%",
  },
  notesColumn: {
    width: "24%",
  },
  itemName: {
    display: "block",
    fontWeight: tokens.fontWeightSemibold,
  },
  itemDetail: {
    display: "block",
    marginTop: "3px",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  needEntry: {
    display: "block",
    "& + &": {
      marginTop: "8px",
      paddingTop: "8px",
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  needName: {
    display: "block",
    fontWeight: tokens.fontWeightSemibold,
  },
  needDetail: {
    display: "block",
    marginTop: "2px",
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  recurrenceNote: {
    display: "block",
    marginBottom: "4px",
    fontWeight: tokens.fontWeightSemibold,
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    gap: "8px",
    padding: "24px 16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    textAlign: "center",
  },
})

const reportCalendarStrings: CalendarStrings = {
  months: [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ],
  shortMonths: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
  days: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  shortDays: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  goToToday: "Hari ini",
  prevMonthAriaLabel: "Bulan sebelumnya",
  nextMonthAriaLabel: "Bulan berikutnya",
  prevYearAriaLabel: "Tahun sebelumnya",
  nextYearAriaLabel: "Tahun berikutnya",
  prevYearRangeAriaLabel: "Rentang tahun sebelumnya",
  nextYearRangeAriaLabel: "Rentang tahun berikutnya",
  selectedDateFormatString: "Tanggal dipilih {0}",
  todayDateFormatString: "Hari ini {0}",
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`)
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function dateForPicker(value: string) {
  if (!isDateOnly(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateFromPicker(value: Date | null | undefined) {
  return value ? localDateString(value) : ""
}

function formatPickerDate(value?: Date) {
  return value
    ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(value)
    : ""
}

function getWeekRange(anchorDate: string): DateRange | null {
  if (!isDateOnly(anchorDate)) return null
  const [year, month, day] = anchorDate.split("-").map(Number)
  const start = new Date(Date.UTC(year, month - 1, day))
  const daysSinceMonday = (start.getUTCDay() + 6) % 7
  start.setUTCDate(start.getUTCDate() - daysSinceMonday)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function resolveDateRange(
  period: ReportPeriod,
  values: {
    dailyDate: string
    weeklyDate: string
    monthlyValue: string
    yearlyValue: string
    customStart: string
    customEnd: string
  },
): DateRange | null {
  switch (period) {
    case "daily":
      return isDateOnly(values.dailyDate)
        ? { startDate: values.dailyDate, endDate: values.dailyDate }
        : null
    case "weekly":
      return getWeekRange(values.weeklyDate)
    case "monthly": {
      const match = /^(\d{4})-(\d{2})$/.exec(values.monthlyValue)
      if (!match) return null
      const year = Number(match[1])
      const month = Number(match[2])
      if (month < 1 || month > 12) return null
      const endDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const range = {
        startDate: `${match[1]}-${match[2]}-01`,
        endDate: `${match[1]}-${match[2]}-${String(endDay).padStart(2, "0")}`,
      }
      return isDateOnly(range.startDate) && isDateOnly(range.endDate)
        ? range
        : null
    }
    case "yearly": {
      if (!/^\d{4}$/.test(values.yearlyValue)) return null
      const range = {
        startDate: `${values.yearlyValue}-01-01`,
        endDate: `${values.yearlyValue}-12-31`,
      }
      return isDateOnly(range.startDate) && isDateOnly(range.endDate)
        ? range
        : null
    }
    case "custom":
      return isDateOnly(values.customStart) &&
        isDateOnly(values.customEnd) &&
        values.customStart <= values.customEnd
        ? { startDate: values.customStart, endDate: values.customEnd }
        : null
  }
}

function reportNote(schedule: MaintenanceSchedule) {
  const isRecurring = schedule.recurrence !== "none"
  const recurrence = isRecurring
    ? `Berkala · ${getMaintenanceRecurrenceLabel(
        schedule.recurrence,
        schedule.recurrence_days,
      )}`
    : ""
  return {
    recurrence,
    notes: schedule.notes.trim() || (isRecurring ? "" : "—"),
  }
}

export function MaintenanceReportDialog({
  open,
  schedules,
  loading,
  loadError,
  onOpenChange,
}: {
  open: boolean
  schedules: readonly MaintenanceSchedule[]
  loading: boolean
  loadError: boolean
  onOpenChange: (open: boolean) => void
}) {
  const styles = useStyles()
  const today = localDateString()
  const [period, setPeriod] = React.useState<ReportPeriod>("daily")
  const [dailyDate, setDailyDate] = React.useState(today)
  const [weeklyDate, setWeeklyDate] = React.useState(today)
  const [monthlyValue, setMonthlyValue] = React.useState(today.slice(0, 7))
  const [yearlyValue, setYearlyValue] = React.useState(today.slice(0, 4))
  const [customStart, setCustomStart] = React.useState(today)
  const [customEnd, setCustomEnd] = React.useState(today)
  const [exporting, setExporting] = React.useState(false)
  const [exportError, setExportError] = React.useState("")

  const dateRange = React.useMemo(
    () =>
      resolveDateRange(period, {
        dailyDate,
        weeklyDate,
        monthlyValue,
        yearlyValue,
        customStart,
        customEnd,
      }),
    [
      period,
      dailyDate,
      weeklyDate,
      monthlyValue,
      yearlyValue,
      customStart,
      customEnd,
    ],
  )

  const occurrences = React.useMemo(
    () =>
      dateRange
        ? getMaintenanceOccurrences(
            schedules,
            dateRange.startDate,
            dateRange.endDate,
          )
        : [],
    [dateRange, schedules],
  )

  const customRangeReversed =
    period === "custom" &&
    isDateOnly(customStart) &&
    isDateOnly(customEnd) &&
    customStart > customEnd

  async function handleExport() {
    if (!dateRange || loading || loadError) return
    setExporting(true)
    setExportError("")

    try {
      const [{ pdf }, { MaintenanceReportDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./maintenance-report-pdf"),
      ])
      const blob = await pdf(
        <MaintenanceReportDocument
          occurrences={occurrences}
          periodLabel={periodLabels[period]}
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
        />,
      ).toBlob()
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `laporan-pemeliharaan-${dateRange.startDate}_${dateRange.endDate}.pdf`
      link.style.display = "none"
      document.body.append(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
      onOpenChange(false)
    } catch (failure) {
      const reason =
        failure instanceof Error
          ? failure.message
          : "Terjadi kesalahan yang tidak diketahui."
      setExportError(`PDF gagal dibuat: ${reason}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => onOpenChange(data.open)}
      modalType="modal"
    >
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Ekspor laporan pemeliharaan</DialogTitle>
          <DialogContent className={styles.content}>
            <div className={styles.layout}>
              <section
                className={styles.formSection}
                aria-labelledby="maintenance-report-period-title"
              >
                <Text
                  as="h3"
                  id="maintenance-report-period-title"
                  size={400}
                  weight="semibold"
                >
                  Pilih periode
                </Text>
                <Text className={styles.sectionDescription} size={200}>
                  Atur rentang laporan yang akan dimuat ke PDF.
                </Text>
                <div className={styles.fields}>
                  <Field label="Periode laporan">
                    <Dropdown
                      value={periodLabels[period]}
                      selectedOptions={[period]}
                      onOptionSelect={(_, data) => {
                        if (isReportPeriod(data.optionValue)) {
                          setPeriod(data.optionValue)
                        }
                      }}
                    >
                      <Option value="daily">Harian</Option>
                      <Option value="weekly">Mingguan</Option>
                      <Option value="monthly">Bulanan</Option>
                      <Option value="yearly">Tahunan</Option>
                      <Option value="custom">Custom</Option>
                    </Dropdown>
                  </Field>
                  {period === "daily" && (
                    <Field label="Tanggal laporan" required>
                      <DatePicker
                        className={styles.datePicker}
                        placeholder="Pilih tanggal"
                        value={dateForPicker(dailyDate)}
                        onSelectDate={(date) =>
                          setDailyDate(dateFromPicker(date))
                        }
                        formatDate={formatPickerDate}
                        firstDayOfWeek={DayOfWeek.Monday}
                        strings={reportCalendarStrings}
                      />
                    </Field>
                  )}
                  {period === "weekly" && (
                    <Field
                      label="Pilih salah satu tanggal dalam minggu"
                      required
                    >
                      <DatePicker
                        className={styles.datePicker}
                        placeholder="Pilih tanggal dalam minggu"
                        value={dateForPicker(weeklyDate)}
                        onSelectDate={(date) =>
                          setWeeklyDate(dateFromPicker(date))
                        }
                        formatDate={formatPickerDate}
                        firstDayOfWeek={DayOfWeek.Monday}
                        strings={reportCalendarStrings}
                      />
                    </Field>
                  )}
                  {period === "monthly" && (
                    <Field label="Bulan laporan" required>
                      <Input
                        type="month"
                        value={monthlyValue}
                        onChange={(_, data) => setMonthlyValue(data.value)}
                      />
                    </Field>
                  )}
                  {period === "yearly" && (
                    <Field label="Tahun laporan" required>
                      <Input
                        type="number"
                        min="1900"
                        max="9999"
                        step="1"
                        value={yearlyValue}
                        onChange={(_, data) => setYearlyValue(data.value)}
                      />
                    </Field>
                  )}
                  {period === "custom" && (
                    <div className={styles.customRange}>
                      <Field label="Tanggal awal" required>
                        <DatePicker
                          className={styles.datePicker}
                          placeholder="Tanggal awal"
                          value={dateForPicker(customStart)}
                          onSelectDate={(date) =>
                            setCustomStart(dateFromPicker(date))
                          }
                          formatDate={formatPickerDate}
                          firstDayOfWeek={DayOfWeek.Monday}
                          strings={reportCalendarStrings}
                        />
                      </Field>
                      <Field label="Tanggal akhir" required>
                        <DatePicker
                          className={styles.datePicker}
                          placeholder="Tanggal akhir"
                          value={dateForPicker(customEnd)}
                          onSelectDate={(date) =>
                            setCustomEnd(dateFromPicker(date))
                          }
                          formatDate={formatPickerDate}
                          firstDayOfWeek={DayOfWeek.Monday}
                          strings={reportCalendarStrings}
                        />
                      </Field>
                    </div>
                  )}
                </div>
                {period === "weekly" && (
                  <Text className={styles.periodHint} size={200}>
                    Satu minggu dihitung dari Senin sampai Minggu.
                  </Text>
                )}
                {dateRange && (
                  <div className={styles.rangeSummary}>
                    <Text size={200} weight="semibold">
                      Rentang laporan
                    </Text>
                    <Text>
                      {formatDate(dateRange.startDate)} -{" "}
                      {formatDate(dateRange.endDate)}
                    </Text>
                  </div>
                )}
                {customRangeReversed && (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      Tanggal awal tidak boleh setelah tanggal akhir.
                    </MessageBarBody>
                  </MessageBar>
                )}
              </section>
              <section
                className={styles.previewSection}
                aria-labelledby="maintenance-report-preview-title"
              >
                <div className={styles.sectionHeader}>
                  <Text
                    as="h3"
                    id="maintenance-report-preview-title"
                    size={400}
                    weight="semibold"
                  >
                    Preview laporan
                  </Text>
                  {dateRange && (
                    <Text size={200} aria-live="polite">
                      {occurrences.length} agenda
                    </Text>
                  )}
                </div>
                {dateRange && (
                  <Text className={styles.previewMeta} size={200}>
                    {periodLabels[period]} · {formatDate(dateRange.startDate)} -{" "}
                    {formatDate(dateRange.endDate)}
                  </Text>
                )}
                {loadError && (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      Jadwal belum berhasil dimuat. Muat ulang halaman sebelum
                      mengekspor laporan.
                    </MessageBarBody>
                  </MessageBar>
                )}
                {exportError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{exportError}</MessageBarBody>
                  </MessageBar>
                )}
                {loading ? (
                  <div className={styles.emptyState} role="status">
                    <Spinner size="small" />
                    <Text>Memuat preview jadwal…</Text>
                  </div>
                ) : loadError ? null : !dateRange ? (
                  <div className={styles.emptyState} role="status">
                    <Text>
                      Lengkapi pilihan periode untuk melihat preview.
                    </Text>
                  </div>
                ) : occurrences.length === 0 ? (
                  <div className={styles.emptyState} role="status">
                    <Text weight="semibold">
                      Tidak ada agenda pada periode ini.
                    </Text>
                    <Text size={200}>
                      PDF tetap dapat diunduh tanpa baris agenda.
                    </Text>
                  </div>
                ) : (
                  <div className={styles.tableContainer}>
                    <table
                      className={styles.previewTable}
                      aria-label="Preview agenda pemeliharaan"
                    >
                      <thead>
                        <tr>
                          <th
                            className={`${styles.tableHeading} ${styles.dateColumn}`}
                            scope="col"
                          >
                            Tanggal
                          </th>
                          <th
                            className={`${styles.tableHeading} ${styles.itemColumn}`}
                            scope="col"
                          >
                            Item pemeliharaan
                          </th>
                          <th
                            className={`${styles.tableHeading} ${styles.assigneeColumn}`}
                            scope="col"
                          >
                            Petugas
                          </th>
                          <th
                            className={`${styles.tableHeading} ${styles.needsColumn}`}
                            scope="col"
                          >
                            Kebutuhan
                          </th>
                          <th
                            className={`${styles.tableHeading} ${styles.notesColumn}`}
                            scope="col"
                          >
                            Keterangan
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {occurrences.map(({ date, schedule }) => {
                          const itemDetail = [
                            schedule.asset_category,
                            schedule.asset_details,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                          const note = reportNote(schedule)

                          return (
                            <tr key={`${schedule.id}-${date}`}>
                              <td
                                className={`${styles.tableCell} ${styles.dateColumn}`}
                              >
                                {formatDate(date)}
                              </td>
                              <td
                                className={`${styles.tableCell} ${styles.itemColumn}`}
                              >
                                <span className={styles.itemName}>
                                  {schedule.asset_name || "—"}
                                </span>
                                {itemDetail && (
                                  <span className={styles.itemDetail}>
                                    {itemDetail}
                                  </span>
                                )}
                              </td>
                              <td
                                className={`${styles.tableCell} ${styles.assigneeColumn}`}
                              >
                                {schedule.assignees || "—"}
                              </td>
                              <td
                                className={`${styles.tableCell} ${styles.needsColumn}`}
                              >
                                {schedule.needs.length === 0
                                  ? "Tidak dicatat"
                                  : schedule.needs.map((need, index) => (
                                      <span
                                        className={styles.needEntry}
                                        key={`${need.name}-${index}`}
                                      >
                                        <span className={styles.needName}>
                                          {need.name}
                                        </span>
                                        <span className={styles.needDetail}>
                                          {need.quantity} {need.unit}
                                        </span>
                                        {need.notes && (
                                          <span className={styles.needDetail}>
                                            {need.notes}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                              </td>
                              <td
                                className={`${styles.tableCell} ${styles.notesColumn}`}
                              >
                                {note.recurrence && (
                                  <span className={styles.recurrenceNote}>
                                    {note.recurrence}
                                  </span>
                                )}
                                {note.notes}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              onClick={() => onOpenChange(false)}
              disabled={exporting}
            >
              Batal
            </Button>
            <Button
              appearance="primary"
              onClick={handleExport}
              disabled={!dateRange || loading || loadError || exporting}
            >
              {exporting ? (
                <>
                  <Spinner size="tiny" /> Membuat PDF…
                </>
              ) : (
                "Unduh PDF"
              )}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

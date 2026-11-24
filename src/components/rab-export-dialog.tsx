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
  Option,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  DocumentExcelRegular,
  DocumentPdfRegular,
} from "@fluentui/react-icons"
import { terbilangRupiah, type RABRecord } from "@/lib/rab"
import { parseRABNotes } from "@/lib/rab-notes"
import { RABNotesContent } from "./rab-notes-content"

type ExportFormat = "xlsx" | "pdf"
type ExportOrientation = "portrait" | "landscape"

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
})

function formatRABDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}

const useStyles = makeStyles({
  surface: {
    width: "min(1120px, calc(100vw - 32px))",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100dvh - 32px)",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "minmax(240px, 30%) minmax(0, 1fr)",
    gap: "20px",
    minWidth: 0,
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  formPanel: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    alignContent: "start",
    gap: "16px",
    minWidth: 0,
    paddingRight: "20px",
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
    "& > *": {
      minWidth: 0,
    },
    "@media (max-width: 760px)": {
      paddingRight: 0,
      paddingBottom: "16px",
      borderRight: 0,
      borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  formControl: {
    width: "100%",
    minWidth: 0,
  },
  previewPanel: {
    display: "grid",
    alignContent: "start",
    gap: "12px",
    minWidth: 0,
  },
  overviewMeta: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  overviewField: {
    display: "grid",
    gap: "2px",
  },
  overviewTable: {
    display: "grid",
    gap: "6px",
  },
  overviewHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 56px 70px 112px 112px",
    gap: "8px",
    padding: "8px",
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  overviewRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 56px 70px 112px 112px",
    alignItems: "center",
    gap: "8px",
    padding: "8px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  overviewTotal: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px",
    backgroundColor: tokens.colorBrandBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  overviewNotes: {
    display: "grid",
    gap: "4px",
    padding: "10px 12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    whiteSpace: "pre-wrap",
  },
  overviewFootnote: {
    color: tokens.colorNeutralForeground2,
  },
  formatOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  formatIcon: {
    display: "inline-flex",
    alignItems: "center",
  },
  regularIcon: {},
  filledIcon: { display: "none" },
})

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function excelNoteValue(value: string) {
  const richText = parseRABNotes(value).flatMap((line, index) => {
    const runs: Array<{
      text: string
      font?: { bold?: boolean; italic?: boolean; underline?: boolean }
    }> = []
    if (index > 0) runs.push({ text: "\n" })
    if (line.marker) {
      runs.push({ text: `${"  ".repeat(line.indent)}${line.marker} ` })
    }
    for (const run of line.runs) {
      runs.push({
        text: run.text,
        ...(run.bold || run.italic || run.underline
          ? {
              font: {
                ...(run.bold ? { bold: true } : {}),
                ...(run.italic ? { italic: true } : {}),
                ...(run.underline ? { underline: true } : {}),
              },
            }
          : {}),
      })
    }
    return runs
  })
  return richText.length ? { richText } : { richText: [{ text: "-" }] }
}

export function RABExportDialog({
  open,
  record,
  onOpenChange,
}: {
  open: boolean
  record: RABRecord | null
  onOpenChange: (open: boolean) => void
}) {
  const styles = useStyles()
  const [approvedBy, setApprovedBy] = React.useState("")
  const [knownBy, setKnownBy] = React.useState("")
  const [format, setFormat] = React.useState<ExportFormat>("xlsx")
  const [orientation, setOrientation] =
    React.useState<ExportOrientation>("portrait")
  const [exporting, setExporting] = React.useState(false)
  const [exportError, setExportError] = React.useState("")

  async function handleExport() {
    if (!record || exporting) return
    const approver = approvedBy.trim()
    const knowledgeable = knownBy.trim()
    if (!approver) {
      setExportError("Isi nama yang menyetujui RAB.")
      return
    }
    if (!knowledgeable) {
      setExportError("Isi nama yang mengetahui RAB.")
      return
    }

    setExporting(true)
    setExportError("")
    const filenameBase = `rab-${record.rab_date}-${record.sppg_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`

    try {
      if (format === "xlsx") {
        const ExcelJS = await import("exceljs")
        const workbook = new ExcelJS.Workbook()
        workbook.creator = "Operasional"
        workbook.created = new Date()

        const sheet = workbook.addWorksheet("RAB")
        sheet.columns = [
          { header: "Nama item", key: "name", width: 34 },
          { header: "Kuantitas", key: "quantity", width: 14 },
          { header: "Satuan", key: "unit", width: 16 },
          { header: "Biaya satuan", key: "unitCost", width: 18 },
          { header: "Subtotal", key: "subtotal", width: 18 },
        ]
        sheet.insertRows(1, [
          ["Rencana Anggaran Biaya"],
          [`Disetujui oleh: ${approver}`],
          [`Diketahui oleh: ${knowledgeable}`],
          [`Tanggal RAB: ${record.rab_date}`],
          [`SPPG: ${record.sppg_name}`],
          [`Petugas: ${record.assignee_name}`],
          ["Keterangan", excelNoteValue(record.notes)],
          [],
        ])
        sheet.addRows(
          record.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            unitCost: item.estimatedUnitCost,
            subtotal: item.quantity * item.estimatedUnitCost,
          })),
        )
        sheet.addRow([])
        sheet.addRow(["", "", "", "Grand total", record.grand_total])
        sheet.getRow(1).font = { bold: true, size: 16 }
        sheet.views = [{ state: "frozen", ySplit: 9 }]
        sheet.getCell("A9").font = { bold: true }
        sheet.eachRow((row) => {
          row.height = 20
        })
        sheet.mergeCells("B7:E7")
        sheet.getCell("B7").alignment = { vertical: "top", wrapText: true }
        sheet.getRow(7).height = Math.max(
          20,
          Math.ceil((record.notes || "-").length / 50) * 15,
        )
        sheet.addRow([`Terbilang: ${terbilangRupiah(record.grand_total)}`])
        const wordsRowNumber = sheet.lastRow?.number
        if (wordsRowNumber) {
          sheet.mergeCells(`A${wordsRowNumber}:E${wordsRowNumber}`)
          sheet.getCell(`A${wordsRowNumber}`).alignment = { wrapText: true }
        }
        const buffer = await workbook.xlsx.writeBuffer()
        downloadBlob(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${filenameBase}.xlsx`,
        )
      } else {
        const [{ pdf }, { RABExportDocument }] = await Promise.all([
          import("@react-pdf/renderer"),
          import("./rab-export-pdf"),
        ])
        const blob = await pdf(
          <RABExportDocument
            record={record}
            approvedBy={approver}
            knownBy={knowledgeable}
            orientation={orientation}
          />,
        ).toBlob()
        downloadBlob(blob, `${filenameBase}.pdf`)
      }
      onOpenChange(false)
    } catch (error) {
      setExportError(
        error instanceof Error ? error.message : "RAB gagal diekspor.",
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => {
      if (!exporting) onOpenChange(data.open)
    }}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Ekspor RAB</DialogTitle>
          <DialogContent className={styles.content}>
            <section className={styles.formPanel} aria-label="Pengaturan ekspor">
              {exportError && (
                <div role="alert" style={{ color: tokens.colorPaletteRedForeground1 }}>
                  {exportError}
                </div>
              )}
              <Field label="Disetujui oleh" required>
                <Input
                  className={styles.formControl}
                  value={approvedBy}
                  placeholder="Nama penandatangan"
                  disabled={exporting}
                  onChange={(_, data) => {
                    setApprovedBy(data.value)
                    setExportError("")
                  }}
                />
              </Field>
              <Field label="Diketahui oleh" required>
                <Input
                  className={styles.formControl}
                  value={knownBy}
                  placeholder="Nama penandatangan"
                  disabled={exporting}
                  onChange={(_, data) => {
                    setKnownBy(data.value)
                    setExportError("")
                  }}
                />
              </Field>
              <Field label="Format" required>
                <Dropdown
                  className={styles.formControl}
                  value={format === "xlsx" ? "Excel (.xlsx)" : "PDF"}
                  selectedOptions={[format]}
                  onOptionSelect={(_, data) =>
                    setFormat((data.optionValue as ExportFormat) ?? "xlsx")
                  }
                  disabled={exporting}
                >
                  <Option value="xlsx" text="Excel (.xlsx)">
                    <span className={styles.formatOption}>
                      <span className={styles.formatIcon}>
                        <DocumentExcelRegular />
                      </span>
                      <span>Excel (.xlsx)</span>
                    </span>
                  </Option>
                  <Option value="pdf" text="PDF">
                    <span className={styles.formatOption}>
                      <span className={styles.formatIcon}>
                        <DocumentPdfRegular />
                      </span>
                      <span>PDF</span>
                    </span>
                  </Option>
                </Dropdown>
              </Field>
              {format === "pdf" && (
                <Field label="Orientasi" required>
                  <Dropdown
                    className={styles.formControl}
                    value={orientation === "portrait" ? "Portrait" : "Landscape"}
                    selectedOptions={[orientation]}
                    onOptionSelect={(_, data) =>
                      setOrientation(
                        (data.optionValue as ExportOrientation) ?? "portrait",
                      )
                    }
                    disabled={exporting}
                  >
                    <Option value="portrait" text="Portrait">Portrait</Option>
                    <Option value="landscape" text="Landscape">Landscape</Option>
                  </Dropdown>
                </Field>
              )}
            </section>

            {record && (
              <section className={styles.previewPanel} aria-label="Overview RAB">
                <Text size={400} weight="semibold">Overview RAB</Text>
                <div className={styles.overviewMeta}>
                  <div className={styles.overviewField}>
                    <Text size={200}>Tanggal RAB</Text>
                    <Text weight="semibold">{formatRABDate(record.rab_date)}</Text>
                  </div>
                  <div className={styles.overviewField}>
                    <Text size={200}>SPPG</Text>
                    <Text weight="semibold">{record.sppg_name}</Text>
                  </div>
                  <div className={styles.overviewField}>
                    <Text size={200}>Petugas</Text>
                    <Text weight="semibold">{record.assignee_name}</Text>
                  </div>
                </div>
                {record.notes && (
                  <div className={styles.overviewNotes}>
                    <Text size={200} weight="semibold">Keterangan / catatan</Text>
                    <RABNotesContent value={record.notes} />
                  </div>
                )}
                <div className={styles.overviewTable}>
                  <div className={styles.overviewHeader}>
                    <Text size={200} weight="semibold">Nama item</Text>
                    <Text size={200} weight="semibold" style={{ textAlign: "right" }}>Kuantitas</Text>
                    <Text size={200} weight="semibold">Satuan</Text>
                    <Text size={200} weight="semibold" style={{ textAlign: "right" }}>Biaya satuan</Text>
                    <Text size={200} weight="semibold" style={{ textAlign: "right" }}>Subtotal</Text>
                  </div>
                  {record.items.map((item, index) => (
                    <div className={styles.overviewRow} key={`${item.name}-${index}`}>
                      <Text>{item.name}</Text>
                      <Text style={{ textAlign: "right" }}>{item.quantity}</Text>
                      <Text>{item.unit || "-"}</Text>
                      <Text style={{ textAlign: "right" }}>
                        {currencyFormatter.format(item.estimatedUnitCost)}
                      </Text>
                      <Text style={{ textAlign: "right" }}>
                        {currencyFormatter.format(item.quantity * item.estimatedUnitCost)}
                      </Text>
                    </div>
                  ))}
                </div>
                <div className={styles.overviewTotal}>
                  <Text weight="semibold">Grand total</Text>
                  <Text size={400} weight="semibold">
                    {currencyFormatter.format(record.grand_total)}
                  </Text>
                </div>
                <Text size={200} className={styles.overviewFootnote}>
                  {terbilangRupiah(record.grand_total)}
                </Text>
              </section>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              disabled={exporting}
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              appearance="primary"
              disabled={exporting || !approvedBy.trim() || !knownBy.trim()}
              onClick={() => void handleExport()}
            >
              {exporting ? <Spinner size="tiny" /> : "Ekspor"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

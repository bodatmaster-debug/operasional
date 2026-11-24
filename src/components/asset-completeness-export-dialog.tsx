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
  Option,
  Spinner,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  DocumentExcelFilled,
  DocumentExcelRegular,
  DocumentPdfFilled,
  DocumentPdfRegular,
} from "@fluentui/react-icons"
import { getAssetConditionLabel } from "@/lib/asset-condition"
import type { AssetCompletenessRecord } from "@/lib/asset-completeness"
import type { ExportAssetDetail } from "./asset-completeness-export-pdf"

type CategoryFilter = "all" | string
type ConditionFilter = "all" | "good" | "service_required" | "broken" | "unrated"
type ExportFormat = "excel" | "pdf"

const useStyles = makeStyles({
  surface: {
    width: "min(920px, calc(100vw - 40px))",
    maxWidth: "calc(100vw - 40px)",
    maxHeight: "calc(100vh - 40px)",
  },
  content: {
    display: "grid",
    gap: "20px",
    minWidth: 0,
    overflowY: "auto",
  },
  overview: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "16px",
    padding: "16px 18px",
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px 18px",
    },
  },
  metric: { display: "grid", gap: "5px", minWidth: 0 },
  metricLabel: { color: tokens.colorNeutralForeground2 },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    alignItems: "start",
    gap: "20px",
    minWidth: 0,
    "@media (max-width: 760px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "16px",
      "& > :last-child": { gridColumn: "1 / -1" },
    },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "14px",
      "& > :last-child": { gridColumn: "auto" },
    },
  },
  selectorField: {
    minWidth: 0,
    "& > div": { width: "100%" },
  },
  selector: {
    width: "100%",
    minWidth: 0,
  },
  formatOption: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    "& .formatIconFilled": { display: "none" },
    "&:hover .formatIconRegular, &:focus-visible .formatIconRegular": {
      display: "none",
    },
    "&:hover .formatIconFilled, &:focus-visible .formatIconFilled": {
      display: "inline-flex",
    },
  },
  formatIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },
  preview: {
    display: "grid",
    gap: "6px",
    padding: "14px 16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
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

export function AssetCompletenessExportDialog({
  open,
  record,
  assets,
  loading,
  onOpenChange,
}: {
  open: boolean
  record: AssetCompletenessRecord
  assets: readonly ExportAssetDetail[]
  loading: boolean
  onOpenChange: (open: boolean) => void
}) {
  const styles = useStyles()
  const [category, setCategory] = React.useState<CategoryFilter>("all")
  const [condition, setCondition] = React.useState<ConditionFilter>("all")
  const [format, setFormat] = React.useState<ExportFormat>("excel")
  const [exporting, setExporting] = React.useState(false)
  const [exportError, setExportError] = React.useState("")

  const categories = React.useMemo(
    () => [...new Set(assets.map((asset) => asset.category))].sort((a, b) =>
      a.localeCompare(b, "id"),
    ),
    [assets],
  )

  const filteredAssets = React.useMemo(
    () =>
      assets.filter((asset) => {
        const categoryMatches =
          category === "all" || asset.category === category
        const conditionMatches =
          condition === "all" ||
          (condition === "unrated"
            ? asset.condition === null
            : asset.condition === condition)
        return categoryMatches && conditionMatches
      }),
    [assets, category, condition],
  )

  function closeDialog() {
    setCategory("all")
    setCondition("all")
    setFormat("excel")
    setExportError("")
    onOpenChange(false)
  }

  async function handleExport() {
    if (loading || exporting) return
    setExporting(true)
    setExportError("")
    const filenameBase = `kelengkapan-aset-${record.nama
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}`

    try {
      if (format === "excel") {
        const ExcelJS = await import("exceljs")
        const workbook = new ExcelJS.Workbook()
        workbook.creator = "Operasional"
        workbook.created = new Date()

        const overview = workbook.addWorksheet("Ringkasan")
        overview.columns = [
          { header: "SPPG", key: "label", width: 28 },
          { header: "Nilai", key: "value", width: 18 },
        ]
        overview.addRows([
          { label: "Nama SPPG", value: record.nama },
          {
            label: "Kelengkapan",
            value:
              record.percentage === null
                ? "Tidak dapat dibandingkan"
                : `${record.percentage}%`,
          },
          { label: "Mencapai acuan", value: record.itemsAtReference },
          { label: "Dapat dibandingkan", value: record.comparableItemCount },
          { label: "Perlu verifikasi", value: record.itemsNeedingVerification },
          { label: "Aset aktual diekspor", value: filteredAssets.length },
        ])

        const detail = workbook.addWorksheet("Aset aktual")
        detail.columns = [
          { header: "Sumber", key: "source", width: 16 },
          { header: "Kategori", key: "category", width: 22 },
          { header: "Nama aset", key: "name", width: 32 },
          { header: "Tipe / model", key: "type", width: 22 },
          { header: "Merek", key: "brand", width: 18 },
          { header: "Jumlah aktual", key: "quantity", width: 16 },
          { header: "Satuan", key: "unit", width: 14 },
          { header: "Kondisi", key: "condition", width: 18 },
          { header: "Rujukan", key: "reference", width: 24 },
        ]
        detail.addRows(
          filteredAssets.map((asset) => ({
            source: asset.source,
            category: asset.category,
            name: asset.name,
            type: asset.type || "Belum dicatat",
            brand: asset.brand || "Belum dicatat",
            quantity: asset.quantity,
            unit: asset.unit ?? "",
            condition: getAssetConditionLabel(asset.condition),
            reference: asset.reference ?? "",
          })),
        )
        for (const worksheet of [overview, detail]) {
          worksheet.getRow(1).font = { bold: true }
          worksheet.views = [{ state: "frozen", ySplit: 1 }]
          worksheet.autoFilter = {
            from: "A1",
            to: `${String.fromCharCode(64 + worksheet.columnCount)}1`,
          }
        }
        const buffer = await workbook.xlsx.writeBuffer()
        downloadBlob(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          }),
          `${filenameBase}.xlsx`,
        )
      } else {
        const [{ pdf }, { AssetCompletenessExportDocument }] =
          await Promise.all([
            import("@react-pdf/renderer"),
            import("./asset-completeness-export-pdf"),
          ])
        const blob = await pdf(
          <AssetCompletenessExportDocument
            sppgName={record.nama}
            overview={{
              percentage: record.percentage,
              comparableItemCount: record.comparableItemCount,
              itemsAtReference: record.itemsAtReference,
              itemsNeedingVerification: record.itemsNeedingVerification,
            }}
            assets={filteredAssets}
          />,
        ).toBlob()
        downloadBlob(blob, `${filenameBase}.pdf`)
      }
      onOpenChange(false)
    } catch (failure) {
      setExportError(
        `${format === "excel" ? "Excel" : "PDF"} gagal dibuat: ${
          failure instanceof Error ? failure.message : "Terjadi kesalahan."
        }`,
      )
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => {
        if (data.open) onOpenChange(true)
        else closeDialog()
      }}
    >
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Ekspor kelengkapan aset aktual</DialogTitle>
          <DialogContent className={styles.content}>
            <div className={styles.overview}>
              <div className={styles.metric}>
                <Text size={200} className={styles.metricLabel}>SPPG</Text>
                <Text weight="semibold">{record.nama}</Text>
              </div>
              <div className={styles.metric}>
                <Text size={200} className={styles.metricLabel}>Kelengkapan</Text>
                <Text weight="semibold">
                  {record.percentage === null ? "—" : `${record.percentage}%`}
                </Text>
              </div>
              <div className={styles.metric}>
                <Text size={200} className={styles.metricLabel}>Mencapai acuan</Text>
                <Text weight="semibold">
                  {record.itemsAtReference}/{record.comparableItemCount}
                </Text>
              </div>
              <div className={styles.metric}>
                <Text size={200} className={styles.metricLabel}>Perlu verifikasi</Text>
                <Text weight="semibold">{record.itemsNeedingVerification}</Text>
              </div>
            </div>
            <div className={styles.filters}>
              <Field label="Kategori aset" className={styles.selectorField}>
                <Dropdown
                  className={styles.selector}
                  value={category === "all" ? "Semua kategori" : category}
                  selectedOptions={[category]}
                  onOptionSelect={(_, data) =>
                    setCategory(String(data.optionValue ?? "all"))
                  }
                >
                  <Option value="all">Semua kategori</Option>
                  {categories.map((item) => (
                    <Option key={item} value={item}>{item}</Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Kondisi aset" className={styles.selectorField}>
                <Dropdown
                  className={styles.selector}
                  value={
                    condition === "all"
                      ? "Semua kondisi"
                      : condition === "unrated"
                        ? "Belum dinilai"
                        : getAssetConditionLabel(
                            condition as "good" | "service_required" | "broken",
                          )
                  }
                  selectedOptions={[condition]}
                  onOptionSelect={(_, data) =>
                    setCondition(
                      (data.optionValue as ConditionFilter | undefined) ?? "all",
                    )
                  }
                >
                  <Option value="all">Semua kondisi</Option>
                  <Option value="good">Baik</Option>
                  <Option value="service_required">Butuh diservis</Option>
                  <Option value="broken">Rusak</Option>
                  <Option value="unrated">Belum dinilai</Option>
                </Dropdown>
              </Field>
              <Field label="Format" className={styles.selectorField}>
                <Dropdown
                  className={styles.selector}
                  value={format === "excel" ? "Excel (.xlsx)" : "PDF"}
                  selectedOptions={[format]}
                  onOptionSelect={(_, data) =>
                    setFormat((data.optionValue as ExportFormat) ?? "excel")
                  }
                >
                  <Option
                    value="excel"
                    text="Excel (.xlsx)"
                    className={styles.formatOption}
                  >
                    <span className={styles.formatIcon} aria-hidden="true">
                      <DocumentExcelRegular className="formatIconRegular" />
                      <DocumentExcelFilled className="formatIconFilled" />
                    </span>
                    <span>Excel (.xlsx)</span>
                  </Option>
                  <Option
                    value="pdf"
                    text="PDF"
                    className={styles.formatOption}
                  >
                    <span className={styles.formatIcon} aria-hidden="true">
                      <DocumentPdfRegular className="formatIconRegular" />
                      <DocumentPdfFilled className="formatIconFilled" />
                    </span>
                    <span>PDF</span>
                  </Option>
                </Dropdown>
              </Field>
            </div>
            <div className={styles.preview}>
              <Text weight="semibold">
                {filteredAssets.length} catatan aset akan diekspor
              </Text>
              <Text size={200}>
                Filter kategori dan kondisi diterapkan pada rincian aset aktual.
              </Text>
            </div>
            {exportError && <Text role="alert">{exportError}</Text>}
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              onClick={closeDialog}
              disabled={exporting}
            >
              Batal
            </Button>
            <Button
              appearance="primary"
              onClick={() => void handleExport()}
              disabled={loading || exporting}
            >
              {exporting ? (
                <>
                  <Spinner size="tiny" /> Membuat {format === "excel" ? "Excel" : "PDF"}…
                </>
              ) : (
                `Unduh ${format === "excel" ? "Excel" : "PDF"}`
              )}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

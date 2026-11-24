"use client"

import * as React from "react"
import {
  Badge,
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Dropdown,
  Field,
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import type { TableColumnDefinition } from "@fluentui/react-components"
import {
  ArrowUploadRegular,
  CopyFilled,
  CopyRegular,
} from "@fluentui/react-icons"
import type { LocalUser } from "@/lib/access-types"

type ImportField =
  | "assetName"
  | "quantity"
  | "unit"
  | "category"
  | "acquisitionValue"
  | "notes"

type ColumnMapping = Record<ImportField, number | null>

type SourceRow = {
  rowNumber: number
  cells: string[]
}

type PreviewRow = {
  sourceRowNumber: number
  assetName: string
  quantity: number | null
  unit: string
  category: string
  acquisitionValue: number | null
  notes: string
  error: string
}

type ImportBatch = {
  id: string
  sourceFilename: string
  createdByUsername: string
  createdAt: string
  rowCount: number
}

type ImportedRow = {
  id: string
  sourceRowNumber: number
  assetName: string
  quantity: number
  unit: string
  category: string
  acquisitionValue: number | null
  notes: string
  createdAt: string
}

type FetchLogEntry = {
  id: number
  method: "GET" | "POST"
  endpoint: string
  status: string
  durationMs: number
  result: string
}

const EMPTY_MAPPING: ColumnMapping = {
  assetName: null,
  quantity: null,
  unit: null,
  category: null,
  acquisitionValue: null,
  notes: null,
}

const FIELD_LABELS: Record<ImportField, string> = {
  assetName: "Nama aset",
  quantity: "Jumlah",
  unit: "Satuan",
  category: "Kategori",
  acquisitionValue: "Nilai perolehan",
  notes: "Catatan",
}

const AUTO_MATCHES: Record<ImportField, string[]> = {
  assetName: ["nama aset", "nama barang", "nama item", "nama", "item", "aset"],
  quantity: ["jumlah", "kuantitas", "qty", "quantity", "volume"],
  unit: ["satuan", "unit"],
  category: ["kategori", "category", "jenis"],
  acquisitionValue: ["nilai perolehan", "harga perolehan", "nilai", "harga"],
  notes: ["catatan", "keterangan", "notes"],
}

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
})

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

const FABRIC_FILE_ICON_ASSETS =
  "https://res-1.cdn.office.net/files/fabric-cdn-prod_20221201.001/assets/item-types"

const useStyles = makeStyles({
  root: {
    display: "grid",
    alignContent: "start",
    gap: "24px",
    minWidth: 0,
  },
  section: {
    display: "grid",
    alignContent: "start",
    gap: "12px",
    minWidth: 0,
  },
  sectionTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minHeight: "40px",
  },
  sectionTitleIcon: {
    display: "inline-flex",
    flexShrink: 0,
    color: tokens.colorBrandForeground1,
  },
  fileTypeImage: {
    display: "inline-block",
    flexShrink: 0,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    verticalAlign: "middle",
  },
  fileTypeImage16: {
    width: "16px",
    height: "16px",
    backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/16/xlsx.png)`,
    "@media only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (min-resolution: 144dpi)": {
      backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/16_1.5x/xlsx.png)`,
    },
    "@media only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi)": {
      backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/16_2x/xlsx.png)`,
    },
    "@media only screen and (-webkit-min-device-pixel-ratio: 3), only screen and (min-resolution: 288dpi)": {
      backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/16_3x/xlsx.png)`,
    },
  },
  fileTypeImage32: {
    width: "32px",
    height: "32px",
    backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/48/xlsx.png)`,
    "@media only screen and (-webkit-min-device-pixel-ratio: 1.5), only screen and (min-resolution: 144dpi)": {
      backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/48_1.5x/xlsx.png)`,
    },
    "@media only screen and (-webkit-min-device-pixel-ratio: 2), only screen and (min-resolution: 192dpi)": {
      backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/48_2x/xlsx.png)`,
    },
    "@media only screen and (-webkit-min-device-pixel-ratio: 3), only screen and (min-resolution: 288dpi)": {
      backgroundImage: `url(${FABRIC_FILE_ICON_ASSETS}/48_3x/xlsx.png)`,
    },
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  fileName: {
    minWidth: 0,
    overflowWrap: "anywhere",
    color: tokens.colorNeutralForeground2,
  },
  mappingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
    gap: "12px",
  },
  tableShell: {
    minWidth: 0,
    overflowX: "auto",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  dataGrid: {
    minWidth: "720px",
  },
  batchLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 0.75fr) minmax(0, 1.75fr)",
    gap: "20px",
    minWidth: 0,
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  batchList: {
    display: "grid",
    alignContent: "start",
    gap: "4px",
    maxHeight: "360px",
    overflowY: "auto",
    minWidth: 0,
  },
  batchButton: {
    display: "grid",
    justifyItems: "start",
    gap: "4px",
    width: "100%",
    minWidth: 0,
    height: "auto",
    padding: "10px 12px",
    textAlign: "left",
    whiteSpace: "normal",
  },
  batchFilename: {
    width: "100%",
    overflowWrap: "anywhere",
    textAlign: "left",
  },
  detailHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
  },
  emptyState: {
    padding: "20px 12px",
    color: tokens.colorNeutralForeground2,
  },
  fetchLog: {
    display: "grid",
    gap: "4px",
    minWidth: 0,
    padding: "8px 12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  fetchLogHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px",
  },
  copyButton: {
    minWidth: "32px",
    width: "32px",
    height: "32px",
    padding: 0,
  },
  fetchLogList: {
    display: "grid",
    gap: "2px",
    maxHeight: "176px",
    minWidth: 0,
    margin: 0,
    padding: 0,
    overflowY: "auto",
    listStyleType: "none",
  },
  fetchLogLine: {
    minWidth: 0,
    overflowWrap: "anywhere",
    fontFamily: "Consolas, 'Courier New', monospace",
    fontSize: "12px",
    lineHeight: "20px",
    color: tokens.colorNeutralForeground2,
  },
})

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id-ID")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
}

function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping = { ...EMPTY_MAPPING }
  for (const field of Object.keys(AUTO_MATCHES) as ImportField[]) {
    const aliases = AUTO_MATCHES[field].map(normalizeHeader)
    const index = headers.findIndex((header) =>
      aliases.includes(normalizeHeader(header)),
    )
    if (index >= 0) mapping[field] = index
  }
  return mapping
}

function parseInteger(value: string): number | null {
  const normalized = value.trim().replace(/[^\d,.-]/g, "")
  if (!normalized) return null
  const grouped = /^-?\d{1,3}(?:[.,]\d{3})+$/.test(normalized)
  const digits = grouped ? normalized.replace(/[.,]/g, "") : normalized
  if (!/^-?\d+$/.test(digits)) return null
  const number = Number(digits)
  return Number.isSafeInteger(number) ? number : null
}

function makePreviewRows(
  sourceRows: SourceRow[],
  mapping: ColumnMapping,
): PreviewRow[] {
  const mappedColumns = Object.entries(mapping).filter(
    ([, columnIndex]) => columnIndex !== null,
  )
  const hasDuplicateColumns = mappedColumns.some(
    ([field, columnIndex], index) =>
      mappedColumns.some(
        ([otherField, otherIndex], otherPosition) =>
          otherPosition > index &&
          otherField !== field &&
          otherIndex === columnIndex,
      ),
  )
  return sourceRows.map(({ rowNumber, cells }) => {
    const value = (field: ImportField) => {
      const index = mapping[field]
      return index === null ? "" : (cells[index] ?? "").trim()
    }

    const assetName = value("assetName")
    const quantityText = value("quantity")
    const quantity = quantityText ? parseInteger(quantityText) : null
    const unit = value("unit")
    const category = value("category")
    const acquisitionText = value("acquisitionValue")
    const acquisitionValue = acquisitionText
      ? parseInteger(acquisitionText)
      : null
    const notes = value("notes")
    const errors: string[] = []

    if (hasDuplicateColumns) {
      errors.push("Setiap data harus dipetakan ke kolom yang berbeda.")
    }
    if (mapping.assetName === null) errors.push("Pilih kolom nama aset.")
    else if (!assetName) errors.push("Nama aset kosong.")
    else if (assetName.length > 200) errors.push("Nama aset lebih dari 200 karakter.")
    if (mapping.quantity === null) errors.push("Pilih kolom jumlah.")
    else if (quantity === null || quantity < 1 || quantity > 1_000_000) {
      errors.push("Jumlah harus bilangan bulat 1–1.000.000.")
    }
    if (unit.length > 40) errors.push("Satuan lebih dari 40 karakter.")
    if (category.length > 100) errors.push("Kategori lebih dari 100 karakter.")
    if (
      acquisitionText &&
      (acquisitionValue === null ||
        acquisitionValue < 0 ||
        acquisitionValue > 1_000_000_000_000)
    ) {
      errors.push("Nilai perolehan harus bilangan bulat yang valid.")
    }
    if (notes.length > 1000) errors.push("Catatan lebih dari 1.000 karakter.")

    return {
      sourceRowNumber: rowNumber,
      assetName,
      quantity,
      unit,
      category,
      acquisitionValue,
      notes,
      error: errors.join(" "),
    }
  })
}

function isBatch(value: unknown): value is ImportBatch {
  if (typeof value !== "object" || value === null) return false
  const batch = value as Record<string, unknown>
  return (
    typeof batch.id === "string" &&
    typeof batch.sourceFilename === "string" &&
    typeof batch.createdByUsername === "string" &&
    typeof batch.createdAt === "string" &&
    typeof batch.rowCount === "number"
  )
}

function isImportedRow(value: unknown): value is ImportedRow {
  if (typeof value !== "object" || value === null) return false
  const row = value as Record<string, unknown>
  return (
    typeof row.id === "string" &&
    typeof row.sourceRowNumber === "number" &&
    typeof row.assetName === "string" &&
    typeof row.quantity === "number" &&
    typeof row.unit === "string" &&
    typeof row.category === "string" &&
    (row.acquisitionValue === null || typeof row.acquisitionValue === "number") &&
    typeof row.notes === "string" &&
    typeof row.createdAt === "string"
  )
}

function readCellText(row: { getCell: (column: number) => { text: string; value: unknown } }, column: number) {
  const cell = row.getCell(column)
  if (cell.value === null || cell.value === undefined) return ""
  return (cell.text || String(cell.value)).trim()
}

function copyTextUsingDocument(text: string) {
  const textArea = document.createElement("textarea")
  textArea.value = text
  textArea.readOnly = true
  textArea.style.position = "fixed"
  textArea.style.opacity = "0"
  document.body.append(textArea)
  textArea.select()
  try {
    return document.execCommand("copy")
  } catch {
    return false
  } finally {
    textArea.remove()
  }
}

function selectText(element: HTMLElement | null) {
  const selection = window.getSelection()
  if (!element || !selection) return false
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
  return true
}

function XlsxFileTypeIcon({ size }: { size: 16 | 32 }) {
  const styles = useStyles()
  const sizeClassName = size === 32 ? styles.fileTypeImage32 : styles.fileTypeImage16
  return (
    <span
      className={`${styles.fileTypeImage} ${sizeClassName} ms-BrandIcon--xlsx`}
      aria-hidden="true"
    />
  )
}

export function AssetImportManagement({ user }: { user: LocalUser }) {
  const styles = useStyles()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [sourceFilename, setSourceFilename] = React.useState("")
  const [worksheetName, setWorksheetName] = React.useState("")
  const [headers, setHeaders] = React.useState<string[]>([])
  const [sourceRows, setSourceRows] = React.useState<SourceRow[]>([])
  const [mapping, setMapping] = React.useState<ColumnMapping>(EMPTY_MAPPING)
  const [parseError, setParseError] = React.useState("")
  const [saveError, setSaveError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [batches, setBatches] = React.useState<ImportBatch[]>([])
  const [selectedBatchId, setSelectedBatchId] = React.useState<string | null>(null)
  const [importedRows, setImportedRows] = React.useState<ImportedRow[]>([])
  const [loadError, setLoadError] = React.useState("")
  const [successMessage, setSuccessMessage] = React.useState("")
  const [fetchLog, setFetchLog] = React.useState<FetchLogEntry[]>([])
  const [fetchLogCopied, setFetchLogCopied] = React.useState(false)
  const [copyButtonHovered, setCopyButtonHovered] = React.useState(false)
  const [fetchLogCopyMessage, setFetchLogCopyMessage] = React.useState("")
  const [fetchLogCopyError, setFetchLogCopyError] = React.useState("")
  const fetchLogSequence = React.useRef(0)
  const fetchLogListRef = React.useRef<HTMLOListElement>(null)

  const appendFetchLog = React.useCallback(
    (entry: Omit<FetchLogEntry, "id">) => {
      const nextEntry: FetchLogEntry = {
        ...entry,
        id: ++fetchLogSequence.current,
      }
      setFetchLogCopied(false)
      setFetchLogCopyMessage("")
      setFetchLogCopyError("")
      setFetchLog((current) => [nextEntry, ...current].slice(0, 12))
    },
    [],
  )

  const fetchWithLog = React.useCallback(
    async (
      input: RequestInfo | URL,
      init: RequestInit | undefined,
      endpoint: string,
      result: string,
    ) => {
      const method = init?.method?.toUpperCase() === "POST" ? "POST" : "GET"
      const startedAt = performance.now()
      try {
        const response = await fetch(input, init)
        appendFetchLog({
          method,
          endpoint,
          status: String(response.status),
          durationMs: Math.round(performance.now() - startedAt),
          result: response.ok ? result : `${result} gagal`,
        })
        return response
      } catch (error) {
        appendFetchLog({
          method,
          endpoint,
          status: "NETWORK_ERROR",
          durationMs: Math.round(performance.now() - startedAt),
          result: "koneksi gagal",
        })
        throw error
      }
    },
    [appendFetchLog],
  )

  async function copyFetchLog() {
    setFetchLogCopyMessage("")
    setFetchLogCopyError("")
    const text = fetchLog
      .map(
        ({ durationMs, method, endpoint, status, result }) =>
          `${durationMs} ms ${method} ${endpoint} ${status} · ${result}`,
      )
      .join("\n")
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
      } else if (!copyTextUsingDocument(text)) {
        throw new Error("Penyalinan tidak didukung.")
      }
      setFetchLogCopied(true)
    } catch {
      if (copyTextUsingDocument(text)) {
        setFetchLogCopied(true)
        return
      }
      setFetchLogCopied(false)
      if (selectText(fetchLogListRef.current)) {
        setFetchLogCopyMessage(
          "Clipboard diblokir; log sudah dipilih. Tekan Ctrl+C untuk menyalin.",
        )
      } else {
        setFetchLogCopyError(
          "Log tidak dapat disalin. Periksa izin clipboard browser.",
        )
      }
    }
  }

  const canImport =
    user.role === "admin" || user.permissions?.assets === true
  const previewRows = React.useMemo(
    () => makePreviewRows(sourceRows, mapping),
    [mapping, sourceRows],
  )
  const invalidRows = previewRows.filter((row) => row.error)
  const canSave =
    canImport &&
    previewRows.length > 0 &&
    invalidRows.length === 0 &&
    mapping.assetName !== null &&
    mapping.quantity !== null &&
    !saving

  const loadBatches = React.useCallback(async (preferredId?: string) => {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetchWithLog(
        "/api/asset-import",
        { cache: "no-store" },
        "/api/asset-import",
        "daftar batch",
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Daftar impor Excel gagal dimuat."
        throw new Error(message)
      }
      const rawBatches =
        typeof payload === "object" &&
        payload !== null &&
        "batches" in payload &&
        Array.isArray(payload.batches)
          ? payload.batches
          : null
      if (!rawBatches || !rawBatches.every(isBatch)) {
        throw new Error("Respons daftar impor Excel tidak valid.")
      }
      setBatches(rawBatches)
      const nextId =
        (preferredId && rawBatches.some((batch) => batch.id === preferredId)
          ? preferredId
          : rawBatches[0]?.id) ?? null
      setSelectedBatchId(nextId)
      if (!nextId) {
        setImportedRows([])
        return
      }

      const detailResponse = await fetchWithLog(
        `/api/asset-import?batchId=${encodeURIComponent(nextId)}`,
        { cache: "no-store" },
        "/api/asset-import?batchId=…",
        "rincian impor",
      )
      const detailPayload: unknown = await detailResponse.json().catch(() => null)
      if (!detailResponse.ok) {
        throw new Error("Rincian impor Excel gagal dimuat.")
      }
      const rawRows =
        typeof detailPayload === "object" &&
        detailPayload !== null &&
        "rows" in detailPayload &&
        Array.isArray(detailPayload.rows)
          ? detailPayload.rows
          : null
      if (!rawRows || !rawRows.every(isImportedRow)) {
        throw new Error("Respons rincian impor Excel tidak valid.")
      }
      setImportedRows(rawRows)
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Impor Excel gagal dimuat.",
      )
    } finally {
      setLoading(false)
    }
  }, [fetchWithLog])

  React.useEffect(() => {
    let active = true
    void (async () => {
      await Promise.resolve()
      if (active) await loadBatches()
    })()
    return () => {
      active = false
    }
  }, [loadBatches])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return

    setParseError("")
    setSaveError("")
    setSuccessMessage("")
    setSourceFilename("")
    setWorksheetName("")
    setHeaders([])
    setSourceRows([])
    setMapping(EMPTY_MAPPING)

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setParseError("Pilih file Excel .xlsx. Format .xls belum didukung.")
      return
    }
    if (file.size === 0 || file.size > 15 * 1024 * 1024) {
      setParseError("Ukuran file harus lebih dari 0 dan maksimal 15 MB.")
      return
    }

    try {
      const ExcelJS = await import("exceljs")
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(await file.arrayBuffer())
      const worksheet = workbook.worksheets[0]
      if (!worksheet) {
        setParseError("Workbook tidak memiliki lembar kerja.")
        return
      }
      if (worksheet.rowCount > 100_000 || worksheet.columnCount > 50) {
        setParseError(
          "Lembar kerja terlalu besar. Batasnya 100.000 baris dan 50 kolom.",
        )
        return
      }

      let headerRowNumber = 0
      let headerCount = 0
      for (let rowNumber = 1; rowNumber <= Math.min(10, worksheet.rowCount); rowNumber++) {
        const row = worksheet.getRow(rowNumber)
        const count = Array.from({ length: worksheet.columnCount }, (_, index) =>
          readCellText(row, index + 1),
        ).filter(Boolean).length
        if (count > headerCount) {
          headerCount = count
          headerRowNumber = rowNumber
        }
      }
      if (!headerRowNumber || headerCount === 0) {
        setParseError("Baris judul kolom tidak ditemukan pada 10 baris pertama.")
        return
      }

      const headerRow = worksheet.getRow(headerRowNumber)
      const nextHeaders = Array.from(
        { length: worksheet.columnCount },
        (_, index) => readCellText(headerRow, index + 1),
      )
      const nextRows: SourceRow[] = []
      for (
        let rowNumber = headerRowNumber + 1;
        rowNumber <= worksheet.rowCount;
        rowNumber++
      ) {
        const row = worksheet.getRow(rowNumber)
        const cells = Array.from(
          { length: worksheet.columnCount },
          (_, index) => readCellText(row, index + 1),
        )
        if (cells.every((cell) => !cell)) continue
        nextRows.push({ rowNumber, cells })
        if (nextRows.length > 2_000) {
          setParseError("Maksimal 2.000 baris data dapat diimpor sekaligus.")
          return
        }
      }
      if (!nextRows.length) {
        setParseError("Tidak ada baris data setelah judul kolom.")
        return
      }

      setSourceFilename(file.name)
      setWorksheetName(worksheet.name)
      setHeaders(nextHeaders)
      setSourceRows(nextRows)
      setMapping(autoMapColumns(nextHeaders))
    } catch (error) {
      setParseError(
        error instanceof Error
          ? `File Excel tidak dapat dibaca: ${error.message}`
          : "File Excel tidak dapat dibaca.",
      )
    }
  }

  async function selectBatch(batchId: string) {
    setLoadError("")
    setSelectedBatchId(batchId)
    try {
      const response = await fetchWithLog(
        `/api/asset-import?batchId=${encodeURIComponent(batchId)}`,
        { cache: "no-store" },
        "/api/asset-import?batchId=…",
        "rincian impor",
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error("Rincian impor Excel gagal dimuat.")
      const rawRows =
        typeof payload === "object" &&
        payload !== null &&
        "rows" in payload &&
        Array.isArray(payload.rows)
          ? payload.rows
          : null
      if (!rawRows || !rawRows.every(isImportedRow)) {
        throw new Error("Respons rincian impor Excel tidak valid.")
      }
      setImportedRows(rawRows)
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Rincian impor gagal dimuat.",
      )
    }
  }

  async function saveImport() {
    if (!canSave || !sourceFilename) return
    setSaving(true)
    setSaveError("")
    setSuccessMessage("")
    try {
      const response = await fetchWithLog(
        "/api/asset-import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceFilename,
            rows: previewRows.map(
              ({
                sourceRowNumber,
                assetName,
                quantity,
                unit,
                category,
                acquisitionValue,
                notes,
              }) => ({
                sourceRowNumber,
                assetName,
                quantity,
                unit,
                category,
                acquisitionValue,
                notes,
              }),
            ),
          }),
        },
        "/api/asset-import",
        "simpan impor",
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        const message =
          typeof payload === "object" &&
          payload !== null &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Data impor Excel gagal disimpan."
        throw new Error(message)
      }
      const savedBatch =
        typeof payload === "object" &&
        payload !== null &&
        "batch" in payload &&
        isBatch(payload.batch)
          ? payload.batch
          : null
      if (!savedBatch) throw new Error("Respons simpan impor Excel tidak valid.")

      setSuccessMessage(
        `${savedBatch.rowCount.toLocaleString("id-ID")} baris tersimpan sebagai data belum dialokasikan.`,
      )
      setSourceFilename("")
      setWorksheetName("")
      setHeaders([])
      setSourceRows([])
      setMapping(EMPTY_MAPPING)
      await loadBatches(savedBatch.id)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Data impor Excel gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  const previewColumns = React.useMemo<TableColumnDefinition<PreviewRow>[]>(
    () => [
      createTableColumn<PreviewRow>({
        columnId: "sourceRowNumber",
        renderHeaderCell: () => "Baris",
        renderCell: (item) => item.sourceRowNumber,
      }),
      createTableColumn<PreviewRow>({
        columnId: "assetName",
        renderHeaderCell: () => "Nama aset",
        renderCell: (item) => item.assetName || "—",
      }),
      createTableColumn<PreviewRow>({
        columnId: "quantity",
        renderHeaderCell: () => "Jumlah",
        renderCell: (item) => item.quantity ?? "—",
      }),
      createTableColumn<PreviewRow>({
        columnId: "unit",
        renderHeaderCell: () => "Satuan",
        renderCell: (item) => item.unit || "—",
      }),
      createTableColumn<PreviewRow>({
        columnId: "category",
        renderHeaderCell: () => "Kategori",
        renderCell: (item) => item.category || "—",
      }),
      createTableColumn<PreviewRow>({
        columnId: "validation",
        renderHeaderCell: () => "Validasi",
        renderCell: (item) =>
          item.error ? (
            <Text role="alert" style={{ color: tokens.colorPaletteRedForeground1 }}>
              {item.error}
            </Text>
          ) : (
            <Badge appearance="tint" color="success">Siap</Badge>
          ),
      }),
    ],
    [],
  )

  const importedColumns = React.useMemo<TableColumnDefinition<ImportedRow>[]>(
    () => [
      createTableColumn<ImportedRow>({
        columnId: "sourceRowNumber",
        renderHeaderCell: () => "Baris Excel",
        renderCell: (item) => item.sourceRowNumber,
      }),
      createTableColumn<ImportedRow>({
        columnId: "assetName",
        renderHeaderCell: () => "Nama aset",
        renderCell: (item) => item.assetName,
      }),
      createTableColumn<ImportedRow>({
        columnId: "quantity",
        renderHeaderCell: () => "Jumlah",
        renderCell: (item) => `${item.quantity} ${item.unit}`.trim(),
      }),
      createTableColumn<ImportedRow>({
        columnId: "category",
        renderHeaderCell: () => "Kategori",
        renderCell: (item) => item.category || "—",
      }),
      createTableColumn<ImportedRow>({
        columnId: "acquisitionValue",
        renderHeaderCell: () => "Nilai perolehan",
        renderCell: (item) =>
          item.acquisitionValue === null
            ? "—"
            : currencyFormatter.format(item.acquisitionValue),
      }),
      createTableColumn<ImportedRow>({
        columnId: "allocation",
        renderHeaderCell: () => "Status alokasi",
        renderCell: () => <Badge appearance="tint" color="informative">Belum dialokasikan</Badge>,
      }),
    ],
    [],
  )

  const selectedBatch = batches.find((batch) => batch.id === selectedBatchId)

  return (
    <div className={styles.root}>
      <section className={styles.section} aria-labelledby="asset-import-title">
        <Text
          id="asset-import-title"
          as="h2"
          size={500}
          weight="semibold"
          className={styles.sectionTitle}
        >
          <span className={styles.sectionTitleIcon}>
            <XlsxFileTypeIcon size={32} />
          </span>
          Impor daftar aset dari Excel
        </Text>
        <Text>
          Baca file .xlsx, cocokkan kolom, dan simpan sebagai daftar persiapan.
          Data impor tidak mengubah jumlah aset aktual atau stok gudang.
        </Text>

        {!canImport && (
          <MessageBar intent="warning">
            <MessageBarBody>
              Akun ini hanya dapat melihat daftar impor. Minta Admin memberikan
              izin tulis aset untuk mengimpor file.
            </MessageBarBody>
          </MessageBar>
        )}
        {parseError && (
          <MessageBar intent="error">
            <MessageBarBody>{parseError}</MessageBarBody>
          </MessageBar>
        )}
        {saveError && (
          <MessageBar intent="error">
            <MessageBarBody>{saveError}</MessageBarBody>
          </MessageBar>
        )}
        {successMessage && (
          <MessageBar intent="success">
            <MessageBarBody>{successMessage}</MessageBarBody>
          </MessageBar>
        )}

        <div className={styles.toolbar}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(event) => void handleFileChange(event)}
          />
          <Button
            appearance="primary"
            icon={<ArrowUploadRegular />}
            disabled={!canImport || saving}
            onClick={() => fileInputRef.current?.click()}
          >
            Pilih file Excel
          </Button>
          {sourceFilename && (
            <Text className={styles.fileName} size={200}>
              <XlsxFileTypeIcon size={16} /> {sourceFilename}
              {worksheetName ? ` · Lembar: ${worksheetName}` : ""}
            </Text>
          )}
        </div>

        {headers.length > 0 && (
          <>
            <div className={styles.mappingGrid}>
              {(Object.keys(FIELD_LABELS) as ImportField[]).map((field) => (
                <Field
                  key={field}
                  label={`${FIELD_LABELS[field]}${field === "assetName" || field === "quantity" ? " *" : ""}`}
                >
                  <Dropdown
                    value={
                      mapping[field] === null
                        ? "Tidak digunakan"
                        : headers[mapping[field] as number] || "Kolom dipilih"
                    }
                    selectedOptions={[
                      mapping[field] === null
                        ? "none"
                        : String(mapping[field]),
                    ]}
                    onOptionSelect={(_, data) => {
                      const index =
                        data.optionValue === "none"
                          ? null
                          : Number(data.optionValue)
                      setMapping((current) => ({
                        ...current,
                        [field]: Number.isInteger(index) ? index : null,
                      }))
                    }}
                  >
                    <Option value="none" text="Tidak digunakan">
                      Tidak digunakan
                    </Option>
                    {headers.map((header, index) => (
                      <Option key={`${index}-${header}`} value={String(index)} text={header || `Kolom ${index + 1}`}>
                        {header || `Kolom ${index + 1}`}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
              ))}
            </div>

            <div className={styles.detailHeading}>
              <Text weight="semibold">Pratinjau {previewRows.length} baris</Text>
              <Text size={200}>
                {invalidRows.length
                  ? `${invalidRows.length} baris perlu diperbaiki lewat pemetaan kolom atau file sumber.`
                  : "Semua baris lolos validasi."}
              </Text>
            </div>
            <div className={styles.tableShell}>
              <DataGrid
                aria-label="Pratinjau data Excel"
                items={previewRows.slice(0, 10)}
                columns={previewColumns}
                getRowId={(item) => String(item.sourceRowNumber)}
                className={styles.dataGrid}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<PreviewRow>>
                  {({ item, rowId }) => (
                    <DataGridRow<PreviewRow> key={rowId}>
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
            {previewRows.length > 10 && (
              <Text size={200}>
                Menampilkan 10 baris pertama; semua {previewRows.length} baris
                diperiksa sebelum disimpan.
              </Text>
            )}
            <div className={styles.toolbar}>
              <Button
                appearance="primary"
                disabled={!canSave}
                onClick={() => void saveImport()}
              >
                {saving ? <Spinner size="tiny" /> : "Simpan sebagai belum dialokasikan"}
              </Button>
              <Text size={200}>
                Maksimal 2.000 baris per impor. File diproses di browser; hanya
                data hasil pemetaan yang disimpan ke SQLite lokal.
              </Text>
            </div>
          </>
        )}
      </section>

      <section className={styles.section} aria-labelledby="import-history-title">
        <div className={styles.detailHeading}>
          <Text id="import-history-title" as="h2" size={500} weight="semibold">
            Data impor tersimpan
          </Text>
          <div className={styles.toolbar}>
            <Badge appearance="outline" color="informative">
              Belum dialokasikan
            </Badge>
            <Button
              appearance="subtle"
              size="small"
              disabled={loading}
              onClick={() => void loadBatches(selectedBatchId ?? undefined)}
            >
              Muat ulang
            </Button>
          </div>
        </div>
        {loadError && (
          <MessageBar intent="error">
            <MessageBarBody>{loadError}</MessageBarBody>
          </MessageBar>
        )}
        {loading ? (
          <div role="status"><Spinner label="Memuat impor Excel…" /></div>
        ) : batches.length === 0 ? (
          <Text className={styles.emptyState} role="status">
            Belum ada data impor. Pilih file Excel untuk menyiapkan daftar aset.
          </Text>
        ) : (
          <div className={styles.batchLayout}>
            <div className={styles.batchList} aria-label="Daftar impor Excel">
              {batches.map((batch) => (
                <Button
                  key={batch.id}
                  appearance={batch.id === selectedBatchId ? "secondary" : "subtle"}
                  className={styles.batchButton}
                  aria-pressed={batch.id === selectedBatchId}
                  onClick={() => void selectBatch(batch.id)}
                >
                  <Text className={styles.batchFilename} weight="semibold">
                    {batch.sourceFilename}
                  </Text>
                  <Text size={200}>
                    {batch.rowCount.toLocaleString("id-ID")} baris ·{" "}
                    {batch.createdByUsername} ·{" "}
                    {dateFormatter.format(new Date(batch.createdAt))}
                  </Text>
                </Button>
              ))}
            </div>
            <div className={styles.section}>
              <div className={styles.detailHeading}>
                <Text weight="semibold">
                  {selectedBatch?.sourceFilename ?? "Pilih impor"}
                </Text>
                <Text size={200}>{importedRows.length} baris</Text>
              </div>
              <div className={styles.tableShell}>
                <DataGrid
                  aria-label="Daftar aset belum dialokasikan"
                  items={importedRows}
                  columns={importedColumns}
                  getRowId={(item) => item.id}
                  className={styles.dataGrid}
                >
                  <DataGridHeader>
                    <DataGridRow>
                      {({ renderHeaderCell }) => (
                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                      )}
                    </DataGridRow>
                  </DataGridHeader>
                  <DataGridBody<ImportedRow>>
                    {({ item, rowId }) => (
                      <DataGridRow<ImportedRow> key={rowId}>
                        {({ renderCell }) => (
                          <DataGridCell>{renderCell(item)}</DataGridCell>
                        )}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
              </div>
              {selectedBatch && importedRows.length === 0 && (
                <Text className={styles.emptyState} role="status">
                  Tidak ada baris pada impor ini.
                </Text>
              )}
            </div>
          </div>
        )}
        <div
          className={styles.fetchLog}
          aria-labelledby="asset-import-fetch-log-title"
        >
          <div className={styles.fetchLogHeader}>
            <Text
              id="asset-import-fetch-log-title"
              size={200}
              weight="semibold"
            >
              Log fetch
            </Text>
            <Tooltip
              content={fetchLogCopied ? "Log berhasil disalin" : "Salin log"}
              relationship="description"
            >
              <Button
                appearance="subtle"
                className={styles.copyButton}
                icon={
                  copyButtonHovered ? (
                    <CopyFilled aria-hidden="true" />
                  ) : (
                    <CopyRegular aria-hidden="true" />
                  )
                }
                disabled={fetchLog.length === 0}
                aria-label={
                  fetchLogCopied
                    ? "Log tersalin ke clipboard"
                    : "Salin log ke clipboard"
                }
                onMouseEnter={() => setCopyButtonHovered(true)}
                onMouseLeave={() => setCopyButtonHovered(false)}
                onFocus={() => setCopyButtonHovered(true)}
                onBlur={() => setCopyButtonHovered(false)}
                onClick={() => void copyFetchLog()}
              />
            </Tooltip>
          </div>
          {fetchLog.length > 0 ? (
            <ol
              ref={fetchLogListRef}
              className={styles.fetchLogList}
              aria-label="Log permintaan impor Excel"
            >
              {fetchLog.map((entry) => (
                <li key={entry.id} className={styles.fetchLogLine}>
                  {entry.durationMs} ms {entry.method} {entry.endpoint}{" "}
                  {entry.status} · {entry.result}
                </li>
              ))}
            </ol>
          ) : (
            <Text className={styles.fetchLogLine} size={200} role="status">
              Belum ada permintaan fetch.
            </Text>
          )}
          {fetchLogCopyMessage && (
            <Text size={200} role="status">
              {fetchLogCopyMessage}
            </Text>
          )}
          {fetchLogCopyError && (
            <Text
              size={200}
              role="alert"
              style={{ color: tokens.colorPaletteRedForeground1 }}
            >
              {fetchLogCopyError}
            </Text>
          )}
        </div>
      </section>
    </div>
  )
}

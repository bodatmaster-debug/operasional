"use client"

import * as React from "react"
import { Blur } from "@fluentui/react-motion-components-preview"
import {
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
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
  MessageBarActions,
  MessageBarBody,
  Option,
  Spinner,
  TeachingPopover,
  TeachingPopoverBody,
  TeachingPopoverCarousel,
  TeachingPopoverCarouselCard,
  TeachingPopoverCarouselFooter,
  TeachingPopoverCarouselNav,
  TeachingPopoverCarouselNavButton,
  TeachingPopoverHeader,
  TeachingPopoverSurface,
  TeachingPopoverTitle,
  TeachingPopoverTrigger,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import { InfoRegular } from "@fluentui/react-icons"
import {
  isAssetCondition,
  type AssetConditionValue,
} from "@/lib/asset-condition"
import { AssetConditionSelect } from "@/components/asset-condition-select"
import type {
  SortDirection,
  TableColumnDefinition,
  TableColumnId,
} from "@fluentui/react-components"
import {
  ASSET_CATEGORIES,
  type AssetCategory,
} from "@/lib/asset-catalog"
import type { SppgDirectoryRecord } from "@/lib/directory-types"

type NonJuknisAssetRecord = {
  id: string
  sppg_id: string
  category: AssetCategory
  item_name: string
  asset_type: string
  asset_brand: string
  quantity: number
  asset_condition: AssetConditionValue
  actual_unit?: string | null
  acuan_quantity?: number | null
  acuan_unit?: string | null
  surat_edaran_number?: string
  surat_edaran_year?: number
  created_at: string
  updated_at: string
}

type AssetManagementMode = "non-juknis" | "surat-edaran"

type SortState = {
  sortColumn: TableColumnId | undefined
  sortDirection: SortDirection
}

type Props = {
  sppgs: SppgDirectoryRecord[]
  selectedSppgId: string
  directoryLoading: boolean
  directoryError: string
  canManage: boolean
  onSelectSppg: (id: string) => void
}

type ManagementProps = Props & {
  mode: AssetManagementMode
}

const PAGE_SIZE = 5

const useStyles = makeStyles({
  view: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
  },
  header: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  toolbar: {
    display: "flex",
    minWidth: 0,
    alignItems: "end",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  controls: {
    display: "flex",
    flex: "1 1 320px",
    minWidth: 0,
    alignItems: "end",
    flexWrap: "wrap",
    gap: "12px",
  },
  sppgField: {
    flex: "1 1 280px",
    minWidth: 0,
    maxWidth: "420px",
  },
  addButton: {
    whiteSpace: "nowrap",
  },
  tableContainer: {
    minWidth: 0,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  tableShell: {
    minWidth: 0,
    overflow: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  dataGrid: {
    width: "100%",
    minWidth: "1150px",
    "& [role='columnheader']:nth-of-type(1), & [role='gridcell']:nth-of-type(1)": {
      flex: "0 0 170px",
    },
    "& [role='columnheader']:nth-of-type(2), & [role='gridcell']:nth-of-type(2)": {
      flex: "1 1 240px",
      minWidth: "200px",
    },
    "& [role='columnheader']:nth-of-type(3), & [role='gridcell']:nth-of-type(3)": {
      flex: "0 0 160px",
    },
    "& [role='columnheader']:nth-of-type(4), & [role='gridcell']:nth-of-type(4)": {
      flex: "0 0 160px",
    },
    "& [role='columnheader']:nth-of-type(5), & [role='gridcell']:nth-of-type(5)": {
      flex: "0 0 110px",
    },
    "& [role='columnheader']:nth-of-type(6), & [role='gridcell']:nth-of-type(6)": {
      flex: "0 0 170px",
    },
    "& [role='columnheader']:nth-of-type(7), & [role='gridcell']:nth-of-type(7)": {
      flex: "0 0 140px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(7) > div": {
      justifyContent: "flex-end",
    },
  },
  suratEdaranDataGrid: {
    minWidth: "1750px",
    "& [role='columnheader']:nth-of-type(5), & [role='gridcell']:nth-of-type(5)": {
      flex: "0 0 220px",
    },
    "& [role='columnheader']:nth-of-type(6), & [role='gridcell']:nth-of-type(6)": {
      flex: "0 0 90px",
      justifyContent: "flex-start",
    },
    "& [role='columnheader']:nth-of-type(6) > div": {
      justifyContent: "flex-start",
    },
    "& [role='columnheader']:nth-of-type(7), & [role='gridcell']:nth-of-type(7)": {
      flex: "0 0 125px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(7) > div": {
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(8), & [role='gridcell']:nth-of-type(8)": {
      flex: "0 0 140px",
    },
    "& [role='columnheader']:nth-of-type(9), & [role='gridcell']:nth-of-type(9)": {
      flex: "0 0 140px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(9) > div": {
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(10), & [role='gridcell']:nth-of-type(10)": {
      flex: "0 0 170px",
    },
    "& [role='columnheader']:nth-of-type(11), & [role='gridcell']:nth-of-type(11)": {
      flex: "0 0 150px",
    },
  },
  tableHeader: {
    position: "sticky",
    top: 0,
    zIndex: 2,
  },
  headerCell: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  itemCell: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2,
    overflowWrap: "anywhere",
  },
  actionCell: {
    display: "flex",
    width: "100%",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "4px",
  },
  status: {
    display: "grid",
    minHeight: "160px",
    placeItems: "center",
    gap: "8px",
    padding: "28px",
    textAlign: "center",
  },
  summary: {
    minWidth: 0,
    color: tokens.colorNeutralForeground2,
  },
  pagination: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "8px 16px",
    padding: "8px 12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  paginationControls: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  paginationSummary: {
    color: tokens.colorNeutralForeground2,
  },
  dialogSurface: {
    width: "min(560px, calc(100vw - 32px))",
    maxWidth: "560px",
  },
  dialogContent: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    paddingBlock: "4px",
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "12px",
    },
  },
  teachingSurface: {
    width: "min(420px, calc(100vw - 32px))",
    maxWidth: "420px",
  },
  teachingCard: {
    minHeight: "170px",
  },
  assetHelpRow: {
    display: "inline-flex",
    gridColumn: "1 / -1",
    alignItems: "center",
    gap: "4px",
  },
  assetHelpIcon: {
    display: "grid",
    flexShrink: 0,
    width: "20px",
    height: "20px",
    placeItems: "center",
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  assetHelpTrigger: {
    minWidth: 0,
    minHeight: "20px",
    height: "20px",
    padding: 0,
    color: tokens.colorBrandForeground2,
    fontSize: tokens.fontSizeBase200,
    lineHeight: tokens.lineHeightBase300,
    textDecorationLine: "none",
    textUnderlineOffset: "2px",
    ":hover": {
      textDecorationLine: "underline",
    },
  },
  assetHelpContent: {
    display: "grid",
    minWidth: 0,
    gap: "12px",
  },
  assetExampleWindow: {
    display: "flex",
    alignItems: "center",
    width: "min(100%, 260px)",
    height: "72px",
    minWidth: 0,
    overflow: "hidden",
    padding: "0 16px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  assetExampleValue: {
    color: tokens.colorNeutralForeground1,
    fontSize: "32px",
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: "40px",
    whiteSpace: "nowrap",
    transform: "scale(1.45)",
    transformOrigin: "left center",
  },
  assetHelpDescription: {
    color: tokens.colorNeutralForegroundOnBrand,
    lineHeight: tokens.lineHeightBase300,
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
})

function isAssetCategory(value: unknown): value is AssetCategory {
  return (
    typeof value === "string" &&
    ASSET_CATEGORIES.some((category) => category === value)
  )
}

function isRecordBase(value: unknown): value is NonJuknisAssetRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "sppg_id" in value &&
    typeof value.sppg_id === "string" &&
    "category" in value &&
    isAssetCategory(value.category) &&
    "item_name" in value &&
    typeof value.item_name === "string" &&
    "asset_type" in value &&
    typeof value.asset_type === "string" &&
    "asset_brand" in value &&
    typeof value.asset_brand === "string" &&
    "asset_condition" in value &&
    isAssetCondition(value.asset_condition) &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  )
}

function isRecord(
  value: unknown,
  mode: AssetManagementMode,
): value is NonJuknisAssetRecord {
  if (!isRecordBase(value)) return false
  if (mode !== "surat-edaran") return true

  const hasNoReferenceValue =
    value.acuan_quantity === null && value.acuan_unit === null
  const hasReferenceValue =
    typeof value.acuan_quantity === "number" &&
    Number.isSafeInteger(value.acuan_quantity) &&
    value.acuan_quantity >= 0 &&
    value.acuan_quantity <= 1_000_000 &&
    typeof value.acuan_unit === "string" &&
    value.acuan_unit.trim().length > 0 &&
    value.acuan_unit.trim().length <= 100

  return (
    typeof value.surat_edaran_number === "string" &&
    typeof value.surat_edaran_year === "number" &&
    Number.isSafeInteger(value.surat_edaran_year) &&
    value.surat_edaran_year >= 1 &&
    value.surat_edaran_year <= 9999 &&
    "actual_unit" in value &&
    typeof value.actual_unit === "string" &&
    value.actual_unit.length <= 100 &&
    "acuan_quantity" in value &&
    "acuan_unit" in value &&
    (hasNoReferenceValue || hasReferenceValue)
  )
}

async function errorFromResponse(response: Response, fallback: string) {
  const payload: unknown = await response.json().catch(() => null)
  if (
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error
  }
  return fallback
}

function createColumns(
  onEdit: (record: NonJuknisAssetRecord) => void,
  onDelete: (record: NonJuknisAssetRecord) => void,
  onConditionSaved: (
    record: NonJuknisAssetRecord,
    condition: AssetConditionValue,
  ) => void,
  mode: AssetManagementMode,
  canManage: boolean,
  disabled: boolean,
  styles: ReturnType<typeof useStyles>,
): TableColumnDefinition<NonJuknisAssetRecord>[] {
  const columns: TableColumnDefinition<NonJuknisAssetRecord>[] = [
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "category",
      compare: (a, b) => a.category.localeCompare(b.category, "id"),
      renderHeaderCell: () => "Kategori",
      renderCell: (record) => <Text>{record.category}</Text>,
    }),
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "name",
      compare: (a, b) => a.item_name.localeCompare(b.item_name, "id"),
      renderHeaderCell: () => "Nama barang",
      renderCell: (record) => (
        <div className={styles.itemCell}>
          <Text weight="semibold">{record.item_name}</Text>
        </div>
      ),
    }),
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "type",
      compare: (a, b) => a.asset_type.localeCompare(b.asset_type, "id"),
      renderHeaderCell: () => "Tipe",
      renderCell: (record) => <Text>{record.asset_type}</Text>,
    }),
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "brand",
      compare: (a, b) => a.asset_brand.localeCompare(b.asset_brand, "id"),
      renderHeaderCell: () => "Merek",
      renderCell: (record) => <Text>{record.asset_brand}</Text>,
    }),
    ...(mode === "surat-edaran"
      ? [
          createTableColumn<NonJuknisAssetRecord>({
            columnId: "suratEdaranNumber",
            compare: (a, b) =>
              (a.surat_edaran_number ?? "").localeCompare(
                b.surat_edaran_number ?? "",
                "id",
              ),
            renderHeaderCell: () => "Nomor Surat Edaran",
            renderCell: (record) => (
              <Text>{record.surat_edaran_number}</Text>
            ),
          }),
          createTableColumn<NonJuknisAssetRecord>({
            columnId: "suratEdaranYear",
            compare: (a, b) =>
              (a.surat_edaran_year ?? 0) - (b.surat_edaran_year ?? 0),
            renderHeaderCell: () => "Tahun",
            renderCell: (record) => (
              <Text>{record.surat_edaran_year}</Text>
            ),
          }),
          createTableColumn<NonJuknisAssetRecord>({
            columnId: "acuanQuantity",
            compare: (a, b) =>
              (a.acuan_quantity ?? -1) - (b.acuan_quantity ?? -1),
            renderHeaderCell: () => "Jumlah acuan",
            renderCell: (record) => (
              <Text>
                {record.acuan_quantity === null ||
                record.acuan_quantity === undefined
                  ? "Belum diisi"
                  : new Intl.NumberFormat("id-ID").format(
                      record.acuan_quantity,
                    )}
              </Text>
            ),
          }),
          createTableColumn<NonJuknisAssetRecord>({
            columnId: "acuanUnit",
            compare: (a, b) =>
              (a.acuan_unit ?? "").localeCompare(b.acuan_unit ?? "", "id"),
            renderHeaderCell: () => "Satuan acuan",
            renderCell: (record) => (
              <Text>{record.acuan_unit ?? "Belum diisi"}</Text>
            ),
          }),
        ]
      : []),
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "quantity",
      compare: (a, b) => a.quantity - b.quantity,
      renderHeaderCell: () =>
        mode === "surat-edaran" ? "Jumlah aktual" : "Jumlah",
      renderCell: (record) => (
        <Text>
          {new Intl.NumberFormat("id-ID").format(record.quantity)}
          {mode === "surat-edaran"
            ? ` ${record.actual_unit?.trim() || "(satuan belum diisi)"}`
            : ""}
        </Text>
      ),
    }),
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "condition",
      compare: (a, b) =>
        (a.asset_condition ?? "").localeCompare(
          b.asset_condition ?? "",
          "id",
        ),
      renderHeaderCell: () => "Kondisi aset",
      renderCell: (record) => (
        <AssetConditionSelect
          source={mode === "surat-edaran" ? "surat-edaran" : "non-juknis"}
          recordId={record.id}
          sppgId={record.sppg_id}
          assetName={record.item_name}
          value={record.asset_condition}
          canManage={canManage}
          onSaved={(condition) => onConditionSaved(record, condition)}
        />
      ),
    }),
    createTableColumn<NonJuknisAssetRecord>({
      columnId: "actions",
      compare: () => 0,
      renderHeaderCell: () => "Tindakan",
      renderCell: (record) =>
        canManage ? (
          <div className={styles.actionCell}>
            <Button
              appearance="outline"
              size="small"
              disabled={disabled}
              onClick={() => onEdit(record)}
            >
              Ubah
            </Button>
            <Button
              appearance="subtle"
              size="small"
              disabled={disabled}
              onClick={() => onDelete(record)}
            >
              Hapus
            </Button>
          </div>
        ) : null,
    }),
  ]
  return columns
}

function getAssetHelpAnnouncement(value: string) {
  return value === "1"
    ? "Contoh tipe aset, langkah 1 dari 2"
    : "Contoh merek aset, langkah 2 dari 2"
}

function ManualAssetManagement({
  sppgs,
  selectedSppgId,
  directoryLoading,
  directoryError,
  canManage,
  onSelectSppg,
  mode,
}: ManagementProps) {
  const styles = useStyles()
  const isSuratEdaran = mode === "surat-edaran"
  const apiPath = isSuratEdaran
    ? "/api/surat-edaran-assets"
    : "/api/non-juknis-assets"
  const assetLabel = isSuratEdaran ? "aset Surat Edaran" : "peralatan non-juknis"
  const addLabel = isSuratEdaran ? "Tambah aset Surat Edaran" : "Tambah peralatan"
  const selectedSppg = sppgs.find((sppg) => sppg.id === selectedSppgId)
  const [records, setRecords] = React.useState<NonJuknisAssetRecord[]>([])
  const [recordsSppgId, setRecordsSppgId] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const [refreshCount, setRefreshCount] = React.useState(0)
  const [sortState, setSortState] = React.useState<SortState>({
    sortColumn: undefined,
    sortDirection: "ascending",
  })
  const [pageIndex, setPageIndex] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [category, setCategory] = React.useState<AssetCategory | "">("")
  const [itemName, setItemName] = React.useState("")
  const [assetType, setAssetType] = React.useState("")
  const [assetBrand, setAssetBrand] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [actualUnit, setActualUnit] = React.useState("")
  const [acuanQuantity, setAcuanQuantity] = React.useState("")
  const [acuanUnit, setAcuanUnit] = React.useState("")
  const [suratEdaranNumber, setSuratEdaranNumber] = React.useState("")
  const [suratEdaranYear, setSuratEdaranYear] = React.useState("")
  const [saveError, setSaveError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] =
    React.useState<NonJuknisAssetRecord | null>(null)
  const [deleteError, setDeleteError] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)
  const numericQuantity = Number(quantity)
  const numericAcuanQuantity = Number(acuanQuantity)
  const numericSuratEdaranYear = Number(suratEdaranYear)
  const quantityIsValid =
    quantity.trim() !== "" &&
    Number.isSafeInteger(numericQuantity) &&
    numericQuantity >= 0 &&
    numericQuantity <= 1_000_000
  const acuanReferenceIsValid =
    !isSuratEdaran ||
    (acuanQuantity.trim() !== "" &&
      Number.isSafeInteger(numericAcuanQuantity) &&
      numericAcuanQuantity >= 0 &&
      numericAcuanQuantity <= 1_000_000 &&
      acuanUnit.trim() !== "" &&
      acuanUnit.trim().length <= 100)
  const actualUnitIsValid =
    !isSuratEdaran ||
    (actualUnit.trim() !== "" && actualUnit.trim().length <= 100)
  const suratEdaranCitationIsValid =
    !isSuratEdaran ||
    (suratEdaranNumber.trim() !== "" &&
      suratEdaranNumber.trim().length <= 120 &&
      suratEdaranYear.trim() !== "" &&
      Number.isSafeInteger(numericSuratEdaranYear) &&
      numericSuratEdaranYear >= 1 &&
      numericSuratEdaranYear <= 9999)

  const openEditDialog = React.useCallback(
    (record: NonJuknisAssetRecord) => {
      setEditingId(record.id)
      setCategory(record.category)
      setItemName(record.item_name)
      setAssetType(record.asset_type)
      setAssetBrand(record.asset_brand)
      setQuantity(String(record.quantity))
      setActualUnit(record.actual_unit ?? "")
      setAcuanQuantity(
        record.acuan_quantity == null ? "" : String(record.acuan_quantity),
      )
      setAcuanUnit(record.acuan_unit ?? "")
      setSuratEdaranNumber(record.surat_edaran_number ?? "")
      setSuratEdaranYear(
        record.surat_edaran_year === undefined
          ? ""
          : String(record.surat_edaran_year),
      )
      setSaveError("")
      setDialogOpen(true)
    },
    [],
  )

  React.useEffect(() => {
    if (!selectedSppgId) return

    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setLoadError("")
      try {
        const response = await fetch(
          `${apiPath}?sppgId=${encodeURIComponent(selectedSppgId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        if (!response.ok) {
          throw new Error(
            await errorFromResponse(
              response,
              `Catatan ${assetLabel} gagal dimuat.`,
            ),
          )
        }

        const payload: unknown = await response.json().catch(() => null)
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("records" in payload) ||
          !Array.isArray(payload.records) ||
          !payload.records.every((record: unknown) => isRecord(record, mode))
        ) {
          throw new Error(`Respons catatan ${assetLabel} tidak valid.`)
        }
        if (!controller.signal.aborted) {
          setRecords(payload.records)
          setRecordsSppgId(selectedSppgId)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : `Catatan ${assetLabel} gagal dimuat.`,
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [apiPath, assetLabel, mode, selectedSppgId, refreshCount])

  const visibleRecords = React.useMemo(
    () => (recordsSppgId === selectedSppgId ? records : []),
    [records, recordsSppgId, selectedSppgId],
  )
  const sortedRecords = React.useMemo(() => {
    const result = [...visibleRecords]
    if (sortState.sortColumn) {
      const direction = sortState.sortDirection === "ascending" ? 1 : -1
      const columns: Record<
        string,
        (record: NonJuknisAssetRecord) => string | number
      > = {
        category: (record) => record.category,
        name: (record) => record.item_name,
        type: (record) => record.asset_type,
        brand: (record) => record.asset_brand,
        suratEdaranNumber: (record) => record.surat_edaran_number ?? "",
        suratEdaranYear: (record) => record.surat_edaran_year ?? 0,
        acuanQuantity: (record) => record.acuan_quantity ?? -1,
        acuanUnit: (record) => record.acuan_unit ?? "",
        quantity: (record) => record.quantity,
        condition: (record) => record.asset_condition ?? "",
      }
      const getValue = columns[String(sortState.sortColumn)]
      if (getValue) {
        result.sort((left, right) => {
          const a = getValue(left)
          const b = getValue(right)
          return (
            (typeof a === "number" && typeof b === "number"
              ? a - b
              : String(a).localeCompare(String(b), "id")) * direction
          )
        })
      }
    }
    return result
  }, [visibleRecords, sortState])
  const pageCount = Math.max(1, Math.ceil(sortedRecords.length / PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)
  const pageRecords = sortedRecords.slice(
    currentPageIndex * PAGE_SIZE,
    (currentPageIndex + 1) * PAGE_SIZE,
  )
  const pageStart =
    sortedRecords.length === 0 ? 0 : currentPageIndex * PAGE_SIZE + 1
  const pageEnd = Math.min(
    (currentPageIndex + 1) * PAGE_SIZE,
    sortedRecords.length,
  )
  const busy = loading || saving || deleting
  const columns = React.useMemo(
    () =>
      createColumns(
        openEditDialog,
        (record) => {
          setDeleteTarget(record)
          setDeleteError("")
        },
        (record, condition) =>
          setRecords((current) =>
            current.map((currentRecord) =>
              currentRecord.id === record.id
                ? { ...currentRecord, asset_condition: condition }
                : currentRecord,
            ),
          ),
        mode,
        canManage,
        busy,
        styles,
      ),
    [canManage, busy, mode, openEditDialog, styles],
  )

  function resetForm() {
    setDialogOpen(false)
    setEditingId(null)
    setCategory("")
    setItemName("")
    setAssetType("")
    setAssetBrand("")
    setQuantity("")
    setActualUnit("")
    setAcuanQuantity("")
    setAcuanUnit("")
    setSuratEdaranNumber("")
    setSuratEdaranYear("")
    setSaveError("")
  }

  function openAddDialog() {
    setEditingId(null)
    setCategory("")
    setItemName("")
    setAssetType("")
    setAssetBrand("")
    setQuantity("")
    setActualUnit("")
    setAcuanQuantity("")
    setAcuanUnit("")
    setSuratEdaranNumber("")
    setSuratEdaranYear("")
    setSaveError("")
    setDialogOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (
      !selectedSppgId ||
      !category ||
      !itemName.trim() ||
      !assetType.trim() ||
      !assetBrand.trim() ||
      !quantityIsValid ||
      !actualUnitIsValid ||
      !acuanReferenceIsValid ||
      !suratEdaranCitationIsValid
    ) {
      setSaveError(
        isSuratEdaran
          ? "Lengkapi kategori, nama barang, tipe, merek, jumlah acuan dan satuannya, jumlah dan satuan aktual, nomor, serta tahun Surat Edaran."
          : "Lengkapi kategori, nama barang, tipe, merek, dan jumlah.",
      )
      return
    }

    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch(apiPath, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          sppgId: selectedSppgId,
          category,
          itemName: itemName.trim(),
          assetType: assetType.trim(),
          assetBrand: assetBrand.trim(),
          quantity: numericQuantity,
          ...(isSuratEdaran
            ? {
                actualUnit: actualUnit.trim(),
                acuanQuantity: numericAcuanQuantity,
                acuanUnit: acuanUnit.trim(),
                suratEdaranNumber: suratEdaranNumber.trim(),
                suratEdaranYear: numericSuratEdaranYear,
              }
            : {}),
        }),
      })
      if (!response.ok) {
        throw new Error(
          await errorFromResponse(
            response,
            `Catatan ${assetLabel} gagal disimpan.`,
          ),
        )
      }
      resetForm()
      setRefreshCount((count) => count + 1)
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : `Catatan ${assetLabel} gagal disimpan.`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError("")
    try {
      const params = new URLSearchParams({
        id: deleteTarget.id,
        sppgId: selectedSppgId,
      })
      const response = await fetch(`${apiPath}?${params}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        throw new Error(
          await errorFromResponse(
            response,
            `Catatan ${assetLabel} gagal dihapus.`,
          ),
        )
      }
      setDeleteTarget(null)
      setRefreshCount((count) => count + 1)
    } catch (error) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : `Catatan ${assetLabel} gagal dihapus.`,
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section
      className={styles.view}
      aria-label={isSuratEdaran ? "Aset Surat Edaran" : "Peralatan non-juknis"}
    >
      <header className={styles.header}>
        <Text size={400} weight="semibold">
          {isSuratEdaran ? "Aset Surat Edaran" : "Peralatan non juknis"}
        </Text>
        <Text size={200} className={styles.secondaryText}>
          {isSuratEdaran
            ? "Catat jumlah acuan sesuai Surat Edaran, jumlah aset yang dimiliki, serta nomor dan tahun dokumen. Aplikasi tidak otomatis menilai kecukupan atau kepatuhan."
            : "Catat aset di luar katalog. Data ini tidak dibandingkan dengan acuan atau validator juknis."}
        </Text>
      </header>

      {directoryError && (
        <MessageBar intent="error">
          <MessageBarBody>{directoryError}</MessageBarBody>
          <MessageBarActions>
            <Button appearance="subtle" onClick={() => window.location.reload()}>
              Muat ulang
            </Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <div className={styles.toolbar}>
        <div className={styles.controls}>
          <Field label="SPPG" className={styles.sppgField}>
            <Dropdown
              aria-label={
                isSuratEdaran
                  ? "SPPG untuk aset Surat Edaran"
                  : "SPPG untuk peralatan non-juknis"
              }
              placeholder={
                directoryLoading
                  ? "Memuat daftar SPPG…"
                  : sppgs.length === 0
                    ? "Belum ada SPPG"
                    : "Pilih SPPG"
              }
              value={selectedSppg?.nama ?? ""}
              selectedOptions={selectedSppgId ? [selectedSppgId] : []}
              disabled={
                directoryLoading || sppgs.length === 0 || Boolean(directoryError)
              }
              onOptionSelect={(_, data) => {
                if (typeof data.optionValue === "string") {
                  setPageIndex(0)
                  onSelectSppg(data.optionValue)
                }
              }}
            >
              {sppgs.map((sppg) => (
                <Option key={sppg.id} value={sppg.id} text={sppg.nama}>
                  {sppg.nama}
                </Option>
              ))}
            </Dropdown>
          </Field>
        </div>
        {canManage && (
          <Button
            appearance="primary"
            className={styles.addButton}
            disabled={
              !selectedSppgId ||
              directoryLoading ||
              loading ||
              saving ||
              deleting ||
              Boolean(loadError || directoryError)
            }
            onClick={openAddDialog}
          >
            {addLabel}
          </Button>
        )}
      </div>

      {!selectedSppgId && !directoryLoading && !directoryError && (
        <MessageBar intent="info">
          <MessageBarBody>
            Pilih SPPG untuk melihat atau mencatat {assetLabel}.
          </MessageBarBody>
        </MessageBar>
      )}
      {loadError && (
        <MessageBar intent="error">
          <MessageBarBody>{loadError}</MessageBarBody>
          <MessageBarActions>
            <Button
              appearance="subtle"
              onClick={() => setRefreshCount((count) => count + 1)}
            >
              Coba lagi
            </Button>
          </MessageBarActions>
        </MessageBar>
      )}

      <Text size={200} className={styles.summary} aria-live="polite">
        {loading
          ? `Memuat catatan ${assetLabel}…`
          : `${visibleRecords.length} ${isSuratEdaran ? "aset" : "peralatan"} tercatat${selectedSppg ? ` · ${selectedSppg.nama}` : ""}`}
      </Text>

      <div className={styles.tableContainer}>
        {loading || directoryLoading ? (
          <div className={styles.status} role="status">
            <Spinner label={`Memuat catatan ${assetLabel}`} />
          </div>
        ) : directoryError ? (
          <div className={styles.status} role="status">
            <Text weight="semibold">Daftar SPPG belum dapat dimuat</Text>
            <Text size={200} className={styles.secondaryText}>
              Periksa pesan kesalahan di atas, lalu muat ulang aplikasi.
            </Text>
          </div>
        ) : loadError ? (
          <div className={styles.status} role="status">
            <Text weight="semibold">Daftar belum dapat ditampilkan</Text>
            <Text size={200} className={styles.secondaryText}>
              Periksa pesan kesalahan, lalu coba muat ulang data.
            </Text>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className={styles.status} role="status">
            <Text weight="semibold">
              {`Belum ada ${isSuratEdaran ? "aset Surat Edaran" : "peralatan non-juknis"} yang dicatat`}
            </Text>
            <Text size={200} className={styles.secondaryText}>
              {canManage
                ? `Gunakan ${addLabel} untuk mencatat aset SPPG ini.`
                : `Catatan ${assetLabel} untuk SPPG ini belum tersedia.`}
            </Text>
          </div>
        ) : (
          <div className={styles.tableShell}>
            <DataGrid
              aria-label={`Daftar ${assetLabel}`}
              items={pageRecords}
              columns={columns}
              sortable
              sortState={sortState}
              onSortChange={(_, nextSortState) => {
                setSortState(nextSortState)
                setPageIndex(0)
              }}
              getRowId={(record) => record.id}
              focusMode="composite"
              className={
                isSuratEdaran
                  ? `${styles.dataGrid} ${styles.suratEdaranDataGrid}`
                  : styles.dataGrid
              }
            >
              <DataGridHeader className={styles.tableHeader}>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell className={styles.headerCell}>
                      {renderHeaderCell()}
                    </DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<NonJuknisAssetRecord>>
                {({ item, rowId }) => (
                  <DataGridRow<NonJuknisAssetRecord> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
        )}
        {sortedRecords.length > 0 && !loading && (
          <nav
            className={styles.pagination}
            aria-label={`Navigasi halaman ${assetLabel}`}
          >
            <Text
              size={200}
              className={styles.paginationSummary}
              aria-live="polite"
            >
              Menampilkan {pageStart}-{pageEnd} dari {sortedRecords.length} item
            </Text>
            <div className={styles.paginationControls}>
              <Button
                appearance="primary"
                size="small"
                disabled={currentPageIndex === 0}
                onClick={() =>
                  setPageIndex((current) => Math.max(0, current - 1))
                }
              >
                Sebelumnya
              </Button>
              <Text size={200} aria-live="polite">
                Halaman {currentPageIndex + 1} dari {pageCount}
              </Text>
              <Button
                appearance="primary"
                size="small"
                disabled={currentPageIndex === pageCount - 1}
                onClick={() =>
                  setPageIndex((current) =>
                    Math.min(pageCount - 1, current + 1),
                  )
                }
              >
                Berikutnya
              </Button>
            </div>
          </nav>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open && !saving) resetForm()
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <DialogTitle>
                {editingId
                  ? `Ubah ${assetLabel}`
                  : `Tambah ${assetLabel}`}
              </DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <Field label="Kategori" required>
                  <Dropdown
                    aria-label={`Kategori ${assetLabel}`}
                    placeholder="Pilih kategori"
                    value={category}
                    selectedOptions={category ? [category] : []}
                    disabled={saving}
                    onOptionSelect={(_, data) => {
                      const selected = ASSET_CATEGORIES.find(
                        (candidate) => candidate === data.optionValue,
                      )
                      if (selected) setCategory(selected)
                    }}
                  >
                    {ASSET_CATEGORIES.map((item) => (
                      <Option key={item} value={item} text={item}>
                        {item}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                <Field label="Nama barang" required>
                  <Input
                    autoFocus
                    aria-label={`Nama barang ${assetLabel}`}
                    maxLength={100}
                    required
                    value={itemName}
                    disabled={saving}
                    onChange={(_, data) => setItemName(data.value)}
                  />
                </Field>
                <Field label="Tipe" required>
                  <Input
                    aria-label={`Tipe ${assetLabel}`}
                    maxLength={100}
                    required
                    value={assetType}
                    disabled={saving}
                    onChange={(_, data) => setAssetType(data.value)}
                  />
                </Field>
                <Field label="Merek" required>
                  <Input
                    aria-label={`Merek ${assetLabel}`}
                    maxLength={100}
                    required
                    value={assetBrand}
                    disabled={saving}
                    onChange={(_, data) => setAssetBrand(data.value)}
                  />
                </Field>
                <TeachingPopover appearance="brand">
                  <div className={styles.assetHelpRow}>
                    <span className={styles.assetHelpIcon}>
                      <InfoRegular aria-hidden="true" />
                    </span>
                    <TeachingPopoverTrigger>
                      <Button
                        type="button"
                        appearance="transparent"
                        className={styles.assetHelpTrigger}
                      >
                        Klik untuk bantuan
                      </Button>
                    </TeachingPopoverTrigger>
                  </div>
                  <TeachingPopoverSurface className={styles.teachingSurface}>
                    <TeachingPopoverHeader>
                      Panduan tipe dan merek aset
                    </TeachingPopoverHeader>
                    <TeachingPopoverCarousel
                      defaultValue="1"
                      announcement={getAssetHelpAnnouncement}
                    >
                      <TeachingPopoverCarouselCard
                        value="1"
                        className={styles.teachingCard}
                      >
                        <TeachingPopoverBody>
                          <div className={styles.assetHelpContent}>
                            <TeachingPopoverTitle>
                              Tipe aset
                            </TeachingPopoverTitle>
                            <div
                              className={styles.assetExampleWindow}
                              role="img"
                              aria-label="Contoh tipe aset AB-108-R"
                            >
                              <Blur.In>
                                <Text className={styles.assetExampleValue}>
                                  AB-108-R
                                </Text>
                              </Blur.In>
                            </div>
                            <Text
                              size={200}
                              className={styles.assetHelpDescription}
                            >
                              Catat tipe atau kode model yang tertera pada aset.
                              Contoh: AB-108-R.
                            </Text>
                          </div>
                        </TeachingPopoverBody>
                      </TeachingPopoverCarouselCard>
                      <TeachingPopoverCarouselCard
                        value="2"
                        className={styles.teachingCard}
                      >
                        <TeachingPopoverBody>
                          <div className={styles.assetHelpContent}>
                            <TeachingPopoverTitle>
                              Merek aset
                            </TeachingPopoverTitle>
                            <div
                              className={styles.assetExampleWindow}
                              role="img"
                              aria-label="Contoh merek aset GEA"
                            >
                              <Blur.In>
                                <Text className={styles.assetExampleValue}>
                                  GEA
                                </Text>
                              </Blur.In>
                            </div>
                            <Text
                              size={200}
                              className={styles.assetHelpDescription}
                            >
                              Catat merek yang tertera pada aset. Contoh: GEA.
                            </Text>
                          </div>
                        </TeachingPopoverBody>
                      </TeachingPopoverCarouselCard>
                      <TeachingPopoverCarouselFooter
                        next="Berikutnya"
                        previous="Sebelumnya"
                        initialStepText="Tutup"
                        finalStepText="Selesai"
                      >
                        <TeachingPopoverCarouselNav>
                          {() => <TeachingPopoverCarouselNavButton />}
                        </TeachingPopoverCarouselNav>
                      </TeachingPopoverCarouselFooter>
                    </TeachingPopoverCarousel>
                  </TeachingPopoverSurface>
                </TeachingPopover>
                {isSuratEdaran && (
                  <>
                    <Field label="Nomor Surat Edaran" required>
                      <Input
                        aria-label="Nomor Surat Edaran"
                        maxLength={120}
                        required
                        value={suratEdaranNumber}
                        disabled={saving}
                        onChange={(_, data) =>
                          setSuratEdaranNumber(data.value)
                        }
                      />
                    </Field>
                    <Field label="Tahun" required>
                      <Input
                        aria-label="Tahun Surat Edaran"
                        type="number"
                        min={1}
                        max={9999}
                        step={1}
                        required
                        value={suratEdaranYear}
                        disabled={saving}
                        onChange={(_, data) =>
                          setSuratEdaranYear(data.value)
                        }
                      />
                    </Field>
                    <Field label="Jumlah acuan" required>
                      <Input
                        aria-label="Jumlah acuan Surat Edaran"
                        type="number"
                        min={0}
                        max={1_000_000}
                        step={1}
                        required
                        value={acuanQuantity}
                        disabled={saving}
                        onChange={(_, data) =>
                          setAcuanQuantity(data.value)
                        }
                      />
                    </Field>
                    <Field label="Satuan acuan" required>
                      <Input
                        aria-label="Satuan acuan Surat Edaran"
                        maxLength={100}
                        placeholder="Sesuai dokumen"
                        required
                        value={acuanUnit}
                        disabled={saving}
                        onChange={(_, data) => setAcuanUnit(data.value)}
                      />
                    </Field>
                    <Field
                      label="Satuan jumlah aktual"
                      required
                      className={styles.fullWidth}
                    >
                      <Input
                        aria-label="Satuan jumlah aset aktual"
                        maxLength={100}
                        placeholder="Sesuai satuan yang dicatat"
                        required
                        value={actualUnit}
                        disabled={saving}
                        onChange={(_, data) => setActualUnit(data.value)}
                      />
                    </Field>
                  </>
                )}
                <Field
                  label={isSuratEdaran ? "Jumlah aset" : "Jumlah"}
                  required
                  className={styles.fullWidth}
                >
                  <Input
                    aria-label={`Jumlah ${assetLabel}`}
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    required
                    value={quantity}
                    disabled={saving}
                    onChange={(_, data) => setQuantity(data.value)}
                  />
                </Field>
                {saveError && (
                  <MessageBar
                    intent="error"
                    className={styles.fullWidth}
                  >
                    <MessageBarBody>{saveError}</MessageBarBody>
                  </MessageBar>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={saving}
                  onClick={resetForm}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={
                    !selectedSppgId ||
                    saving ||
                    loading ||
                    !category ||
                    !itemName.trim() ||
                    !assetType.trim() ||
                    !assetBrand.trim() ||
                    !quantityIsValid ||
                    !acuanReferenceIsValid ||
                    !suratEdaranCitationIsValid
                  }
                  aria-busy={saving}
                >
                  {saving && <Spinner size="tiny" />}
                  {saving
                    ? "Menyimpan…"
                    : editingId
                      ? "Simpan perubahan"
                      : isSuratEdaran
                        ? "Simpan aset"
                        : "Simpan peralatan"}
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(_, data) => {
          if (!data.open && !deleting) {
            setDeleteTarget(null)
            setDeleteError("")
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody>
            <DialogTitle>
              Hapus catatan {isSuratEdaran ? "aset Surat Edaran" : "peralatan"}?
            </DialogTitle>
            <DialogContent className={styles.itemCell}>
              <Text>
                Catatan <strong>{deleteTarget?.item_name}</strong> akan dihapus
                dari SPPG ini.
              </Text>
              {deleteError && (
                <MessageBar intent="error">
                  <MessageBarBody>{deleteError}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                disabled={deleting}
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError("")
                }}
              >
                Batal
              </Button>
              <Button
                appearance="primary"
                disabled={deleting}
                onClick={() => void confirmDelete()}
                aria-busy={deleting}
              >
                {deleting && <Spinner size="tiny" />}
                {deleting ? "Menghapus…" : "Hapus catatan"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  )
}

export function NonJuknisAssetManagement(props: Props) {
  return <ManualAssetManagement {...props} mode="non-juknis" />
}

export function SuratEdaranAssetManagement(props: Props) {
  return <ManualAssetManagement {...props} mode="surat-edaran" />
}

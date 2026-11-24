"use client"

import * as React from "react"
import { Blur } from "@fluentui/react-motion-components-preview"
import {
  Badge,
  Button,
  Combobox,
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
  Field,
  Input,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  MessageBar,
  MessageBarBody,
  Option,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Spinner,
  Tab,
  TabList,
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
  Dropdown,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  CalendarRegular,
  DocumentPdfRegular,
  InfoRegular,
  MoreHorizontalRegular,
} from "@fluentui/react-icons"
import { Calendar } from "@fluentui/react-calendar-preview"
import type { CalendarDayHandle } from "@fluentui/react-calendar-preview"
import type { TableColumnDefinition } from "@fluentui/react-components"
import { isDateOnly, localDateString } from "@/lib/maintenance"
import { ASSET_CATEGORIES, assetCatalog } from "@/lib/asset-catalog"
import type { AssetCategory } from "@/lib/asset-categories"
import {
  isWarehouseAssetCategory,
  type WarehouseAssetCategory,
  type WarehouseAssetAllocation,
  type WarehouseAssetAllocationMovement,
  type WarehouseCompatibleAsset,
  type WarehouseItem,
  type WarehouseKind,
  type WarehouseMovement,
  type WarehouseSppg,
} from "@/lib/warehouse-types"
import type { LocalUser } from "@/lib/access-types"
import type { WarehouseHandoverDocumentData } from "./warehouse-handover-pdf"

type Props = { user: LocalUser; view: WarehouseView; kind: WarehouseKind }
type MovementType = "in" | "out"
type WarehouseView = "stock" | "allocations"
type AllocationAction = "allocate" | "transfer" | "return"
type AllocationLogTab = "incoming" | "mutations"
type AllocationReceipt = WarehouseHandoverDocumentData

const kindLabels: Record<WarehouseKind, string> = {
  asset: "Stok Aset",
  "spare-part": "Spare Part",
}

const assetCategoryOptions: {
  value: WarehouseAssetCategory
  label: string
  description: string
}[] = [
  {
    value: "juknis",
    label: "Item Juknis",
    description: "Aset dalam kategori Juknis",
  },
  {
    value: "non-juknis",
    label: "Item non-Juknis",
    description: "Aset di luar kategori Juknis",
  },
  {
    value: "surat-edaran",
    label: "Surat Edaran",
    description: "Aset dari Surat Edaran",
  },
]

const assetCategoryLabels: Record<WarehouseAssetCategory, string> = {
  juknis: "Item Juknis",
  "non-juknis": "Item non-Juknis",
  "surat-edaran": "Surat Edaran",
}

function getAssetHelpAnnouncement(value: string) {
  return value === "1"
    ? "Contoh tipe aset, langkah 1 dari 2"
    : "Contoh merek aset, langkah 2 dari 2"
}

const allocationDateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
})

function dateForPicker(value: string): Date | null {
  if (!isDateOnly(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function formatAllocationDate(value: string) {
  const date = dateForPicker(value)
  return date ? allocationDateFormatter.format(date) : value
}

function formatAllocationDateInput(value: string) {
  const date = dateForPicker(value)
  return date
    ? `${String(date.getDate()).padStart(2, "0")}/${String(
        date.getMonth() + 1,
      ).padStart(2, "0")}/${date.getFullYear()}`
    : ""
}

function parseAllocationDateInput(value: string) {
  if (isDateOnly(value)) return value
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return ""
  const date = `${match[3]}-${match[2]}-${match[1]}`
  return isDateOnly(date) ? date : ""
}

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

const useStyles = makeStyles({
  page: { display: "grid", gap: "16px", marginTop: "24px" },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  tableShell: {
    overflowX: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  grid: { minWidth: "540px" },
  wideGrid: { minWidth: "960px" },
  status: {
    display: "grid",
    minHeight: "180px",
    placeItems: "center",
    gap: "12px",
    padding: "32px",
    textAlign: "center",
  },
  sectionHeading: { marginTop: "24px", marginBottom: "12px" },
  dialogSurface: {
    width: "min(440px, calc(100vw - 32px))",
    maxHeight: "calc(100vh - 48px)",
  },
  itemDialogBody: {
    display: "grid",
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    width: "100%",
    height: "min(630px, calc(100vh - 96px))",
    minHeight: 0,
  },
  itemDialogContent: {
    minHeight: 0,
    overflowY: "auto",
    paddingBottom: "8px",
  },
  itemDialogActions: { justifyContent: "flex-end" },
  itemSaveButton: { minWidth: "120px", whiteSpace: "nowrap" },
  form: { display: "grid", gap: "12px" },
  sparePartStockSummary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    minHeight: "40px",
    padding: "8px 12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
  },
  assetSubcategoryDropdown: { width: "100%", minWidth: 0 },
  juknisCombobox: { width: "100%", minWidth: 0 },
  assetCategoryChoices: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  },
  assetCategoryButton: {
    width: "100%",
    minWidth: 0,
    minHeight: "76px",
    height: "auto",
    justifyContent: "flex-start",
    padding: "8px",
    textAlign: "left",
    whiteSpace: "normal",
  },
  assetCategoryButtonContent: {
    display: "grid",
    gap: "4px",
    justifyItems: "start",
    textAlign: "left",
    whiteSpace: "normal",
  },
  assetCategoryDescription: {
    opacity: 0.85,
    color: "inherit",
    whiteSpace: "normal",
  },
  juknisOption: { display: "grid", gap: "2px", minWidth: 0 },
  juknisOptionSource: {
    display: "block",
    color: tokens.colorNeutralForeground2,
    whiteSpace: "normal",
  },
  teachingSurface: {
    width: "min(420px, calc(100vw - 32px))",
    maxWidth: "420px",
  },
  teachingCard: { minHeight: "170px" },
  assetHelpRow: {
    display: "inline-flex",
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
    ":hover": { textDecorationLine: "underline" },
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
  rowActions: { display: "flex", flexWrap: "wrap", gap: "8px" },
  allocationDialogSurface: {
    width: "min(860px, calc(100vw - 32px))",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100dvh - 32px)",
  },
  allocationDialogBody: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gridTemplateRows: "auto minmax(0, 1fr)",
    width: "100%",
    minHeight: 0,
    maxHeight: "calc(100dvh - 48px)",
  },
  allocationForm: {
    display: "grid",
    gridTemplateRows: "minmax(0, 1fr) auto",
    rowGap: "12px",
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    height: "100%",
  },
  allocationDialogContent: {
    display: "grid",
    gap: "16px",
    width: "100%",
    minWidth: 0,
    minHeight: 0,
    overflowY: "auto",
  },
  allocationColumns: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignContent: "start",
    columnGap: "48px",
    rowGap: "16px",
    minWidth: 0,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  allocationSelectionRow: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    columnGap: "48px",
    minWidth: 0,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  allocationItemPreview: {
    display: "grid",
    alignContent: "center",
    alignSelf: "end",
    minHeight: "31.6px",
    padding: "8px 12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  allocationColumnDivider: {
    position: "absolute",
    insetBlock: 0,
    insetInlineStart: "50%",
    width: "1px",
    backgroundColor: tokens.colorNeutralStroke2,
    "@media (max-width: 720px)": {
      display: "none",
    },
  },
  allocationItemSummary: {
    display: "grid",
    gap: "4px",
  },
  allocationCalendarButton: {
    minWidth: "32px",
    paddingInline: "6px",
  },
  allocationReceiptSummary: {
    display: "grid",
    gap: "8px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  allocationReceiptActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  },
  allocationDialogActions: { justifyContent: "flex-end" },
  error: { marginBottom: "16px" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "8px" },
})

function readPayloadError(payload: unknown, fallback: string) {
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

function isWarehouseItem(value: unknown): value is WarehouseItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "kind" in value &&
    (value.kind === "asset" || value.kind === "spare-part") &&
    "assetCategory" in value &&
    (value.assetCategory === null ||
      isWarehouseAssetCategory(value.assetCategory)) &&
    "assetSubcategory" in value &&
    (value.assetSubcategory === null ||
      ASSET_CATEGORIES.some((category) => category === value.assetSubcategory)) &&
    "assetCatalogId" in value &&
    (value.assetCatalogId === null ||
      typeof value.assetCatalogId === "string") &&
    "assetType" in value &&
    (value.assetType === null || typeof value.assetType === "string") &&
    "assetBrand" in value &&
    (value.assetBrand === null || typeof value.assetBrand === "string") &&
    "storagePeriodMonths" in value &&
    (value.storagePeriodMonths === null ||
      (typeof value.storagePeriodMonths === "number" &&
        Number.isSafeInteger(value.storagePeriodMonths) &&
        value.storagePeriodMonths >= 1 &&
        value.storagePeriodMonths <= 1200)) &&
    "compatibleAssetItemId" in value &&
    (value.compatibleAssetItemId === null ||
      typeof value.compatibleAssetItemId === "string") &&
    "compatibleAssetItemName" in value &&
    (value.compatibleAssetItemName === null ||
      typeof value.compatibleAssetItemName === "string") &&
    "name" in value &&
    typeof value.name === "string" &&
    "unit" in value &&
    typeof value.unit === "string" &&
    "stock" in value &&
    typeof value.stock === "number" &&
    Number.isSafeInteger(value.stock) &&
    value.stock >= 0
  )
}

function isWarehouseCompatibleAsset(
  value: unknown,
): value is WarehouseCompatibleAsset {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "assetType" in value &&
    (typeof value.assetType === "string" || value.assetType === null) &&
    "assetBrand" in value &&
    (typeof value.assetBrand === "string" || value.assetBrand === null)
  )
}

function isWarehouseMovement(value: unknown): value is WarehouseMovement {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "itemId" in value &&
    typeof value.itemId === "string" &&
    "itemName" in value &&
    typeof value.itemName === "string" &&
    "assetSubcategory" in value &&
    (value.assetSubcategory === null ||
      ASSET_CATEGORIES.some((category) => category === value.assetSubcategory)) &&
    "movementType" in value &&
    (value.movementType === "in" || value.movementType === "out") &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    "unit" in value &&
    typeof value.unit === "string" &&
    "note" in value &&
    typeof value.note === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "transactionDate" in value &&
    typeof value.transactionDate === "string"
  )
}

function isWarehouseSppg(value: unknown): value is WarehouseSppg {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "nama" in value &&
    typeof value.nama === "string"
  )
}

function isWarehouseAssetAllocation(
  value: unknown,
): value is WarehouseAssetAllocation {
  return (
    typeof value === "object" &&
    value !== null &&
    "itemId" in value &&
    typeof value.itemId === "string" &&
    "itemName" in value &&
    typeof value.itemName === "string" &&
    "sppgId" in value &&
    typeof value.sppgId === "string" &&
    "sppgName" in value &&
    typeof value.sppgName === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity > 0 &&
    "unit" in value &&
    typeof value.unit === "string"
  )
}

function isWarehouseAssetAllocationMovement(
  value: unknown,
): value is WarehouseAssetAllocationMovement {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "itemId" in value &&
    typeof value.itemId === "string" &&
    "itemName" in value &&
    typeof value.itemName === "string" &&
    "movementType" in value &&
    (value.movementType === "allocate" ||
      value.movementType === "transfer" ||
      value.movementType === "return") &&
    "fromSppgId" in value &&
    (typeof value.fromSppgId === "string" || value.fromSppgId === null) &&
    "fromSppgName" in value &&
    (typeof value.fromSppgName === "string" || value.fromSppgName === null) &&
    "toSppgId" in value &&
    (typeof value.toSppgId === "string" || value.toSppgId === null) &&
    "toSppgName" in value &&
    (typeof value.toSppgName === "string" || value.toSppgName === null) &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    "unit" in value &&
    typeof value.unit === "string" &&
    "note" in value &&
    typeof value.note === "string" &&
    "createdAt" in value &&
    typeof value.createdAt === "string" &&
    "transactionDate" in value &&
    typeof value.transactionDate === "string" &&
    "createdByUsername" in value &&
    (typeof value.createdByUsername === "string" ||
      value.createdByUsername === null)
  )
}

export function WarehouseManagement({ user, view, kind }: Props) {
  const styles = useStyles()
  const [items, setItems] = React.useState<WarehouseItem[]>([])
  const [compatibleAssetItems, setCompatibleAssetItems] = React.useState<
    WarehouseCompatibleAsset[]
  >([])
  const [movements, setMovements] = React.useState<WarehouseMovement[]>([])
  const [sppgs, setSppgs] = React.useState<WarehouseSppg[]>([])
  const [allocations, setAllocations] = React.useState<
    WarehouseAssetAllocation[]
  >([])
  const [allocationMovements, setAllocationMovements] = React.useState<
    WarehouseAssetAllocationMovement[]
  >([])
  const [allocationLogTab, setAllocationLogTab] =
    React.useState<AllocationLogTab>("incoming")
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [saveError, setSaveError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [itemDialogOpen, setItemDialogOpen] = React.useState(false)
  const [itemDialogContentElement, setItemDialogContentElement] =
    React.useState<HTMLDivElement | null>(null)
  const [movementItem, setMovementItem] = React.useState<WarehouseItem | null>(
    null,
  )
  const [name, setName] = React.useState("")
  const [assetName, setAssetName] = React.useState("")
  const [assetType, setAssetType] = React.useState("")
  const [assetBrand, setAssetBrand] = React.useState("")
  const [sparePartSearch, setSparePartSearch] = React.useState("")
  const [selectedSparePartItemId, setSelectedSparePartItemId] =
    React.useState("")
  const [compatibleAssetItemId, setCompatibleAssetItemId] = React.useState("")
  const [storagePeriodMonths, setStoragePeriodMonths] = React.useState("")
  const [unit, setUnit] = React.useState("")
  const [initialStock, setInitialStock] = React.useState("0")
  const [assetCategory, setAssetCategory] =
    React.useState<WarehouseAssetCategory | null>(null)
  const [assetSubcategory, setAssetSubcategory] =
    React.useState<AssetCategory | null>(null)
  const [assetCatalogId, setAssetCatalogId] = React.useState<string | null>(
    null,
  )
  const [assetCatalogSearch, setAssetCatalogSearch] = React.useState("")
  const [movementType, setMovementType] = React.useState<MovementType>("in")
  const [quantity, setQuantity] = React.useState("")
  const [note, setNote] = React.useState("")
  const [allocationItem, setAllocationItem] =
    React.useState<WarehouseItem | null>(null)
  const [allocationDialogOpen, setAllocationDialogOpen] = React.useState(false)
  const [selectedAllocationItemId, setSelectedAllocationItemId] =
    React.useState("")
  const [allocationError, setAllocationError] = React.useState("")
  const [allocationAction, setAllocationAction] =
    React.useState<AllocationAction>("allocate")
  const [allocationDate, setAllocationDate] = React.useState(() =>
    localDateString(),
  )
  const [allocationDateInput, setAllocationDateInput] = React.useState(() =>
    formatAllocationDateInput(localDateString()),
  )
  const [allocationCalendarOpen, setAllocationCalendarOpen] =
    React.useState(false)
  const allocationCalendarDayRef = React.useRef<CalendarDayHandle>(null)
  const [allocationReceipt, setAllocationReceipt] =
    React.useState<AllocationReceipt | null>(null)
  const [receiptError, setReceiptError] = React.useState("")
  const [generatingReceipt, setGeneratingReceipt] = React.useState(false)
  const [fromSppgId, setFromSppgId] = React.useState("")
  const [toSppgId, setToSppgId] = React.useState("")
  const canWrite =
    user.role === "admin" || user.permissions?.assets === true
  const selectedAllocationItem =
    allocationItem ??
    items.find((item) => item.id === selectedAllocationItemId) ??
    null
  const selectedCompatibleAssetItem = compatibleAssetItems.find(
    (item) => item.id === compatibleAssetItemId,
  )
  const selectedSparePartItem = items.find(
    (item) => item.id === selectedSparePartItemId,
  )

  React.useEffect(() => {
    if (allocationCalendarOpen) {
      allocationCalendarDayRef.current?.focus()
    }
  }, [allocationCalendarOpen])
  function setAllocationDateValue(value: string) {
    setAllocationDate(value)
    setAllocationDateInput(formatAllocationDateInput(value))
  }

  const selectedJuknisItem = assetCatalog.find(
    (item) => item.catalogId === assetCatalogId,
  )
  const juknisItemsInCategory = assetSubcategory
    ? assetCatalog.filter((item) => item.category === assetSubcategory)
    : []
  const normalizedAssetCatalogSearch = assetCatalogSearch
    .trim()
    .toLocaleLowerCase("id-ID")
  const matchingJuknisItems = juknisItemsInCategory.filter((item) =>
    [item.name, item.groupName, item.sourceLabel]
      .join(" ")
      .toLocaleLowerCase("id-ID")
      .includes(normalizedAssetCatalogSearch),
  )
  const matchingSpareParts = items.filter(
    (item) =>
      item.kind === "spare-part" &&
      item.name
        .toLocaleLowerCase("id-ID")
        .includes(sparePartSearch.trim().toLocaleLowerCase("id-ID")),
  )
  const juknisOptionText = (item: (typeof assetCatalog)[number]) =>
    `${item.name} · ${item.sourceLabel}`
  const incomingMovements = movements.filter(
    (movement) => movement.movementType === "in",
  )
  const visibleAllocationMovements = allocationMovements.filter(
    (movement) => movement.movementType !== "allocate",
  )

  const loadWarehouse = React.useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch(`/api/warehouse?kind=${kind}`, {
        cache: "no-store",
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(readPayloadError(payload, "Stok gudang gagal dimuat."))
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("items" in payload) ||
        !Array.isArray(payload.items) ||
        !payload.items.every(isWarehouseItem) ||
        !("compatibleAssetItems" in payload) ||
        !Array.isArray(payload.compatibleAssetItems) ||
        !payload.compatibleAssetItems.every(isWarehouseCompatibleAsset) ||
        !("movements" in payload) ||
        !Array.isArray(payload.movements) ||
        !payload.movements.every(isWarehouseMovement) ||
        !("sppgs" in payload) ||
        !Array.isArray(payload.sppgs) ||
        !payload.sppgs.every(isWarehouseSppg) ||
        !("allocations" in payload) ||
        !Array.isArray(payload.allocations) ||
        !payload.allocations.every(isWarehouseAssetAllocation) ||
        !("allocationMovements" in payload) ||
        !Array.isArray(payload.allocationMovements) ||
        !payload.allocationMovements.every(isWarehouseAssetAllocationMovement)
      ) {
        throw new Error("Format data gudang yang diterima tidak valid.")
      }
      setItems(payload.items)
      setCompatibleAssetItems(payload.compatibleAssetItems)
      setMovements(payload.movements)
      setSppgs(payload.sppgs)
      setAllocations(payload.allocations)
      setAllocationMovements(payload.allocationMovements)
    } catch (failure) {
      setLoadError(
        failure instanceof Error ? failure.message : "Stok gudang gagal dimuat.",
      )
    } finally {
      setLoading(false)
    }
  }, [kind])

  React.useEffect(() => {
    void Promise.resolve().then(loadWarehouse)
  }, [loadWarehouse])

  async function submit(action: "create-item" | "movement") {
    setSaving(true)
    setSaveError("")
    try {
      const body =
        action === "create-item"
          ? {
              action,
              kind,
              assetCategory: kind === "asset" ? assetCategory : null,
              assetSubcategory:
                kind === "asset" ? assetSubcategory : null,
              assetCatalogId:
                kind === "asset" && assetCategory === "juknis"
                  ? assetCatalogId
                  : null,
              assetType: kind === "asset" ? assetType : null,
              assetBrand: kind === "asset" ? assetBrand : null,
              name:
                kind === "spare-part"
                  ? name
                  : kind === "asset" && assetCategory === "non-juknis"
                    ? assetName
                    : null,
              unit,
              initialStock: Number(initialStock),
              storagePeriodMonths:
                kind === "spare-part" ? Number(storagePeriodMonths) : null,
              compatibleAssetItemId:
                kind === "spare-part" ? compatibleAssetItemId : null,
            }
          : {
              action,
              kind,
              itemId: movementItem?.id,
              movementType,
              quantity: Number(quantity),
              note,
            }
      const response = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          readPayloadError(payload, "Pencatatan stok gagal disimpan."),
        )
      }
      setItemDialogOpen(false)
      setMovementItem(null)
      setName("")
      setAssetName("")
      setAssetType("")
      setAssetBrand("")
      setSparePartSearch("")
      setSelectedSparePartItemId("")
      setCompatibleAssetItemId("")
      setStoragePeriodMonths("")
      setUnit("")
      setInitialStock("0")
      setAssetCategory(null)
      setAssetSubcategory(null)
      setAssetCatalogId(null)
      setAssetCatalogSearch("")
      setQuantity("")
      setNote("")
      await loadWarehouse()
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Pencatatan stok gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  const openAllocation = React.useCallback((
    item: WarehouseItem,
    action: AllocationAction,
    sourceSppgId = "",
  ) => {
    setSaveError("")
    setAllocationError("")
    setQuantity("")
    setNote("")
    setAllocationItem(item)
    setAllocationDialogOpen(true)
    setSelectedAllocationItemId(item.id)
    setAllocationAction(action)
    setAllocationDateValue(localDateString())
    setAllocationCalendarOpen(false)
    setAllocationReceipt(null)
    setReceiptError("")
    setFromSppgId(sourceSppgId)
    setToSppgId("")
  }, [])

  async function submitAllocation() {
    const item = selectedAllocationItem
    if (!item) return
    if (!isDateOnly(allocationDate)) {
      setAllocationError(
        "Masukkan tanggal transaksi yang valid dengan format DD/MM/YYYY.",
      )
      return
    }
    const destinationName =
      allocationAction === "return"
        ? ""
        : sppgs.find((sppg) => sppg.id === toSppgId)?.nama ?? ""
    if (allocationAction !== "return" && !destinationName) {
      setAllocationError("Pilih SPPG tujuan sebelum menyimpan alokasi.")
      return
    }
    setSaving(true)
    setAllocationError("")
    try {
      const body = {
        action: allocationAction,
        kind: "asset",
        itemId: item.id,
        quantity: Number(quantity),
        note,
        transactionDate: allocationDate,
        ...(allocationAction !== "allocate" ? { fromSppgId } : {}),
        ...(allocationAction !== "return" ? { toSppgId } : {}),
      }
      const response = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          readPayloadError(payload, "Mutasi alokasi aset gagal disimpan."),
        )
      }
      if (allocationAction === "allocate") {
        setAllocationReceipt({
          itemName: item.name,
          quantity: Number(quantity),
          unit: item.unit,
          sppgName: destinationName,
          transactionDate: allocationDate,
          note: note.trim(),
          recordedByUsername: user.username,
        })
        setReceiptError("")
      } else {
        setAllocationDialogOpen(false)
        setAllocationItem(null)
        setSelectedAllocationItemId("")
        setQuantity("")
        setNote("")
        setAllocationDateValue(localDateString())
        setAllocationCalendarOpen(false)
      }
      await loadWarehouse()
    } catch (failure) {
      setAllocationError(
        failure instanceof Error
          ? failure.message
          : "Mutasi alokasi aset gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  function openAllocationDialog() {
    setAllocationError("")
    setAllocationItem(null)
    setSelectedAllocationItemId("")
    setAllocationAction("allocate")
    setFromSppgId("")
    setToSppgId("")
    setQuantity("")
    setNote("")
    setAllocationDateValue(localDateString())
    setAllocationCalendarOpen(false)
    setAllocationReceipt(null)
    setReceiptError("")
    setAllocationDialogOpen(true)
  }

  async function printAllocationReceipt() {
    if (!allocationReceipt || generatingReceipt) return
    const printWindow = window.open("about:blank", "_blank")
    setGeneratingReceipt(true)
    setReceiptError("")
    try {
      const [{ pdf }, { WarehouseHandoverDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./warehouse-handover-pdf"),
      ])
      const blob = await pdf(
        <WarehouseHandoverDocument receipt={allocationReceipt} />,
      ).toBlob()
      const filename = `serah-terima-${allocationReceipt.transactionDate}-${allocationReceipt.sppgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}.pdf`
      if (printWindow) {
        const url = URL.createObjectURL(blob)
        printWindow.location.replace(url)
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
      } else {
        downloadBlob(blob, filename)
      }
    } catch (failure) {
      printWindow?.close()
      setReceiptError(
        failure instanceof Error
          ? failure.message
          : "PDF serah terima gagal dibuat.",
      )
    } finally {
      setGeneratingReceipt(false)
    }
  }

  const itemColumns = React.useMemo<TableColumnDefinition<WarehouseItem>[]>(
    () => [
      createTableColumn<WarehouseItem>({
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name, "id"),
        renderHeaderCell: () => "Nama item",
        renderCell: (item) => item.name,
      }),
      ...(kind === "asset"
        ? [
            createTableColumn<WarehouseItem>({
              columnId: "assetType",
              renderHeaderCell: () => "Tipe aset",
              renderCell: (item) => item.assetType || "—",
            }),
            createTableColumn<WarehouseItem>({
              columnId: "assetBrand",
              renderHeaderCell: () => "Merek aset",
              renderCell: (item) => item.assetBrand || "—",
            }),
            createTableColumn<WarehouseItem>({
              columnId: "assetCategory",
              renderHeaderCell: () => "Jenis aset",
              renderCell: (item) =>
                item.assetCategory
                  ? assetCategoryLabels[item.assetCategory]
                  : "Belum diklasifikasikan",
            }),
            createTableColumn<WarehouseItem>({
              columnId: "assetSubcategory",
              renderHeaderCell: () => "Kategori",
              renderCell: (item) =>
                item.assetSubcategory ?? "Belum diklasifikasikan",
            }),
          ]
        : []),
      createTableColumn<WarehouseItem>({
        columnId: "stock",
        compare: (a, b) => a.stock - b.stock,
        renderHeaderCell: () => "Stok tersedia",
        renderCell: (item) => item.stock.toLocaleString("id-ID"),
      }),
      createTableColumn<WarehouseItem>({
        columnId: "unit",
        renderHeaderCell: () => "Satuan",
        renderCell: (item) => item.unit,
      }),
      ...(kind === "spare-part"
        ? [
            createTableColumn<WarehouseItem>({
              columnId: "compatibleAssetItemName",
              renderHeaderCell: () => "Untuk item aset",
              renderCell: (item) => item.compatibleAssetItemName || "—",
            }),
            createTableColumn<WarehouseItem>({
              columnId: "storagePeriodMonths",
              renderHeaderCell: () => "Masa simpan",
              renderCell: (item) =>
                item.storagePeriodMonths
                  ? `${item.storagePeriodMonths.toLocaleString("id-ID")} bulan`
                  : "Belum dicatat",
            }),
          ]
        : []),
      createTableColumn<WarehouseItem>({
        columnId: "actions",
        renderHeaderCell: () => "Aksi",
        renderCell: (item) => (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                size="small"
                icon={<MoreHorizontalRegular />}
                aria-label={`Tindakan stok untuk ${item.name}`}
                disabled={!canWrite}
              />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                {kind === "asset" && (
                  <MenuItem
                    disabled={
                      !canWrite || item.stock === 0 || sppgs.length === 0
                    }
                    onClick={() => openAllocation(item, "allocate")}
                  >
                    Alokasikan
                  </MenuItem>
                )}
                <MenuItem
                  disabled={!canWrite}
                  onClick={() => {
                    setSaveError("")
                    setQuantity("")
                    setNote("")
                    setMovementType("in")
                    setMovementItem(item)
                  }}
                >
                  Catat stok
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        ),
      }),
    ],
    [canWrite, kind, openAllocation, sppgs.length],
  )

  const movementColumns = React.useMemo<
    TableColumnDefinition<WarehouseMovement>[]
  >(
    () => [
      createTableColumn<WarehouseMovement>({
        columnId: "transactionDate",
        compare: (a, b) =>
          a.transactionDate.localeCompare(b.transactionDate) ||
          a.createdAt.localeCompare(b.createdAt),
        renderHeaderCell: () => "Tanggal transaksi",
        renderCell: (item) => formatAllocationDate(item.transactionDate),
      }),
      createTableColumn<WarehouseMovement>({
        columnId: "itemName",
        compare: (a, b) => a.itemName.localeCompare(b.itemName, "id"),
        renderHeaderCell: () => "Item",
        renderCell: (item) => item.itemName,
      }),
      ...(kind === "asset"
        ? [
            createTableColumn<WarehouseMovement>({
              columnId: "assetSubcategory",
              renderHeaderCell: () => "Kategori",
              renderCell: (item) =>
                item.assetSubcategory ?? "Belum diklasifikasikan",
            }),
          ]
        : []),
      createTableColumn<WarehouseMovement>({
        columnId: "movementType",
        renderHeaderCell: () => "Jenis",
        renderCell: (item) => (item.movementType === "in" ? "Masuk" : "Keluar"),
      }),
      createTableColumn<WarehouseMovement>({
        columnId: "quantity",
        compare: (a, b) => a.quantity - b.quantity,
        renderHeaderCell: () => "Jumlah",
        renderCell: (item) =>
          `${item.movementType === "in" ? "+" : "−"}${item.quantity.toLocaleString("id-ID")} ${item.unit}`,
      }),
      createTableColumn<WarehouseMovement>({
        columnId: "note",
        renderHeaderCell: () => "Catatan",
        renderCell: (item) => item.note || "—",
      }),
    ],
    [kind],
  )

  const allocationColumns = React.useMemo<
    TableColumnDefinition<WarehouseAssetAllocation>[]
  >(
    () => [
      createTableColumn<WarehouseAssetAllocation>({
        columnId: "stockKind",
        renderHeaderCell: () => "Jenis stok",
        renderCell: () => (
          <Badge appearance="tint" color="informative">
            Stok aset
          </Badge>
        ),
      }),
      createTableColumn<WarehouseAssetAllocation>({
        columnId: "itemName",
        compare: (a, b) => a.itemName.localeCompare(b.itemName, "id"),
        renderHeaderCell: () => "Aset",
        renderCell: (item) => item.itemName,
      }),
      createTableColumn<WarehouseAssetAllocation>({
        columnId: "sppgName",
        compare: (a, b) => a.sppgName.localeCompare(b.sppgName, "id"),
        renderHeaderCell: () => "SPPG",
        renderCell: (item) => item.sppgName,
      }),
      createTableColumn<WarehouseAssetAllocation>({
        columnId: "quantity",
        compare: (a, b) => a.quantity - b.quantity,
        renderHeaderCell: () => "Saldo dialokasikan",
        renderCell: (item) =>
          `${item.quantity.toLocaleString("id-ID")} ${item.unit}`,
      }),
      createTableColumn<WarehouseAssetAllocation>({
        columnId: "actions",
        renderHeaderCell: () => "Aksi",
        renderCell: (allocation) => {
          const item = items.find((candidate) => candidate.id === allocation.itemId)
          if (!item) return "—"
          return (
            <div className={styles.rowActions}>
              <Button
                appearance="secondary"
                disabled={!canWrite}
                onClick={() =>
                  openAllocation(item, "transfer", allocation.sppgId)
                }
              >
                Mutasi
              </Button>
              <Button
                appearance="secondary"
                disabled={!canWrite}
                onClick={() =>
                  openAllocation(item, "return", allocation.sppgId)
                }
              >
                Kembalikan
              </Button>
            </div>
          )
        },
      }),
    ],
    [canWrite, items, openAllocation, styles.rowActions],
  )

  const allocationMovementColumns = React.useMemo<
    TableColumnDefinition<WarehouseAssetAllocationMovement>[]
  >(
    () => [
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "stockKind",
        renderHeaderCell: () => "Jenis stok",
        renderCell: () => (
          <Badge appearance="tint" color="informative">
            Stok aset
          </Badge>
        ),
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "transactionDate",
        compare: (a, b) =>
          a.transactionDate.localeCompare(b.transactionDate) ||
          a.createdAt.localeCompare(b.createdAt),
        renderHeaderCell: () => "Tanggal transaksi",
        renderCell: (movement) =>
          formatAllocationDate(movement.transactionDate),
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "itemName",
        compare: (a, b) => a.itemName.localeCompare(b.itemName, "id"),
        renderHeaderCell: () => "Aset",
        renderCell: (movement) => movement.itemName,
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "movementType",
        renderHeaderCell: () => "Jenis",
        renderCell: (movement) =>
          movement.movementType === "allocate"
            ? "Alokasi"
            : movement.movementType === "transfer"
              ? "Mutasi SPPG"
              : "Pengembalian",
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "route",
        renderHeaderCell: () => "Perpindahan",
        renderCell: (movement) =>
          `${movement.fromSppgName ?? "Gudang"} → ${movement.toSppgName ?? "Gudang"}`,
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "quantity",
        compare: (a, b) => a.quantity - b.quantity,
        renderHeaderCell: () => "Jumlah",
        renderCell: (movement) =>
          `${movement.quantity.toLocaleString("id-ID")} ${movement.unit}`,
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "createdByUsername",
        renderHeaderCell: () => "Dicatat oleh",
        renderCell: (movement) => movement.createdByUsername ?? "—",
      }),
      createTableColumn<WarehouseAssetAllocationMovement>({
        columnId: "note",
        renderHeaderCell: () => "Catatan",
        renderCell: (movement) => movement.note || "—",
      }),
    ],
    [],
  )

  const incomingItemColumns = React.useMemo<
    TableColumnDefinition<WarehouseItem>[]
  >(
    () => [
      createTableColumn<WarehouseItem>({
        columnId: "name",
        compare: (a, b) => a.name.localeCompare(b.name, "id"),
        renderHeaderCell: () => "Nama barang / item",
        renderCell: (item) => item.name,
      }),
      createTableColumn<WarehouseItem>({
        columnId: "assetCategory",
        renderHeaderCell: () => "Jenis aset",
        renderCell: (item) =>
          item.assetCategory
            ? assetCategoryLabels[item.assetCategory]
            : "Belum diklasifikasikan",
      }),
      createTableColumn<WarehouseItem>({
        columnId: "stock",
        compare: (a, b) => a.stock - b.stock,
        renderHeaderCell: () => "Stok gudang",
        renderCell: (item) => item.stock.toLocaleString("id-ID"),
      }),
      createTableColumn<WarehouseItem>({
        columnId: "unit",
        renderHeaderCell: () => "Satuan",
        renderCell: (item) => item.unit,
      }),
      createTableColumn<WarehouseItem>({
        columnId: "actions",
        renderHeaderCell: () => "Aksi",
        renderCell: (item) => (
          <Button
            appearance="primary"
            disabled={!canWrite}
            onClick={() => {
              setSaveError("")
              setQuantity("")
              setNote("")
              setMovementType("in")
              setMovementItem(item)
            }}
          >
            Catat
          </Button>
        ),
      }),
    ],
    [canWrite],
  )

  return (
    <section className={styles.page} aria-label="Gudang">
      {saveError && (
        <MessageBar intent="error" className={styles.error}>
          <MessageBarBody>{saveError}</MessageBarBody>
        </MessageBar>
      )}

      {view === "stock" && (
        <>
          <div className={styles.toolbar}>
            <Text>
              {kindLabels[kind]} · {items.length.toLocaleString("id-ID")} item
            </Text>
            {canWrite && (
              <Button
                appearance="primary"
                onClick={() => {
                  setSaveError("")
                  setAssetCategory(null)
                  setItemDialogOpen(true)
                }}
              >
                Tambah item
              </Button>
            )}
          </div>

          {loading ? (
            <div className={styles.status} role="status">
              <Spinner label="Memuat stok gudang…" />
            </div>
          ) : loadError ? (
            <div className={styles.status} role="alert">
              <Text>{loadError}</Text>
              <Button appearance="secondary" onClick={() => void loadWarehouse()}>
                Coba lagi
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.tableShell}>
              <div className={styles.status}>
                <Text weight="semibold">Belum ada item {kindLabels[kind].toLowerCase()}.</Text>
                <Text size={200}>
                  {canWrite
                    ? "Tambahkan item untuk mulai mencatat stok masuk dan keluar."
                    : "Item gudang akan tampil di sini setelah dicatat."}
                </Text>
              </div>
            </div>
          ) : (
            <div className={styles.tableShell}>
              <DataGrid
                aria-label={`Daftar ${kindLabels[kind].toLowerCase()}`}
                items={items}
                columns={itemColumns}
                sortable
                getRowId={(item) => item.id}
                focusMode="composite"
                className={styles.grid}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<WarehouseItem>>
                  {({ item, rowId }) => (
                    <DataGridRow<WarehouseItem> key={rowId}>
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
          )}

          {!loading && !loadError && movements.length > 0 && (
            <>
              <Text as="h2" size={400} weight="semibold" className={styles.sectionHeading}>
                Riwayat stok terbaru
              </Text>
              <div className={styles.tableShell}>
                <DataGrid
                  aria-label={`Riwayat ${kindLabels[kind].toLowerCase()}`}
                  items={movements}
                  columns={movementColumns}
                  sortable
                  getRowId={(item) => item.id}
                  focusMode="composite"
                  className={styles.grid}
                >
                  <DataGridHeader>
                    <DataGridRow>
                      {({ renderHeaderCell }) => (
                        <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                      )}
                    </DataGridRow>
                  </DataGridHeader>
                  <DataGridBody<WarehouseMovement>>
                    {({ item, rowId }) => (
                      <DataGridRow<WarehouseMovement> key={rowId}>
                        {({ renderCell }) => (
                          <DataGridCell>{renderCell(item)}</DataGridCell>
                        )}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
              </div>
            </>
          )}
        </>
      )}

      {view === "allocations" && (
        <>
          <div className={styles.toolbar}>
            <div>
              <Text>Saldo aset yang telah dialokasikan ke SPPG</Text>
              <br />
              <Text size={200}>
                Catatan distribusi gudang ini tidak mengubah jumlah aktual aset
                SPPG secara otomatis.
              </Text>
            </div>
            <Text size={200}>
              {allocations.length.toLocaleString("id-ID")} alokasi aktif
            </Text>
          </div>

          {loading ? (
            <div className={styles.status} role="status">
              <Spinner label="Memuat alokasi aset…" />
            </div>
          ) : loadError ? (
            <div className={styles.status} role="alert">
              <Text>{loadError}</Text>
              <Button appearance="secondary" onClick={() => void loadWarehouse()}>
                Coba lagi
              </Button>
            </div>
          ) : allocations.length === 0 ? (
            <div className={styles.tableShell}>
              <div className={styles.status}>
                <Text weight="semibold">Belum ada aset yang dialokasikan.</Text>
                <Text size={200}>
                  {sppgs.length === 0
                    ? "Daftarkan SPPG terlebih dahulu untuk mulai mengalokasikan stok."
                    : items.some((item) => item.stock > 0)
                      ? "Pilih item gudang dan SPPG tujuan untuk mencatat alokasi pertama."
                      : "Catat stok aset melalui submenu Stok aset sebelum membuat penyaluran pertama."}
                </Text>
                <Button
                  appearance="primary"
                  disabled={!canWrite}
                  onClick={openAllocationDialog}
                >
                  Alokasikan item ke SPPG
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.tableShell}>
              <DataGrid
                aria-label="Saldo alokasi aset per SPPG"
                items={allocations}
                columns={allocationColumns}
                sortable
                getRowId={(allocation) =>
                  `${allocation.itemId}:${allocation.sppgId}`
                }
                focusMode="composite"
                className={styles.wideGrid}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<WarehouseAssetAllocation>>
                  {({ item, rowId }) => (
                    <DataGridRow<WarehouseAssetAllocation> key={rowId}>
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
          )}

          <TabList
            aria-label="Pencatatan barang masuk dan log mutasi aset"
            selectedValue={allocationLogTab}
            onTabSelect={(_, data) => {
              if (data.value === "incoming" || data.value === "mutations") {
                setAllocationLogTab(data.value)
              }
            }}
          >
            <Tab value="incoming">Pencatatan barang masuk</Tab>
            <Tab value="mutations">Log mutasi</Tab>
          </TabList>
          {loading ? (
            <div className={styles.status} role="status">
              <Spinner
                label={
                  allocationLogTab === "incoming"
                    ? "Memuat pencatatan barang masuk…"
                    : "Memuat log mutasi…"
                }
              />
            </div>
          ) : loadError ? null : allocationLogTab === "incoming" ? (
            <>
              <Text weight="semibold">Pilih barang atau item untuk dicatat masuk</Text>
              {items.length === 0 ? (
                <div className={styles.tableShell}>
                  <div className={styles.status}>
                    <Text>Belum ada item aset di gudang.</Text>
                    <Text size={200}>
                      Tambahkan item melalui submenu Stok aset sebelum mencatat
                      barang masuk.
                    </Text>
                  </div>
                </div>
              ) : (
                <div className={styles.tableShell}>
                  <DataGrid
                    aria-label="Pilih item aset untuk pencatatan barang masuk"
                    items={items}
                    columns={incomingItemColumns}
                    sortable
                    getRowId={(item) => item.id}
                    focusMode="composite"
                    className={styles.grid}
                  >
                    <DataGridHeader>
                      <DataGridRow>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<WarehouseItem>>
                      {({ item, rowId }) => (
                        <DataGridRow<WarehouseItem> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>
                </div>
              )}
              <Text as="h2" size={400} weight="semibold" className={styles.sectionHeading}>
                Riwayat barang masuk
              </Text>
              {incomingMovements.length === 0 ? (
                <div className={styles.tableShell}>
                  <div className={styles.status}>
                    <Text>Belum ada pencatatan barang masuk.</Text>
                  </div>
                </div>
              ) : (
                <div className={styles.tableShell}>
                  <DataGrid
                    aria-label="Riwayat barang masuk ke stok aset gudang"
                    items={incomingMovements}
                    columns={movementColumns}
                    sortable
                    getRowId={(movement) => movement.id}
                    focusMode="composite"
                    className={styles.grid}
                  >
                    <DataGridHeader>
                      <DataGridRow>
                        {({ renderHeaderCell }) => (
                          <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                        )}
                      </DataGridRow>
                    </DataGridHeader>
                    <DataGridBody<WarehouseMovement>>
                      {({ item, rowId }) => (
                        <DataGridRow<WarehouseMovement> key={rowId}>
                          {({ renderCell }) => (
                            <DataGridCell>{renderCell(item)}</DataGridCell>
                          )}
                        </DataGridRow>
                      )}
                    </DataGridBody>
                  </DataGrid>
                </div>
              )}
            </>
          ) : visibleAllocationMovements.length === 0 ? (
            <div className={styles.tableShell}>
              <div className={styles.status}>
                <Text>Belum ada catatan mutasi aset.</Text>
              </div>
            </div>
          ) : (
            <div className={styles.tableShell}>
              <DataGrid
                aria-label="Log mutasi aset"
                items={visibleAllocationMovements}
                columns={allocationMovementColumns}
                sortable
                getRowId={(movement) => movement.id}
                focusMode="composite"
                className={styles.wideGrid}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<WarehouseAssetAllocationMovement>>
                  {({ item, rowId }) => (
                    <DataGridRow<WarehouseAssetAllocationMovement> key={rowId}>
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
          )}
        </>
      )}

      <Dialog
        open={itemDialogOpen}
        onOpenChange={(_, data) => {
          setItemDialogOpen(data.open)
          if (!data.open) {
            setSaveError("")
            setName("")
            setAssetName("")
            setAssetType("")
            setAssetBrand("")
            setSparePartSearch("")
            setSelectedSparePartItemId("")
            setCompatibleAssetItemId("")
            setStoragePeriodMonths("")
            if (assetCategory === "juknis") {
              setUnit("")
            }
            setAssetCategory(null)
            setAssetSubcategory(null)
            setAssetCatalogId(null)
            setAssetCatalogSearch("")
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody className={styles.itemDialogBody}>
            <DialogTitle>Tambah {kindLabels[kind].toLowerCase()}</DialogTitle>
            <DialogContent
              ref={setItemDialogContentElement}
              className={styles.itemDialogContent}
            >
              <form
                id="warehouse-item-form"
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault()
                  void submit("create-item")
                }}
              >
                {kind === "asset" && (
                  <Field
                    label="Jenis item aset"
                    hint="Pilih satu kategori."
                    required
                  >
                    <div
                      className={styles.assetCategoryChoices}
                      role="group"
                      aria-label="Pilih jenis item aset"
                    >
                      {assetCategoryOptions.map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          appearance={
                            assetCategory === option.value
                              ? "primary"
                              : "secondary"
                          }
                          aria-pressed={assetCategory === option.value}
                          className={styles.assetCategoryButton}
                          onClick={() => {
                            const switchingJuknis =
                              (assetCategory === "juknis") !==
                              (option.value === "juknis")
                            setAssetCategory(option.value)
                            if (switchingJuknis) {
                              setAssetCatalogId(null)
                              setAssetCatalogSearch("")
                              setUnit("")
                            }
                          }}
                        >
                          <span className={styles.assetCategoryButtonContent}>
                            <span>{option.label}</span>
                            <Text
                              size={200}
                              className={styles.assetCategoryDescription}
                            >
                              {option.description}
                            </Text>
                          </span>
                        </Button>
                      ))}
                    </div>
                  </Field>
                )}
                {kind === "asset" && (
                  <Field label="Kategori aset" required>
                    <Dropdown
                      className={styles.assetSubcategoryDropdown}
                      placeholder="Pilih kategori aset"
                      value={assetSubcategory ?? ""}
                      selectedOptions={
                        assetSubcategory ? [assetSubcategory] : []
                      }
                      onOptionSelect={(_, data) => {
                        const selected = ASSET_CATEGORIES.find(
                          (category) => category === data.optionValue,
                        )
                        if (!selected) return
                        if (
                          selected !== assetSubcategory &&
                          assetCategory === "juknis"
                        ) {
                          setAssetCatalogId(null)
                          setAssetCatalogSearch("")
                          setUnit("")
                        }
                        setAssetSubcategory(selected)
                      }}
                    >
                      {ASSET_CATEGORIES.map((category) => (
                        <Option key={category} value={category} text={category}>
                          {category}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                )}
                {kind === "asset" && assetCategory === "juknis" && (
                  <Field
                    label="Rujukan Juknis"
                    hint={
                      assetSubcategory
                        ? "Daftar rujukan mengikuti kategori yang dipilih."
                        : "Pilih kategori aset terlebih dahulu."
                    }
                    required
                  >
                    <Combobox
                      className={styles.juknisCombobox}
                      placeholder="Pilih atau cari rujukan Juknis"
                      disabled={!assetSubcategory}
                      value={
                        assetCatalogSearch ||
                        (selectedJuknisItem
                          ? juknisOptionText(selectedJuknisItem)
                          : "")
                      }
                      selectedOptions={
                        assetCatalogId ? [assetCatalogId] : []
                      }
                      positioning={{
                        position: "below",
                        align: "start",
                        matchTargetSize: "width",
                        pinned: true,
                        autoSize: "height",
                        overflowBoundary:
                          itemDialogContentElement ?? "window",
                      }}
                      onChange={(event) => {
                        const value = event.target.value
                        setAssetCatalogSearch(value)
                        const exactMatch = juknisItemsInCategory.find(
                          (item) =>
                            juknisOptionText(item).toLocaleLowerCase("id-ID") ===
                            value.trim().toLocaleLowerCase("id-ID"),
                        )
                        setAssetCatalogId(exactMatch?.catalogId ?? null)
                        if (exactMatch) {
                          setUnit(exactMatch.unit)
                        } else {
                          setUnit("")
                        }
                      }}
                      onOptionSelect={(_, data) => {
                        const item = juknisItemsInCategory.find(
                          (option) => option.catalogId === data.optionValue,
                        )
                        if (!item) {
                          setAssetCatalogId(null)
                          setUnit("")
                          return
                        }
                        setAssetCatalogId(item.catalogId)
                        setAssetCatalogSearch("")
                        setUnit(item.unit)
                      }}
                    >
                      {matchingJuknisItems.length > 0
                        ? matchingJuknisItems.map((item) => (
                            <Option
                              key={item.catalogId}
                              value={item.catalogId}
                              text={juknisOptionText(item)}
                            >
                              <span className={styles.juknisOption}>
                                {item.name}
                                <Text
                                  size={200}
                                  className={styles.juknisOptionSource}
                                >
                                  {item.sourceLabel}
                                </Text>
                              </span>
                            </Option>
                          ))
                        : (
                            <Option
                              value="__no_juknis_results__"
                              text={
                                assetSubcategory
                                  ? "Tidak ada rujukan Juknis yang cocok"
                                  : "Pilih kategori terlebih dahulu"
                              }
                              disabled
                            >
                              {assetSubcategory
                                ? "Tidak ada rujukan Juknis yang cocok"
                                : "Pilih kategori terlebih dahulu"}
                            </Option>
                          )}
                    </Combobox>
                  </Field>
                )}
                {kind === "asset" ? (
                  <>
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
                                  aria-label="Ilustrasi tipe aset AB-108-R yang diperbesar"
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
                                  aria-label="Ilustrasi merek aset GEA yang diperbesar"
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
                    {assetCategory === "non-juknis" && (
                      <Field label="Nama item" required>
                        <Input
                          value={assetName}
                          onChange={(_, data) => setAssetName(data.value)}
                          maxLength={160}
                          placeholder="Masukkan nama item"
                          required
                        />
                      </Field>
                    )}
                    <Field label="Tipe aset" required>
                      <Input
                        value={assetType}
                        onChange={(_, data) => setAssetType(data.value)}
                        maxLength={100}
                        placeholder="Masukkan tipe aset"
                        required
                      />
                    </Field>
                    <Field
                      label="Merek aset"
                      required
                      hint={
                        assetCategory === "juknis"
                          ? "Catat merek yang tertera pada aset."
                          : "Catat merek sesuai nameplate aset."
                      }
                    >
                      <Input
                        value={assetBrand}
                        onChange={(_, data) => setAssetBrand(data.value)}
                        maxLength={100}
                        placeholder="Masukkan merek aset"
                        required
                      />
                    </Field>
                  </>
                ) : (
                  <>
                    <Field
                      label="Untuk item aset"
                      hint={
                        compatibleAssetItems.length > 0
                          ? "Pilih aset yang menggunakan spare part ini."
                          : "Tambahkan item aset di gudang terlebih dahulu."
                      }
                      required
                    >
                      <Dropdown
                        placeholder={
                          compatibleAssetItems.length > 0
                            ? "Pilih item aset"
                            : "Belum ada item aset"
                        }
                        value={
                          selectedCompatibleAssetItem
                            ? [
                                selectedCompatibleAssetItem.name,
                                selectedCompatibleAssetItem.assetType,
                                selectedCompatibleAssetItem.assetBrand,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                            : ""
                        }
                        selectedOptions={
                          compatibleAssetItemId
                            ? [compatibleAssetItemId]
                            : []
                        }
                        onOptionSelect={(_, data) =>
                          setCompatibleAssetItemId(data.optionValue ?? "")
                        }
                        disabled={compatibleAssetItems.length === 0}
                      >
                        {compatibleAssetItems.map((item) => (
                          <Option key={item.id} value={item.id}>
                            {[item.name, item.assetType, item.assetBrand]
                              .filter(Boolean)
                              .join(" · ")}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                    <Field
                      label="Item spare part"
                      hint="Pilih item yang sudah ada atau ketik nama item baru."
                      required
                    >
                      <Combobox
                        placeholder="Pilih atau cari spare part"
                        value={sparePartSearch || name}
                        selectedOptions={name ? [name] : []}
                        onChange={(event) => {
                          const value = event.target.value
                          setSelectedSparePartItemId("")
                          setSparePartSearch(value)
                          setName(value)
                        }}
                        onOptionSelect={(_, data) => {
                          const item = matchingSpareParts.find(
                            (option) => option.name === data.optionValue,
                          )
                          if (!item) return
                          setSelectedSparePartItemId(item.id)
                          setName(item.name)
                          setSparePartSearch("")
                          setUnit(item.unit)
                          setStoragePeriodMonths(
                            item.storagePeriodMonths?.toString() ?? "",
                          )
                          setCompatibleAssetItemId(
                            item.compatibleAssetItemId ?? "",
                          )
                        }}
                      >
                        {matchingSpareParts.length > 0 ? (
                          matchingSpareParts.map((item) => (
                            <Option
                              key={item.id}
                              value={item.name}
                              text={item.name}
                            >
                              {item.name}
                            </Option>
                          ))
                        ) : (
                          <Option
                            value="__no_spare_part_results__"
                            text="Ketik nama item baru"
                            disabled
                          >
                            Ketik nama item baru
                          </Option>
                        )}
                      </Combobox>
                    </Field>
                    {selectedSparePartItem && (
                      <Field
                        label="Jumlah spare part serupa"
                        hint="Stok yang saat ini tercatat untuk item terpilih."
                      >
                        <div
                          className={styles.sparePartStockSummary}
                          role="status"
                          aria-live="polite"
                        >
                          <Text weight="semibold">
                            {selectedSparePartItem.stock.toLocaleString(
                              "id-ID",
                            )}{" "}
                            {selectedSparePartItem.unit}
                          </Text>
                          <Text size={200}>Stok saat ini</Text>
                        </div>
                      </Field>
                    )}
                    <Field
                      label="Jangka masa simpan"
                      hint="Satuan bulan."
                      required
                    >
                      <Input
                        type="number"
                        min={1}
                        max={1200}
                        step={1}
                        value={storagePeriodMonths}
                        onChange={(_, data) =>
                          setStoragePeriodMonths(data.value)
                        }
                        placeholder="Contoh: 12"
                        required
                      />
                    </Field>
                  </>
                )}
                <Field
                  label="Satuan"
                  required
                  hint={
                    kind === "asset" && assetCategory === "juknis"
                      ? "Mengikuti data rujukan Juknis."
                      : "Contoh: unit, buah, set, meter"
                  }
                >
                  <Input
                    value={unit}
                    onChange={(_, data) => setUnit(data.value)}
                    maxLength={32}
                    required
                    readOnly={kind === "asset" && assetCategory === "juknis"}
                  />
                </Field>
                <Field label="Stok awal" required hint="Isi 0 jika belum ada stok.">
                  <Input
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    value={initialStock}
                    onChange={(_, data) => setInitialStock(data.value)}
                    required
                  />
                </Field>
              </form>
            </DialogContent>
            <DialogActions className={styles.itemDialogActions}>
              <Button
                type="button"
                appearance="secondary"
                onClick={() => setItemDialogOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="warehouse-item-form"
                appearance="primary"
                className={styles.itemSaveButton}
                disabled={
                  saving ||
                  initialStock.trim() === "" ||
                  (kind === "spare-part" &&
                    (!compatibleAssetItemId ||
                      !name.trim() ||
                      !unit.trim() ||
                      storagePeriodMonths.trim() === "" ||
                      !Number.isSafeInteger(Number(storagePeriodMonths)) ||
                      Number(storagePeriodMonths) < 1 ||
                      Number(storagePeriodMonths) > 1200)) ||
                  (kind === "asset" &&
                    (!assetCategory ||
                      !assetSubcategory ||
                      (assetCategory === "juknis" && !assetCatalogId) ||
                      !assetType.trim() ||
                      !assetBrand.trim() ||
                      (assetCategory === "non-juknis" && !assetName.trim())))
                }
              >
                {saving ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={movementItem !== null}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setMovementItem(null)
            setSaveError("")
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody>
            <DialogTitle>Catat stok</DialogTitle>
            <DialogContent>
              {movementItem && (
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submit("movement")
                  }}
                >
                  <Text weight="semibold">{movementItem.name}</Text>
                  <Text size={200}>
                    Stok saat ini: {movementItem.stock.toLocaleString("id-ID")}{" "}
                    {movementItem.unit}
                  </Text>
                  <Field label="Jenis transaksi" required>
                    <Dropdown
                      value={movementType === "in" ? "Barang masuk" : "Barang keluar"}
                      selectedOptions={[movementType]}
                      onOptionSelect={(_, data) => {
                        if (data.optionValue === "in" || data.optionValue === "out") {
                          setMovementType(data.optionValue)
                        }
                      }}
                    >
                      <Option value="in" text="Barang masuk">
                        Barang masuk
                      </Option>
                      <Option value="out" text="Barang keluar">
                        Barang keluar
                      </Option>
                    </Dropdown>
                  </Field>
                  <Field label={`Jumlah (${movementItem.unit})`} required>
                    <Input
                      type="number"
                      min={1}
                      max={1_000_000}
                      step={1}
                      value={quantity}
                      onChange={(_, data) => setQuantity(data.value)}
                      required
                    />
                  </Field>
                  <Field label="Catatan" hint="Opsional">
                    <Input
                      value={note}
                      onChange={(_, data) => setNote(data.value)}
                      maxLength={500}
                    />
                  </Field>
                  <div className={styles.actions}>
                    <Button
                      type="button"
                      appearance="secondary"
                      onClick={() => setMovementItem(null)}
                    >
                      Batal
                    </Button>
                    <Button type="submit" appearance="primary" disabled={saving}>
                      {saving ? "Menyimpan…" : "Simpan transaksi"}
                    </Button>
                  </div>
                </form>
              )}
            </DialogContent>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={allocationDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open) {
            setAllocationDialogOpen(false)
            setAllocationItem(null)
            setSelectedAllocationItemId("")
            setAllocationError("")
            setAllocationCalendarOpen(false)
            setAllocationReceipt(null)
            setReceiptError("")
          }
        }}
      >
        <DialogSurface className={styles.allocationDialogSurface}>
          <DialogBody className={styles.allocationDialogBody}>
            <DialogTitle>
              {allocationReceipt
                ? "Alokasi aset tersimpan"
                : allocationAction === "allocate"
                  ? "Alokasikan aset ke SPPG"
                  : allocationAction === "transfer"
                    ? "Mutasi aset antar-SPPG"
                    : "Kembalikan aset ke gudang"}
            </DialogTitle>
            {allocationDialogOpen && (
              allocationReceipt ? (
                <div className={styles.allocationForm}>
                  <DialogContent className={styles.allocationDialogContent}>
                    <Text>
                      Alokasi berhasil dicatat. Buka PDF form serah terima
                      untuk dicetak atau disimpan.
                    </Text>
                    <div className={styles.allocationReceiptSummary}>
                      <Text weight="semibold">{allocationReceipt.itemName}</Text>
                      <Text>
                        {allocationReceipt.quantity.toLocaleString("id-ID")}{" "}
                        {allocationReceipt.unit} · {allocationReceipt.sppgName}
                      </Text>
                      <Text size={200}>
                        Tanggal transaksi:{" "}
                        {formatAllocationDate(
                          allocationReceipt.transactionDate,
                        )}
                      </Text>
                    </div>
                    {receiptError && (
                      <MessageBar intent="error">
                        <MessageBarBody>{receiptError}</MessageBarBody>
                      </MessageBar>
                    )}
                  </DialogContent>
                  <DialogActions className={styles.allocationReceiptActions}>
                    <Button
                      appearance="secondary"
                      disabled={generatingReceipt}
                      onClick={() => {
                        setAllocationDialogOpen(false)
                        setAllocationReceipt(null)
                      }}
                    >
                      Selesai
                    </Button>
                    <Button
                      appearance="primary"
                      icon={<DocumentPdfRegular />}
                      disabled={generatingReceipt}
                      onClick={() => void printAllocationReceipt()}
                    >
                      {generatingReceipt
                        ? "Menyiapkan PDF…"
                        : "Cetak serah terima"}
                    </Button>
                  </DialogActions>
                </div>
              ) : (
                <form
                  className={styles.allocationForm}
                  onSubmit={(event) => {
                    event.preventDefault()
                    void submitAllocation()
                  }}
                >
                <DialogContent className={styles.allocationDialogContent}>
                  {allocationError && (
                    <MessageBar intent="error">
                      <MessageBarBody>{allocationError}</MessageBarBody>
                    </MessageBar>
                  )}
                  {allocationItem === null && (
                    <>
                      {items.some((item) => item.stock > 0) ? (
                        <div className={styles.allocationSelectionRow}>
                          <Field label="Item gudang" required>
                            <Dropdown
                              placeholder="Pilih item aset"
                              value={selectedAllocationItem?.name ?? ""}
                              selectedOptions={
                                selectedAllocationItemId
                                  ? [selectedAllocationItemId]
                                  : []
                              }
                              onOptionSelect={(_, data) => {
                                if (typeof data.optionValue === "string") {
                                  setSelectedAllocationItemId(data.optionValue)
                                  setQuantity("")
                                }
                              }}
                            >
                              {items
                                .filter((item) => item.stock > 0)
                                .map((item) => (
                                  <Option
                                    key={item.id}
                                    value={item.id}
                                    text={`${item.name} · ${item.stock} ${item.unit}`}
                                  >
                                    {item.name} · {item.stock} {item.unit}
                                  </Option>
                                ))}
                            </Dropdown>
                          </Field>
                          {selectedAllocationItem && (
                            <div className={styles.allocationItemPreview}>
                              <Text size={200}>
                                {allocationAction === "allocate"
                                  ? "Stok gudang tersedia"
                                  : "Stok tersedia pada SPPG"}
                                :{" "}
                                <Text weight="semibold" size={200}>
                                  {allocationAction === "allocate"
                                    ? selectedAllocationItem.stock.toLocaleString(
                                        "id-ID",
                                      )
                                    : (
                                        allocations.find(
                                          (allocation) =>
                                            allocation.itemId ===
                                              selectedAllocationItem.id &&
                                            allocation.sppgId === fromSppgId,
                                        )?.quantity ?? 0
                                      ).toLocaleString("id-ID")}{" "}
                                  {selectedAllocationItem.unit}
                                </Text>
                              </Text>
                            </div>
                          )}
                        </div>
                      ) : (
                        <Text>
                          Belum ada item aset dengan stok tersedia. Tambahkan
                          stok melalui submenu Stok aset, lalu kembali ke sini.
                        </Text>
                      )}
                      {sppgs.length === 0 && (
                        <Text>Daftarkan SPPG sebelum mengalokasikan aset.</Text>
                      )}
                    </>
                  )}
                  {selectedAllocationItem && (
                    <>
                      {allocationItem !== null && (
                        <div className={styles.allocationItemSummary}>
                          <Text weight="semibold">
                            {selectedAllocationItem.name}
                          </Text>
                          {allocationAction === "allocate" ? (
                            <Text size={200}>
                              Stok gudang tersedia:{" "}
                              {selectedAllocationItem.stock.toLocaleString(
                                "id-ID",
                              )}{" "}
                              {selectedAllocationItem.unit}
                            </Text>
                          ) : (
                            <Text size={200}>
                              Saldo SPPG asal:{" "}
                              {(
                                allocations.find(
                                  (allocation) =>
                                    allocation.itemId ===
                                      selectedAllocationItem.id &&
                                    allocation.sppgId === fromSppgId,
                                )?.quantity ?? 0
                              ).toLocaleString("id-ID")}{" "}
                              {selectedAllocationItem.unit}
                            </Text>
                          )}
                        </div>
                      )}
                      <div className={styles.allocationColumns}>
                        <Field label="Tanggal transaksi" required>
                          <Popover
                            open={allocationCalendarOpen}
                            onOpenChange={(_, data) =>
                              setAllocationCalendarOpen(data.open)
                            }
                            trapFocus
                          >
                            <Input
                              value={allocationDateInput}
                              placeholder="DD/MM/YYYY"
                              disabled={saving}
                              aria-label="Masukkan tanggal transaksi"
                              onChange={(_, data) => {
                                setAllocationDateInput(data.value)
                                setAllocationDate(
                                  parseAllocationDateInput(data.value),
                                )
                                setAllocationError("")
                              }}
                              contentAfter={
                                <PopoverTrigger disableButtonEnhancement>
                                  <Button
                                    appearance="transparent"
                                    className={styles.allocationCalendarButton}
                                    icon={<CalendarRegular />}
                                    disabled={saving}
                                    aria-label="Pilih tanggal transaksi"
                                    type="button"
                                  />
                                </PopoverTrigger>
                              }
                              required
                            />
                            <PopoverSurface aria-label="Pilih tanggal transaksi">
                              <Calendar
                                value={dateForPicker(allocationDate)}
                                layout="overlay"
                                dayPicker={{
                                  ref: allocationCalendarDayRef,
                                  closeButton: { title: "Tutup kalender" },
                                }}
                                onSelectDate={(_, data) => {
                                  setAllocationDateValue(
                                    data.date ? localDateString(data.date) : "",
                                  )
                                  setAllocationError("")
                                  setAllocationCalendarOpen(false)
                                }}
                                onDismiss={() =>
                                  setAllocationCalendarOpen(false)
                                }
                              />
                            </PopoverSurface>
                          </Popover>
                        </Field>
                        <Field label="Jenis transaksi" required>
                          <Dropdown
                            value={
                              allocationAction === "allocate"
                                ? "Alokasi dari gudang"
                                : allocationAction === "transfer"
                                  ? "Mutasi antar-SPPG"
                                  : "Kembali ke gudang"
                            }
                            selectedOptions={[allocationAction]}
                            onOptionSelect={(_, data) => {
                              if (
                                data.optionValue === "allocate" ||
                                data.optionValue === "transfer" ||
                                data.optionValue === "return"
                              ) {
                                setAllocationAction(data.optionValue)
                                setFromSppgId(
                                  data.optionValue === "allocate"
                                    ? ""
                                    : fromSppgId,
                                )
                                setToSppgId("")
                              }
                            }}
                          >
                            <Option value="allocate" text="Alokasi dari gudang">
                              Alokasi dari gudang
                            </Option>
                            <Option value="transfer" text="Mutasi antar-SPPG">
                              Mutasi antar-SPPG
                            </Option>
                            <Option value="return" text="Kembali ke gudang">
                              Kembali ke gudang
                            </Option>
                          </Dropdown>
                        </Field>
                        {allocationAction === "allocate" ? (
                          <Field label="SPPG asal">
                            <Dropdown
                              placeholder="Tidak diperlukan"
                              value=""
                              selectedOptions={[]}
                              disabled
                            />
                          </Field>
                        ) : (
                          <Field label="SPPG asal" required>
                            <Dropdown
                              placeholder="Pilih SPPG asal"
                              value={
                                sppgs.find(
                                  (sppg) => sppg.id === fromSppgId,
                                )?.nama ?? ""
                              }
                              selectedOptions={fromSppgId ? [fromSppgId] : []}
                              onOptionSelect={(_, data) => {
                                if (typeof data.optionValue === "string") {
                                  setFromSppgId(data.optionValue)
                                  if (data.optionValue === toSppgId) {
                                    setToSppgId("")
                                  }
                                }
                              }}
                            >
                              {allocations
                                .filter(
                                  (allocation) =>
                                    allocation.itemId ===
                                    selectedAllocationItem.id,
                                )
                                .map((allocation) => (
                                  <Option
                                    key={allocation.sppgId}
                                    value={allocation.sppgId}
                                    text={allocation.sppgName}
                                  >
                                    {allocation.sppgName}
                                  </Option>
                                ))}
                            </Dropdown>
                          </Field>
                        )}
                        {allocationAction === "return" ? (
                          <Field label="SPPG tujuan">
                            <Dropdown
                              placeholder="Tidak diperlukan"
                              value=""
                              selectedOptions={[]}
                              disabled
                            />
                          </Field>
                        ) : (
                          <Field label="SPPG tujuan" required>
                            <Dropdown
                              placeholder="Pilih SPPG tujuan"
                              value={
                                sppgs.find(
                                  (sppg) => sppg.id === toSppgId,
                                )?.nama ?? ""
                              }
                              selectedOptions={toSppgId ? [toSppgId] : []}
                              onOptionSelect={(_, data) => {
                                if (typeof data.optionValue === "string") {
                                  setToSppgId(data.optionValue)
                                }
                              }}
                            >
                              {sppgs
                                .filter(
                                  (sppg) =>
                                    allocationAction !== "transfer" ||
                                    sppg.id !== fromSppgId,
                                )
                                .map((sppg) => (
                                  <Option
                                    key={sppg.id}
                                    value={sppg.id}
                                    text={sppg.nama}
                                  >
                                    {sppg.nama}
                                  </Option>
                                ))}
                            </Dropdown>
                          </Field>
                        )}
                        <Field
                          label={`Jumlah (${selectedAllocationItem.unit})`}
                          required
                        >
                          <Input
                            type="number"
                            min={1}
                            max={
                              allocationAction === "allocate"
                                ? selectedAllocationItem.stock
                                : allocations.find(
                                    (allocation) =>
                                      allocation.itemId ===
                                        selectedAllocationItem.id &&
                                      allocation.sppgId === fromSppgId,
                                  )?.quantity ?? 1_000_000
                            }
                            step={1}
                            value={quantity}
                            placeholder="Masukkan jumlah"
                            onChange={(_, data) => setQuantity(data.value)}
                            required
                          />
                        </Field>
                        <Field label="Catatan">
                          <Input
                            value={note}
                            placeholder="Tambahkan catatan"
                            onChange={(_, data) => setNote(data.value)}
                            maxLength={500}
                          />
                        </Field>
                        <div
                          className={styles.allocationColumnDivider}
                          role="separator"
                          aria-orientation="vertical"
                        />
                      </div>
                    </>
                  )}
                </DialogContent>
                <DialogActions className={styles.allocationDialogActions}>
                  <Button
                    type="button"
                    appearance="secondary"
                    onClick={() => {
                      setAllocationDialogOpen(false)
                      setAllocationItem(null)
                      setSelectedAllocationItemId("")
                      setAllocationReceipt(null)
                    }}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    appearance="primary"
                    disabled={
                      saving ||
                      !quantity ||
                      !selectedAllocationItem ||
                      !quantity ||
                      (allocationAction !== "allocate" && !fromSppgId) ||
                      (allocationAction !== "return" && !toSppgId) ||
                      (allocationAction === "transfer" &&
                        fromSppgId === toSppgId)
                    }
                  >
                    {saving
                      ? "Menyimpan…"
                      : allocationAction === "allocate"
                        ? "Alokasikan aset"
                        : "Simpan mutasi"}
                  </Button>
                </DialogActions>
                </form>
              )
            )}
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  )
}

"use client"

import * as React from "react"
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
  TableCellLayout,
  Text,
  ToggleButton,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  AddRegular,
  DocumentAddColor,
  EditFilled,
  EditRegular,
  EyeFilled,
  EyeRegular,
  DocumentArrowUpFilled,
  DocumentArrowUpRegular,
  MoreHorizontalRegular,
  GameControllerButtonXFilled,
  GameControllerButtonXRegular,
  bundleIcon,
} from "@fluentui/react-icons"
import type { TableColumnDefinition } from "@fluentui/react-components"
import { CalendarRegular } from "@fluentui/react-icons"
import { Calendar } from "@fluentui/react-calendar-preview"
import type { CalendarDayHandle } from "@fluentui/react-calendar-preview"
import type { LocalUser } from "@/lib/access-types"
import type { RABRecord } from "@/lib/rab"
import {
  MAX_RAB_ITEMS,
  MAX_RAB_ITEM_QUANTITY,
  MAX_RAB_ITEM_UNIT_LENGTH,
  MAX_RAB_NOTES_LENGTH,
} from "@/lib/rab"
import { RABNotesEditor } from "./rab-notes-editor"
import { RABNotesContent } from "./rab-notes-content"
import { isDateOnly, localDateString } from "@/lib/maintenance"
import { RABExportDialog } from "./rab-export-dialog"

type SppgOption = { id: string; nama: string }
type AssigneeOption = { id: string; name: string; role: string }
type RABItem = {
  id: string
  name: string
  quantity: number
  unit: string
  estimatedUnitCost: number
}
type RABForm = {
  rabDate: string
  sppgId: string
  assigneeId: string
}
type ItemDraft = {
  name: string
  quantity: string
  unit: string
  estimatedUnitCost: string
}

const EMPTY_ITEM_DRAFT: ItemDraft = {
  name: "",
  quantity: "",
  unit: "",
  estimatedUnitCost: "",
}

const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
})

const DeleteItemIcon = bundleIcon(
  GameControllerButtonXFilled,
  GameControllerButtonXRegular,
)
const EditItemIcon = bundleIcon(EditFilled, EditRegular)
const ViewRABIcon = bundleIcon(EyeFilled, EyeRegular)
const ExportRABIcon = bundleIcon(
  DocumentArrowUpFilled,
  DocumentArrowUpRegular,
)

function dateForPicker(value: string): Date | null {
  if (!isDateOnly(value)) return null
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function dateFromPicker(value: Date | null | undefined) {
  return value ? localDateString(value) : ""
}

function formatRABDate(value: string) {
  const date = dateForPicker(value)
  return date ? dateFormatter.format(date) : value
}

function formatCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 15)
  if (!digits) return ""
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Number(digits))
}

function parseCurrencyInput(value: string) {
  const digits = value.replace(/\D/g, "")
  return digits ? Number(digits) : 0
}

const useStyles = makeStyles({
  view: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
    marginTop: "24px",
  },
  datePicker: {
    width: "152px",
    minWidth: "152px",
    justifyContent: "flex-start",
  },
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  toolbarActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "8px",
  },
  tableWrap: {
    minWidth: 0,
    overflowX: "auto",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    minWidth: "680px",
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    gap: "8px",
    padding: "48px 24px",
    border: `1px dashed ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    textAlign: "center",
  },
  dialogSurface: {
    width: "min(820px, calc(100vw - 32px))",
    maxWidth: "820px",
  },
  rabDialogBody: {
    gridTemplateRows: "auto minmax(0, 1fr) auto",
    minHeight: 0,
  },
  dialogContent: {
    display: "grid",
    gap: "20px",
    minHeight: 0,
    overflowY: "auto",
    paddingTop: "12px",
    "@media (max-height: 359px)": {
      overflowY: "unset",
    },
  },
  rabTitle: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    minHeight: "40px",
    paddingLeft: "52px",
    paddingBottom: "12px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  rabTitleIcon: {
    position: "absolute",
    left: "0",
    top: "50%",
    transform: "translateY(-50%)",
  },
  rabTitleText: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  rabTitleHeading: {
    display: "block",
    fontSize: "16px",
    lineHeight: "20px",
    fontWeight: tokens.fontWeightSemibold,
  },
  rabSubtitle: {
    color: tokens.colorNeutralForeground2,
    fontSize: "12px",
    fontWeight: tokens.fontWeightRegular,
    lineHeight: "16px",
  },
  selectionFields: {
    display: "grid",
    gridTemplateColumns: "240px 240px",
    gap: "16px",
    "@media (max-width: 600px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  selectionDropdown: {
    width: "240px",
    minWidth: "240px",
  },
  section: {
    display: "grid",
    gap: "12px",
    minWidth: 0,
  },
  sectionHeading: {
    display: "grid",
    gap: "2px",
  },
  itemList: {
    display: "grid",
    gap: "8px",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: "12px",
    padding: "12px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 600px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  itemDescription: {
    display: "grid",
    gap: "3px",
    minWidth: 0,
  },
  itemMeta: {
    color: tokens.colorNeutralForeground2,
  },
  itemActions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "4px",
  },
  deleteItemButton: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled": {
      display: "inline",
    },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular": {
      display: "none",
    },
  },
  editItemButton: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled": {
      display: "inline",
    },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular": {
      display: "none",
    },
  },
  menuActionItem: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled": {
      display: "inline",
    },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular": {
      display: "none",
    },
  },
  itemDraft: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.4fr) minmax(84px, 0.7fr) minmax(100px, 0.8fr) minmax(145px, 1.2fr) 32px",
    alignItems: "end",
    gap: "12px",
    "& > *": {
      minWidth: 0,
    },
    "@media (max-width: 760px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  itemDraftField: {
    width: "100%",
    minWidth: 0,
    "& .fui-Input": {
      width: "100%",
      minWidth: 0,
    },
    "& .fui-Input__input": {
      minWidth: 0,
      boxSizing: "border-box",
    },
  },
  addItemButton: {
    width: "32px",
    minWidth: "32px",
    height: "32px",
    padding: "0",
    justifySelf: "start",
    alignSelf: "end",
  },
  editFields: {
    display: "grid",
    gridTemplateColumns:
      "minmax(0, 1.6fr) minmax(80px, 0.7fr) minmax(100px, 0.8fr) minmax(145px, 1.2fr)",
    alignItems: "end",
    gap: "10px",
    gridColumn: "1 / -1",
    "& > *": {
      minWidth: 0,
    },
    "@media (max-width: 760px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  summary: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  formError: {
    color: tokens.colorPaletteRedForeground1,
  },
  notesCount: {
    display: "flex",
    justifyContent: "flex-end",
    color: tokens.colorNeutralForeground2,
  },
  actionDetailSurface: {
    width: "min(620px, calc(100vw - 32px))",
    maxHeight: "calc(100dvh - 32px)",
  },
  actionDetailContent: {
    display: "grid",
    gap: "12px",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  detailField: {
    display: "grid",
    gap: "2px",
  },
  detailNotes: {
    gridColumn: "1 / -1",
    whiteSpace: "pre-wrap",
  },
  detailItems: {
    display: "grid",
    gap: "8px",
  },
  detailItem: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: "12px",
    padding: "10px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
})

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSppg(value: unknown): value is SppgOption {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.nama === "string"
  )
}

function isAssignee(value: unknown): value is AssigneeOption {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string"
  )
}

function isRABRecord(value: unknown): value is RABRecord {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    isDateOnly(value.rab_date) &&
    (typeof value.sppg_id === "string" || value.sppg_id === null) &&
    typeof value.sppg_name === "string" &&
    typeof value.assignee_id === "string" &&
    typeof value.assignee_name === "string" &&
    typeof value.notes === "string" &&
    (typeof value.created_by === "string" || value.created_by === null) &&
    typeof value.created_at === "string" &&
    typeof value.item_count === "number" &&
    Number.isSafeInteger(value.item_count) &&
    typeof value.grand_total === "number" &&
    Number.isSafeInteger(value.grand_total) &&
    Array.isArray(value.items) &&
    value.items.every(
      (item) =>
        isObject(item) &&
        typeof item.name === "string" &&
        typeof item.quantity === "number" &&
        typeof item.unit === "string" &&
        typeof item.estimatedUnitCost === "number",
    )
  )
}

function readRecords<T>(
  payload: unknown,
  predicate: (value: unknown) => value is T,
  message: string,
) {
  if (
    !isObject(payload) ||
    !Array.isArray(payload.records) ||
    !payload.records.every(predicate)
  ) {
    throw new Error(message)
  }
  return payload.records
}

function errorFromPayload(payload: unknown, fallback: string) {
  return isObject(payload) &&
    typeof payload.error === "string" &&
    payload.error.trim()
    ? payload.error
    : fallback
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

function createRABColumns({
  onView,
  onEdit,
  onExport,
  onDelete,
  canEdit,
  menuActionItemClassName,
}: {
  onView: (record: RABRecord) => void
  onEdit: (record: RABRecord) => void
  onExport: (record: RABRecord) => void
  onDelete: (record: RABRecord) => void
  canEdit: boolean
  menuActionItemClassName: string
}): TableColumnDefinition<RABRecord>[] {
  return [
  createTableColumn<RABRecord>({
    columnId: "rab_date",
    compare: (a, b) => a.rab_date.localeCompare(b.rab_date),
    renderHeaderCell: () => "Tanggal RAB",
    renderCell: (record) => (
      <TableCellLayout>
        {formatRABDate(record.rab_date)}
      </TableCellLayout>
    ),
  }),
  createTableColumn<RABRecord>({
    columnId: "sppg_name",
    compare: (a, b) => a.sppg_name.localeCompare(b.sppg_name),
    renderHeaderCell: () => "SPPG",
    renderCell: (record) => <TableCellLayout>{record.sppg_name}</TableCellLayout>,
  }),
  createTableColumn<RABRecord>({
    columnId: "assignee_name",
    compare: (a, b) => a.assignee_name.localeCompare(b.assignee_name),
    renderHeaderCell: () => "Petugas",
    renderCell: (record) => (
      <TableCellLayout>{record.assignee_name}</TableCellLayout>
    ),
  }),
  createTableColumn<RABRecord>({
    columnId: "item_count",
    compare: (a, b) => a.item_count - b.item_count,
    renderHeaderCell: () => "Jumlah item",
    renderCell: (record) => (
      <TableCellLayout>{record.item_count}</TableCellLayout>
    ),
  }),
  createTableColumn<RABRecord>({
    columnId: "grand_total",
    compare: (a, b) => a.grand_total - b.grand_total,
    renderHeaderCell: () => "Grand total",
    renderCell: (record) => (
      <TableCellLayout>{formatCurrency(record.grand_total)}</TableCellLayout>
    ),
  }),
  createTableColumn<RABRecord>({
    columnId: "actions",
    renderHeaderCell: () => "Aksi",
    renderCell: (record) => (
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Button
            appearance="subtle"
            icon={<MoreHorizontalRegular />}
            aria-label={`Pilihan aksi RAB ${record.sppg_name}`}
            title="Pilihan aksi"
          />
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem
              className={menuActionItemClassName}
              icon={<ViewRABIcon />}
              onClick={() => onView(record)}
            >
              Lihat
            </MenuItem>
            {canEdit && (
              <MenuItem
                className={menuActionItemClassName}
                icon={<EditItemIcon />}
                onClick={() => onEdit(record)}
              >
                Edit RAB
              </MenuItem>
            )}
            <MenuItem
              className={menuActionItemClassName}
              icon={<ExportRABIcon />}
              onClick={() => onExport(record)}
            >
              Ekspor
            </MenuItem>
            <MenuItem
              className={menuActionItemClassName}
              icon={<DeleteItemIcon />}
              onClick={() => onDelete(record)}
            >
              Hapus
            </MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>
    ),
  }),
]
}

function itemFromDraft(draft: ItemDraft): RABItem | null {
  const name = draft.name.trim()
  const quantity = Number(draft.quantity)
  const estimatedUnitCost = parseCurrencyInput(draft.estimatedUnitCost)
  const lineTotal = quantity * estimatedUnitCost
  if (
    !name ||
    name.length > 160 ||
    /[\u0000-\u001f\u007f]/.test(name) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > MAX_RAB_ITEM_QUANTITY ||
    !draft.unit.trim() ||
    draft.unit.trim().length > MAX_RAB_ITEM_UNIT_LENGTH ||
    /[\u0000-\u001f\u007f]/.test(draft.unit) ||
    !Number.isSafeInteger(estimatedUnitCost) ||
    estimatedUnitCost < 1 ||
    !Number.isSafeInteger(lineTotal)
  ) {
    return null
  }
  return {
    id: crypto.randomUUID(),
    name,
    quantity,
    unit: draft.unit.trim(),
    estimatedUnitCost,
  }
}

function itemDraftFromItem(item: RABItem): ItemDraft {
  return {
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    estimatedUnitCost: formatCurrencyInput(String(item.estimatedUnitCost)),
  }
}

function RABCreateDialog({
  open,
  onOpenChange,
  sppgs,
  assignees,
  record,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sppgs: SppgOption[]
  assignees: AssigneeOption[]
  record: RABRecord | null
  onSaved: (record: RABRecord) => void
}) {
  const styles = useStyles()
  const [form, setForm] = React.useState<RABForm>(() => ({
    rabDate: record?.rab_date ?? localDateString(),
    sppgId: record?.sppg_id ?? "",
    assigneeId: record?.assignee_id ?? "",
  }))
  const { rabDate, sppgId, assigneeId } = form
  const [notes, setNotes] = React.useState(record?.notes ?? "")
  const [items, setItems] = React.useState<RABItem[]>(() =>
    record
      ? record.items.map((item) => ({ ...item, id: crypto.randomUUID() }))
      : [],
  )
  const [draft, setDraft] = React.useState<ItemDraft>(EMPTY_ITEM_DRAFT)
  const [draftError, setDraftError] = React.useState("")
  const [editingItemId, setEditingItemId] = React.useState<string | null>(null)
  const [editingDraft, setEditingDraft] =
    React.useState<ItemDraft>(EMPTY_ITEM_DRAFT)
  const [editingError, setEditingError] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [calendarOpen, setCalendarOpen] = React.useState(false)
  const dayRef = React.useRef<CalendarDayHandle>(null)

  React.useEffect(() => {
    if (calendarOpen) {
      dayRef.current?.focus()
    }
  }, [calendarOpen])

  const grandTotal = items.reduce(
    (total, item) => total + item.quantity * item.estimatedUnitCost,
    0,
  )
  const hasDraftContent = Object.values(draft).some((value) => value.trim())
  const canSave =
    Boolean(
      rabDate &&
        sppgId &&
        assigneeId &&
        items.length > 0 &&
        notes.length <= MAX_RAB_NOTES_LENGTH,
    ) &&
    !hasDraftContent &&
    !editingItemId &&
    !saving
  const selectedAssignee = assignees.find(
    (person) => person.id === assigneeId,
  )

  function addItem() {
    if (items.length >= MAX_RAB_ITEMS) {
      setDraftError(`RAB maksimal memiliki ${MAX_RAB_ITEMS} item.`)
      return
    }
    const item = itemFromDraft(draft)
    if (!item) {
      setDraftError(
        "Isi nama item, kuantitas bilangan bulat, dan perkiraan biaya positif.",
      )
      return
    }
    const nextTotal = grandTotal + item.quantity * item.estimatedUnitCost
    if (!Number.isSafeInteger(nextTotal)) {
      setDraftError("Grand total melebihi batas perhitungan yang aman.")
      return
    }
    setItems((current) => [...current, item])
    setDraft(EMPTY_ITEM_DRAFT)
    setDraftError("")
    setFormError("")
  }

  function beginEdit(item: RABItem) {
    setEditingItemId(item.id)
    setEditingDraft(itemDraftFromItem(item))
    setEditingError("")
    setFormError("")
  }

  function saveEdit() {
    if (!editingItemId) return
    const item = itemFromDraft(editingDraft)
    if (!item) {
      setEditingError(
        "Isi nama item, kuantitas bilangan bulat, dan perkiraan biaya positif.",
      )
      return
    }
    const nextItems = items.map((current) =>
      current.id === editingItemId ? { ...item, id: editingItemId } : current,
    )
    const nextTotal = nextItems.reduce(
      (total, current) => total + current.quantity * current.estimatedUnitCost,
      0,
    )
    if (!Number.isSafeInteger(nextTotal)) {
      setEditingError("Grand total melebihi batas perhitungan yang aman.")
      return
    }
    setItems(nextItems)
    setEditingItemId(null)
    setEditingDraft(EMPTY_ITEM_DRAFT)
    setEditingError("")
  }

  function cancelEdit() {
    setEditingItemId(null)
    setEditingDraft(EMPTY_ITEM_DRAFT)
    setEditingError("")
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId))
    if (editingItemId === itemId) cancelEdit()
  }

  async function saveRAB() {
    if (!canSave) return
    setSaving(true)
    setFormError("")
    try {
      const response = await fetch(
        record ? `/api/rab/${encodeURIComponent(record.id)}` : "/api/rab",
        {
        method: record ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppgId,
          rabDate,
          assigneeId,
          notes,
          items: items.map(({ name, quantity, unit, estimatedUnitCost }) => ({
            name,
            quantity,
            unit,
            estimatedUnitCost,
          })),
        }),
      },
      )
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(
            payload,
            record ? "RAB gagal diperbarui." : "RAB gagal disimpan.",
          ),
        )
      }
      if (!isObject(payload) || !isRABRecord(payload.record)) {
        throw new Error("Respons penyimpanan RAB tidak valid.")
      }
      setSaving(false)
      onSaved(payload.record)
      onOpenChange(false)
    } catch (error) {
      setSaving(false)
      setFormError(
        error instanceof Error
          ? error.message
          : record
            ? "RAB gagal diperbarui."
            : "RAB gagal disimpan.",
      )
    }
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen && saving) return
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => changeOpen(data.open)}>
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody className={styles.rabDialogBody}>
          <DialogTitle className={styles.rabTitle}>
            <span className={styles.rabTitleText}>
              <Text as="span" className={styles.rabTitleHeading}>
                {record ? "Edit RAB" : "RAB baru"}
              </Text>
              <Text as="span" className={styles.rabSubtitle}>
                {record
                  ? "Perbarui data dan rincian item RAB."
                  : "Susun daftar item dan perkiraan biaya untuk diajukan."}
              </Text>
            </span>
            <DocumentAddColor
              className={styles.rabTitleIcon}
              fontSize={40}
              aria-hidden="true"
            />
          </DialogTitle>
          <DialogContent className={styles.dialogContent}>
            {formError && (
              <MessageBar intent="error">
                <MessageBarBody>{formError}</MessageBarBody>
              </MessageBar>
            )}
            <Field label="Tanggal RAB" required>
              <Popover
                open={calendarOpen}
                onOpenChange={(_event, data) => setCalendarOpen(data.open)}
                trapFocus
              >
                <PopoverTrigger disableButtonEnhancement>
                  <Button
                    className={styles.datePicker}
                    icon={<CalendarRegular />}
                    disabled={saving}
                    type="button"
                  >
                    {formatRABDate(rabDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverSurface aria-label="Pilih tanggal RAB">
                  <Calendar
                    value={dateForPicker(rabDate)}
                    layout="overlay"
                    dayPicker={{
                      ref: dayRef,
                      closeButton: { title: "Tutup kalender" },
                    }}
                    onSelectDate={(_event, data) => {
                      setForm((current) => ({
                        ...current,
                        rabDate: dateFromPicker(data.date),
                      }))
                      setCalendarOpen(false)
                    }}
                    onDismiss={() => setCalendarOpen(false)}
                  />
                </PopoverSurface>
              </Popover>
            </Field>
            <div className={styles.selectionFields}>
              <Field label="SPPG" required>
                <Dropdown
                  className={styles.selectionDropdown}
                  aria-label="Pilih SPPG"
                  placeholder="Pilih SPPG"
                  value={sppgs.find((item) => item.id === sppgId)?.nama ?? ""}
                  selectedOptions={sppgId ? [sppgId] : []}
                  onOptionSelect={(_, data) => {
                    setForm((current) => ({
                      ...current,
                      sppgId: data.optionValue ?? "",
                    }))
                    setFormError("")
                  }}
                  disabled={saving || sppgs.length === 0}
                >
                  {sppgs.map((sppg) => (
                    <Option key={sppg.id} value={sppg.id}>
                      {sppg.nama}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Petugas" required>
                <Dropdown
                  className={styles.selectionDropdown}
                  aria-label="Pilih petugas"
                  placeholder="Pilih petugas"
                  value={
                    selectedAssignee
                      ? `${selectedAssignee.name} (${selectedAssignee.role})`
                      : ""
                  }
                  selectedOptions={assigneeId ? [assigneeId] : []}
                  onOptionSelect={(_, data) => {
                    setForm((current) => ({
                      ...current,
                      assigneeId: data.optionValue ?? "",
                    }))
                    setFormError("")
                  }}
                  disabled={saving || assignees.length === 0}
                >
                  {assignees.map((person) => (
                    <Option
                      key={person.id}
                      value={person.id}
                      text={`${person.name} (${person.role})`}
                    >
                      {person.name} ({person.role})
                    </Option>
                  ))}
                </Dropdown>
              </Field>
            </div>
            <Field label="Keterangan / catatan">
              <RABNotesEditor
                disabled={saving}
                initialValue={record?.notes}
                onChange={setNotes}
              />
              <Text
                size={100}
                className={
                  notes.length > MAX_RAB_NOTES_LENGTH
                    ? styles.formError
                    : styles.notesCount
                }
              >
                {notes.length.toLocaleString("id-ID")} /{" "}
                {MAX_RAB_NOTES_LENGTH.toLocaleString("id-ID")}
              </Text>
            </Field>
            {notes.length > MAX_RAB_NOTES_LENGTH && (
              <Text className={styles.formError} size={200}>
                Keterangan melebihi batas {MAX_RAB_NOTES_LENGTH.toLocaleString("id-ID")} karakter.
              </Text>
            )}

            {sppgs.length === 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  Data SPPG belum tersedia. Tambahkan SPPG sebelum membuat RAB.
                </MessageBarBody>
              </MessageBar>
            )}
            {assignees.length === 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  Daftar petugas pemeliharaan belum tersedia. Tambahkan petugas
                  melalui menu Jadwal pemeliharaan.
                </MessageBarBody>
              </MessageBar>
            )}

            <section className={styles.section} aria-labelledby="rab-items-title">
              <div className={styles.sectionHeading}>
                <Text id="rab-items-title" as="h3" size={300} weight="semibold">
                  Item RAB
                </Text>
                <Text size={200} className={styles.itemMeta}>
                  Masukkan perkiraan biaya satuan. Subtotal dihitung dari
                  kuantitas × perkiraan biaya.
                </Text>
              </div>
              {items.length > 0 && (
                <ol className={styles.itemList} aria-label="Item RAB yang ditambahkan">
                  {items.map((item, index) => (
                    <li className={styles.item} key={item.id}>
                      {editingItemId === item.id ? (
                        <div className={styles.editFields}>
                          <Field
                            label="Nama item"
                            required
                            className={styles.itemDraftField}
                          >
                            <Input
                              value={editingDraft.name}
                              maxLength={160}
                              disabled={saving}
                              onChange={(_, data) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  name: data.value,
                                }))
                              }
                            />
                          </Field>
                          <Field
                            label="Kuantitas"
                            required
                            className={styles.itemDraftField}
                          >
                            <Input
                              type="number"
                              min={1}
                              max={MAX_RAB_ITEM_QUANTITY}
                              step={1}
                              value={editingDraft.quantity}
                              disabled={saving}
                              onChange={(_, data) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  quantity: data.value,
                                }))
                              }
                            />
                          </Field>
                          <Field
                            label="Satuan"
                            required
                            className={styles.itemDraftField}
                          >
                            <Input
                              value={editingDraft.unit}
                              maxLength={MAX_RAB_ITEM_UNIT_LENGTH}
                              placeholder="Contoh: unit"
                              disabled={saving}
                              onChange={(_, data) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  unit: data.value,
                                }))
                              }
                            />
                          </Field>
                          <Field
                            label="Biaya satuan (Rp)"
                            required
                            className={styles.itemDraftField}
                          >
                            <Input
                              type="text"
                              inputMode="numeric"
                              value={editingDraft.estimatedUnitCost}
                              placeholder="0"
                              contentBefore={
                                <Text size={200} weight="semibold">
                                  Rp
                                </Text>
                              }
                              disabled={saving}
                              onChange={(_, data) =>
                                setEditingDraft((current) => ({
                                  ...current,
                                  estimatedUnitCost: formatCurrencyInput(
                                    data.value,
                                  ),
                                }))
                              }
                            />
                          </Field>
                          {editingError && (
                            <Text className={styles.formError} size={200}>
                              {editingError}
                            </Text>
                          )}
                          <div className={styles.itemActions}>
                            <Button
                              type="button"
                              appearance="secondary"
                              disabled={saving}
                              onClick={cancelEdit}
                            >
                              Batal edit
                            </Button>
                            <Button
                              type="button"
                              appearance="primary"
                              disabled={saving}
                              onClick={saveEdit}
                            >
                              Simpan perubahan
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.itemDescription}>
                            <Text weight="semibold">
                              {index + 1}. {item.name}
                            </Text>
                            <Text size={200} className={styles.itemMeta}>
                              {item.quantity}{item.unit ? ` ${item.unit}` : ""} × {formatCurrency(item.estimatedUnitCost)}{" "}
                              · Subtotal{" "}
                              {formatCurrency(
                                item.quantity * item.estimatedUnitCost,
                              )}
                            </Text>
                          </div>
                          <div className={styles.itemActions}>
                            <Tooltip content="Edit item" relationship="label">
                              <Button
                                className={styles.editItemButton}
                                type="button"
                                appearance="subtle"
                                icon={<EditItemIcon />}
                                aria-label={`Edit item ${item.name}`}
                                disabled={saving || editingItemId !== null}
                                onClick={() => beginEdit(item)}
                              />
                            </Tooltip>
                            <Tooltip content="Hapus item" relationship="label">
                              <Button
                                className={styles.deleteItemButton}
                                type="button"
                                appearance="subtle"
                                icon={<DeleteItemIcon />}
                                aria-label={`Hapus item ${item.name}`}
                                disabled={saving}
                                onClick={() => removeItem(item.id)}
                              />
                            </Tooltip>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ol>
              )}

              <div className={styles.itemDraft}>
                <Field
                  label="Nama item"
                  required
                  className={styles.itemDraftField}
                >
                  <Input
                    value={draft.name}
                    maxLength={160}
                    placeholder="Contoh: Kompor"
                    disabled={saving}
                    onChange={(_, data) => {
                      setDraft((current) => ({ ...current, name: data.value }))
                      setDraftError("")
                    }}
                  />
                </Field>
                <Field
                  label="Kuantitas"
                  required
                  className={styles.itemDraftField}
                >
                  <Input
                    type="number"
                    min={1}
                    max={MAX_RAB_ITEM_QUANTITY}
                    step={1}
                    value={draft.quantity}
                    placeholder="0"
                    disabled={saving}
                    onChange={(_, data) => {
                      setDraft((current) => ({
                        ...current,
                        quantity: data.value,
                      }))
                      setDraftError("")
                    }}
                  />
                </Field>
                <Field
                  label="Satuan"
                  required
                  className={styles.itemDraftField}
                >
                  <Input
                    value={draft.unit}
                    maxLength={MAX_RAB_ITEM_UNIT_LENGTH}
                    placeholder="Contoh: unit"
                    disabled={saving}
                    onChange={(_, data) => {
                      setDraft((current) => ({
                        ...current,
                        unit: data.value,
                      }))
                      setDraftError("")
                    }}
                  />
                </Field>
                <Field
                  label="Biaya satuan (Rp)"
                  required
                  className={styles.itemDraftField}
                >
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={draft.estimatedUnitCost}
                    placeholder="0"
                    contentBefore={
                      <Text size={200} weight="semibold">
                        Rp
                      </Text>
                    }
                    disabled={saving}
                    onChange={(_, data) => {
                      setDraft((current) => ({
                        ...current,
                        estimatedUnitCost: formatCurrencyInput(data.value),
                      }))
                      setDraftError("")
                    }}
                  />
                </Field>
                <ToggleButton
                  className={styles.addItemButton}
                  type="button"
                  appearance="secondary"
                  checked={false}
                  icon={<AddRegular />}
                  aria-label="Tambah item"
                  disabled={saving || items.length >= MAX_RAB_ITEMS}
                  onClick={addItem}
                  title="Tambah item"
                />
                {draftError && (
                  <Text className={styles.formError} size={200}>
                    {draftError}
                  </Text>
                )}
              </div>
            </section>

            <div className={styles.summary}>
              <Text weight="semibold">Grand total</Text>
              <Text size={400} weight="semibold">
                {formatCurrency(grandTotal)}
              </Text>
            </div>
            {hasDraftContent && (
              <Text className={styles.formError} size={200}>
                Tambahkan atau kosongkan isian item sebelum menyimpan RAB.
              </Text>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              type="button"
              appearance="secondary"
              disabled={saving}
              onClick={() => changeOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              appearance="primary"
              disabled={!canSave}
              onClick={() => void saveRAB()}
            >
              {saving ? <Spinner size="tiny" /> : "Simpan"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export function RABManagement({ user }: { user: LocalUser }) {
  const styles = useStyles()
  const [records, setRecords] = React.useState<RABRecord[]>([])
  const [sppgs, setSppgs] = React.useState<SppgOption[]>([])
  const [assignees, setAssignees] = React.useState<AssigneeOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [viewTarget, setViewTarget] = React.useState<RABRecord | null>(null)
  const [editTarget, setEditTarget] = React.useState<RABRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<RABRecord | null>(null)
  const [exportTarget, setExportTarget] = React.useState<RABRecord | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")
  const canCreate =
    user.role === "admin" || user.permissions?.maintenance === true

  React.useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setLoadError("")
      try {
        const [rabResponse, sppgResponse, assigneeResponse] = await Promise.all([
          fetch("/api/rab", { cache: "no-store", signal: controller.signal }),
          fetch("/api/directory?kind=sppg", {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch("/api/maintenance/assignees", {
            cache: "no-store",
            signal: controller.signal,
          }),
        ])
        const [rabPayload, sppgPayload, assigneePayload]: unknown[] =
          await Promise.all([
            rabResponse.json().catch(() => null),
            sppgResponse.json().catch(() => null),
            assigneeResponse.json().catch(() => null),
          ])
        if (!rabResponse.ok) {
          throw new Error(errorFromPayload(rabPayload, "Daftar RAB gagal dimuat."))
        }
        if (!sppgResponse.ok) {
          throw new Error(errorFromPayload(sppgPayload, "Daftar SPPG gagal dimuat."))
        }
        if (!assigneeResponse.ok) {
          throw new Error(
            errorFromPayload(assigneePayload, "Daftar petugas gagal dimuat."),
          )
        }
        setRecords(readRecords(rabPayload, isRABRecord, "Daftar RAB tidak valid."))
        setSppgs(readRecords(sppgPayload, isSppg, "Daftar SPPG tidak valid."))
        setAssignees(
          readRecords(assigneePayload, isAssignee, "Daftar petugas tidak valid."),
        )
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Data RAB gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [refreshKey])

  const onSaved = React.useCallback((record: RABRecord) => {
    setRecords((current) =>
      [record, ...current.filter((item) => item.id !== record.id)].sort(
        (a, b) => b.created_at.localeCompare(a.created_at),
      ),
    )
  }, [])

  async function deleteRAB() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    setDeleteError("")
    try {
      const response = await fetch(`/api/rab/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(errorFromPayload(payload, "RAB gagal dihapus."))
      }
      setRecords((current) =>
        current.filter((record) => record.id !== deleteTarget.id),
      )
      setDeleteTarget(null)
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "RAB gagal dihapus.",
      )
    } finally {
      setDeleting(false)
    }
  }

  const columns = React.useMemo(
    () =>
      createRABColumns({
        onView: setViewTarget,
        onEdit: setEditTarget,
        onExport: setExportTarget,
        menuActionItemClassName: styles.menuActionItem,
        canEdit: canCreate,
        onDelete: (record) => {
          setDeleteError("")
          setDeleteTarget(record)
        },
      }),
    [canCreate, styles.menuActionItem],
  )

  return (
    <section className={styles.view} aria-labelledby="rab-management-title">
      <div className={styles.toolbar}>
        <div>
          <Text id="rab-management-title" as="h2" size={400} weight="semibold">
            Daftar RAB
          </Text>
          <Text size={200}>
            RAB yang disimpan untuk disiapkan sebagai pengajuan.
          </Text>
        </div>
        {canCreate && (
          <div className={styles.toolbarActions}>
            <Button
              appearance="primary"
              icon={<AddRegular />}
              disabled={loading || Boolean(loadError)}
              onClick={() => setDialogOpen(true)}
            >
              RAB baru
            </Button>
          </div>
        )}
      </div>

      {loadError && (
        <MessageBar intent="error">
          <MessageBarBody>
            {loadError}{" "}
            <Button
              appearance="transparent"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Coba lagi
            </Button>
          </MessageBarBody>
        </MessageBar>
      )}

      {loadError ? null : loading ? (
        <Spinner label="Memuat daftar RAB" />
      ) : records.length === 0 ? (
        <div className={styles.emptyState}>
          <Text size={300} weight="semibold">
            Belum ada RAB
          </Text>
          <Text size={200}>
            RAB yang disimpan akan tampil di sini untuk disiapkan sebagai
            pengajuan.
          </Text>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <DataGrid
            className={styles.table}
            items={records}
            columns={columns}
            getRowId={(record) => record.id}
            sortable
            aria-label="Daftar RAB"
          >
            <DataGridHeader>
              <DataGridRow>
                {({ renderHeaderCell }) => (
                  <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                )}
              </DataGridRow>
            </DataGridHeader>
            <DataGridBody<RABRecord>>
              {({ item, rowId }) => (
                <DataGridRow<RABRecord> key={rowId}>
                  {({ renderCell }) => (
                    <DataGridCell>{renderCell(item)}</DataGridCell>
                  )}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </div>
      )}

      <Dialog open={Boolean(viewTarget)} onOpenChange={(_, data) => {
        if (!data.open) setViewTarget(null)
      }}>
        <DialogSurface className={styles.actionDetailSurface}>
          <DialogBody>
            <DialogTitle>Rincian RAB</DialogTitle>
            {viewTarget && (
              <DialogContent className={styles.actionDetailContent}>
                <div className={styles.detailGrid}>
                  <div className={styles.detailField}>
                    <Text size={200}>Tanggal RAB</Text>
                    <Text weight="semibold">{formatRABDate(viewTarget.rab_date)}</Text>
                  </div>
                  <div className={styles.detailField}>
                    <Text size={200}>SPPG</Text>
                    <Text weight="semibold">{viewTarget.sppg_name}</Text>
                  </div>
                  <div className={styles.detailField}>
                    <Text size={200}>Petugas</Text>
                    <Text weight="semibold">{viewTarget.assignee_name}</Text>
                  </div>
                  <div className={styles.detailField}>
                    <Text size={200}>Grand total</Text>
                    <Text weight="semibold">{formatCurrency(viewTarget.grand_total)}</Text>
                  </div>
                  {viewTarget.notes && (
                    <div className={`${styles.detailField} ${styles.detailNotes}`}>
                      <Text size={200}>Keterangan / catatan</Text>
                      <RABNotesContent value={viewTarget.notes} />
                    </div>
                  )}
                </div>
                <div className={styles.detailItems}>
                  {viewTarget.items.map((item, index) => (
                    <div className={styles.detailItem} key={`${item.name}-${index}`}>
                      <Text weight="semibold">
                        {index + 1}. {item.name}
                      </Text>
                      <Text size={200}>
                        {item.quantity}{item.unit ? ` ${item.unit}` : ""} × {formatCurrency(item.estimatedUnitCost)}
                      </Text>
                    </div>
                  ))}
                </div>
              </DialogContent>
            )}
            <DialogActions>
              <Button appearance="secondary" onClick={() => setViewTarget(null)}>
                Tutup
              </Button>
              {viewTarget && (
                canCreate && (
                  <Button
                    appearance="secondary"
                    icon={<EditRegular />}
                    onClick={() => {
                      setEditTarget(viewTarget)
                      setViewTarget(null)
                    }}
                  >
                    Edit RAB
                  </Button>
                )
              )}
              {viewTarget && (
                <Button
                  appearance="primary"
                  icon={<DocumentArrowUpRegular />}
                  onClick={() => setExportTarget(viewTarget)}
                >
                  Ekspor
                </Button>
              )}
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(_, data) => {
        if (!data.open && !deleting) setDeleteTarget(null)
      }}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Hapus RAB?</DialogTitle>
            <DialogContent>
              {deleteError && (
                <MessageBar intent="error">
                  <MessageBarBody>{deleteError}</MessageBarBody>
                </MessageBar>
              )}
              <Text>
                RAB untuk {deleteTarget?.sppg_name ?? "SPPG ini"} akan dihapus
                beserta seluruh itemnya.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </Button>
              <Button
                appearance="primary"
                disabled={deleting}
                onClick={() => void deleteRAB()}
              >
                {deleting ? <Spinner size="tiny" /> : "Hapus"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {exportTarget && (
        <RABExportDialog
          open
          record={exportTarget}
          onOpenChange={(open) => {
            if (!open) setExportTarget(null)
          }}
        />
      )}

      {(dialogOpen || editTarget) && (
        <RABCreateDialog
          key={editTarget?.id ?? "new"}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDialogOpen(false)
              setEditTarget(null)
            }
          }}
          sppgs={sppgs}
          assignees={assignees}
          record={editTarget}
          onSaved={onSaved}
        />
      )}
    </section>
  )
}

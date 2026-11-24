"use client"

import * as React from "react"
import {
  Button,
  Badge,
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
  Spinner,
  SplitButton,
  Switch,
  TableCellLayout,
  Text,
  Textarea,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  AddRegular,
  CalendarDateFilled,
  CalendarDateRegular,
  CheckmarkCircleFilled,
  CheckmarkCircleRegular,
  DeleteRegular,
  DocumentArrowUpFilled,
  DocumentArrowUpRegular,
  InfoRegular,
  bundleIcon,
} from "@fluentui/react-icons"
import { Calendar as CalendarPreview } from "@fluentui/react-calendar-preview"
import {
  Calendar,
  DayOfWeek,
  type CalendarDayProps,
  type CalendarStrings,
} from "@fluentui/react-calendar-compat"
import type {
  MenuButtonProps,
  TableColumnDefinition,
} from "@fluentui/react-components"
import type { LocalUser } from "@/lib/access-types"
import type { SppgDirectoryRecord } from "@/lib/directory-types"
import {
  localDateString,
  getMaintenanceOccurrences,
  getMaintenanceOccurrencesForMonth,
  getMaintenanceRecurrenceLabel,
  isMaintenanceOccurrenceListed,
  isValidMaintenancePhone,
  MAX_MAINTENANCE_NEEDS,
  parseMaintenanceNeeds,
  MAINTENANCE_ASSIGNEE_ROLES,
  type MaintenanceAssetOption,
  type MaintenanceAssignee,
  type MaintenanceAssigneeRole,
  type MaintenanceNeed,
  type MaintenanceNeedDraft,
  type MaintenanceOccurrence,
  type MaintenanceOccurrenceStatus,
  type MaintenanceOccurrenceState,
  type MaintenanceRecurrence,
  type MaintenanceSchedule,
  type MaintenanceType,
} from "@/lib/maintenance"
import { MaintenanceReportDialog } from "./maintenance-report-dialog"

const MAINTENANCE_PAGE_SIZE = 5
type MaintenanceScheduleTableRow = MaintenanceOccurrence & {
  status: MaintenanceOccurrenceStatus | null
}

const CalendarButtonIcon = bundleIcon(
  CalendarDateFilled,
  CalendarDateRegular,
)
const ExportMenuIcon = bundleIcon(
  DocumentArrowUpFilled,
  DocumentArrowUpRegular,
)

const useStyles = makeStyles({
  view: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
    marginTop: "24px",
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
  maintenanceSplitButton: {
    "& .fui-SplitButton__menuButton .fui-MenuButton__menuIcon": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
    },
    "& .fui-SplitButton__menuButton .fui-MenuButton__menuIcon > svg": {
      display: "block",
    },
  },
  calendarButton: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled": {
      display: "inline",
    },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular": {
      display: "none",
    },
  },
  exportMenuItem: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled": {
      display: "inline",
    },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular": {
      display: "none",
    },
  },
  calendarLayout: {
    display: "grid",
    gridTemplateColumns: "max-content minmax(280px, 320px)",
    alignItems: "start",
    gap: "20px",
    minWidth: 0,
    "@media (max-width: 920px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  calendarWidget: {
    minWidth: 0,
    maxWidth: "100%",
    justifySelf: "start",
    "& .fui-CalendarDayGrid__dayButton .fui-CalendarDayGrid__dayMarker": {
      backgroundColor: tokens.colorBrandForeground1,
      height: "7px",
      width: "7px",
    },
    "& [aria-current='date'] .fui-CalendarDayGrid__dayButton .fui-CalendarDayGrid__dayMarker":
      {
      backgroundColor: tokens.colorNeutralForegroundOnBrand,
    },
    "@media (forced-colors: active)": {
      "& .fui-CalendarDayGrid__dayButton .fui-CalendarDayGrid__dayMarker": {
        backgroundColor: "WindowText",
        forcedColorAdjust: "none",
      },
      "& [aria-selected='true'] .fui-CalendarDayGrid__dayButton .fui-CalendarDayGrid__dayMarker":
        {
          backgroundColor: "HighlightText",
        },
      "& [aria-current='date'] .fui-CalendarDayGrid__dayButton .fui-CalendarDayGrid__dayMarker":
        {
          backgroundColor: "Window",
        },
    },
  },
  calendarDialogSurface: {
    width: "min(900px, calc(100vw - 32px))",
    maxWidth: "900px",
  },
  calendarDialogContent: {
    maxHeight: "min(70vh, 560px)",
    overflowY: "auto",
  },
  calendarDetails: {
    display: "grid",
    gap: "8px",
    width: "100%",
    maxWidth: "320px",
    minWidth: 0,
    minHeight: 0,
    maxHeight: "min(40vh, 280px)",
    overflowY: "auto",
    overscrollBehaviorY: "contain",
    paddingTop: "12px",
    paddingLeft: "16px",
    borderLeft: `1px solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 920px)": {
      paddingLeft: 0,
      borderLeft: "none",
      borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
  },
  calendarAgendaList: {
    display: "grid",
    gap: 0,
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  calendarAgendaHeading: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  calendarAgendaItem: {
    display: "grid",
    gap: "4px",
    paddingBlock: "12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  calendarAgendaTitle: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "4px 12px",
  },
  calendarAgendaDetails: {
    color: tokens.colorNeutralForeground2,
    overflowWrap: "anywhere",
  },
  tableShell: {
    minWidth: 0,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  dataGridViewport: {
    minWidth: 0,
    overflowX: "auto",
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
  dataGrid: {
    minWidth: "900px",
  },
  itemCell: {
    display: "grid",
    minWidth: 0,
  },
  itemName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  },
  itemTooltipContent: {
    display: "grid",
    gap: "4px",
    maxWidth: "320px",
  },
  secondaryText: {
    color: tokens.colorNeutralForeground3,
  },
  state: {
    display: "grid",
    justifyItems: "center",
    gap: "10px",
    padding: "40px 20px",
    textAlign: "center",
  },
  dialogSurface: {
    width: "min(680px, calc(100vw - 32px))",
    maxWidth: "680px",
    maxHeight: "calc(100dvh - 32px)",
  },
  dialogBody: {
    display: "grid",
    minHeight: 0,
    maxHeight: "calc(100dvh - 80px)",
    "@media (min-width: 481px)": {
      gridTemplateRows: "auto minmax(0, 1fr) auto",
    },
  },
  dialogContent: {
    minHeight: 0,
    overflowY: "auto",
    overscrollBehaviorY: "contain",
  },
  form: {
    display: "grid",
    gap: "16px",
    paddingTop: "8px",
  },
  planningFields: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
    alignItems: "start",
    gap: "16px",
    minWidth: 0,
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  planningFieldLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    minHeight: "24px",
  },
  assetDetailsTooltip: {
    display: "grid",
    gap: "4px",
    maxWidth: "280px",
    overflowWrap: "anywhere",
  },
  doneNeedsButton: {
    "&:hover [data-completion-icon='regular'], &:focus-visible [data-completion-icon='regular']":
      {
        display: "none",
      },
    "&:hover [data-completion-icon='filled'], &:focus-visible [data-completion-icon='filled']":
      {
        display: "block",
        color: tokens.colorBrandForeground1,
      },
  },
  doneNeedsIcon: {
    display: "inline-grid",
    placeItems: "center",
    "& > svg": {
      gridArea: "1 / 1",
    },
    "& [data-completion-icon='filled']": {
      display: "none",
    },
  },
  formFieldGroup: {
    display: "grid",
    gap: "8px",
    minWidth: 0,
  },
  assigneePickerRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 32px",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  assigneeDropdown: {
    width: "100%",
    minWidth: 0,
  },
  section: {
    display: "grid",
    gap: "12px",
    paddingTop: "16px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  assigneeDialogSurface: {
    width: "min(480px, calc(100vw - 32px))",
    maxWidth: "480px",
  },
  summary: {
    display: "grid",
    gap: "12px",
    paddingTop: "8px",
  },
  summaryLine: {
    display: "grid",
    gap: "4px",
  },
  needsList: {
    display: "grid",
    gap: "6px",
    maxHeight: "min(22vh, 180px)",
    overflowY: "auto",
    overscrollBehaviorY: "contain",
    listStyleType: "none",
    margin: 0,
    padding: 0,
  },
  needItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    minWidth: 0,
    paddingTop: "8px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  needItemDescription: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  needItemMeta: {
    color: tokens.colorNeutralForeground2,
    overflowWrap: "anywhere",
  },
  needDraft: {
    display: "grid",
    gap: "10px",
    paddingTop: "8px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  needDraftFields: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignItems: "end",
    gap: "8px",
    minWidth: 0,
    "@media (max-width: 420px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  needDraftNameField: {
    gridColumn: "1 / -1",
  },
  needDraftNotesField: {
    gridColumn: "1 / -1",
  },
  needDraftActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "8px",
  },
  needsSummary: {
    margin: 0,
    paddingLeft: "20px",
  },
  scheduleNote: {
    maxWidth: "32ch",
    whiteSpace: "normal",
  },
  clickableScheduleRow: {
    cursor: "pointer",
    "&:hover": {
      backgroundColor: tokens.colorSubtleBackgroundHover,
    },
  },
  previewSurface: {
    width: "min(760px, calc(100vw - 32px))",
    maxWidth: "760px",
    maxHeight: "calc(100dvh - 32px)",
  },
  previewContent: {
    display: "grid",
    gap: "16px",
    minHeight: 0,
    overflowY: "auto",
  },
  previewDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px 24px",
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  previewField: {
    display: "grid",
    gap: "2px",
    minWidth: 0,
  },
  previewActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: "8px",
    gridColumn: "1 / -1",
    width: "100%",
  },
  previewActionButton: {
    flexShrink: 0,
    whiteSpace: "nowrap",
  },
})

type SppgOption = Pick<
  SppgDirectoryRecord,
  "id" | "nama" | "kepala_sppg" | "pic" | "lokasi"
>

type ScheduleForm = {
  sppgId: string
  assetKey: string
  maintenanceType: MaintenanceType | ""
  notes: string
  scheduledDate: string
  recurrenceEnabled: boolean
  recurrence: Exclude<MaintenanceRecurrence, "none">
  recurrenceDays: string
  assigneeIds: string[]
  needs: Array<MaintenanceNeed & { id: string }>
  needDraft: MaintenanceNeedDraft
  showNeedsForm: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseRecords<T>(
  payload: unknown,
  isRecord: (value: unknown) => value is T,
  fallback: string,
) {
  if (
    !isObject(payload) ||
    !Array.isArray(payload.records) ||
    !payload.records.every(isRecord)
  ) {
    throw new Error(fallback)
  }
  return payload.records
}

function isSppg(value: unknown): value is SppgOption {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.nama === "string" &&
    typeof value.kepala_sppg === "string" &&
    typeof value.pic === "string" &&
    typeof value.lokasi === "string"
  )
}

function isAssignee(value: unknown): value is MaintenanceAssignee {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.role === "string" &&
    typeof value.phone === "string"
  )
}

function isAssetOption(value: unknown): value is MaintenanceAssetOption {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.category === "string" &&
    typeof value.name === "string" &&
    typeof value.details === "string" &&
    typeof value.quantity === "number" &&
    typeof value.unit === "string"
  )
}

function isMaintenanceSchedule(value: unknown): value is MaintenanceSchedule {
  return (
    isObject(value) &&
    typeof value.id === "string" &&
    (typeof value.sppg_id === "string" || value.sppg_id === null) &&
    typeof value.sppg_name === "string" &&
    typeof value.asset_source === "string" &&
    typeof value.asset_category === "string" &&
    typeof value.asset_name === "string" &&
    typeof value.asset_details === "string" &&
    (value.maintenance_type === "routine" ||
      value.maintenance_type === "repair") &&
    typeof value.notes === "string" &&
    typeof value.scheduled_date === "string" &&
    typeof value.recurrence === "string" &&
    (typeof value.recurrence_days === "number" ||
      value.recurrence_days === null) &&
    typeof value.assignees === "string" &&
    parseMaintenanceNeeds(value.needs).ok &&
    typeof value.created_at === "string"
  )
}

function isMaintenanceOccurrenceState(
  value: unknown,
): value is MaintenanceOccurrenceState {
  return (
    isObject(value) &&
    typeof value.schedule_id === "string" &&
    typeof value.occurrence_date === "string" &&
    (value.status === "completed" || value.status === "dismissed") &&
    typeof value.updated_at === "string"
  )
}

function maintenanceOccurrenceKey(scheduleId: string, date: string) {
  return `${scheduleId}:${date}`
}

function assetKey(asset: Pick<MaintenanceAssetOption, "source" | "id">) {
  return `${asset.source}:${asset.id}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(
    localDateFromString(value),
  )
}

function localDateFromString(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function maintenanceTypeLabel(type: MaintenanceType) {
  return type === "routine" ? "Maintenance rutin" : "Perbaikan"
}

function errorFromPayload(payload: unknown, fallback: string) {
  return isObject(payload) &&
    typeof payload.error === "string" &&
    payload.error.trim()
    ? payload.error
    : fallback
}

function emptyForm(): ScheduleForm {
  return {
    sppgId: "",
    assetKey: "",
    maintenanceType: "",
    notes: "",
    scheduledDate: localDateString(),
    recurrenceEnabled: false,
    recurrence: "custom",
    recurrenceDays: "",
    assigneeIds: [],
    needs: [],
    needDraft: { name: "", quantity: "", unit: "", notes: "" },
    showNeedsForm: false,
  }
}

function MaintenanceScheduleDialog({
  open,
  onOpenChange,
  sppgs,
  assignees,
  onAddAssignee,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sppgs: SppgOption[]
  assignees: MaintenanceAssignee[]
  onAddAssignee: () => void
  onSaved: () => void
}) {
  const styles = useStyles()
  const [form, setForm] = React.useState<ScheduleForm>(emptyForm)
  const [assets, setAssets] = React.useState<MaintenanceAssetOption[]>([])
  const [assetsLoading, setAssetsLoading] = React.useState(false)
  const [assetsError, setAssetsError] = React.useState("")
  const [formError, setFormError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [confirming, setConfirming] = React.useState(false)
  const [confirmingNeedDraftCancellation, setConfirmingNeedDraftCancellation] =
    React.useState(false)

  React.useEffect(() => {
    if (!open || !form.sppgId) {
      return
    }

    const controller = new AbortController()
    void (async () => {
      setAssetsLoading(true)
      setAssetsError("")
      try {
        const response = await fetch(
          `/api/maintenance/assets?sppgId=${encodeURIComponent(form.sppgId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            errorFromPayload(payload, "Daftar aset SPPG gagal dimuat."),
          )
        }
        setAssets(parseRecords(payload, isAssetOption, "Daftar aset tidak valid."))
      } catch (failure) {
        if (!controller.signal.aborted) {
          setAssetsError(
            failure instanceof Error
              ? failure.message
              : "Daftar aset SPPG gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setAssetsLoading(false)
      }
    })()
    return () => controller.abort()
  }, [form.sppgId, open])

  function resetForm() {
    setForm(emptyForm())
    setAssets([])
    setFormError("")
    setConfirming(false)
    setConfirmingNeedDraftCancellation(false)
  }

  function changeOpen(nextOpen: boolean) {
    if (!nextOpen && saving) return
    if (!nextOpen) resetForm()
    onOpenChange(nextOpen)
  }

  const selectedSppg = sppgs.find((sppg) => sppg.id === form.sppgId)
  const selectedAsset = assets.find(
    (asset) => assetKey(asset) === form.assetKey,
  )
  const todayDateString = localDateString()
  const minSelectableDate = React.useMemo(
    () => localDateFromString(todayDateString),
    [todayDateString],
  )
  const selectedScheduleDate = React.useMemo(
    () => localDateFromString(form.scheduledDate),
    [form.scheduledDate],
  )
  const selectedAssigneeLabels = assignees
    .filter((person) => form.assigneeIds.includes(person.id))
    .map((person) => `${person.name} (${person.role})`)
    .join(", ")
  const hasSelectedAssignee = form.assigneeIds.length > 0
  const parsedNeeds = parseMaintenanceNeeds(form.needs)
  const needDraftIsEmpty = !(
    form.needDraft.name.trim() ||
    form.needDraft.quantity.trim() ||
    form.needDraft.unit.trim() ||
    form.needDraft.notes.trim()
  )
  function discardNeedDraft() {
    setConfirmingNeedDraftCancellation(false)
    setForm((current) => ({
      ...current,
      showNeedsForm: false,
      needDraft: {
        name: "",
        quantity: "",
        unit: "",
        notes: "",
      },
    }))
  }
  function requestNeedDraftCancellation() {
    if (needDraftIsEmpty) {
      discardNeedDraft()
      return
    }
    setConfirmingNeedDraftCancellation(true)
  }
  const parsedNeedDraft = parseMaintenanceNeeds(
    needDraftIsEmpty
      ? []
      : [
          {
            ...form.needDraft,
            quantity: Number(form.needDraft.quantity),
          },
        ],
  )
  const canAddNeed =
    form.needs.length < MAX_MAINTENANCE_NEEDS &&
    !needDraftIsEmpty &&
    parsedNeedDraft.ok &&
    parsedNeedDraft.needs.length === 1
  const hasValidNeeds = parsedNeeds.ok && needDraftIsEmpty
  const hasValidRecurrence =
    !form.recurrenceEnabled ||
    form.recurrence !== "custom" ||
    (form.recurrenceDays !== "" &&
      Number.isSafeInteger(Number(form.recurrenceDays)) &&
      Number(form.recurrenceDays) >= 1 &&
      Number(form.recurrenceDays) <= 36500)
  const canReview =
    Boolean(
      selectedSppg &&
        selectedAsset &&
        form.maintenanceType &&
        form.notes.trim() &&
        form.scheduledDate &&
        hasSelectedAssignee,
    ) &&
    hasValidRecurrence &&
    hasValidNeeds &&
    !assetsLoading &&
    !saving

  async function saveSchedule() {
    if (
      !selectedSppg ||
      !selectedAsset ||
      !form.maintenanceType ||
      !canReview ||
      !parsedNeeds.ok
    ) {
      return
    }
    setSaving(true)
    setFormError("")
    try {
      const response = await fetch("/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppgId: form.sppgId,
          assetSource: selectedAsset.source,
          assetRecordId: selectedAsset.id,
          maintenanceType: form.maintenanceType,
          notes: form.notes,
          scheduledDate: form.scheduledDate,
          recurrence:
            form.maintenanceType === "routine" && form.recurrenceEnabled
              ? form.recurrence
              : "none",
          recurrenceDays:
            form.recurrenceEnabled && form.recurrence === "custom"
              ? Number(form.recurrenceDays)
              : null,
          assigneeIds: form.assigneeIds,
          needs: parsedNeeds.needs,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Jadwal pemeliharaan gagal disimpan."),
        )
      }
      resetForm()
      onOpenChange(false)
      onSaved()
    } catch (failure) {
      setFormError(
        failure instanceof Error
          ? failure.message
          : "Jadwal pemeliharaan gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(_, data) => changeOpen(data.open)}
      modalType="modal"
    >
      <DialogSurface className={styles.dialogSurface}>
        <DialogBody className={styles.dialogBody}>
          <DialogTitle>
            {confirmingNeedDraftCancellation
              ? "Buang draft kebutuhan?"
              : confirming
                ? "Tinjau jadwal pemeliharaan"
                : "Tambah jadwal pemeliharaan"}
          </DialogTitle>
          <DialogContent className={styles.dialogContent}>
            {confirmingNeedDraftCancellation ? (
              <Text>
                Isian kebutuhan yang belum ditambahkan akan dibuang. Kebutuhan
                yang sudah masuk ke daftar tetap tersimpan.
              </Text>
            ) : confirming ? (
              <div className={styles.summary}>
                <Text>
                  Periksa detail rencana ini sebelum menyimpannya.
                </Text>
                {[
                  ["SPPG", selectedSppg?.nama],
                  [
                    "Item aset",
                    selectedAsset
                      ? `${selectedAsset.name} · ${selectedAsset.category}`
                      : undefined,
                  ],
                  [
                    "Jenis",
                    form.maintenanceType
                      ? maintenanceTypeLabel(form.maintenanceType)
                      : undefined,
                  ],
                  ["Tanggal", formatDate(form.scheduledDate)],
                  [
                    "Petugas",
                    [
                      ...assignees
                        .filter((person) =>
                          form.assigneeIds.includes(person.id),
                        )
                        .map((person) => `${person.name} (${person.role})`),
                    ].join(", "),
                  ],
                  [
                    "Periodesasi",
                    form.maintenanceType === "routine"
                      ? getMaintenanceRecurrenceLabel(
                          form.recurrenceEnabled ? form.recurrence : "none",
                          form.recurrenceEnabled &&
                            form.recurrence === "custom"
                            ? Number(form.recurrenceDays)
                            : null,
                        )
                      : "Sekali",
                  ],
                  ["Keterangan", form.notes.trim()],
                ].map(([label, value]) => (
                  <div className={styles.summaryLine} key={label}>
                    <Text size={200} weight="semibold">
                      {label}
                    </Text>
                    <Text>{value || "—"}</Text>
                  </div>
                ))}
                {form.needs.length > 0 && (
                  <div className={styles.summaryLine}>
                    <Text size={200} weight="semibold">
                      Kebutuhan yang direncanakan
                    </Text>
                    <ul className={styles.needsSummary}>
                                      {form.needs.map((need) => (
                                        <li key={need.id}>
                          {need.name} — {need.quantity} {need.unit}
                          {need.notes.trim() ? ` · ${need.notes.trim()}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <form
                id="maintenance-form"
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault()
                  setFormError("")
                  if (canReview) setConfirming(true)
                }}
              >
                <div className={styles.planningFields}>
                  <div className={styles.formFieldGroup}>
                    <Field label="SPPG" required>
                      <Dropdown
                        value={selectedSppg?.nama ?? ""}
                        selectedOptions={form.sppgId ? [form.sppgId] : []}
                        placeholder={
                          sppgs.length === 0
                            ? "Belum ada data SPPG"
                            : "Pilih SPPG"
                        }
                        disabled={sppgs.length === 0}
                        onOptionSelect={(_, data) => {
                          setAssets([])
                          setAssetsError("")
                          setForm((current) => ({
                            ...current,
                            sppgId: data.optionValue ?? "",
                            assetKey: "",
                          }))
                        }}
                      >
                        {sppgs.map((sppg) => (
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
                  </div>
                  <Field label="Jenis rencana" required>
                    <Dropdown
                      value={
                        form.maintenanceType
                          ? maintenanceTypeLabel(form.maintenanceType)
                          : ""
                      }
                      selectedOptions={
                        form.maintenanceType ? [form.maintenanceType] : []
                      }
                      placeholder="Pilih jenis rencana"
                      onOptionSelect={(_, data) => {
                        const type =
                          data.optionValue === "routine" ||
                          data.optionValue === "repair"
                            ? data.optionValue
                            : ""
                        setForm((current) => ({
                          ...current,
                          maintenanceType: type,
                          recurrenceEnabled:
                            type === "routine" && current.recurrenceEnabled,
                        }))
                      }}
                    >
                      <Option value="routine">Maintenance rutin</Option>
                      <Option value="repair">Perbaikan</Option>
                    </Dropdown>
                  </Field>
                </div>
                <div className={styles.section}>
                  <div className={styles.planningFields}>
                    <div className={styles.formFieldGroup}>
                      <Field
                        label={
                          <span className={styles.planningFieldLabel}>
                            Item aset tercatat
                            {selectedAsset && (
                              <Tooltip
                                content={
                                  <div className={styles.assetDetailsTooltip}>
                                    <Text size={200} weight="semibold">
                                      {selectedAsset.details ||
                                        selectedAsset.category}
                                    </Text>
                                    <Text size={200}>
                                      Jumlah tercatat {selectedAsset.quantity}{" "}
                                      {selectedAsset.unit}
                                    </Text>
                                  </div>
                                }
                                relationship="description"
                              >
                                <Button
                                  type="button"
                                  appearance="subtle"
                                  size="small"
                                  icon={<InfoRegular />}
                                  aria-label="Lihat detail item aset tercatat"
                                />
                              </Tooltip>
                            )}
                          </span>
                        }
                        required
                      >
                        <Dropdown
                          value={
                            selectedAsset
                              ? `${selectedAsset.name} — ${selectedAsset.category}`
                              : ""
                          }
                          selectedOptions={
                            selectedAsset ? [assetKey(selectedAsset)] : []
                          }
                          placeholder={
                            !form.sppgId
                              ? "Pilih SPPG terlebih dahulu"
                              : assetsLoading
                                ? "Memuat item aset…"
                                : assets.length === 0
                                  ? "Belum ada item aset tercatat"
                                  : "Pilih satu item aset"
                          }
                          disabled={
                            !form.sppgId || assetsLoading || assets.length === 0
                          }
                          onOptionSelect={(_, data) =>
                            setForm((current) => ({
                              ...current,
                              assetKey: data.optionValue ?? "",
                            }))
                          }
                        >
                          {assets.map((asset) => (
                            <Option
                              key={assetKey(asset)}
                              value={assetKey(asset)}
                              text={`${asset.name} — ${asset.category}`}
                            >
                              {asset.name} — {asset.category}
                              {asset.details ? ` · ${asset.details}` : ""}
                              {` · ${asset.quantity} ${asset.unit}`}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                      {assetsError && (
                        <MessageBar intent="error">
                          <MessageBarBody>{assetsError}</MessageBarBody>
                        </MessageBar>
                      )}
                    </div>
                    <div className={styles.formFieldGroup}>
                      <Field
                        label={
                          <span className={styles.planningFieldLabel}>
                            Petugas
                          </span>
                        }
                        required
                      >
                        <div className={styles.assigneePickerRow}>
                          <Dropdown
                            className={styles.assigneeDropdown}
                            multiselect
                            value={selectedAssigneeLabels}
                            selectedOptions={form.assigneeIds}
                            placeholder={
                              assignees.length > 0
                                ? "Pilih petugas"
                                : "Belum ada petugas terdaftar"
                            }
                            disabled={assignees.length === 0}
                            onOptionSelect={(_, data) =>
                              setForm((current) => ({
                                ...current,
                                assigneeIds: data.selectedOptions,
                              }))
                            }
                          >
                            {assignees.map((person) => {
                              const label = `${person.name} · ${person.role}${person.phone ? ` · ${person.phone}` : ""}`
                              return (
                                <Option
                                  key={person.id}
                                  value={person.id}
                                  text={label}
                                >
                                  {label}
                                </Option>
                              )
                            })}
                          </Dropdown>
                          <Tooltip
                            content="Tambah petugas"
                            relationship="label"
                          >
                            <Button
                              type="button"
                              appearance="primary"
                              size="medium"
                              icon={<AddRegular />}
                              aria-label="Tambah petugas"
                              onClick={onAddAssignee}
                            />
                          </Tooltip>
                        </div>
                      </Field>
                      {assignees.length === 0 && (
                        <Text size={200} className={styles.secondaryText}>
                          Belum ada petugas terdaftar. Gunakan tombol + untuk
                          menambahkan petugas.
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
                <Field label="Keterangan" required>
                  <Textarea
                    value={form.notes}
                    maxLength={1000}
                    onChange={(_, data) =>
                      setForm((current) => ({
                        ...current,
                        notes: data.value,
                      }))
                    }
                    placeholder="Rencana pekerjaan atau catatan masalah"
                  />
                </Field>
                <div className={styles.section}>
                  <div className={styles.toolbar}>
                    <div className={styles.formFieldGroup}>
                      <Text as="h3" size={300} weight="semibold">
                        Kebutuhan pemeliharaan
                      </Text>
                      <Text size={200} className={styles.secondaryText}>
                        Catat oli, suku cadang, atau kebutuhan lain untuk rencana ini.
                      </Text>
                    </div>
                    <div className={styles.toolbarActions}>
                      {form.showNeedsForm && !needDraftIsEmpty && (
                        <Button
                          type="button"
                          appearance="subtle"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              needDraft: {
                                name: "",
                                quantity: "",
                                unit: "",
                                notes: "",
                              },
                            }))
                          }
                        >
                          Kosongkan
                        </Button>
                      )}
                      <Button
                        className={
                          form.showNeedsForm ? styles.doneNeedsButton : undefined
                        }
                        type="button"
                        appearance={
                          form.showNeedsForm ? "subtle" : "secondary"
                        }
                        icon={
                          form.showNeedsForm ? (
                            <span className={styles.doneNeedsIcon}>
                              <CheckmarkCircleRegular
                                aria-hidden="true"
                                data-completion-icon="regular"
                              />
                              <CheckmarkCircleFilled
                                aria-hidden="true"
                                data-completion-icon="filled"
                              />
                            </span>
                          ) : (
                            <AddRegular />
                          )
                        }
                        disabled={form.showNeedsForm && !needDraftIsEmpty}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            showNeedsForm: !current.showNeedsForm,
                          }))
                        }
                      >
                        {form.showNeedsForm ? "Selesai" : "Tambah kebutuhan"}
                      </Button>
                    </div>
                  </div>
                  {form.needs.length > 0 && (
                    <ol className={styles.needsList} aria-label="Daftar kebutuhan">
                      {form.needs.map((need, index) => (
                        <li className={styles.needItem} key={need.id}>
                          <div className={styles.needItemDescription}>
                            <Text weight="semibold">
                              {index + 1}. {need.name} — {need.quantity} {need.unit}
                            </Text>
                            {need.notes && (
                              <Text
                                size={200}
                                className={styles.needItemMeta}
                              >
                                {need.notes}
                              </Text>
                            )}
                          </div>
                          <Tooltip
                            content="Hapus kebutuhan"
                            relationship="label"
                          >
                            <Button
                              type="button"
                              appearance="subtle"
                              icon={<DeleteRegular />}
                              aria-label={`Hapus kebutuhan ${index + 1}`}
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  needs: current.needs.filter(
                                    (item) => item.id !== need.id,
                                  ),
                                }))
                              }
                            />
                          </Tooltip>
                        </li>
                      ))}
                    </ol>
                  )}
                  {form.showNeedsForm && (
                    <div className={styles.needDraft}>
                      <div className={styles.needDraftFields}>
                        <Field
                          className={styles.needDraftNameField}
                          label="Nama kebutuhan"
                          required
                        >
                          <Input
                            value={form.needDraft.name}
                            maxLength={120}
                            aria-label="Nama kebutuhan"
                            placeholder="Contoh: Oli mesin"
                            onChange={(_, data) =>
                              setForm((current) => ({
                                ...current,
                                needDraft: {
                                  ...current.needDraft,
                                  name: data.value,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field
                          label="Jumlah"
                          required
                        >
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            value={form.needDraft.quantity}
                            aria-label="Jumlah kebutuhan"
                            placeholder="0"
                            onChange={(_, data) =>
                              setForm((current) => ({
                                ...current,
                                needDraft: {
                                  ...current.needDraft,
                                  quantity: data.value,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field
                          label="Satuan"
                          required
                        >
                          <Input
                            value={form.needDraft.unit}
                            maxLength={32}
                            aria-label="Satuan kebutuhan"
                            placeholder="L, pcs"
                            onChange={(_, data) =>
                              setForm((current) => ({
                                ...current,
                                needDraft: {
                                  ...current.needDraft,
                                  unit: data.value,
                                },
                              }))
                            }
                          />
                        </Field>
                        <Field
                          className={styles.needDraftNotesField}
                          label="Catatan (opsional)"
                        >
                          <Input
                            value={form.needDraft.notes}
                            maxLength={500}
                            aria-label="Catatan kebutuhan"
                            placeholder="Spesifikasi atau catatan"
                            onChange={(_, data) =>
                              setForm((current) => ({
                                ...current,
                                needDraft: {
                                  ...current.needDraft,
                                  notes: data.value,
                                },
                              }))
                            }
                          />
                        </Field>
                      </div>
                      <div className={styles.needDraftActions}>
                        <Button
                          type="button"
                          appearance="secondary"
                          onClick={requestNeedDraftCancellation}
                        >
                          Batal
                        </Button>
                        <Button
                          type="button"
                          appearance="primary"
                          icon={<AddRegular />}
                          disabled={!canAddNeed}
                          onClick={() => {
                            if (
                              !canAddNeed ||
                              !parsedNeedDraft.ok ||
                              parsedNeedDraft.needs.length !== 1
                            ) {
                              return
                            }
                            setForm((current) => ({
                              ...current,
                              needs: [
                                ...current.needs,
                                {
                                  id: crypto.randomUUID(),
                                  ...parsedNeedDraft.needs[0],
                                },
                              ],
                              needDraft: {
                                name: "",
                                quantity: "",
                                unit: "",
                                notes: "",
                              },
                            }))
                          }}
                        >
                          Tambahkan
                        </Button>
                      </div>
                      {!needDraftIsEmpty && parsedNeedDraft.ok && (
                        <Text size={200} className={styles.secondaryText}>
                          Pilih Tambahkan agar kebutuhan masuk ke daftar jadwal.
                        </Text>
                      )}
                    </div>
                  )}
                  {!needDraftIsEmpty && !parsedNeedDraft.ok && (
                    <MessageBar intent="warning">
                      <MessageBarBody>{parsedNeedDraft.error}</MessageBarBody>
                    </MessageBar>
                  )}
                </div>
                <div className={styles.section}>
                  <Field label="Tanggal penugasan" required>
                    <CalendarPreview
                      aria-label="Tanggal penugasan"
                      goToTodayButton={null}
                      minDate={minSelectableDate}
                      value={selectedScheduleDate}
                      onSelectDate={(_, data) =>
                        setForm((current) => ({
                          ...current,
                          scheduledDate: localDateString(data.date),
                        }))
                      }
                    />
                  </Field>
                  <Text size={200} className={styles.secondaryText}>
                    Tanggal sebelum hari ini tidak tersedia.
                  </Text>
                </div>
                {form.maintenanceType === "routine" && (
                  <div className={styles.section}>
                    <Switch
                      checked={form.recurrenceEnabled}
                      label="Buat jadwal rutin berulang"
                      onChange={(_, data) =>
                        setForm((current) => ({
                          ...current,
                          recurrenceEnabled: data.checked,
                        }))
                      }
                    />
                    {form.recurrenceEnabled && (
                      <>
                        <Field label="Periodesasi">
                          <Dropdown
                            value={
                              form.recurrence === "custom"
                                ? "Setiap beberapa hari"
                                : getMaintenanceRecurrenceLabel(
                                    form.recurrence,
                                    null,
                                  )
                            }
                            selectedOptions={[form.recurrence]}
                            onOptionSelect={(_, data) => {
                              if (
                                data.optionValue === "custom" ||
                                data.optionValue === "weekly" ||
                                data.optionValue === "monthly" ||
                                data.optionValue === "yearly"
                              ) {
                                setForm((current) => ({
                                  ...current,
                                  recurrence: data.optionValue as Exclude<
                                    MaintenanceRecurrence,
                                    "none"
                                  >,
                                }))
                              }
                            }}
                          >
                            <Option value="custom">Setiap beberapa hari</Option>
                            <Option value="weekly">Mingguan</Option>
                            <Option value="monthly">Bulanan</Option>
                            <Option value="yearly">Tahunan</Option>
                          </Dropdown>
                        </Field>
                        {form.recurrence === "custom" && (
                          <Field label="Ulangi setiap (hari)" required>
                            <Input
                              type="number"
                              min={1}
                              max={36500}
                              step={1}
                              value={form.recurrenceDays}
                              onChange={(_, data) =>
                                setForm((current) => ({
                                  ...current,
                                  recurrenceDays: data.value,
                                }))
                              }
                            />
                          </Field>
                        )}
                        <Text size={200} className={styles.secondaryText}>
                          Periodesasi adalah rencana operator. Tanggal
                          berikutnya tidak dibuat otomatis.
                        </Text>
                      </>
                    )}
                  </div>
                )}
              </form>
            )}
            {formError && (
              <MessageBar intent="error">
                <MessageBarBody>{formError}</MessageBarBody>
              </MessageBar>
            )}
          </DialogContent>
          <DialogActions>
            {confirmingNeedDraftCancellation ? (
              <>
                <Button
                  appearance="secondary"
                  onClick={() =>
                    setConfirmingNeedDraftCancellation(false)
                  }
                >
                  Kembali mengisi
                </Button>
                <Button appearance="primary" onClick={discardNeedDraft}>
                  Buang draft
                </Button>
              </>
            ) : confirming ? (
              <>
                <Button
                  appearance="secondary"
                  disabled={saving}
                  onClick={() => setConfirming(false)}
                >
                  Kembali ke form
                </Button>
                <Button
                  appearance="primary"
                  disabled={saving}
                  onClick={() => void saveSchedule()}
                >
                  {saving ? "Menyimpan…" : "Konfirmasi dan simpan"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  appearance="secondary"
                  disabled={saving}
                  onClick={() => changeOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  form="maintenance-form"
                  disabled={!canReview}
                  onClick={() => {
                    if (canReview) setConfirming(true)
                  }}
                >
                  Tinjau jadwal
                </Button>
              </>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
    </>
  )
}

function MaintenanceAssigneeDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}) {
  const styles = useStyles()
  const [name, setName] = React.useState("")
  const [role, setRole] = React.useState<MaintenanceAssigneeRole | "">("")
  const [phone, setPhone] = React.useState("")
  const [error, setError] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  function changeOpen(nextOpen: boolean) {
    if (saving && !nextOpen) return
    if (!nextOpen) {
      setName("")
      setRole("")
      setPhone("")
      setError("")
    }
    onOpenChange(nextOpen)
  }

  const canSave =
    name.trim().length > 0 &&
    name.trim().length <= 100 &&
    role !== "" &&
    isValidMaintenancePhone(phone) &&
    !saving

  async function saveAssignee() {
    if (!canSave || !role) return
    setSaving(true)
    setError("")
    try {
      const response = await fetch("/api/maintenance/assignees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role, phone }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Petugas gagal disimpan."),
        )
      }
      setName("")
      setRole("")
      setPhone("")
      setError("")
      onOpenChange(false)
      onSaved()
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Petugas gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => changeOpen(data.open)}
      modalType="modal"
    >
      <DialogSurface className={styles.assigneeDialogSurface}>
        <DialogBody>
          <DialogTitle>Tambah petugas</DialogTitle>
          <DialogContent>
            <form
              id="maintenance-assignee-form"
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault()
                void saveAssignee()
              }}
            >
              <Field label="Nama" required>
                <Input
                  autoComplete="name"
                  maxLength={100}
                  value={name}
                  onChange={(_, data) => setName(data.value)}
                />
              </Field>
              <Field label="Jabatan" required>
                <Dropdown
                  placeholder="Pilih jabatan"
                  value={role}
                  selectedOptions={role ? [role] : []}
                  onOptionSelect={(_, data) => {
                    const selectedRole = MAINTENANCE_ASSIGNEE_ROLES.find(
                      (candidate) => candidate === data.optionValue,
                    )
                    setRole(selectedRole ?? "")
                  }}
                >
                  <Option value="Teknisi">Teknisi</Option>
                  <Option value="Staff Yayasan">Staff Yayasan</Option>
                </Dropdown>
              </Field>
              <Field label="Nomor telepon" required>
                <Input
                  type="tel"
                  autoComplete="tel"
                  maxLength={32}
                  value={phone}
                  onChange={(_, data) => setPhone(data.value)}
                />
              </Field>
            </form>
            {error && (
              <MessageBar intent="error">
                <MessageBarBody>{error}</MessageBarBody>
              </MessageBar>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              disabled={saving}
              onClick={() => changeOpen(false)}
            >
              Batal
            </Button>
            <Button
              appearance="primary"
              type="submit"
              form="maintenance-assignee-form"
              disabled={!canSave}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

function utcCalendarDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function dateFromCalendarString(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function calendarDateLabel(
  value: string,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("id-ID", {
    ...options,
    timeZone: "UTC",
  }).format(utcCalendarDate(value))
}

const maintenanceCalendarStrings: CalendarStrings = {
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
  dayMarkedAriaLabel: "Ada jadwal pemeliharaan",
}

function MaintenanceCalendar({
  schedules,
}: {
  schedules: MaintenanceSchedule[]
}) {
  const styles = useStyles()
  const [selectedDate, setSelectedDate] = React.useState(() => new Date())
  const selectedDateString = localDateString(selectedDate)
  const calendarDayProps = React.useMemo<Partial<CalendarDayProps>>(
    () => ({
      getMarkedDays: (startingDate, endingDate) => {
        const markedDates = getMaintenanceOccurrences(
          schedules,
          localDateString(startingDate),
          localDateString(endingDate),
        ).map(({ date }) => date)

        return [...new Set(markedDates)].map(dateFromCalendarString)
      },
    }),
    [schedules],
  )
  const selectedOccurrences = React.useMemo(
    () =>
      getMaintenanceOccurrences(
        schedules,
        selectedDateString,
        selectedDateString,
      ),
    [schedules, selectedDateString],
  )

  return (
    <div className={styles.calendarLayout}>
      <div
        className={styles.calendarWidget}
        role="group"
        aria-label="Kalender jadwal pemeliharaan"
      >
        <Calendar
          calendarDayProps={calendarDayProps}
          firstDayOfWeek={DayOfWeek.Monday}
          onSelectDate={setSelectedDate}
          showGoToToday
          strings={maintenanceCalendarStrings}
          value={selectedDate}
        />
      </div>
      <section
        className={styles.calendarDetails}
        aria-labelledby="maintenance-calendar-agenda"
      >
        <Text
          id="maintenance-calendar-agenda"
          as="h3"
          size={300}
          weight="semibold"
          className={styles.calendarAgendaHeading}
        >
          {calendarDateLabel(selectedDateString, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          <Badge
            appearance="tint"
            color={selectedOccurrences.length > 0 ? "brand" : "subtle"}
            size="small"
            aria-label={`${selectedOccurrences.length} agenda`}
          >
            {selectedOccurrences.length} agenda
          </Badge>
        </Text>
        {selectedOccurrences.length === 0 ? (
          <Text size={200}>
            {schedules.length === 0
              ? "Belum ada jadwal pemeliharaan."
              : "Tidak ada jadwal pemeliharaan pada tanggal ini."}
          </Text>
        ) : (
          <ul className={styles.calendarAgendaList}>
            {selectedOccurrences.map(({ schedule }) => (
              <li
                className={styles.calendarAgendaItem}
                key={`${schedule.id}-${selectedDateString}`}
              >
                <div className={styles.calendarAgendaTitle}>
                  <Text weight="semibold">{schedule.asset_name}</Text>
                  <Text size={200}>
                    {maintenanceTypeLabel(schedule.maintenance_type)}
                    {schedule.maintenance_type === "routine"
                      ? ` · ${getMaintenanceRecurrenceLabel(schedule.recurrence, schedule.recurrence_days)}`
                      : ""}
                  </Text>
                </div>
                <Text size={200} className={styles.calendarAgendaDetails}>
                  {schedule.sppg_name} · {schedule.asset_category}
                  {schedule.asset_details
                    ? ` · ${schedule.asset_details}`
                    : ""}
                </Text>
                <Text size={200} className={styles.calendarAgendaDetails}>
                  Petugas: {schedule.assignees || "Belum ditentukan"}
                </Text>
                {schedule.notes && <Text size={200}>{schedule.notes}</Text>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export function MaintenanceManagement({ user }: { user: LocalUser }) {
  const styles = useStyles()
  const [sppgs, setSppgs] = React.useState<SppgOption[]>([])
  const [assignees, setAssignees] = React.useState<MaintenanceAssignee[]>([])
  const [schedules, setSchedules] = React.useState<MaintenanceSchedule[]>([])
  const [occurrenceStatuses, setOccurrenceStatuses] = React.useState<
    Record<string, MaintenanceOccurrenceStatus>
  >({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [selectedOccurrence, setSelectedOccurrence] =
    React.useState<MaintenanceScheduleTableRow | null>(null)
  const [occurrenceActionLoading, setOccurrenceActionLoading] =
    React.useState(false)
  const [occurrenceActionError, setOccurrenceActionError] = React.useState("")
  const [calendarDialogOpen, setCalendarDialogOpen] = React.useState(false)
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [assigneeDialogOpen, setAssigneeDialogOpen] = React.useState(false)
  const [refresh, setRefresh] = React.useState(0)
  const [pageIndex, setPageIndex] = React.useState(0)
  const canManage =
    user.role === "admin" ||
    user.permissions?.maintenance === true

  React.useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setLoading(true)
      setError("")
      try {
        const month = localDateString().slice(0, 7)
        const [directoryResponse, assigneeResponse, scheduleResponse, occurrenceResponse] =
          await Promise.all([
            fetch("/api/directory?kind=sppg", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/maintenance/assignees", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch("/api/maintenance", {
              cache: "no-store",
              signal: controller.signal,
            }),
            fetch(`/api/maintenance/occurrences?month=${month}`, {
              cache: "no-store",
              signal: controller.signal,
            }),
          ])
        const [
          directoryPayload,
          assigneePayload,
          schedulePayload,
          occurrencePayload,
        ] =
          await Promise.all([
            directoryResponse.json().catch(() => null) as Promise<unknown>,
            assigneeResponse.json().catch(() => null) as Promise<unknown>,
            scheduleResponse.json().catch(() => null) as Promise<unknown>,
            occurrenceResponse.json().catch(() => null) as Promise<unknown>,
          ])
        for (const [response, payload, fallback] of [
          [
            directoryResponse,
            directoryPayload,
            "Daftar SPPG gagal dimuat.",
          ],
          [assigneeResponse, assigneePayload, "Daftar petugas gagal dimuat."],
          [
            scheduleResponse,
            schedulePayload,
            "Jadwal pemeliharaan gagal dimuat.",
          ],
          [
            occurrenceResponse,
            occurrencePayload,
            "Status jadwal pemeliharaan gagal dimuat.",
          ],
        ] as const) {
          if (!response.ok) throw new Error(errorFromPayload(payload, fallback))
        }
        setSppgs(parseRecords(directoryPayload, isSppg, "Daftar SPPG tidak valid."))
        setAssignees(
          parseRecords(
            assigneePayload,
            isAssignee,
            "Daftar petugas tidak valid.",
          ),
        )
        setSchedules(
          parseRecords(
            schedulePayload,
            isMaintenanceSchedule,
            "Daftar jadwal tidak valid.",
          ),
        )
        const occurrenceStates = parseRecords(
          occurrencePayload,
          isMaintenanceOccurrenceState,
          "Status jadwal pemeliharaan tidak valid.",
        )
        setOccurrenceStatuses(
          Object.fromEntries(
            occurrenceStates.map((occurrence) => [
              maintenanceOccurrenceKey(
                occurrence.schedule_id,
                occurrence.occurrence_date,
              ),
              occurrence.status,
            ]),
          ),
        )
        setPageIndex(0)
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(
            failure instanceof Error
              ? failure.message
              : "Data pemeliharaan gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [refresh])

  const columns = React.useMemo<
    TableColumnDefinition<MaintenanceScheduleTableRow>[]
  >(
    () => [
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "scheduled_date",
        renderHeaderCell: () => "Tanggal",
        renderCell: ({ date }) => (
          <TableCellLayout>{formatDate(date)}</TableCellLayout>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "sppg_name",
        renderHeaderCell: () => "SPPG",
        renderCell: ({ schedule }) => (
          <TableCellLayout truncate>
            {schedule.sppg_id
              ? schedule.sppg_name
              : `${schedule.sppg_name} (dihapus)`}
          </TableCellLayout>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "asset_name",
        renderHeaderCell: () => "Item aset",
        renderCell: ({ schedule }) => (
          <Tooltip
            content={
              <div className={styles.itemTooltipContent}>
                <Text weight="semibold">{schedule.asset_name}</Text>
                <Text size={200}>
                  {schedule.asset_category}
                  {schedule.asset_details ? ` · ${schedule.asset_details}` : ""}
                </Text>
              </div>
            }
            relationship="description"
          >
            <Text className={styles.itemName} weight="semibold">
              {schedule.asset_name}
            </Text>
          </Tooltip>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "maintenance_type",
        renderHeaderCell: () => "Jenis rencana",
        renderCell: ({ schedule }) => (
          <TableCellLayout>
            {maintenanceTypeLabel(schedule.maintenance_type)}
          </TableCellLayout>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "assignees",
        renderHeaderCell: () => "Petugas",
        renderCell: ({ schedule }) => (
          <TableCellLayout truncate>{schedule.assignees}</TableCellLayout>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "recurrence",
        renderHeaderCell: () => "Periodesasi",
        renderCell: ({ schedule }) => (
          <TableCellLayout>
            {schedule.maintenance_type === "routine"
              ? getMaintenanceRecurrenceLabel(
                  schedule.recurrence,
                  schedule.recurrence_days,
                )
              : "Sekali"}
          </TableCellLayout>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "status",
        renderHeaderCell: () => "Status",
        renderCell: ({ status }) => (
          <Badge
            appearance="filled"
            color={status === "completed" ? "success" : "brand"}
            size="small"
          >
            {status === "completed" ? "Selesai" : "Belum selesai"}
          </Badge>
        ),
      }),
      createTableColumn<MaintenanceScheduleTableRow>({
        columnId: "notes",
        renderHeaderCell: () => "Keterangan",
        renderCell: ({ schedule }) => (
          <TableCellLayout className={styles.scheduleNote} truncate>
            {schedule.notes}
          </TableCellLayout>
        ),
      }),
    ],
    [styles],
  )

  const currentDate = localDateString()
  const currentMonthLabel = new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(localDateFromString(`${currentDate.slice(0, 7)}-01`))
  const sortedSchedules = React.useMemo(
    () =>
      getMaintenanceOccurrencesForMonth(schedules, currentDate)
        .map((occurrence) => ({
          ...occurrence,
          status:
            occurrenceStatuses[
              maintenanceOccurrenceKey(
                occurrence.schedule.id,
                occurrence.date,
              )
            ] ?? null,
        }))
        .filter((occurrence) =>
          isMaintenanceOccurrenceListed(occurrence.status),
        ),
    [schedules, currentDate, occurrenceStatuses],
  )
  const pageCount = Math.max(
    1,
    Math.ceil(sortedSchedules.length / MAINTENANCE_PAGE_SIZE),
  )
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)
  const pageSchedules = sortedSchedules.slice(
    currentPageIndex * MAINTENANCE_PAGE_SIZE,
    (currentPageIndex + 1) * MAINTENANCE_PAGE_SIZE,
  )
  const pageStart =
    sortedSchedules.length === 0
      ? 0
      : currentPageIndex * MAINTENANCE_PAGE_SIZE + 1
  const pageEnd = Math.min(
    (currentPageIndex + 1) * MAINTENANCE_PAGE_SIZE,
    sortedSchedules.length,
  )

  async function updateOccurrenceStatus(status: MaintenanceOccurrenceStatus) {
    if (!selectedOccurrence || !canManage || occurrenceActionLoading) return

    setOccurrenceActionLoading(true)
    setOccurrenceActionError("")
    try {
      const response = await fetch("/api/maintenance/occurrences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleId: selectedOccurrence.schedule.id,
          occurrenceDate: selectedOccurrence.date,
          status,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Status jadwal pemeliharaan gagal disimpan."),
        )
      }

      const key = maintenanceOccurrenceKey(
        selectedOccurrence.schedule.id,
        selectedOccurrence.date,
      )
      setOccurrenceStatuses((current) => ({ ...current, [key]: status }))
      if (status === "dismissed") {
        setSelectedOccurrence(null)
      } else {
        setSelectedOccurrence((current) =>
          current ? { ...current, status } : current,
        )
      }
    } catch (failure) {
      setOccurrenceActionError(
        failure instanceof Error
          ? failure.message
          : "Status jadwal pemeliharaan gagal disimpan.",
      )
    } finally {
      setOccurrenceActionLoading(false)
    }
  }

  return (
    <section className={styles.view} aria-label="Jadwal pemeliharaan">
      <div className={styles.toolbar}>
        <Button
          className={styles.calendarButton}
          appearance="secondary"
          icon={<CalendarButtonIcon aria-hidden="true" />}
          onClick={() => setCalendarDialogOpen(true)}
        >
          Kalender
        </Button>
        {canManage && (
          <div className={styles.toolbarActions}>
            <Menu positioning="below-end">
              <MenuTrigger disableButtonEnhancement>
                {(triggerProps: MenuButtonProps) => (
                  <SplitButton
                    className={styles.maintenanceSplitButton}
                    appearance="secondary"
                    menuButton={triggerProps}
                    primaryActionButton={{
                      disabled: loading || Boolean(error),
                      onClick: () => setReportDialogOpen(true),
                    }}
                  >
                    Ekspor
                  </SplitButton>
                )}
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  <MenuItem
                    className={styles.exportMenuItem}
                    disabled={loading || Boolean(error)}
                    icon={<ExportMenuIcon aria-hidden="true" />}
                    onClick={() => setReportDialogOpen(true)}
                  >
                    Ekspor
                  </MenuItem>
                  <MenuItem onClick={() => setAssigneeDialogOpen(true)}>
                    Tambah petugas
                  </MenuItem>
                </MenuList>
              </MenuPopover>
            </Menu>
            <Button
              appearance="primary"
              onClick={() => setDialogOpen(true)}
              disabled={sppgs.length === 0}
            >
              Tambah jadwal
            </Button>
          </div>
        )}
      </div>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      <div className={styles.tableShell}>
        {loading ? (
          <div className={styles.state} role="status">
            <Spinner size="small" />
            <Text>Memuat jadwal pemeliharaan…</Text>
          </div>
        ) : error ? (
          <div className={styles.state}>
            <Text>Jadwal belum dapat ditampilkan.</Text>
            <Button
              appearance="secondary"
              onClick={() => setRefresh((value) => value + 1)}
            >
              Coba lagi
            </Button>
          </div>
        ) : sortedSchedules.length === 0 ? (
          <div className={styles.state} role="status">
            <Text weight="semibold">
              {schedules.length === 0
                ? "Belum ada jadwal pemeliharaan."
                : `Belum ada jadwal pemeliharaan pada ${currentMonthLabel}.`}
            </Text>
            <Text size={300}>
              Jadwal pada tabel mengikuti bulan berjalan. Jadwal rutin akan
              muncul kembali setiap kali tanggal periodenya tiba.
            </Text>
            {sppgs.length === 0 && (
              <Text size={200}>
                Tambahkan data SPPG sebelum membuat jadwal.
              </Text>
            )}
          </div>
        ) : (
          <>
            <div className={styles.dataGridViewport}>
              <DataGrid
                items={pageSchedules}
                columns={columns}
                getRowId={({ date, schedule }) => `${schedule.id}:${date}`}
                className={styles.dataGrid}
                aria-label={`Daftar jadwal pemeliharaan bulan ${currentMonthLabel}`}
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<MaintenanceScheduleTableRow>>
                  {({ item, rowId }) => (
                    <DataGridRow<MaintenanceScheduleTableRow>
                      key={rowId}
                      className={styles.clickableScheduleRow}
                      aria-label={`${formatDate(item.date)} — ${item.schedule.asset_name}. Buka pratinjau.`}
                      onClick={() => {
                        setOccurrenceActionError("")
                        setSelectedOccurrence(item)
                      }}
                      onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          setOccurrenceActionError("")
                          setSelectedOccurrence(item)
                        }
                      }}
                    >
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
            <nav
              className={styles.pagination}
              aria-label="Navigasi halaman jadwal pemeliharaan"
            >
              <Text
                size={200}
                className={styles.paginationSummary}
                aria-live="polite"
              >
                Menampilkan {pageStart}-{pageEnd} dari {sortedSchedules.length} jadwal bulan {currentMonthLabel}
              </Text>
              <div className={styles.paginationControls}>
                <Button
                  appearance="secondary"
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
                  appearance="secondary"
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
          </>
        )}
      </div>
      <Dialog
        open={selectedOccurrence !== null}
        onOpenChange={(_, data) => {
          if (!data.open && !occurrenceActionLoading) {
            setSelectedOccurrence(null)
            setOccurrenceActionError("")
          }
        }}
        modalType="modal"
      >
        <DialogSurface
          className={styles.previewSurface}
          aria-label="Pratinjau jadwal pemeliharaan"
        >
          <DialogBody>
            <DialogTitle>
              {selectedOccurrence?.schedule.asset_name ??
                "Pratinjau jadwal pemeliharaan"}
            </DialogTitle>
            {selectedOccurrence && (
              <>
                <DialogContent className={styles.previewContent}>
                  <div className={styles.previewDetails}>
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        Tanggal
                      </Text>
                      <Text>{formatDate(selectedOccurrence.date)}</Text>
                    </div>
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        Status
                      </Text>
                      <Badge
                        appearance="filled"
                        color={
                          selectedOccurrence.status === "completed"
                            ? "success"
                            : "brand"
                        }
                        size="small"
                      >
                        {selectedOccurrence.status === "completed"
                          ? "Selesai"
                          : "Belum selesai"}
                      </Badge>
                    </div>
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        SPPG
                      </Text>
                      <Text>{selectedOccurrence.schedule.sppg_name}</Text>
                    </div>
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        Kategori aset
                      </Text>
                      <Text>{selectedOccurrence.schedule.asset_category}</Text>
                    </div>
                    {selectedOccurrence.schedule.asset_details && (
                      <div className={styles.previewField}>
                        <Text size={200} className={styles.secondaryText}>
                          Rincian aset
                        </Text>
                        <Text>{selectedOccurrence.schedule.asset_details}</Text>
                      </div>
                    )}
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        Jenis rencana
                      </Text>
                      <Text>
                        {maintenanceTypeLabel(
                          selectedOccurrence.schedule.maintenance_type,
                        )}
                      </Text>
                    </div>
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        Petugas
                      </Text>
                      <Text>
                        {selectedOccurrence.schedule.assignees ||
                          "Belum ditentukan"}
                      </Text>
                    </div>
                    <div className={styles.previewField}>
                      <Text size={200} className={styles.secondaryText}>
                        Periodesasi
                      </Text>
                      <Text>
                        {selectedOccurrence.schedule.maintenance_type ===
                        "routine"
                          ? getMaintenanceRecurrenceLabel(
                              selectedOccurrence.schedule.recurrence,
                              selectedOccurrence.schedule.recurrence_days,
                            )
                          : "Sekali"}
                      </Text>
                    </div>
                  </div>
                  <div className={styles.previewField}>
                    <Text size={200} className={styles.secondaryText}>
                      Keterangan
                    </Text>
                    <Text>{selectedOccurrence.schedule.notes}</Text>
                  </div>
                  {selectedOccurrence.schedule.needs.length > 0 && (
                    <div className={styles.previewField}>
                      <Text size={200} weight="semibold">
                        Kebutuhan pemeliharaan
                      </Text>
                      <ul className={styles.needsSummary}>
                        {selectedOccurrence.schedule.needs.map((need, index) => (
                          <li
                            key={`${need.name}:${need.unit}:${index}`}
                          >
                            {need.name} — {need.quantity} {need.unit}
                            {need.notes ? ` · ${need.notes}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {canManage && (
                    <Text size={200} className={styles.secondaryText}>
                      “Hapus dari daftar” hanya menghilangkan jadwal tanggal ini
                      dari tabel. Jadwal rutin dan kalender tetap tersimpan.
                    </Text>
                  )}
                  {occurrenceActionError && (
                    <MessageBar intent="error">
                      <MessageBarBody>{occurrenceActionError}</MessageBarBody>
                    </MessageBar>
                  )}
                </DialogContent>
                <DialogActions className={styles.previewActions}>
                  <Button
                    className={styles.previewActionButton}
                    appearance="secondary"
                    disabled={occurrenceActionLoading}
                    onClick={() => setSelectedOccurrence(null)}
                  >
                    Tutup
                  </Button>
                  {canManage && (
                    <>
                      <Button
                        className={styles.previewActionButton}
                        appearance="secondary"
                        icon={<DeleteRegular />}
                        disabled={occurrenceActionLoading}
                        onClick={() => void updateOccurrenceStatus("dismissed")}
                      >
                        {occurrenceActionLoading
                          ? "Menyimpan…"
                          : "Hapus dari daftar"}
                      </Button>
                      {selectedOccurrence.status !== "completed" && (
                        <Button
                          className={styles.previewActionButton}
                          appearance="primary"
                          icon={<CheckmarkCircleRegular />}
                          disabled={occurrenceActionLoading}
                          onClick={() =>
                            void updateOccurrenceStatus("completed")
                          }
                        >
                          {occurrenceActionLoading
                            ? "Menyimpan…"
                            : "Tandai selesai"}
                        </Button>
                      )}
                    </>
                  )}
                </DialogActions>
              </>
            )}
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog
        open={calendarDialogOpen}
        onOpenChange={(_, data) => setCalendarDialogOpen(data.open)}
        modalType="modal"
      >
        <DialogSurface
          className={styles.calendarDialogSurface}
          aria-label="Kalender pemeliharaan"
        >
          <DialogBody>
            <DialogContent className={styles.calendarDialogContent}>
              {loading ? (
                <div className={styles.state} role="status">
                  <Spinner size="small" />
                  <Text>Memuat jadwal pemeliharaan…</Text>
                </div>
              ) : error ? (
                <MessageBar intent="error">
                  <MessageBarBody>
                    Jadwal belum dapat ditampilkan. Tutup kalender lalu coba
                    muat ulang halaman.
                  </MessageBarBody>
                </MessageBar>
              ) : (
                <MaintenanceCalendar schedules={schedules} />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setCalendarDialogOpen(false)}>
                Tutup
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <MaintenanceScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sppgs={sppgs}
        assignees={assignees}
        onAddAssignee={() => setAssigneeDialogOpen(true)}
        onSaved={() => setRefresh((value) => value + 1)}
      />
      <MaintenanceReportDialog
        open={reportDialogOpen}
        schedules={schedules}
        loading={loading}
        loadError={Boolean(error)}
        onOpenChange={setReportDialogOpen}
      />
      <MaintenanceAssigneeDialog
        open={assigneeDialogOpen}
        onOpenChange={setAssigneeDialogOpen}
        onSaved={() => setRefresh((value) => value + 1)}
      />
    </section>
  )
}

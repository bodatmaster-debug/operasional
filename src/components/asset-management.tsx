"use client"

import * as React from "react"
import {
  Blur,
  SlideRelaxed,
} from "@fluentui/react-motion-components-preview"
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
  MessageBarActions,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  SearchBox,
  Spinner,
  SplitButton,
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
  Tooltip,
  makeStyles,
  mergeClasses,
  tokens,
} from "@fluentui/react-components"
import type {
  MenuButtonProps,
  SortDirection,
  TableColumnDefinition,
  TableColumnId,
} from "@fluentui/react-components"
import {
  ASSET_CATEGORIES,
  assetCatalog,
  type AssetCatalogItem,
} from "@/lib/asset-catalog"
import {
  electricalStandardReferences,
  vehicleStandardReferences,
} from "@/lib/asset-standard-references"
import { ElectricalInstallationManagement } from "@/components/electrical-installation-management"
import {
  NonJuknisAssetManagement,
  SuratEdaranAssetManagement,
} from "@/components/non-juknis-asset-management"
import {
  getVehicleMakes,
  getVehicleModels,
  getVehicleModelSource,
  getVehicleSubtypes,
  getVehicleTypeLabel,
  isVehicleType,
  VEHICLE_SUBTYPES,
  VEHICLE_TYPES,
  type VehicleType,
} from "@/lib/vehicle-types"
import {
  BoxMultipleSearchFilled,
  BoxMultipleSearchRegular,
  BookInformationRegular,
  DesktopCheckmarkFilled,
  DesktopCheckmarkRegular,
  DismissRegular,
  FlashFilled,
  FlashRegular,
  FireFilled,
  FireRegular,
  InfoRegular,
  RefrigeratorFilled,
  RefrigeratorRegular,
  TaskListSquareLtrRegular,
  ToolboxFilled,
  ToolboxRegular,
  VehicleTruckCubeFilled,
  VehicleTruckCubeRegular,
  WarningRegular,
  bundleIcon,
} from "@fluentui/react-icons"
import {
  assetQuantityNeedsVerification,
  assetReferenceNeedsVerification,
  getAssetQuantityFeedback,
  getAssetStatus,
  usesThreeThousandCapacityReference,
  type AssetStatus,
} from "@/lib/asset-status"
import {
  isAssetCondition,
  type AssetConditionValue,
} from "@/lib/asset-condition"
import { AssetConditionSelect } from "@/components/asset-condition-select"
import { getGasInstallationConfigurationStatus } from "@/lib/gas-installation"
import { getVehicleR4BoxQuantityReminder } from "@/lib/vehicle-quantity-reminder"
import type { LocalUser } from "@/lib/access-types"
import type { SppgDirectoryRecord } from "@/lib/directory-types"
import { useUiDispatch, useUiState } from "@/components/ui-state-provider"
import type { AssetTab } from "@/lib/ui-state"
export type { AssetTab } from "@/lib/ui-state"

type AssetInventoryRecord = {
  id: string
  sppg_id: string
  catalog_id: string
  quantity: number
  asset_type: string
  asset_brand: string
  asset_condition: AssetConditionValue
  created_at: string
  updated_at: string
}

type VehicleInventoryRecord = {
  id: string
  sppg_id: string
  vehicle_type: VehicleType
  vehicle_subtype: string
  vehicle_make: string
  vehicle_model: string
  quantity: number
  asset_condition: AssetConditionValue
  created_at: string
  updated_at: string
}

type GasInstallationRecord = {
  sppg_id: string
  safety_system_present: 0 | 1
  high_pressure_present: 0 | 1
  high_pressure_line_count: number | null
  low_pressure_present: 0 | 1
  low_pressure_line_count: number | null
  created_at: string
  updated_at: string
}

type PresenceChoice = "yes" | "no" | ""

type AssetRow = AssetCatalogItem & {
  id: string
  inventoryRecordId: string | null
  assetCondition: AssetConditionValue
  actualQuantity: number | null
  actualType: string
  actualBrand: string
}

type AssetSortState = {
  sortColumn: TableColumnId | undefined
  sortDirection: SortDirection
}

const REFERENCE_CATEGORIES = ["Kendaraan", "Instalasi listrik"] as const
const SURAT_EDARAN_TAB = "Surat Edaran" as const
const AllAssetCategoriesIcon = bundleIcon(
  BoxMultipleSearchFilled,
  BoxMultipleSearchRegular,
)
const KitchenEquipmentIcon = bundleIcon(
  RefrigeratorFilled,
  RefrigeratorRegular,
)
const OperationalEquipmentIcon = bundleIcon(
  ToolboxFilled,
  ToolboxRegular,
)
const OfficeEquipmentIcon = bundleIcon(
  DesktopCheckmarkFilled,
  DesktopCheckmarkRegular,
)
const GasInstallationIcon = bundleIcon(FireFilled, FireRegular)
const VehicleCategoryIcon = bundleIcon(
  VehicleTruckCubeFilled,
  VehicleTruckCubeRegular,
)
const ElectricalInstallationIcon = bundleIcon(FlashFilled, FlashRegular)

function getVehicleGuideAnnouncement(value: string) {
  return `Panduan kendaraan, poin ${value} dari ${vehicleStandardReferences.length}`
}

function getAssetHelpAnnouncement(value: string) {
  return value === "1"
    ? "Contoh tipe aset, langkah 1 dari 2"
    : "Contoh merek aset, langkah 2 dari 2"
}

function isAssetTab(value: unknown): value is AssetTab {
  return (
    typeof value === "string" &&
    (value === "all" ||
      value === "non-juknis" ||
      value === SURAT_EDARAN_TAB ||
      REFERENCE_CATEGORIES.some((category) => category === value) ||
      ASSET_CATEGORIES.some((category) => category === value))
  )
}

function getAssetRowStatus(item: AssetRow): AssetStatus {
  return getAssetStatus(
    item.actualQuantity,
    item.quantity,
    assetReferenceNeedsVerification(item),
  )
}

const assetStatusColors: Record<
  AssetStatus,
  "success" | "danger" | "severe" | "brand"
> = {
  Terpenuhi: "success",
  "Belum terpenuhi": "danger",
  "Belum dicatat": "severe",
  "Perlu verifikasi": "brand",
}

const assetStatusIcons: Record<AssetStatus, React.ReactElement> = {
  Terpenuhi: <TaskListSquareLtrRegular aria-hidden="true" />,
  "Belum terpenuhi": <DismissRegular aria-hidden="true" />,
  "Belum dicatat": <WarningRegular aria-hidden="true" />,
  "Perlu verifikasi": <InfoRegular aria-hidden="true" />,
}

const ASSET_PAGE_SIZE = 5

const useStyles = makeStyles({
  view: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
    marginTop: "24px",
  },
  context: {
    minWidth: 0,
    maxWidth: "100%",
    lineHeight: tokens.lineHeightBase300,
  },
  contextBody: {
    minWidth: 0,
    flex: "1 1 0%",
    "& > *": {
      minWidth: 0,
      whiteSpace: "normal",
      overflowWrap: "anywhere",
    },
  },
  toolbar: {
    minWidth: 0,
    maxWidth: "640px",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
    alignItems: "end",
    gap: "16px",
  },
  vehicleToolbar: {
    display: "flex",
    minWidth: 0,
    flexWrap: "wrap",
    alignItems: "end",
    gap: "16px",
  },
  vehicleToolbarControls: {
    display: "flex",
    flex: "0 1 531px",
    minWidth: 0,
    maxWidth: "100%",
    flexWrap: "wrap",
    alignItems: "end",
    gap: "12px",
  },
  vehicleSppgField: {
    flex: "0 1 360px",
    minWidth: 0,
    maxWidth: "100%",
  },
  vehicleToolbarGuideButton: {
    whiteSpace: "nowrap",
  },
  vehicleToolbarAddButton: {
    whiteSpace: "nowrap",
  },
  categorySection: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  categoryTabs: {
    minWidth: 0,
    maxWidth: "100%",
    overflowX: "auto",
    paddingBottom: "2px",
    "& [role='tablist']": {
      width: "max-content",
      minWidth: "100%",
    },
    "& [role='tab']": {
      flexShrink: 0,
      whiteSpace: "nowrap",
    },
  },
  categoryIconTab: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled, &[aria-selected='true'] .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular, &[aria-selected='true'] .fui-Icon-regular":
      { display: "none" },
  },
  referenceView: {
    display: "grid",
    minWidth: 0,
    gap: "12px",
  },
  gasPage: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
  },
  gasPageHeader: {
    display: "grid",
    minWidth: 0,
    gap: "12px",
    paddingBottom: "16px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  gasPageIntro: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  gasSppgRow: {
    display: "flex",
    minWidth: 0,
  },
  gasSppgField: {
    flex: "1 1 320px",
    minWidth: 0,
    maxWidth: "100%",
  },
  gasSummaryGrid: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(280px, 0.9fr)",
    alignItems: "start",
    gap: "16px",
    "@media (max-width: 860px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  gasConfigurationColumn: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    gap: "16px",
  },
  gasConfiguration: {
    display: "grid",
    minWidth: 0,
    gap: "12px",
    padding: "16px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  gasConfigurationHeader: {
    display: "flex",
    minWidth: 0,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "12px",
  },
  gasConfigurationValues: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
    gap: "12px",
  },
  gasConfigurationValue: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    gap: "4px",
    paddingTop: "12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  gasConfigurationLabel: {
    color: tokens.colorNeutralForeground2,
  },
  gasSectionHeader: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  gasGuidance: {
    display: "grid",
    minWidth: 0,
    alignContent: "start",
    gap: "12px",
    padding: "16px",
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  gasNotes: {
    display: "grid",
    minWidth: 0,
  },
  gasNote: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(100px, 0.45fr) minmax(0, 1fr)",
    gap: "12px",
    paddingBlock: "10px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    "&:last-child": {
      borderBottom: "none",
      paddingBottom: 0,
    },
    "@media (max-width: 640px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "4px",
    },
  },
  referenceTable: {
    width: "100%",
    minWidth: "100%",
    tableLayout: "fixed",
    borderCollapse: "collapse",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  referenceCell: {
    padding: "10px 12px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    textAlign: "left",
    verticalAlign: "top",
    lineHeight: tokens.lineHeightBase300,
    whiteSpace: "normal",
    overflowWrap: "anywhere",
  },
  referenceRequirement: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  referenceHeaderCell: {
    backgroundColor: tokens.colorNeutralBackground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  referenceAspectCell: {
    width: "35%",
  },
  referenceSource: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground2,
  },
  vehicleContent: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
  },
  vehicleFormFields: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    alignItems: "end",
    gap: "16px",
    "@media (max-width: 640px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: "12px",
    },
  },
  gasFormFields: {
    display: "grid",
    minWidth: 0,
    gap: "16px",
  },
  gasDialogContent: {
    minWidth: 0,
    gridTemplateColumns: "minmax(0, 1fr)",
  },
  vehicleTypeField: {
    minWidth: 0,
    gridColumn: "1 / -1",
  },
  vehicleTypeOptions: {
    flexWrap: "wrap",
    columnGap: "8px",
    rowGap: "8px",
    padding: "8px 12px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  vehicleTable: {
    width: "100%",
    minWidth: "920px",
    tableLayout: "fixed",
    borderCollapse: "collapse",
    backgroundColor: tokens.colorNeutralBackground1,
  },
  vehicleTypeCell: {
    width: "14%",
  },
  vehicleSubtypeCell: {
    width: "22%",
  },
  vehicleMakeCell: {
    width: "14%",
  },
  vehicleModelCell: {
    width: "24%",
  },
  vehicleQuantityCell: {
    width: "12%",
  },
  vehicleActions: {
    display: "flex",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "8px",
  },
  vehicleSplitButton: {
    "& .fui-SplitButton__menuButton .fui-MenuButton__menuIcon > svg": {
      display: "block",
      transform: "translate(0.4px, -0.44px)",
    },
  },
  vehicleEmptyState: {
    display: "grid",
    minHeight: "132px",
    placeItems: "center",
    gap: "8px",
    padding: "24px",
    textAlign: "center",
  },
  teachingSurface: {
    width: "min(420px, calc(100vw - 32px))",
    maxWidth: "420px",
  },
  teachingCard: {
    minHeight: "170px",
  },
  teachingContent: {
    display: "grid",
    minWidth: 0,
    gap: "12px",
  },
  teachingRequirement: {
    lineHeight: tokens.lineHeightBase300,
    overflowWrap: "anywhere",
  },
  assetHelpTrigger: {
    justifySelf: "start",
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
  field: { minWidth: 0 },
  filterSummary: { minWidth: 0, color: tokens.colorNeutralForeground2 },
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
    minWidth: "1180px",
    "& [role='columnheader']:nth-of-type(1), & [role='gridcell']:nth-of-type(1)": {
      flex: "1 1 340px",
      minWidth: "220px",
    },
    "& [role='columnheader']:nth-of-type(2), & [role='gridcell']:nth-of-type(2)": {
      flex: "0 0 170px",
    },
    "& [role='columnheader']:nth-of-type(3), & [role='gridcell']:nth-of-type(3)": {
      flex: "0 0 190px",
    },
    "& [role='columnheader']:nth-of-type(4), & [role='gridcell']:nth-of-type(4)": {
      flex: "0 0 170px",
    },
    "& [role='columnheader']:nth-of-type(5), & [role='gridcell']:nth-of-type(5)": {
      flex: "0 0 170px",
    },
    "& [role='columnheader']:nth-of-type(6), & [role='gridcell']:nth-of-type(6)": {
      flex: "0 0 140px",
      justifyContent: "flex-end",
    },
    "& [role='columnheader']:nth-of-type(6) > div": {
      justifyContent: "flex-end",
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
  itemCell: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2,
    overflowWrap: "anywhere",
  },
  assetValidation: {
    display: "block",
    color: tokens.colorPaletteRedForeground1,
    lineHeight: tokens.lineHeightBase200,
    overflowWrap: "anywhere",
  },
  assetSuccess: {
    display: "block",
    color: tokens.colorPaletteGreenForeground1,
    lineHeight: tokens.lineHeightBase200,
    overflowWrap: "anywhere",
  },
  assetRecordNote: {
    display: "block",
    minWidth: 0,
    padding: "8px 10px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground2,
    lineHeight: tokens.lineHeightBase300,
    overflowWrap: "anywhere",
  },
  quantityReferenceSummary: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
    padding: "12px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  sourceCell: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "6px",
  },
  actionCell: {
    display: "flex",
    width: "100%",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "4px",
  },
  recordActionButton: {
    "&&:hover:not(:disabled)": {
      backgroundColor: tokens.colorBrandBackgroundHover,
      color: tokens.colorNeutralForegroundOnBrand,
    },
    "&&:active:not(:disabled)": {
      backgroundColor: tokens.colorBrandBackgroundPressed,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  status: {
    display: "grid",
    minHeight: "160px",
    placeItems: "center",
    gap: "12px",
    padding: "28px",
    textAlign: "center",
  },
  dialogSurface: {
    width: "min(480px, calc(100vw - 32px))",
    maxWidth: "480px",
  },
  dialogContent: {
    display: "grid",
    gap: "16px",
    paddingBlock: "4px",
  },
  recordSummary: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  dialogActionButton: {
    whiteSpace: "nowrap",
  },
  vehicleDialogSurface: {
    width: "min(760px, calc(100vw - 32px))",
    maxWidth: "760px",
    maxHeight: "calc(100dvh - 32px)",
    overflowX: "hidden",
    overflowY: "auto",
  },
  vehicleDialogContent: {
    display: "grid",
    minWidth: 0,
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: "16px",
    paddingBlock: "4px",
  },
})

function errorFromPayload(payload: unknown, fallback: string) {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback
}

function isSppgRecord(value: unknown): value is SppgDirectoryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "nama" in value &&
    typeof value.nama === "string" &&
    "jumlah_penerima_manfaat" in value &&
    (typeof value.jumlah_penerima_manfaat === "number" ||
      value.jumlah_penerima_manfaat === null)
  )
}

function isAssetInventoryRecord(value: unknown): value is AssetInventoryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "sppg_id" in value &&
    typeof value.sppg_id === "string" &&
    "catalog_id" in value &&
    typeof value.catalog_id === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity >= 0 &&
    "asset_type" in value &&
    typeof value.asset_type === "string" &&
    "asset_brand" in value &&
    typeof value.asset_brand === "string" &&
    "asset_condition" in value &&
    isAssetCondition(value.asset_condition) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  )
}

function isVehicleInventoryRecord(
  value: unknown,
): value is VehicleInventoryRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "sppg_id" in value &&
    typeof value.sppg_id === "string" &&
    "vehicle_type" in value &&
    isVehicleType(value.vehicle_type) &&
    "vehicle_subtype" in value &&
    typeof value.vehicle_subtype === "string" &&
    "vehicle_make" in value &&
    typeof value.vehicle_make === "string" &&
    "vehicle_model" in value &&
    typeof value.vehicle_model === "string" &&
    "quantity" in value &&
    typeof value.quantity === "number" &&
    Number.isSafeInteger(value.quantity) &&
    value.quantity >= 0 &&
    "asset_condition" in value &&
    isAssetCondition(value.asset_condition) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  )
}

function isPresenceFlag(value: unknown): value is 0 | 1 {
  return value === 0 || value === 1
}

function isPositiveLineCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  )
}

function isGasInstallationRecord(
  value: unknown,
): value is GasInstallationRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "sppg_id" in value &&
    typeof value.sppg_id === "string" &&
    "safety_system_present" in value &&
    isPresenceFlag(value.safety_system_present) &&
    "high_pressure_present" in value &&
    isPresenceFlag(value.high_pressure_present) &&
    "high_pressure_line_count" in value &&
    (value.high_pressure_present === 1
      ? isPositiveLineCount(value.high_pressure_line_count)
      : value.high_pressure_line_count === null) &&
    "low_pressure_present" in value &&
    isPresenceFlag(value.low_pressure_present) &&
    "low_pressure_line_count" in value &&
    (value.low_pressure_present === 1
      ? isPositiveLineCount(value.low_pressure_line_count)
      : value.low_pressure_line_count === null) &&
    "created_at" in value &&
    typeof value.created_at === "string" &&
    "updated_at" in value &&
    typeof value.updated_at === "string"
  )
}

function isPresenceChoice(value: string): value is Exclude<PresenceChoice, ""> {
  return value === "yes" || value === "no"
}

function getGasLineSummary(
  record: GasInstallationRecord | null,
  pressure: "high" | "low",
) {
  if (!record) return "Belum dicatat"

  const isPresent =
    pressure === "high"
      ? record.high_pressure_present
      : record.low_pressure_present
  if (isPresent === 0) return "Tidak ada"

  const lineCount =
    pressure === "high"
      ? record.high_pressure_line_count
      : record.low_pressure_line_count
  return lineCount === null
    ? "Jumlah jalur belum dicatat"
    : `${new Intl.NumberFormat("id-ID").format(lineCount)} jalur`
}

function recordsFromPayload<T>(
  payload: unknown,
  isRecord: (value: unknown) => value is T,
  fallback: string,
) {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("records" in payload) ||
    !Array.isArray(payload.records) ||
    !payload.records.every(isRecord)
  ) {
    throw new Error(fallback)
  }
  return payload.records
}

function createAssetColumns(
  onRecord: (item: AssetRow) => void,
  onDelete: (item: AssetRow) => void,
  onConditionSaved: (
    item: AssetRow,
    condition: AssetConditionValue,
  ) => void,
  canManage: boolean,
  selectedSppgId: string,
  inventoryLoading: boolean,
  inventoryError: string,
  styles: ReturnType<typeof useStyles>,
): TableColumnDefinition<AssetRow>[] {
  const columns: TableColumnDefinition<AssetRow>[] = [
    createTableColumn<AssetRow>({
      columnId: "name",
      compare: (a, b) => a.name.localeCompare(b.name, "id"),
      renderHeaderCell: () => "Nama aset",
      renderCell: (item) => (
        <div className={styles.itemCell}>
          <Text weight="semibold">{item.name}</Text>
          {(item.actualType || item.actualBrand) && (
            <Text size={200} className={styles.secondaryText}>
              {[
                item.actualType && `Tipe: ${item.actualType}`,
                item.actualBrand && `Merek: ${item.actualBrand}`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          )}
          <Text size={200} className={styles.secondaryText}>
            {item.sourceLabel}
          </Text>
        </div>
      ),
    }),
    createTableColumn<AssetRow>({
      columnId: "status",
      compare: (a, b) =>
        getAssetRowStatus(a).localeCompare(getAssetRowStatus(b), "id"),
      renderHeaderCell: () => "Status",
      renderCell: (item) => {
        if (inventoryError) {
          return <Text role="alert">Gagal dimuat</Text>
        }
        if (inventoryLoading) {
          return <Text>Memuat…</Text>
        }
        if (!selectedSppgId) {
          return <Text>Pilih SPPG</Text>
        }
        const status = getAssetRowStatus(item)
        return (
          <Badge
            appearance="filled"
            color={assetStatusColors[status]}
            icon={assetStatusIcons[status]}
            style={{ fontWeight: 400 }}
          >
            {status}
          </Badge>
        )
      },
    }),
    createTableColumn<AssetRow>({
      columnId: "reference",
      compare: (a, b) => (a.quantity ?? -1) - (b.quantity ?? -1),
      renderHeaderCell: () => "Jumlah acuan",
      renderCell: (item) => (
        <Tooltip
          content={
            item.note
              ? `${item.sourceLabel}. ${item.note}`
              : item.sourceLabel
          }
          relationship="label"
        >
          <span className={styles.sourceCell}>
            <Text>{item.quantityText}</Text>
            {item.quantityUncertain && (
              <Badge appearance="tint" color="warning">
                Perlu verifikasi
              </Badge>
            )}
          </span>
        </Tooltip>
      ),
    }),
    createTableColumn<AssetRow>({
      columnId: "actual",
      compare: (a, b) =>
        (a.actualQuantity ?? -1) - (b.actualQuantity ?? -1),
      renderHeaderCell: () => "Jumlah aktual",
      renderCell: (item) => {
        if (inventoryError) {
          return <Text role="alert">Gagal dimuat</Text>
        }
        if (inventoryLoading) {
          return <Text>Memuat…</Text>
        }
        if (!selectedSppgId) {
          return <Text>Pilih SPPG</Text>
        }
        return (
          <Text>
            {item.actualQuantity === null
              ? "Belum dicatat"
              : `${new Intl.NumberFormat("id-ID").format(item.actualQuantity)} ${item.unit}`}
          </Text>
        )
      },
    }),
    createTableColumn<AssetRow>({
      columnId: "condition",
      compare: (a, b) =>
        (a.assetCondition ?? "").localeCompare(b.assetCondition ?? "", "id"),
      renderHeaderCell: () => "Kondisi aset",
      renderCell: (item) => {
        if (inventoryError) return <Text role="alert">Gagal dimuat</Text>
        if (inventoryLoading) return <Text>Memuat…</Text>
        if (!selectedSppgId) return <Text>Pilih SPPG</Text>
        return item.inventoryRecordId ? (
          <AssetConditionSelect
            source="juknis"
            recordId={item.inventoryRecordId}
            sppgId={selectedSppgId}
            assetName={item.name}
            value={item.assetCondition}
            canManage={canManage}
            onSaved={(condition) => onConditionSaved(item, condition)}
          />
        ) : (
          <Text>Belum dicatat</Text>
        )
      },
    }),
    createTableColumn<AssetRow>({
      columnId: "actions",
      compare: () => 0,
      renderHeaderCell: () => "Tindakan",
      renderCell: (item) => (
        <div className={styles.actionCell}>
          {canManage && selectedSppgId && (
            <Button
              appearance="outline"
              className={styles.recordActionButton}
              size="small"
              disabled={inventoryLoading}
              onClick={() => onRecord(item)}
            >
              {item.actualQuantity === null ? "Catat" : "Ubah"}
            </Button>
          )}
          {canManage &&
            selectedSppgId &&
            item.actualQuantity !== null && (
              <Button
                appearance="subtle"
                size="small"
                disabled={inventoryLoading}
                onClick={() => onDelete(item)}
              >
                Hapus
              </Button>
            )}
        </div>
      ),
    }),
  ]
  return columns
}

export function AssetManagement({
  user,
  selectedTab,
  onSelectedTabChange,
}: {
  user: LocalUser
  selectedTab: AssetTab
  onSelectedTabChange: (tab: AssetTab) => void
}) {
  const styles = useStyles()
  const uiState = useUiState()
  const dispatch = useUiDispatch()
  const search = uiState.filters.assetSearch
  const [sppgs, setSppgs] = React.useState<SppgDirectoryRecord[]>([])
  const [selectedSppgId, setSelectedSppgId] = React.useState("")
  const [directoryLoading, setDirectoryLoading] = React.useState(true)
  const [directoryError, setDirectoryError] = React.useState("")
  const [inventory, setInventory] = React.useState<AssetInventoryRecord[]>([])
  const [inventoryLoading, setInventoryLoading] = React.useState(false)
  const [inventoryError, setInventoryError] = React.useState("")
  const [refreshCount, setRefreshCount] = React.useState(0)
  const [vehicleInventory, setVehicleInventory] = React.useState<
    VehicleInventoryRecord[]
  >([])
  const [gasInstallation, setGasInstallation] =
    React.useState<GasInstallationRecord | null>(null)
  const [vehicleLoading, setVehicleLoading] = React.useState(false)
  const [vehicleError, setVehicleError] = React.useState("")
  const [vehicleRefreshCount, setVehicleRefreshCount] = React.useState(0)
  const [gasLoading, setGasLoading] = React.useState(false)
  const [gasError, setGasError] = React.useState("")
  const [gasRefreshCount, setGasRefreshCount] = React.useState(0)
  const [gasDialogOpen, setGasDialogOpen] = React.useState(false)
  const [gasSafetySystemPresent, setGasSafetySystemPresent] =
    React.useState<PresenceChoice>("")
  const [highPressurePresent, setHighPressurePresent] =
    React.useState<PresenceChoice>("")
  const [lowPressurePresent, setLowPressurePresent] =
    React.useState<PresenceChoice>("")
  const [highPressureLineCount, setHighPressureLineCount] =
    React.useState("")
  const [lowPressureLineCount, setLowPressureLineCount] = React.useState("")
  const [gasDialogError, setGasDialogError] = React.useState("")
  const [gasSaving, setGasSaving] = React.useState(false)
  const [vehicleType, setVehicleType] = React.useState<VehicleType>("R4")
  const [vehicleSubtype, setVehicleSubtype] = React.useState(
    VEHICLE_SUBTYPES.R4[0],
  )
  const [vehicleSubtypeOther, setVehicleSubtypeOther] = React.useState("")
  const [vehicleMake, setVehicleMake] = React.useState("Belum dicatat")
  const [vehicleMakeOther, setVehicleMakeOther] = React.useState("")
  const [vehicleModel, setVehicleModel] = React.useState("Belum dicatat")
  const [vehicleModelOther, setVehicleModelOther] = React.useState("")
  const [vehicleQuantity, setVehicleQuantity] = React.useState("")
  const [vehicleDialogOpen, setVehicleDialogOpen] = React.useState(false)
  const [editingVehicleId, setEditingVehicleId] = React.useState<string | null>(
    null,
  )
  const [vehicleSaving, setVehicleSaving] = React.useState(false)
  const [vehicleSaveError, setVehicleSaveError] = React.useState("")
  const [vehicleDeleteTarget, setVehicleDeleteTarget] =
    React.useState<VehicleInventoryRecord | null>(null)
  const [vehicleDeleteError, setVehicleDeleteError] = React.useState("")
  const [vehicleDeleting, setVehicleDeleting] = React.useState(false)
  const [animateTableCategoryChange, setAnimateTableCategoryChange] =
    React.useState(false)
  const [pageIndex, setPageIndex] = React.useState(0)
  const [sortState, setSortState] = React.useState<AssetSortState>({
    sortColumn: undefined,
    sortDirection: "ascending",
  })
  const [recordTarget, setRecordTarget] =
    React.useState<AssetCatalogItem | null>(null)
  const [recordQuantity, setRecordQuantity] = React.useState("")
  const [recordAssetType, setRecordAssetType] = React.useState("")
  const [recordAssetBrand, setRecordAssetBrand] = React.useState("")
  const [recordError, setRecordError] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<AssetCatalogItem | null>(
    null,
  )
  const [deleteError, setDeleteError] = React.useState("")
  const [deleting, setDeleting] = React.useState(false)
  const canManage =
    user.role === "admin" ||
    user.permissions?.assets === true
  const selectedSppg = sppgs.find((sppg) => sppg.id === selectedSppgId)
  const currentGasInstallation =
    gasInstallation?.sppg_id === selectedSppgId ? gasInstallation : null
  const numericRecordQuantity = Number(recordQuantity)
  const isRecordQuantityValid =
    recordQuantity !== "" &&
    Number.isSafeInteger(numericRecordQuantity) &&
    numericRecordQuantity >= 0 &&
    numericRecordQuantity <= 1_000_000
  const recordContextIsComparable =
    !recordTarget ||
    !usesThreeThousandCapacityReference(recordTarget) ||
    selectedSppg?.jumlah_penerima_manfaat === 3_000
  const recordQuantityFeedback = recordTarget
    ? recordError
      ? { tone: "warning" as const, message: recordError }
      : recordQuantity !== "" && !isRecordQuantityValid
        ? {
            tone: "warning" as const,
            message:
              "Masukkan bilangan bulat antara 0 dan 1.000.000.",
          }
        : getAssetQuantityFeedback(
            isRecordQuantityValid ? numericRecordQuantity : null,
            recordTarget.quantity,
            recordTarget.unit,
            Boolean(recordTarget.quantityUncertain),
            recordContextIsComparable,
            usesThreeThousandCapacityReference(recordTarget)
              ? "Acuan ini berkonteks SPPG 3.000 penerima manfaat."
              : "",
            recordTarget.name.toLocaleLowerCase("id-ID").includes("opsional"),
          )
    : null
  const vehicleSubtypes = getVehicleSubtypes(vehicleType)
  const vehicleMakes = getVehicleMakes(vehicleType, vehicleSubtype)
  const vehicleModels = getVehicleModels(
    vehicleType,
    vehicleSubtype,
    vehicleMake,
  )
  const selectedVehicleModelSource = getVehicleModelSource(
    vehicleType,
    vehicleSubtype,
    vehicleMake,
    vehicleModel,
  )
  const visibleVehicleInventory = vehicleInventory.filter(
    (record) => record.sppg_id === selectedSppgId,
  )
  const numericVehicleQuantity = Number(vehicleQuantity)
  const isVehicleQuantityValid =
    vehicleQuantity.trim() !== "" &&
    Number.isSafeInteger(numericVehicleQuantity) &&
    numericVehicleQuantity >= 0 &&
    numericVehicleQuantity <= 1_000_000
  const isVehicleR4BoxDraft =
    isVehicleQuantityValid &&
    vehicleType === "R4" &&
    vehicleSubtype === "Box / mobil box"
  const vehicleR4Reminder = getVehicleR4BoxQuantityReminder(
    visibleVehicleInventory,
    isVehicleQuantityValid ? editingVehicleId : null,
    isVehicleQuantityValid
      ? {
          vehicleType,
          vehicleSubtype,
          quantity: numericVehicleQuantity,
        }
      : undefined,
  )
  const isReferenceTab = REFERENCE_CATEGORIES.some(
    (category) => category === selectedTab,
  )
  const selectedCatalogCategory = ASSET_CATEGORIES.find(
    (category) => category === selectedTab,
  )
  const referenceRows =
    selectedTab === "Kendaraan"
      ? vehicleStandardReferences
      : electricalStandardReferences
  const referenceTitle =
    selectedTab === "Kendaraan"
      ? "Rujukan kendaraan"
      : "Rujukan instalasi listrik"

  function openGasDialog() {
    setGasSafetySystemPresent(
      currentGasInstallation
        ? currentGasInstallation.safety_system_present === 1
          ? "yes"
          : "no"
        : "",
    )
    setHighPressurePresent(
      currentGasInstallation
        ? currentGasInstallation.high_pressure_present === 1
          ? "yes"
          : "no"
        : "",
    )
    setLowPressurePresent(
      currentGasInstallation
        ? currentGasInstallation.low_pressure_present === 1
          ? "yes"
          : "no"
        : "",
    )
    setHighPressureLineCount(
      !currentGasInstallation ||
        currentGasInstallation.high_pressure_present === 0 ||
        currentGasInstallation.high_pressure_line_count === null
        ? ""
        : String(currentGasInstallation.high_pressure_line_count),
    )
    setLowPressureLineCount(
      !currentGasInstallation ||
        currentGasInstallation.low_pressure_present === 0 ||
        currentGasInstallation.low_pressure_line_count === null
        ? ""
        : String(currentGasInstallation.low_pressure_line_count),
    )
    setGasDialogError("")
    setGasDialogOpen(true)
  }
  const inventoryByCatalogId = React.useMemo(
    () => new Map(inventory.map((record) => [record.catalog_id, record])),
    [inventory],
  )
  const gasInstallationReadiness =
    getGasInstallationConfigurationStatus(currentGasInstallation)
  const openAssetRecord = React.useCallback((item: AssetRow) => {
    setRecordTarget(item)
    setRecordQuantity(
      item.actualQuantity === null ? "" : String(item.actualQuantity),
    )
    setRecordAssetType(item.actualType)
    setRecordAssetBrand(item.actualBrand)
    setRecordError("")
  }, [])

  React.useEffect(() => {
    const controller = new AbortController()
    void (async () => {
      setDirectoryLoading(true)
      setDirectoryError("")
      try {
        const response = await fetch("/api/directory?kind=sppg", {
          cache: "no-store",
          signal: controller.signal,
        })
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(errorFromPayload(payload, "Daftar SPPG gagal dimuat."))
        }
        const records = recordsFromPayload(
          payload,
          isSppgRecord,
          "Respons daftar SPPG tidak valid.",
        )
        if (!controller.signal.aborted) {
          setSppgs(records)
          setSelectedSppgId((current) =>
            records.some((record) => record.id === current)
              ? current
              : (records[0]?.id ?? ""),
          )
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setDirectoryError(
            error instanceof Error ? error.message : "Daftar SPPG gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setDirectoryLoading(false)
      }
    })()
    return () => controller.abort()
  }, [])

  React.useEffect(() => {
    if (
      !selectedSppgId ||
      selectedTab === "non-juknis" ||
      selectedTab === SURAT_EDARAN_TAB
    ) {
      return
    }

    const controller = new AbortController()
    void (async () => {
      setInventoryLoading(true)
      setInventoryError("")
      try {
        const response = await fetch(
          `/api/assets?sppgId=${encodeURIComponent(selectedSppgId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            errorFromPayload(payload, "Jumlah aktual aset gagal dimuat."),
          )
        }
        const records = recordsFromPayload(
          payload,
          isAssetInventoryRecord,
          "Respons jumlah aktual aset tidak valid.",
        )
        if (!controller.signal.aborted) setInventory(records)
      } catch (error) {
        if (!controller.signal.aborted) {
          setInventoryError(
            error instanceof Error
              ? error.message
              : "Jumlah aktual aset gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setInventoryLoading(false)
      }
    })()
    return () => controller.abort()
  }, [refreshCount, selectedSppgId, selectedTab])

  React.useEffect(() => {
    if (selectedTab !== "Kendaraan" || !selectedSppgId) return

    const controller = new AbortController()
    void (async () => {
      setVehicleLoading(true)
      setVehicleError("")
      try {
        const response = await fetch(
          `/api/vehicles?sppgId=${encodeURIComponent(selectedSppgId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            errorFromPayload(payload, "Data kendaraan gagal dimuat."),
          )
        }
        const records = recordsFromPayload(
          payload,
          isVehicleInventoryRecord,
          "Respons data kendaraan tidak valid.",
        )
        if (!controller.signal.aborted) setVehicleInventory(records)
      } catch (error) {
        if (!controller.signal.aborted) {
          setVehicleError(
            error instanceof Error ? error.message : "Data kendaraan gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setVehicleLoading(false)
      }
    })()
    return () => controller.abort()
  }, [selectedSppgId, selectedTab, vehicleRefreshCount])

  React.useEffect(() => {
    if (selectedTab !== "Instalasi gas" || !selectedSppgId) return

    const controller = new AbortController()
    void (async () => {
      setGasLoading(true)
      setGasError("")
      try {
        const response = await fetch(
          `/api/gas-installation?sppgId=${encodeURIComponent(selectedSppgId)}`,
          { cache: "no-store", signal: controller.signal },
        )
        const payload: unknown = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(
            errorFromPayload(payload, "Kondisi instalasi gas gagal dimuat."),
          )
        }
        if (
          typeof payload !== "object" ||
          payload === null ||
          !("record" in payload) ||
          (payload.record !== null && !isGasInstallationRecord(payload.record))
        ) {
          throw new Error("Respons kondisi instalasi gas tidak valid.")
        }
        if (!controller.signal.aborted) {
          setGasInstallation(payload.record)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setGasError(
            error instanceof Error
              ? error.message
              : "Kondisi instalasi gas gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setGasLoading(false)
      }
    })()
    return () => controller.abort()
  }, [selectedSppgId, selectedTab, gasRefreshCount])

  const rows = React.useMemo(
    () => {
      if (isReferenceTab) return []
      return assetCatalog
        .filter(
          (item) =>
            selectedTab === "all" || item.category === selectedCatalogCategory,
        )
        .filter((item) => {
          const query = search.trim().toLocaleLowerCase("id-ID")
          return (
            !query ||
            [
              item.name,
              item.category,
              item.groupName,
              item.quantityText,
              item.sourceLabel,
              item.note,
            ]
              .join(" ")
              .toLocaleLowerCase("id-ID")
              .includes(query)
          )
        })
        .map((item) => ({
          ...item,
          id: item.catalogId,
          inventoryRecordId:
            inventoryByCatalogId.get(item.catalogId)?.id ?? null,
          assetCondition:
            inventoryByCatalogId.get(item.catalogId)?.asset_condition ?? null,
          actualQuantity:
            inventoryByCatalogId.get(item.catalogId)?.quantity ?? null,
          actualType:
            inventoryByCatalogId.get(item.catalogId)?.asset_type ?? "",
          actualBrand:
            inventoryByCatalogId.get(item.catalogId)?.asset_brand ?? "",
        }))
    },
    [isReferenceTab, selectedTab, selectedCatalogCategory, search, inventoryByCatalogId],
  )

  const columns = React.useMemo(
    () =>
      createAssetColumns(
        openAssetRecord,
        (item) => {
          setDeleteTarget(item)
          setDeleteError("")
        },
        (item, condition) =>
          setInventory((current) =>
            current.map((record) =>
              record.id === item.inventoryRecordId
                ? { ...record, asset_condition: condition }
                : record,
            ),
          ),
        canManage,
        selectedSppgId,
        inventoryLoading,
        inventoryError,
        styles,
      ),
    [
      canManage,
      inventoryError,
      inventoryLoading,
      openAssetRecord,
      selectedSppgId,
      styles,
    ],
  )

  const sortedRows = React.useMemo(() => {
    if (!sortState.sortColumn) return rows
    const column = columns.find(
      (candidate) => candidate.columnId === sortState.sortColumn,
    )
    if (!column) return rows

    const direction = sortState.sortDirection === "ascending" ? 1 : -1
    return [...rows].sort(
      (left, right) => column.compare(left, right) * direction,
    )
  }, [columns, rows, sortState])
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / ASSET_PAGE_SIZE))
  const currentPageIndex = Math.min(pageIndex, pageCount - 1)
  const pageRows = sortedRows.slice(
    currentPageIndex * ASSET_PAGE_SIZE,
    (currentPageIndex + 1) * ASSET_PAGE_SIZE,
  )
  const pageStart =
    sortedRows.length === 0 ? 0 : currentPageIndex * ASSET_PAGE_SIZE + 1
  const pageEnd = Math.min(
    (currentPageIndex + 1) * ASSET_PAGE_SIZE,
    sortedRows.length,
  )

  async function handleGasSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSppgId) return

    if (!isPresenceChoice(gasSafetySystemPresent)) {
      setGasDialogError("Pilih kondisi sensor/alarm kebocoran gas.")
      return
    }
    if (!isPresenceChoice(highPressurePresent)) {
      setGasDialogError("Pilih kondisi jalur high pressure.")
      return
    }
    if (!isPresenceChoice(lowPressurePresent)) {
      setGasDialogError("Pilih kondisi jalur low pressure.")
      return
    }

    const highCount =
      highPressurePresent === "yes" ? Number(highPressureLineCount) : null
    if (
      highPressurePresent === "yes" &&
      (highPressureLineCount.trim() === "" ||
        !Number.isSafeInteger(highCount) ||
        highCount === null ||
        highCount < 1)
    ) {
      setGasDialogError(
        "Jumlah jalur high pressure harus berupa bilangan bulat positif.",
      )
      return
    }
    const lowCount =
      lowPressurePresent === "yes" ? Number(lowPressureLineCount) : null
    if (
      lowPressurePresent === "yes" &&
      (lowPressureLineCount.trim() === "" ||
        !Number.isSafeInteger(lowCount) ||
        lowCount === null ||
        lowCount < 1)
    ) {
      setGasDialogError(
        "Jumlah jalur low pressure harus berupa bilangan bulat positif.",
      )
      return
    }

    setGasSaving(true)
    setGasDialogError("")
    try {
      const response = await fetch("/api/gas-installation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppgId: selectedSppgId,
          safetySystemPresent: gasSafetySystemPresent === "yes",
          highPressurePresent: highPressurePresent === "yes",
          highPressureLineCount: highCount,
          lowPressurePresent: lowPressurePresent === "yes",
          lowPressureLineCount: lowCount,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Kondisi instalasi gas gagal disimpan."),
        )
      }
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("record" in payload) ||
        !isGasInstallationRecord(payload.record) ||
        payload.record.sppg_id !== selectedSppgId
      ) {
        throw new Error("Respons kondisi instalasi gas tidak valid.")
      }

      setGasInstallation(payload.record)
      setGasDialogOpen(false)
    } catch (error) {
      setGasDialogError(
        error instanceof Error
          ? error.message
          : "Kondisi instalasi gas gagal disimpan.",
      )
    } finally {
      setGasSaving(false)
    }
  }

  async function handleRecordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!recordTarget || !selectedSppgId) return

    const quantity = Number(recordQuantity)
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      quantity > 1_000_000
    ) {
      setRecordError("Masukkan bilangan bulat antara 0 dan 1.000.000.")
      return
    }

    setSaving(true)
    setRecordError("")
    try {
      const response = await fetch("/api/assets", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppgId: selectedSppgId,
          catalogId: recordTarget.catalogId,
          quantity,
          assetType: recordAssetType,
          assetBrand: recordAssetBrand,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Jumlah aktual aset gagal disimpan."),
        )
      }
      setRecordTarget(null)
      setRefreshCount((count) => count + 1)
    } catch (error) {
      setRecordError(
        error instanceof Error
          ? error.message
          : "Jumlah aktual aset gagal disimpan.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget || !selectedSppgId) return
    setDeleting(true)
    setDeleteError("")
    try {
      const params = new URLSearchParams({
        sppgId: selectedSppgId,
        catalogId: deleteTarget.catalogId,
      })
      const response = await fetch(`/api/assets?${params}`, {
        method: "DELETE",
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Catatan aset gagal dihapus."),
        )
      }
      setDeleteTarget(null)
      setRefreshCount((count) => count + 1)
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Catatan aset gagal dihapus.",
      )
    } finally {
      setDeleting(false)
    }
  }

  async function handleVehicleDelete() {
    if (!vehicleDeleteTarget) return

    setVehicleDeleting(true)
    setVehicleDeleteError("")
    try {
      const params = new URLSearchParams({
        sppgId: vehicleDeleteTarget.sppg_id,
        recordId: vehicleDeleteTarget.id,
      })
      const response = await fetch(`/api/vehicles?${params}`, {
        method: "DELETE",
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Catatan kendaraan gagal dihapus."),
        )
      }
      setVehicleDeleteTarget(null)
      setVehicleRefreshCount((count) => count + 1)
    } catch (error) {
      setVehicleDeleteError(
        error instanceof Error
          ? error.message
          : "Catatan kendaraan gagal dihapus.",
      )
    } finally {
      setVehicleDeleting(false)
    }
  }

  function resetVehicleForm() {
    setVehicleDialogOpen(false)
    setVehicleType("R4")
    setVehicleSubtype(VEHICLE_SUBTYPES.R4[0])
    setVehicleSubtypeOther("")
    setVehicleMake("Belum dicatat")
    setVehicleMakeOther("")
    setVehicleModel("Belum dicatat")
    setVehicleModelOther("")
    setVehicleQuantity("")
    setEditingVehicleId(null)
    setVehicleSaveError("")
  }

  async function handleVehicleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedSppgId) {
      setVehicleSaveError("Pilih SPPG sebelum menyimpan data kendaraan.")
      return
    }

    const quantity = Number(vehicleQuantity)
    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      quantity > 1_000_000
    ) {
      setVehicleSaveError("Masukkan bilangan bulat antara 0 dan 1.000.000.")
      return
    }

    const subtype =
      vehicleSubtype === "Lainnya"
        ? vehicleSubtypeOther.trim()
        : vehicleSubtype
    const make = vehicleMake === "Lainnya" ? vehicleMakeOther.trim() : vehicleMake
    const model =
      vehicleModel === "Lainnya" ? vehicleModelOther.trim() : vehicleModel
    if (!subtype || !make || !model) {
      setVehicleSaveError(
        "Lengkapi tipe, merek, dan model kendaraan atau pilih Belum dicatat.",
      )
      return
    }

    setVehicleSaving(true)
    setVehicleSaveError("")
    try {
      const response = await fetch("/api/vehicles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sppgId: selectedSppgId,
          recordId: editingVehicleId ?? undefined,
          vehicleType,
          vehicleSubtype: subtype,
          vehicleMake: make,
          vehicleModel: model,
          quantity,
        }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Data kendaraan gagal disimpan."),
        )
      }
      resetVehicleForm()
      setVehicleRefreshCount((count) => count + 1)
    } catch (error) {
      setVehicleSaveError(
        error instanceof Error
          ? error.message
          : "Data kendaraan gagal disimpan.",
      )
    } finally {
      setVehicleSaving(false)
    }
  }

  function editVehicleRecord(record: VehicleInventoryRecord) {
    const subtypes = getVehicleSubtypes(record.vehicle_type)
    const subtype = subtypes.includes(record.vehicle_subtype)
      ? record.vehicle_subtype
      : "Lainnya"
    const makes = getVehicleMakes(record.vehicle_type, subtype)
    const make = makes.includes(record.vehicle_make)
      ? record.vehicle_make
      : "Lainnya"
    const models = getVehicleModels(record.vehicle_type, subtype, make)
    const model = models.includes(record.vehicle_model)
      ? record.vehicle_model
      : "Lainnya"

    setEditingVehicleId(record.id)
    setVehicleType(record.vehicle_type)
    setVehicleSubtype(subtype)
    setVehicleSubtypeOther(
      subtype === "Lainnya" ? record.vehicle_subtype : "",
    )
    setVehicleMake(make)
    setVehicleMakeOther(make === "Lainnya" ? record.vehicle_make : "")
    setVehicleModel(model)
    setVehicleModelOther(model === "Lainnya" ? record.vehicle_model : "")
    setVehicleQuantity(String(record.quantity))
    setVehicleSaveError("")
    setVehicleDialogOpen(true)
  }

  return (
    <section className={styles.view} aria-label="Katalog dan catatan aset">
      {selectedTab !== "non-juknis" &&
        selectedTab !== SURAT_EDARAN_TAB && (
          <div className={styles.categorySection}>
            <Text size={200} weight="semibold">
              Jenis dan kategori aset
            </Text>
            <div className={styles.categoryTabs}>
              <TabList
                aria-label="Kategori aset"
                selectedValue={selectedTab}
                onTabSelect={(_, data) => {
                  setPageIndex(0)
                  if (isAssetTab(data.value)) {
                    if (data.value !== selectedTab) {
                      setAnimateTableCategoryChange(true)
                    }
                    onSelectedTabChange(data.value)
                    if (
                      REFERENCE_CATEGORIES.some(
                        (category) => category === data.value,
                      )
                    ) {
                      dispatch({ type: "asset-search/set", value: "" })
                    }
                  }
                }}
              >
                <Tab
                  value="all"
                  className={styles.categoryIconTab}
                  icon={<AllAssetCategoriesIcon aria-hidden="true" />}
                >
                  Juknis · semua kategori
                </Tab>
                {ASSET_CATEGORIES.map((category) => (
                  <Tab
                    key={category}
                    value={category}
                    className={
                      category === "Peralatan dapur" ||
                      category === "Peralatan operasional" ||
                      category === "Peralatan kantor" ||
                      category === "Instalasi gas"
                        ? styles.categoryIconTab
                        : undefined
                    }
                    icon={
                      category === "Peralatan dapur" ? (
                        <KitchenEquipmentIcon aria-hidden="true" />
                      ) : category === "Peralatan operasional" ? (
                        <OperationalEquipmentIcon aria-hidden="true" />
                      ) : category === "Peralatan kantor" ? (
                        <OfficeEquipmentIcon aria-hidden="true" />
                      ) : category === "Instalasi gas" ? (
                        <GasInstallationIcon aria-hidden="true" />
                      ) : undefined
                    }
                  >
                    {category}
                  </Tab>
                ))}
                {REFERENCE_CATEGORIES.map((category) => (
                  <Tab
                    key={category}
                    value={category}
                    className={
                      category === "Kendaraan" ||
                      category === "Instalasi listrik"
                        ? styles.categoryIconTab
                        : undefined
                    }
                    icon={
                      category === "Kendaraan" ? (
                        <VehicleCategoryIcon aria-hidden="true" />
                      ) : category === "Instalasi listrik" ? (
                        <ElectricalInstallationIcon aria-hidden="true" />
                      ) : undefined
                    }
                  >
                    {category}
                  </Tab>
                ))}
              </TabList>
            </div>
          </div>
        )}

      {selectedTab === "Kendaraan" ? (
        <div className={styles.vehicleContent}>
          <div className={styles.referenceView}>
            <Text size={400} weight="semibold">
              Data kendaraan
            </Text>
            <Text size={200} className={styles.filterSummary}>
              Catat jumlah aktual per jenis untuk SPPG yang dipilih. Angka
              ketentuan bersyarat tidak otomatis dinilai sebagai kepatuhan.
            </Text>
          </div>

          <div className={styles.vehicleToolbar}>
            <div className={styles.vehicleToolbarControls}>
              <div className={styles.vehicleSppgField}>
                <Field label="SPPG" className={styles.field}>
                  <Dropdown
                    aria-label="SPPG untuk data kendaraan"
                    placeholder={
                      directoryLoading
                        ? "Memuat daftar SPPG…"
                        : sppgs.length === 0
                          ? "Belum ada SPPG"
                          : "Pilih SPPG"
                    }
                    value={selectedSppg?.nama ?? ""}
                    selectedOptions={selectedSppgId ? [selectedSppgId] : []}
                    disabled={directoryLoading || sppgs.length === 0}
                    onOptionSelect={(_, data) => {
                      resetVehicleForm()
                      setSelectedSppgId(data.optionValue ?? "")
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
              <TeachingPopover appearance="brand">
                <TeachingPopoverTrigger>
                  <Button
                    appearance="subtle"
                    className={styles.vehicleToolbarGuideButton}
                    icon={<BookInformationRegular aria-hidden="true" />}
                  >
                    Panduan standar
                  </Button>
                </TeachingPopoverTrigger>
                <TeachingPopoverSurface className={styles.teachingSurface}>
                  <TeachingPopoverHeader>Panduan kendaraan</TeachingPopoverHeader>
                  <TeachingPopoverCarousel
                    defaultValue="1"
                    announcement={getVehicleGuideAnnouncement}
                  >
                    {vehicleStandardReferences.map((item, index) => {
                      const value = String(index + 1)
                      return (
                        <TeachingPopoverCarouselCard
                          key={item.id}
                          value={value}
                          className={styles.teachingCard}
                        >
                          <TeachingPopoverBody>
                            <div className={styles.teachingContent}>
                              <TeachingPopoverTitle>
                                {item.aspect}
                              </TeachingPopoverTitle>
                              <Text size={200} weight="semibold">
                                {item.nature}
                              </Text>
                              <Text className={styles.teachingRequirement}>
                                {item.requirement}
                              </Text>
                              <Text
                                size={200}
                                className={styles.referenceSource}
                              >
                                {item.source}
                              </Text>
                            </div>
                          </TeachingPopoverBody>
                        </TeachingPopoverCarouselCard>
                      )
                    })}
                    <TeachingPopoverCarouselFooter
                      next="Berikutnya"
                      previous="Sebelumnya"
                      initialStepText="Tutup"
                      finalStepText="Selesai"
                    >
                      <TeachingPopoverCarouselNav>
                        {(index) => (
                          <TeachingPopoverCarouselNavButton
                            aria-label={`Poin ${index + 1}`}
                          />
                        )}
                      </TeachingPopoverCarouselNav>
                    </TeachingPopoverCarouselFooter>
                  </TeachingPopoverCarousel>
                </TeachingPopoverSurface>
              </TeachingPopover>
            </div>
            {canManage && (
              <Button
                appearance="primary"
                className={styles.vehicleToolbarAddButton}
                disabled={
                  !selectedSppgId ||
                  vehicleLoading ||
                  vehicleSaving ||
                  Boolean(vehicleError)
                }
                onClick={() => {
                  resetVehicleForm()
                  setVehicleDialogOpen(true)
                }}
              >
                Tambah kendaraan
              </Button>
            )}
          </div>

          {directoryError && (
            <MessageBar intent="error">
              <MessageBarBody>{directoryError}</MessageBarBody>
              <MessageBarActions>
                <Button
                  appearance="subtle"
                  onClick={() => window.location.reload()}
                >
                  Muat ulang
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}
          {!directoryLoading && sppgs.length === 0 && !directoryError && (
            <MessageBar intent="warning">
              <MessageBarBody>
                Tambahkan SPPG terlebih dahulu untuk mencatat jumlah kendaraan.
              </MessageBarBody>
            </MessageBar>
          )}
          {vehicleError && (
            <MessageBar intent="error">
              <MessageBarBody>{vehicleError}</MessageBarBody>
              <MessageBarActions>
                <Button
                  appearance="subtle"
                  onClick={() =>
                    setVehicleRefreshCount((count) => count + 1)
                  }
                >
                  Coba lagi
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}

          {canManage && (
            <Dialog
              open={vehicleDialogOpen}
              onOpenChange={(_, data) => {
                if (!data.open && !vehicleSaving) {
                  resetVehicleForm()
                }
              }}
            >
              <DialogSurface className={styles.vehicleDialogSurface}>
                <form onSubmit={handleVehicleSubmit}>
                  <DialogBody>
                    <DialogTitle>
                      {editingVehicleId
                        ? "Ubah catatan kendaraan"
                        : "Tambah kendaraan"}
                    </DialogTitle>
                    <DialogContent className={styles.vehicleDialogContent}>
                      <Text size={200} className={styles.secondaryText}>
                        {selectedSppg?.nama} · jumlah dicatat per kombinasi
                        jenis, tipe, merek, dan model.
                      </Text>
                      <div className={styles.vehicleFormFields}>
                        <div className={styles.vehicleTypeField}>
                          <Field
                            label="Jenis kendaraan"
                            className={styles.field}
                          >
                            <RadioGroup
                              layout="horizontal"
                              className={styles.vehicleTypeOptions}
                              value={vehicleType}
                              disabled={!selectedSppgId || vehicleSaving}
                              onChange={(_, data) => {
                                if (isVehicleType(data.value)) {
                                  setVehicleType(data.value)
                                  setVehicleSubtype(
                                    VEHICLE_SUBTYPES[data.value][0],
                                  )
                                  setVehicleSubtypeOther("")
                                  setVehicleMake("Belum dicatat")
                                  setVehicleMakeOther("")
                                  setVehicleModel("Belum dicatat")
                                  setVehicleModelOther("")
                                }
                              }}
                            >
                              {VEHICLE_TYPES.map((type) => (
                                <Radio
                                  key={type.value}
                                  value={type.value}
                                  label={type.label}
                                />
                              ))}
                            </RadioGroup>
                          </Field>
                        </div>
                        <Field label="Tipe kendaraan" className={styles.field}>
                          {vehicleSubtype === "Lainnya" ? (
                            <Input
                              aria-label="Tipe kendaraan lainnya"
                              placeholder="Masukkan tipe kendaraan"
                              required
                              maxLength={100}
                              value={vehicleSubtypeOther}
                              disabled={!selectedSppgId || vehicleSaving}
                              onChange={(_, data) =>
                                setVehicleSubtypeOther(data.value)
                              }
                            />
                          ) : (
                            <Dropdown
                              aria-label="Tipe kendaraan"
                              value={vehicleSubtype}
                              selectedOptions={[vehicleSubtype]}
                              disabled={!selectedSppgId || vehicleSaving}
                              onOptionSelect={(_, data) => {
                                if (typeof data.optionValue === "string") {
                                  setVehicleSubtype(data.optionValue)
                                  setVehicleSubtypeOther("")
                                  setVehicleMake("Belum dicatat")
                                  setVehicleMakeOther("")
                                  setVehicleModel("Belum dicatat")
                                  setVehicleModelOther("")
                                }
                              }}
                            >
                              {vehicleSubtypes.map((subtype) => (
                                <Option
                                  key={subtype}
                                  value={subtype}
                                  text={subtype}
                                >
                                  {subtype}
                                </Option>
                              ))}
                            </Dropdown>
                          )}
                        </Field>
                        <Field label="Merek" className={styles.field}>
                          {vehicleMake === "Lainnya" ? (
                            <Input
                              aria-label="Merek kendaraan lainnya"
                              placeholder="Masukkan merek"
                              required
                              maxLength={100}
                              value={vehicleMakeOther}
                              disabled={!selectedSppgId || vehicleSaving}
                              onChange={(_, data) =>
                                setVehicleMakeOther(data.value)
                              }
                            />
                          ) : (
                            <Dropdown
                              aria-label="Merek kendaraan"
                              value={vehicleMake}
                              selectedOptions={[vehicleMake]}
                              disabled={!selectedSppgId || vehicleSaving}
                              onOptionSelect={(_, data) => {
                                if (typeof data.optionValue === "string") {
                                  setVehicleMake(data.optionValue)
                                  setVehicleMakeOther("")
                                  setVehicleModel("Belum dicatat")
                                  setVehicleModelOther("")
                                }
                              }}
                            >
                              {vehicleMakes.map((make) => (
                                <Option key={make} value={make} text={make}>
                                  {make}
                                </Option>
                              ))}
                            </Dropdown>
                          )}
                        </Field>
                        <Field label="Model" className={styles.field}>
                          {vehicleModel === "Lainnya" ? (
                            <Input
                              aria-label="Model kendaraan lainnya"
                              placeholder="Masukkan model"
                              required
                              maxLength={100}
                              value={vehicleModelOther}
                              disabled={!selectedSppgId || vehicleSaving}
                              onChange={(_, data) =>
                                setVehicleModelOther(data.value)
                              }
                            />
                          ) : (
                            <Dropdown
                              aria-label="Model kendaraan"
                              value={vehicleModel}
                              selectedOptions={[vehicleModel]}
                              disabled={!selectedSppgId || vehicleSaving}
                              onOptionSelect={(_, data) => {
                                if (typeof data.optionValue === "string") {
                                  setVehicleModel(data.optionValue)
                                  setVehicleModelOther("")
                                }
                              }}
                            >
                              {vehicleModels.map((model) => (
                                <Option key={model} value={model} text={model}>
                                  {model}
                                </Option>
                              ))}
                            </Dropdown>
                          )}
                        </Field>
                        <Field
                          label="Jumlah aktual"
                          className={styles.field}
                        >
                          <Input
                            aria-label="Jumlah aktual kendaraan"
                            type="number"
                            min={0}
                            max={1_000_000}
                            step={1}
                            required
                            value={vehicleQuantity}
                            disabled={!selectedSppgId || vehicleSaving}
                            onChange={(_, data) =>
                              setVehicleQuantity(data.value)
                            }
                          />
                        </Field>
                      </div>
                      <div className={styles.quantityReferenceSummary}>
                        <Text size={200}>
                          Acuan workbook untuk aglomerasi: minimal 1 R4 box
                          tertutup jika ≤1.500 penerima manfaat, atau 2 R4
                          jika &gt;1.500 (Ps. 4.7k).
                        </Text>
                        <Text size={200}>
                          Jumlah aktual R4 bertipe “Box / mobil box”{" "}
                          {isVehicleR4BoxDraft ? "termasuk draf" : "tercatat"}:{" "}
                          {!selectedSppgId || vehicleLoading || vehicleError
                            ? "belum tersedia"
                            : `${new Intl.NumberFormat("id-ID").format(vehicleR4Reminder.actualR4BoxQuantity)} unit`}
                        </Text>
                        <Text size={200} className={styles.secondaryText}>
                          Hitungan hanya mencakup R4 bertipe box dan belum
                          memeriksa apakah box tertutup atau konteks SPPG.
                          Untuk wilayah sulit akses, jenis dan jumlah mengikuti
                          analisis kebutuhan wajar (Ps. 4.7l).
                        </Text>
                      </div>
                      {vehicleLoading || vehicleError ? (
                        <Text size={200} role="status">
                          Jumlah aktual kendaraan belum tersedia; pengingat
                          belum dihitung.
                        </Text>
                      ) : (
                        (vehicleR4Reminder.shortfallUpTo1500 > 0 ||
                          vehicleR4Reminder.shortfallOver1500 > 0) && (
                          <MessageBar intent="warning">
                            <MessageBarBody>
                              Pengingat bersyarat (Ps. 4.7k):{" "}
                              {vehicleR4Reminder.shortfallUpTo1500 > 0 && (
                                <>
                                  jika aglomerasi ≤1.500 penerima manfaat,
                                  kekurangan jumlah R4 bertipe box adalah{" "}
                                  {new Intl.NumberFormat("id-ID").format(
                                    vehicleR4Reminder.shortfallUpTo1500,
                                  )}{" "}
                                  unit.{" "}
                                </>
                              )}
                              {vehicleR4Reminder.shortfallOver1500 > 0 && (
                                <>
                                  jika &gt;1.500 penerima manfaat,
                                  kekurangannya{" "}
                                  {new Intl.NumberFormat("id-ID").format(
                                    vehicleR4Reminder.shortfallOver1500,
                                  )}{" "}
                                  unit.{" "}
                                </>
                              )}
                              Pastikan konteks dan kondisi box tertutup
                              sebelum menindaklanjuti; ini bukan kesimpulan
                              kepatuhan.
                            </MessageBarBody>
                          </MessageBar>
                        )
                      )}
                      <Text size={200} className={styles.assetRecordNote}>
                        <strong>Catatan:</strong>{" "}
                        {selectedVehicleModelSource && (
                          <>
                            Sumber katalog:{" "}
                            {selectedVehicleModelSource.sourceLevel}.{" "}
                            {selectedVehicleModelSource.sourceNote}{" "}
                          </>
                        )}
                        Contoh merek/model bukan standar BGN. Gunakan
                        “Lainnya” untuk pilihan yang tidak tersedia.
                      </Text>
                      {vehicleSaveError && (
                        <MessageBar intent="error">
                          <MessageBarBody>{vehicleSaveError}</MessageBarBody>
                        </MessageBar>
                      )}
                    </DialogContent>
                    <DialogActions>
                      <Button
                        type="button"
                        appearance="secondary"
                        disabled={vehicleSaving}
                        onClick={resetVehicleForm}
                      >
                        Batal
                      </Button>
                      <Button
                        appearance="primary"
                        type="submit"
                        disabled={
                          !selectedSppgId ||
                          vehicleSaving ||
                          vehicleLoading ||
                          Boolean(vehicleError)
                        }
                        aria-busy={vehicleSaving}
                      >
                        {vehicleSaving && <Spinner size="tiny" />}
                        {vehicleSaving
                          ? "Menyimpan…"
                          : editingVehicleId
                            ? "Simpan perubahan"
                            : "Simpan kendaraan"}
                      </Button>
                    </DialogActions>
                  </DialogBody>
                </form>
              </DialogSurface>
            </Dialog>
          )}

          <Text size={200} className={styles.filterSummary} aria-live="polite">
            {vehicleLoading
              ? "Memuat data kendaraan…"
              : `${visibleVehicleInventory.length} kombinasi kendaraan tercatat${selectedSppg ? ` · ${selectedSppg.nama}` : ""}`}
          </Text>

          <div className={styles.tableContainer}>
            {vehicleLoading ? (
              <div className={styles.status} role="status">
                <Spinner label="Memuat data kendaraan" />
              </div>
            ) : visibleVehicleInventory.length === 0 ? (
              <div className={styles.vehicleEmptyState} role="status">
                <Text weight="semibold">Belum ada kendaraan yang dicatat</Text>
                <Text size={200} className={styles.filterSummary}>
                  {canManage
                    ? "Pilih SPPG, lalu gunakan Tambah kendaraan untuk mencatat jumlah aktual."
                    : "Data kendaraan untuk SPPG ini belum tersedia."}
                </Text>
              </div>
            ) : (
              <div className={styles.tableShell}>
                <table
                  className={styles.vehicleTable}
                  aria-label="Jumlah kendaraan aktual per tipe dan model"
                >
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell} ${styles.vehicleTypeCell}`}
                      >
                        Jenis kendaraan
                      </th>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell} ${styles.vehicleSubtypeCell}`}
                      >
                        Tipe
                      </th>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell} ${styles.vehicleMakeCell}`}
                      >
                        Merek
                      </th>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell} ${styles.vehicleModelCell}`}
                      >
                        Model
                      </th>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell} ${styles.vehicleQuantityCell}`}
                      >
                        Jumlah aktual alat
                      </th>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell}`}
                      >
                        Kondisi aset
                      </th>
                      {canManage && (
                        <th
                          scope="col"
                          className={`${styles.referenceCell} ${styles.referenceHeaderCell}`}
                        >
                          Tindakan
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleVehicleInventory.map((record) => (
                      <tr key={record.id}>
                        <th
                          scope="row"
                          className={`${styles.referenceCell} ${styles.vehicleTypeCell}`}
                        >
                          {getVehicleTypeLabel(record.vehicle_type)}
                        </th>
                        <td
                          className={`${styles.referenceCell} ${styles.vehicleSubtypeCell}`}
                        >
                          {record.vehicle_subtype}
                        </td>
                        <td
                          className={`${styles.referenceCell} ${styles.vehicleMakeCell}`}
                        >
                          {record.vehicle_make}
                        </td>
                        <td
                          className={`${styles.referenceCell} ${styles.vehicleModelCell}`}
                        >
                          {record.vehicle_model}
                        </td>
                        <td className={styles.referenceCell}>
                          {new Intl.NumberFormat("id-ID").format(record.quantity)}
                        </td>
                        <td className={styles.referenceCell}>
                          <AssetConditionSelect
                            source="vehicle"
                            recordId={record.id}
                            sppgId={record.sppg_id}
                            assetName={`${record.vehicle_make} ${record.vehicle_model}`}
                            value={record.asset_condition}
                            canManage={canManage}
                            onSaved={(condition) =>
                              setVehicleInventory((current) =>
                                current.map((currentRecord) =>
                                  currentRecord.id === record.id
                                    ? {
                                        ...currentRecord,
                                        asset_condition: condition,
                                      }
                                    : currentRecord,
                                ),
                              )
                            }
                          />
                        </td>
                        {canManage && (
                          <td className={styles.referenceCell}>
                            <div className={styles.vehicleActions}>
                              <Menu positioning="below-end">
                                <MenuTrigger disableButtonEnhancement>
                                  {(triggerProps: MenuButtonProps) => (
                                    <SplitButton
                                      className={styles.vehicleSplitButton}
                                      menuButton={triggerProps}
                                      primaryActionButton={{
                                        onClick: () =>
                                          editVehicleRecord(record),
                                      }}
                                      disabled={
                                        vehicleLoading ||
                                        vehicleSaving ||
                                        vehicleDeleting
                                      }
                                    >
                                      Ubah
                                    </SplitButton>
                                  )}
                                </MenuTrigger>
                                <MenuPopover>
                                  <MenuList>
                                    <MenuItem
                                      disabled={
                                        vehicleLoading ||
                                        vehicleSaving ||
                                        vehicleDeleting
                                      }
                                      onClick={() =>
                                        editVehicleRecord(record)
                                      }
                                    >
                                      Ubah
                                    </MenuItem>
                                    <MenuItem
                                      disabled={
                                        vehicleLoading ||
                                        vehicleSaving ||
                                        vehicleDeleting
                                      }
                                      onClick={() => {
                                        setVehicleDeleteTarget(record)
                                        setVehicleDeleteError("")
                                      }}
                                    >
                                      Hapus
                                    </MenuItem>
                                  </MenuList>
                                </MenuPopover>
                              </Menu>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : selectedTab === "Instalasi gas" ? (
        <div className={styles.gasPage}>
          <header className={styles.gasPageHeader}>
            <div className={styles.gasPageIntro}>
              <Text size={500} weight="semibold">
                Instalasi gas
              </Text>
              <Text size={300} className={styles.secondaryText}>
                Catat kondisi instalasi dan tinjau jumlah peralatan aktual
                beserta rujukan workbook.
              </Text>
            </div>
          </header>

          {directoryError && (
            <MessageBar intent="error">
              <MessageBarBody>{directoryError}</MessageBarBody>
              <MessageBarActions>
                <Button
                  appearance="subtle"
                  onClick={() => window.location.reload()}
                >
                  Muat ulang
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}
          {!directoryLoading && sppgs.length === 0 && !directoryError && (
            <MessageBar intent="warning">
              <MessageBarBody>
                Pilih atau tambahkan SPPG terlebih dahulu untuk melihat dan
                mencatat data aktual.
              </MessageBarBody>
            </MessageBar>
          )}

          <div className={styles.gasSummaryGrid}>
            <div className={styles.gasConfigurationColumn}>
              <div className={styles.gasSppgRow}>
                <Field label="SPPG" className={styles.gasSppgField}>
                  <Dropdown
                    aria-label="SPPG untuk pencatatan instalasi gas"
                    placeholder={
                      directoryLoading
                        ? "Memuat daftar SPPG…"
                        : sppgs.length === 0
                          ? "Belum ada SPPG"
                          : "Pilih SPPG"
                    }
                    value={selectedSppg?.nama ?? ""}
                    selectedOptions={selectedSppgId ? [selectedSppgId] : []}
                    disabled={directoryLoading || sppgs.length === 0}
                    onOptionSelect={(_, data) =>
                      setSelectedSppgId(data.optionValue ?? "")
                    }
                  >
                    {sppgs.map((sppg) => (
                      <Option key={sppg.id} value={sppg.id} text={sppg.nama}>
                        {sppg.nama}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
              </div>
              <section
                className={styles.gasConfiguration}
                aria-labelledby="gas-configuration-title"
              >
              <div className={styles.gasConfigurationHeader}>
                <div className={styles.itemCell}>
                  <Text
                    id="gas-configuration-title"
                    size={400}
                    weight="semibold"
                  >
                    Konfigurasi aktual
                  </Text>
                  <Text size={200} className={styles.secondaryText}>
                    {selectedSppg?.nama ?? "Pilih SPPG"} · Status ringkasan
                    berdasarkan konfigurasi tercatat, bukan penilaian
                    kepatuhan.
                  </Text>
                </div>
                {selectedSppgId &&
                  !gasLoading &&
                  !gasError && (
                    <Badge
                      appearance="filled"
                      color={assetStatusColors[gasInstallationReadiness]}
                      icon={assetStatusIcons[gasInstallationReadiness]}
                      style={{ fontWeight: 400 }}
                    >
                      Instalasi gas: {gasInstallationReadiness}
                    </Badge>
                  )}
                {canManage && selectedSppgId && (
                  <Button
                    appearance="primary"
                    size="small"
                    disabled={gasLoading || Boolean(gasError) || gasSaving}
                    onClick={openGasDialog}
                  >
                    {currentGasInstallation ? "Ubah catatan" : "Catat kondisi"}
                  </Button>
                )}
              </div>

              {gasLoading ? (
                <div role="status" className={styles.vehicleEmptyState}>
                  <Spinner size="small" label="Memuat kondisi instalasi gas" />
                </div>
              ) : gasError ? (
                <MessageBar intent="error">
                  <MessageBarBody>{gasError}</MessageBarBody>
                  <MessageBarActions>
                    <Button
                      appearance="subtle"
                      onClick={() => setGasRefreshCount((count) => count + 1)}
                    >
                      Coba lagi
                    </Button>
                  </MessageBarActions>
                </MessageBar>
              ) : (
                <div className={styles.gasConfigurationValues}>
                  <div className={styles.gasConfigurationValue}>
                    <Text size={200} className={styles.gasConfigurationLabel}>
                      Sensor/alarm kebocoran gas
                    </Text>
                    <Text weight="semibold">
                      {!selectedSppgId
                        ? "Pilih SPPG"
                        : currentGasInstallation
                          ? currentGasInstallation.safety_system_present === 1
                            ? "Ada"
                            : "Tidak ada"
                          : "Belum dicatat"}
                    </Text>
                  </div>
                  <div className={styles.gasConfigurationValue}>
                    <Text size={200} className={styles.gasConfigurationLabel}>
                      Jalur high pressure
                    </Text>
                    <Text weight="semibold">
                      {!selectedSppgId
                        ? "Pilih SPPG"
                        : getGasLineSummary(
                            currentGasInstallation,
                            "high",
                          )}
                    </Text>
                  </div>
                  <div className={styles.gasConfigurationValue}>
                    <Text size={200} className={styles.gasConfigurationLabel}>
                      Jalur low pressure
                    </Text>
                    <Text weight="semibold">
                      {!selectedSppgId
                        ? "Pilih SPPG"
                        : getGasLineSummary(
                            currentGasInstallation,
                            "low",
                          )}
                    </Text>
                  </div>
                </div>
              )}
              </section>
            </div>

            <section
              className={styles.gasGuidance}
              aria-labelledby="gas-guidance-title"
            >
              <div className={styles.gasSectionHeader}>
                <Text id="gas-guidance-title" size={400} weight="semibold">
                  Ketentuan workbook
                </Text>
                <Text size={200} className={styles.secondaryText}>
                  Ps. 4.9.4b
                </Text>
              </div>
              <div className={styles.gasNotes}>
                <div className={styles.gasNote}>
                  <Text weight="semibold">LPG</Text>
                  <Text size={300}>
                    50 kg; gas station terpusat 12 kg bila ukuran 50 kg tidak
                    tersedia.
                  </Text>
                </div>
                <div className={styles.gasNote}>
                  <Text weight="semibold">Penempatan</Text>
                  <Text size={300}>
                    Gas station terpisah dari ruang olah.
                  </Text>
                </div>
                <div className={styles.gasNote}>
                  <Text weight="semibold">Pengelasan</Text>
                  <Text size={300}>
                    Dilakukan oleh welder bersertifikat.
                  </Text>
                </div>
              </div>
              <Text size={200} className={styles.secondaryText}>
                Jalur yang dicatat hanya informasi konfigurasi. Status
                ringkasan mengikuti pilihan sensor/alarm dan jalur; ini bukan
                inspeksi teknis atau kesimpulan kepatuhan.
              </Text>
            </section>
          </div>

        </div>
      ) : selectedTab === "Instalasi listrik" ? (
        <ElectricalInstallationManagement
          user={user}
          sppgs={sppgs}
          selectedSppgId={selectedSppgId}
          directoryLoading={directoryLoading}
          directoryError={directoryError}
          onSelectSppg={setSelectedSppgId}
        />
      ) : selectedTab === "non-juknis" ? (
        <NonJuknisAssetManagement
          sppgs={sppgs}
          selectedSppgId={selectedSppgId}
          directoryLoading={directoryLoading}
          directoryError={directoryError}
          canManage={canManage}
          onSelectSppg={setSelectedSppgId}
        />
      ) : selectedTab === SURAT_EDARAN_TAB ? (
        <SuratEdaranAssetManagement
          sppgs={sppgs}
          selectedSppgId={selectedSppgId}
          directoryLoading={directoryLoading}
          directoryError={directoryError}
          canManage={canManage}
          onSelectSppg={setSelectedSppgId}
        />
      ) : isReferenceTab ? (
        <>
          <MessageBar intent="info" className={styles.context}>
            <MessageBarBody className={styles.contextBody}>
              Workbook hanya menyebut PLN, genset cadangan, dan instalasi
              standar aman; rincian teknis maupun kuantitas tidak tersedia
              untuk dinilai di sini.
            </MessageBarBody>
          </MessageBar>

          <div className={styles.referenceView}>
            <Text size={400} weight="semibold">
              {referenceTitle}
            </Text>
            <div className={styles.tableContainer}>
              <div className={styles.tableShell}>
                <table
                  className={styles.referenceTable}
                  aria-label={referenceTitle}
                >
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell} ${styles.referenceAspectCell}`}
                      >
                        Kondisi / aspek
                      </th>
                      <th
                        scope="col"
                        className={`${styles.referenceCell} ${styles.referenceHeaderCell}`}
                      >
                        Ketentuan workbook
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {referenceRows.map((item) => (
                      <tr key={item.id}>
                        <th
                          scope="row"
                          className={`${styles.referenceCell} ${styles.referenceAspectCell}`}
                        >
                          {item.aspect}
                        </th>
                        <td className={styles.referenceCell}>
                          <div className={styles.referenceRequirement}>
                            <Text size={200} weight="semibold">
                              {item.nature}
                            </Text>
                            <span>{item.requirement}</span>
                            <span className={styles.referenceSource}>
                              {item.source}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <MessageBar intent="info" className={styles.context}>
            <MessageBarBody className={styles.contextBody}>
              Status membandingkan jumlah aktual dengan acuan numerik yang
              jelas, bukan penilaian kepatuhan. Acuan dapur berkonteks SPPG
              3.000 penerima manfaat; acuan ambigu atau kontekstual perlu
              verifikasi.
            </MessageBarBody>
          </MessageBar>

          <div className={styles.toolbar}>
            <Field label="SPPG" className={styles.field}>
              <Dropdown
                aria-label="SPPG untuk pencatatan aset"
                placeholder={
                  directoryLoading
                    ? "Memuat daftar SPPG…"
                    : sppgs.length === 0
                      ? "Belum ada SPPG"
                      : "Pilih SPPG"
                }
                value={selectedSppg?.nama ?? ""}
                selectedOptions={selectedSppgId ? [selectedSppgId] : []}
                disabled={directoryLoading || sppgs.length === 0}
                onOptionSelect={(_, data) => {
                  setPageIndex(0)
                  setSelectedSppgId(data.optionValue ?? "")
                }}
              >
                {sppgs.map((sppg) => (
                  <Option key={sppg.id} value={sppg.id} text={sppg.nama}>
                    {sppg.nama}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            <Field label="Cari aset" className={styles.field}>
              <SearchBox
                value={search}
                onChange={(_, data) => {
                  setPageIndex(0)
                  dispatch({ type: "asset-search/set", value: data.value })
                }}
                placeholder="Nama, kategori, atau rujukan"
              />
            </Field>
          </div>

          {directoryError && (
            <MessageBar intent="error">
              <MessageBarBody>{directoryError}</MessageBarBody>
              <MessageBarActions>
                <Button
                  appearance="subtle"
                  onClick={() => window.location.reload()}
                >
                  Muat ulang
                </Button>
              </MessageBarActions>
            </MessageBar>
          )}
          {!directoryLoading && sppgs.length === 0 && !directoryError && (
            <MessageBar intent="warning">
              <MessageBarBody>
                Katalog tetap ditampilkan. Pilih atau tambahkan SPPG terlebih
                dahulu untuk mencatat jumlah aktual.
              </MessageBarBody>
            </MessageBar>
          )}
          {inventoryError && (
            <MessageBar intent="error">
              <MessageBarBody>{inventoryError}</MessageBarBody>
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

          <Text size={200} className={styles.filterSummary} aria-live="polite">
            Menampilkan {rows.length} dari {assetCatalog.length} item katalog
            {selectedSppg ? ` · ${selectedSppg.nama}` : ""}
          </Text>

          <SlideRelaxed
            key={selectedTab}
            visible
            appear={animateTableCategoryChange}
            outY="20px"
          >
            <div className={styles.tableContainer}>
              <div className={styles.tableShell}>
                <DataGrid
                  aria-label="Katalog acuan dan jumlah aktual aset"
                  items={pageRows}
                  columns={columns}
                  sortable
                  sortState={sortState}
                  onSortChange={(_, nextSortState) => setSortState(nextSortState)}
                  getRowId={(item) => item.id}
                  focusMode="composite"
                  className={styles.dataGrid}
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
                  <DataGridBody<AssetRow>>
                    {({ item, rowId }) => (
                      <DataGridRow<AssetRow> key={rowId}>
                        {({ renderCell }) => (
                          <DataGridCell>{renderCell(item)}</DataGridCell>
                        )}
                      </DataGridRow>
                    )}
                  </DataGridBody>
                </DataGrid>
                {rows.length === 0 && (
                  <div className={styles.status} role="status">
                    <Text weight="semibold">Tidak ada aset yang cocok</Text>
                    <Text size={300}>Ubah kata pencarian atau kategori.</Text>
                  </div>
                )}
              </div>
              {sortedRows.length > 0 && (
                <nav
                  className={styles.pagination}
                  aria-label="Navigasi halaman katalog aset"
                >
                  <Text
                    size={200}
                    className={styles.paginationSummary}
                    aria-live="polite"
                  >
                    Menampilkan {pageStart}-{pageEnd} dari {sortedRows.length} item
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
          </SlideRelaxed>
        </>
      )}

      <Dialog
        open={Boolean(recordTarget)}
        onOpenChange={(_, data) => {
          if (!data.open && !saving) {
            setRecordTarget(null)
            setRecordError("")
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <form onSubmit={handleRecordSubmit}>
            <DialogBody>
              <DialogTitle>Catat jumlah aktual</DialogTitle>
              <DialogContent className={styles.dialogContent}>
                <div className={styles.recordSummary}>
                  <Text weight="semibold">{recordTarget?.name}</Text>
                  <Text size={200} className={styles.secondaryText}>
                    {selectedSppg?.nama} · {recordTarget?.unit} ·{" "}
                    {recordTarget?.sourceLabel}
                  </Text>
                </div>
                <Field label={`Jumlah aktual (${recordTarget?.unit ?? "unit"})`}>
                  <Input
                    autoFocus
                    type="number"
                    min={0}
                    max={1_000_000}
                    step={1}
                    required
                    value={recordQuantity}
                    aria-describedby={
                      recordQuantityFeedback
                        ? "asset-record-quantity-feedback"
                        : undefined
                    }
                    onChange={(_, data) => {
                      setRecordQuantity(data.value)
                      setRecordError("")
                    }}
                  />
                  {recordQuantityFeedback && (
                    <Text
                      id="asset-record-quantity-feedback"
                      size={200}
                      role={
                        recordError ||
                        (recordQuantity !== "" && !isRecordQuantityValid)
                          ? "alert"
                          : "status"
                      }
                      className={
                        recordQuantityFeedback.tone === "success"
                          ? styles.assetSuccess
                          : recordQuantityFeedback.tone === "neutral"
                            ? styles.secondaryText
                            : styles.assetValidation
                      }
                    >
                      {recordQuantityFeedback.tone === "warning" ? (
                        <>
                          <strong>Peringatan:</strong>{" "}
                          {recordQuantityFeedback.message}
                        </>
                      ) : (
                        recordQuantityFeedback.message
                      )}
                    </Text>
                  )}
                </Field>
                <div className={styles.quantityReferenceSummary}>
                  <Text size={200} className={styles.secondaryText}>
                    Jumlah acuan workbook:{" "}
                    {recordTarget?.quantityText ?? "Belum tersedia"}
                  </Text>
                  <Text size={200} className={styles.secondaryText}>
                    Jumlah aktual:{" "}
                    {isRecordQuantityValid
                      ? `${new Intl.NumberFormat("id-ID").format(numericRecordQuantity)} ${recordTarget?.unit ?? "unit"}`
                      : "Belum diisi"}
                  </Text>
                </div>
                {recordTarget &&
                  usesThreeThousandCapacityReference(recordTarget) &&
                  recordTarget.quantity !== null &&
                  !assetQuantityNeedsVerification(recordTarget) && (
                    <Text size={200} className={styles.secondaryText}>
                      Acuan kategori ini berkonteks SPPG berkapasitas 3.000
                      penerima manfaat. Selisih hanya pengingat bersyarat;
                      status tetap perlu verifikasi.
                    </Text>
                  )}
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
                <Field label="Tipe aset (opsional)">
                  <Input
                    maxLength={100}
                    value={recordAssetType}
                    onChange={(_, data) => setRecordAssetType(data.value)}
                    placeholder="Masukkan tipe aset"
                  />
                </Field>
                <Field label="Merek aset (opsional)">
                  <Input
                    maxLength={100}
                    value={recordAssetBrand}
                    onChange={(_, data) => setRecordAssetBrand(data.value)}
                    placeholder="Masukkan merek aset"
                  />
                </Field>
                <Text size={200} className={styles.assetRecordNote}>
                  <strong>Catatan:</strong>{" "}
                  Tipe dan merek berlaku untuk seluruh jumlah pada catatan ini.
                  Detail aset tidak menilai kepatuhan terhadap acuan workbook.
                </Text>
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={saving}
                  onClick={() => setRecordTarget(null)}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={saving || !recordQuantity}
                  aria-busy={saving}
                >
                  {saving && <Spinner size="tiny" />}
                  Simpan
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={gasDialogOpen}
        onOpenChange={(_, data) => {
          if (!data.open && !gasSaving) {
            setGasDialogOpen(false)
            setGasDialogError("")
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <form
            noValidate
            onSubmit={(event) => void handleGasSubmit(event)}
          >
            <DialogBody>
              <DialogTitle>
                {currentGasInstallation
                  ? "Ubah kondisi instalasi gas"
                  : "Catat kondisi instalasi gas"}
              </DialogTitle>
              <DialogContent
                className={mergeClasses(
                  styles.dialogContent,
                  styles.gasDialogContent,
                )}
              >
                <Text size={200} className={styles.secondaryText}>
                  {selectedSppg?.nama}. Catat kondisi yang diketahui; formulir
                  ini tidak menilai kepatuhan terhadap standar.
                </Text>
                <div className={styles.gasFormFields}>
                  <Field
                    label="Sistem keamanan gas (sensor/alarm kebocoran)"
                    required
                  >
                    <RadioGroup
                      layout="horizontal"
                      className={styles.vehicleTypeOptions}
                      value={gasSafetySystemPresent}
                      onChange={(_, data) => {
                        if (isPresenceChoice(data.value)) {
                          setGasSafetySystemPresent(data.value)
                          setGasDialogError("")
                        }
                      }}
                    >
                      <Radio value="yes" label="Ada" />
                      <Radio value="no" label="Tidak ada" />
                    </RadioGroup>
                  </Field>
                  <Field label="Jalur high pressure" required>
                    <RadioGroup
                      layout="horizontal"
                      className={styles.vehicleTypeOptions}
                      value={highPressurePresent}
                      onChange={(_, data) => {
                        if (isPresenceChoice(data.value)) {
                          setHighPressurePresent(data.value)
                          if (data.value === "no") {
                            setHighPressureLineCount("")
                          }
                          setGasDialogError("")
                        }
                      }}
                    >
                      <Radio value="yes" label="Ada" />
                      <Radio value="no" label="Tidak ada" />
                    </RadioGroup>
                  </Field>
                  {highPressurePresent === "yes" && (
                    <Field label="Jumlah jalur high pressure" required>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={highPressureLineCount}
                        onChange={(_, data) => {
                          setHighPressureLineCount(data.value)
                          setGasDialogError("")
                        }}
                      />
                    </Field>
                  )}
                  <Field label="Jalur low pressure" required>
                    <RadioGroup
                      layout="horizontal"
                      className={styles.vehicleTypeOptions}
                      value={lowPressurePresent}
                      onChange={(_, data) => {
                        if (isPresenceChoice(data.value)) {
                          setLowPressurePresent(data.value)
                          if (data.value === "no") {
                            setLowPressureLineCount("")
                          }
                          setGasDialogError("")
                        }
                      }}
                    >
                      <Radio value="yes" label="Ada" />
                      <Radio value="no" label="Tidak ada" />
                    </RadioGroup>
                  </Field>
                  {lowPressurePresent === "yes" && (
                    <Field label="Jumlah jalur low pressure" required>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        required
                        value={lowPressureLineCount}
                        onChange={(_, data) => {
                          setLowPressureLineCount(data.value)
                          setGasDialogError("")
                        }}
                      />
                    </Field>
                  )}
                </div>
                <MessageBar intent="info">
                  <MessageBarBody>
                    Acuan workbook tidak menetapkan keberadaan sensor/alarm
                    atau jumlah jalur. Status ini hanya ringkasan aplikasi,
                    bukan penilaian kepatuhan. Jumlah jalur wajib diisi hanya
                    jika jalurnya dipilih Ada; pilihan Tidak ada tidak
                    menyimpan jumlah. Isian saat ini: sensor/alarm{" "}
                    {gasSafetySystemPresent === "yes"
                      ? "Ada"
                      : gasSafetySystemPresent === "no"
                        ? "Tidak ada"
                        : "belum dipilih"}
                    , high pressure{" "}
                    {highPressurePresent === "yes"
                      ? `${highPressureLineCount.trim() || "jumlah belum diisi"} jalur`
                      : highPressurePresent === "no"
                        ? "Tidak ada"
                        : "belum dipilih"}
                    , low pressure{" "}
                    {lowPressurePresent === "yes"
                      ? `${lowPressureLineCount.trim() || "jumlah belum diisi"} jalur`
                      : lowPressurePresent === "no"
                        ? "Tidak ada"
                        : "belum dipilih"}
                    .
                  </MessageBarBody>
                </MessageBar>
                {gasDialogError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{gasDialogError}</MessageBarBody>
                  </MessageBar>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  className={styles.dialogActionButton}
                  disabled={gasSaving}
                  onClick={() => {
                    setGasDialogOpen(false)
                    setGasDialogError("")
                  }}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  className={styles.dialogActionButton}
                  disabled={gasSaving}
                  aria-busy={gasSaving}
                >
                  {gasSaving && <Spinner size="tiny" />}
                  Simpan kondisi
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>

      <Dialog
        open={Boolean(vehicleDeleteTarget)}
        onOpenChange={(_, data) => {
          if (!data.open && !vehicleDeleting) {
            setVehicleDeleteTarget(null)
            setVehicleDeleteError("")
          }
        }}
      >
        <DialogSurface className={styles.dialogSurface}>
          <DialogBody>
            <DialogTitle>Hapus catatan kendaraan?</DialogTitle>
            <DialogContent className={styles.dialogContent}>
              {vehicleDeleteTarget && (
                <>
                  <Text weight="semibold">
                    {getVehicleTypeLabel(vehicleDeleteTarget.vehicle_type)} ·{" "}
                    {vehicleDeleteTarget.vehicle_subtype}
                  </Text>
                  <Text size={200} className={styles.secondaryText}>
                    {vehicleDeleteTarget.vehicle_make} ·{" "}
                    {vehicleDeleteTarget.vehicle_model} ·{" "}
                    {new Intl.NumberFormat("id-ID").format(
                      vehicleDeleteTarget.quantity,
                    )}{" "}
                    unit ·{" "}
                    {sppgs.find(
                      (sppg) => sppg.id === vehicleDeleteTarget.sppg_id,
                    )?.nama}
                  </Text>
                </>
              )}
              <Text>
                Catatan jumlah aktual ini akan dihapus. Data SPPG dan katalog
                kendaraan tidak berubah.
              </Text>
              {vehicleDeleteError && (
                <MessageBar intent="error">
                  <MessageBarBody>{vehicleDeleteError}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                appearance="secondary"
                className={styles.dialogActionButton}
                disabled={vehicleDeleting}
                onClick={() => {
                  setVehicleDeleteTarget(null)
                  setVehicleDeleteError("")
                }}
              >
                Batal
              </Button>
              <Button
                type="button"
                appearance="primary"
                className={styles.dialogActionButton}
                disabled={vehicleDeleting}
                aria-busy={vehicleDeleting}
                onClick={() => void handleVehicleDelete()}
              >
                {vehicleDeleting && <Spinner size="tiny" />}
                Hapus catatan
              </Button>
            </DialogActions>
          </DialogBody>
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
            <DialogTitle>Hapus catatan jumlah aktual?</DialogTitle>
            <DialogContent className={styles.dialogContent}>
              <Text>
                Catatan untuk “{deleteTarget?.name}” pada {selectedSppg?.nama}{" "}
                akan dihapus. Katalog acuan tidak berubah.
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
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </Button>
              <Button
                appearance="primary"
                disabled={deleting}
                aria-busy={deleting}
                onClick={() => void handleDelete()}
              >
                {deleting && <Spinner size="tiny" />}
                Hapus catatan
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </section>
  )
}

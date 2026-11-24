"use client"

import * as React from "react"
import {
  AppItem,
  Badge,
  Button,
  createTableColumn,
  DataGrid,
  DataGridBody,
  DataGridCell,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridRow,
  Divider,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Hamburger,
  InfoLabel,
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  makeStyles,
  MessageBar,
  MessageBarActions,
  MessageBarBody,
  MessageBarTitle,
  mergeClasses,
  NavCategory,
  NavCategoryItem,
  NavDivider,
  NavDrawer,
  NavDrawerBody,
  NavDrawerFooter,
  NavItem,
  NavSectionHeader,
  NavSubItem,
  NavSubItemGroup,
  Persona,
  TableCellLayout,
  Tab,
  TabList,
  Text,
  Tooltip,
  tokens,
  useRestoreFocusTarget,
} from "@fluentui/react-components"
import type {
  DrawerProps,
  TableColumnDefinition,
} from "@fluentui/react-components"
import {
  Archive20Filled,
  Archive20Regular,
  Board20Filled,
  Board20Regular,
  BoxMultiple20Filled,
  BoxMultiple20Regular,
  BuildingPeopleFilled,
  BuildingPeopleRegular,
  BuildingMultiple20Filled,
  BuildingMultiple20Regular,
  Database24Regular,
  DeleteFilled,
  DeleteRegular,
  ChevronUpDownRegular,
  EditFilled,
  EditRegular,
  EyeFilled,
  EyeRegular,
  MoreHorizontalRegular,
  People20Filled,
  People20Regular,
  PeopleQueueFilled,
  PeopleQueueRegular,
  PanelLeftTallFilled,
  PanelLeftTallRegular,
  SignOutFilled,
  SignOutRegular,
  WeatherMoonFilled,
  WeatherMoonRegular,
  WeatherSunnyFilled,
  WeatherSunnyRegular,
  WrenchScrewdriver20Filled,
  WrenchScrewdriver20Regular,
  bundleIcon,
} from "@fluentui/react-icons"
import { AccountManagement } from "@/components/account-management"
import { AssetManagement } from "@/components/asset-management"
import { AssetCompletenessManagement } from "@/components/asset-completeness-management"
import { AssetImportManagement } from "@/components/asset-import-management"
import { DirectoryCreateDialog } from "@/components/directory-create-dialog"
import { LocalAuthScreen } from "@/components/local-auth-screen"
import { MaintenanceManagement } from "@/components/maintenance-management"
import { PersonalAccountManagement } from "@/components/personal-account-management"
import { RABManagement } from "@/components/rab-management"
import { WarehouseManagement } from "@/components/warehouse-management"
import { useUiDispatch, useUiState } from "@/components/ui-state-provider"
import type { AppSection, MaintenanceTab } from "@/lib/ui-state"
import {
  LOCAL_PAGE_PERMISSION_GROUPS,
  isLocalPagePermissions,
} from "@/lib/access-types"
import type {
  LocalPagePermission,
  LocalRole,
  LocalUser,
} from "@/lib/access-types"
import type {
  DirectoryEditTarget,
  DirectoryKind,
  SppgDirectoryRecord,
  YayasanDirectoryRecord,
} from "@/lib/directory-types"

const DashboardIcon = bundleIcon(Board20Filled, Board20Regular)
const DirectoryIcon = bundleIcon(BuildingMultiple20Filled, BuildingMultiple20Regular)
const AssetIcon = bundleIcon(BoxMultiple20Filled, BoxMultiple20Regular)
const WarehouseIcon = bundleIcon(Archive20Filled, Archive20Regular)
const MaintenanceIcon = bundleIcon(
  WrenchScrewdriver20Filled,
  WrenchScrewdriver20Regular,
)
const AccountsIcon = bundleIcon(People20Filled, People20Regular)
const NavigationToggleIcon = bundleIcon(
  PanelLeftTallFilled,
  PanelLeftTallRegular,
)
const SignOutIcon = bundleIcon(SignOutFilled, SignOutRegular)
const EyeDetailIcon = bundleIcon(EyeFilled, EyeRegular)
const EditRowIcon = bundleIcon(EditFilled, EditRegular)
const DeleteRowIcon = bundleIcon(DeleteFilled, DeleteRegular)

type DrawerType = Required<DrawerProps>["type"]
type SppgRow = SppgDirectoryRecord
type YayasanRow = YayasanDirectoryRecord

const sectionPagePermissions: Partial<
  Record<AppSection, LocalPagePermission>
> = {
  directory: "directory",
  "asset-recording": "asset-recording",
  "asset-non-juknis": "asset-non-juknis",
  "asset-surat-edaran": "asset-surat-edaran",
  "asset-completeness": "asset-completeness",
  "asset-import": "asset-recording",
  maintenance: "maintenance",
  warehouse: "warehouse",
  "warehouse-spare-parts": "warehouse",
  "warehouse-allocations": "warehouse",
}

function hasPageAccess(user: LocalUser, page: LocalPagePermission) {
  return user.role === "admin" || user.pagePermissions?.[page] === true
}

function hasSectionAccess(user: LocalUser, section: AppSection) {
  if (section === "overview") return true
  if (section === "accounts-application" || section === "accounts-personal") {
    return user.role === "admin"
  }
  const page = sectionPagePermissions[section]
  return page !== undefined && hasPageAccess(user, page)
}

function TruncatedDirectoryCell({ value }: { value: string }) {
  return (
    <Tooltip content={value} relationship="label">
      <TableCellLayout truncate>{value}</TableCellLayout>
    </Tooltip>
  )
}

const pageInfo: Record<
  AppSection,
  { label: string; description: string; emptyTitle: string; emptyDescription: string }
> = {
  overview: {
    label: "Ringkasan operasi",
    description: "Gambaran umum data operasional yang dikelola di aplikasi.",
    emptyTitle: "Ringkasan belum tersedia",
    emptyDescription:
      "Ringkasan akan muncul setelah catatan operasional tersedia.",
  },
  directory: {
    label: "SPPG & Yayasan",
    description: "Direktori SPPG dan Yayasan.",
    emptyTitle: "Belum ada data direktori",
    emptyDescription: "Tambahkan catatan pertama untuk mulai mengisi direktori.",
  },
  "asset-recording": {
    label: "Pencatatan aset",
    description:
      "Katalog acuan workbook dan jumlah aktual yang dicatat per SPPG.",
    emptyTitle: "Katalog aset belum tersedia",
    emptyDescription: "Katalog acuan aset belum dapat dimuat.",
  },
  "asset-non-juknis": {
    label: "Aset non-juknis",
    description: "Pencatatan aset non-juknis per SPPG.",
    emptyTitle: "Aset non-juknis belum tersedia",
    emptyDescription: "Data aset non-juknis belum dapat dimuat.",
  },
  "asset-surat-edaran": {
    label: "Aset Surat Edaran",
    description: "Pencatatan aset berdasarkan Surat Edaran per SPPG.",
    emptyTitle: "Aset Surat Edaran belum tersedia",
    emptyDescription: "Data aset Surat Edaran belum dapat dimuat.",
  },
  "asset-completeness": {
    label: "Kelengkapan aset",
    description: "Ringkasan jumlah dan keterbandingan aset per SPPG.",
    emptyTitle: "Kelengkapan aset belum tersedia",
    emptyDescription:
      "Ringkasan kelengkapan aset belum dapat dimuat.",
  },
  "asset-import": {
    label: "Impor Excel",
    description:
      "Siapkan data aset dari workbook Excel untuk dialokasikan pada tahap berikutnya.",
    emptyTitle: "",
    emptyDescription: "",
  },
  maintenance: {
    label: "Pemeliharaan",
    description:
      "Atur rencana pemeliharaan aset berdasarkan SPPG dan tanggal penugasan.",
    emptyTitle: "Belum ada jadwal pemeliharaan",
    emptyDescription: "Jadwal yang dibuat akan tampil di sini.",
  },
  warehouse: {
    label: "Stok aset",
    description: "Kelola stok aset gudang dan catat transaksi masuk dan keluar.",
    emptyTitle: "Stok aset belum tersedia",
    emptyDescription: "Daftar stok aset gudang belum dapat dimuat.",
  },
  "warehouse-spare-parts": {
    label: "Spare Part",
    description: "Kelola stok spare part gudang dan catat transaksi masuk dan keluar.",
    emptyTitle: "Spare part belum tersedia",
    emptyDescription: "Daftar spare part gudang belum dapat dimuat.",
  },
  "warehouse-allocations": {
    label: "Alokasi & mutasi SPPG",
    description: "Kelola saldo aset yang dialokasikan ke SPPG dan riwayat mutasinya.",
    emptyTitle: "Alokasi aset belum tersedia",
    emptyDescription: "Saldo alokasi aset belum dapat dimuat.",
  },
  "accounts-application": {
    label: "Akun aplikasi",
    description: "Kelola daftar akun aplikasi dan peran aksesnya.",
    emptyTitle: "",
    emptyDescription: "",
  },
  "accounts-personal": {
    label: "Akun pribadi",
    description: "Lihat identitas akun Admin dan atur password pribadi.",
    emptyTitle: "",
    emptyDescription: "",
  },
}

const sppgColumns: TableColumnDefinition<SppgRow>[] = [
  createTableColumn<SppgRow>({
    columnId: "nama",
    compare: (a, b) => a.nama.localeCompare(b.nama),
    renderHeaderCell: () => "Nama SPPG",
    renderCell: (item) => <TruncatedDirectoryCell value={item.nama} />,
  }),
  createTableColumn<SppgRow>({
    columnId: "yayasan",
    compare: (a, b) => a.yayasan.localeCompare(b.yayasan),
    renderHeaderCell: () => "Yayasan",
    renderCell: (item) => <TruncatedDirectoryCell value={item.yayasan} />,
  }),
  createTableColumn<SppgRow>({
    columnId: "lokasi",
    compare: (a, b) => a.lokasi.localeCompare(b.lokasi),
    renderHeaderCell: () => "Lokasi",
    renderCell: (item) => <TruncatedDirectoryCell value={item.lokasi} />,
  }),
  createTableColumn<SppgRow>({
    columnId: "kepala_sppg",
    compare: (a, b) => a.kepala_sppg.localeCompare(b.kepala_sppg),
    renderHeaderCell: () => "Kepala SPPG",
    renderCell: (item) => <TruncatedDirectoryCell value={item.kepala_sppg} />,
  }),
]

const yayasanColumns: TableColumnDefinition<YayasanRow>[] = [
  createTableColumn<YayasanRow>({
    columnId: "nama",
    compare: (a, b) => a.nama.localeCompare(b.nama),
    renderHeaderCell: () => "Nama Yayasan",
    renderCell: (item) => <TruncatedDirectoryCell value={item.nama} />,
  }),
  createTableColumn<YayasanRow>({
    columnId: "ketua_yayasan",
    compare: (a, b) => a.ketua_yayasan.localeCompare(b.ketua_yayasan),
    renderHeaderCell: () => "Ketua Yayasan",
    renderCell: (item) => (
      <TruncatedDirectoryCell value={item.ketua_yayasan} />
    ),
  }),
  createTableColumn<YayasanRow>({
    columnId: "sppg_count",
    compare: (a, b) => a.sppg_count - b.sppg_count,
    renderHeaderCell: () => "Jumlah SPPG",
    renderCell: (item) => <TableCellLayout>{item.sppg_count}</TableCellLayout>,
  }),
]

const useStyles = makeStyles({
  shell: {
    display: "flex",
    height: "100dvh",
    minHeight: 0,
    overflow: "hidden",
    backgroundColor: tokens.colorNeutralBackground2,
    color: tokens.colorNeutralForeground1,
  },
  drawer: {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    height: "100%",
    minHeight: 0,
    overflow: "hidden",
    borderRight: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  drawerBody: {
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    paddingInline: "12px",
  },
  drawerFooter: {
    display: "flex",
    flexShrink: 0,
    padding: "8px 12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  personaButton: {
    width: "100%",
    minWidth: 0,
    justifyContent: "space-between",
    padding: "4px 8px",
  },
  accountMenuHeader: {
    display: "grid",
    gap: "2px",
    padding: "12px 12px 8px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  appItem: { marginBottom: "12px" },
  appLogo: {
    display: "inline-block",
    width: "24px",
    height: "24px",
    flexShrink: 0,
    backgroundImage: "url('/operasional-logo.png')",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    backgroundSize: "contain",
  },
  menuTrigger: {
    display: "inline-flex",
    flexShrink: 0,
    transform: "translateY(5px)",
  },
  navigationToggle: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular":
      { display: "none" },
  },
  signOutMenuItem: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular":
      { display: "none" },
  },
  viewDetailMenuItem: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular":
      { display: "none" },
  },
  editMenuItem: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular":
      { display: "none" },
  },
  deleteMenuItem: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular":
      { display: "none" },
  },
  themeMenuItem: {
    "&& [data-theme-icon='filled']": { display: "none" },
    "&& [data-theme-icon='regular']": { display: "inline-flex" },
    "&&:hover [data-theme-icon='filled'], &&:focus-visible [data-theme-icon='filled']":
      { display: "inline-flex" },
    "&&:hover [data-theme-icon='regular'], &&:focus-visible [data-theme-icon='regular']":
      { display: "none" },
  },
  main: {
    flex: "1",
    minWidth: 0,
    minHeight: 0,
    height: "100%",
    overflowY: "auto",
    overscrollBehaviorY: "contain",
    padding: "32px clamp(20px, 4vw, 52px) 40px",
    "@media (max-width: 820px)": { padding: "28px 20px 36px" },
  },
  pageHeader: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    columnGap: "24px",
    rowGap: "16px",
    paddingBottom: "24px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  headingGroup: {
    display: "flex",
    minWidth: 0,
    alignItems: "flex-start",
    gap: "12px",
  },
  pageHeading: { margin: 0 },
  pageDescription: {
    display: "block",
    maxWidth: "66ch",
    marginTop: "8px",
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  headerActions: {
    display: "flex",
    flexDirection: "column",
    flexWrap: "nowrap",
    alignItems: "flex-end",
    gap: "8px",
    "@media (max-width: 720px)": {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
    },
  },
  directoryView: { marginTop: "24px" },
  directoryOverview: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "16px",
    marginTop: "16px",
    marginBottom: "16px",
    padding: "16px 18px",
    backgroundColor: tokens.colorBrandBackground2,
    border: `1px solid ${tokens.colorBrandStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    "@media (max-width: 640px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: "14px 18px",
    },
  },
  overviewMetric: { display: "grid", gap: "5px", minWidth: 0 },
  overviewLabel: { color: tokens.colorNeutralForeground2 },
  directoryToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "16px",
    marginBottom: "16px",
    "@media (max-width: 560px)": { alignItems: "stretch", flexDirection: "column" },
  },
  tableShell: {
    overflowX: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  dataGrid: {
    width: "100%",
    minWidth: "550px",
    "& [role='columnheader']:last-child, & [role='gridcell']:last-of-type": {
      flex: "0 0 104px",
    },
  },
  detailList: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px 24px",
    margin: 0,
    "@media (max-width: 480px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  detailTitle: {
    display: "grid",
    gap: "4px",
  },
  detailSubtitle: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightRegular,
    lineHeight: tokens.lineHeightBase300,
  },
  detailItem: {
    display: "grid",
    minWidth: 0,
    gap: "4px",
  },
  detailTerm: {
    fontWeight: tokens.fontWeightSemibold,
  },
  detailValue: {
    minWidth: 0,
    margin: 0,
    color: tokens.colorNeutralForeground2,
    overflowWrap: "anywhere",
    whiteSpace: "pre-wrap",
  },
  detailSeparator: { marginBlock: "16px" },
  tableEmptyState: {
    display: "grid",
    placeItems: "center",
    alignContent: "center",
    gap: "4px",
    minHeight: "120px",
    padding: "24px 20px",
    textAlign: "center",
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  emptyMessageBar: {
    width: "100%",
    marginTop: "16px",
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    gap: "12px",
    minHeight: "380px",
    marginTop: "32px",
    padding: "48px 24px",
    textAlign: "center",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  emptyIcon: {
    display: "grid",
    placeItems: "center",
    width: "52px",
    height: "52px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground3,
    color: tokens.colorNeutralForeground2,
  },
  emptyHeading: { margin: 0 },
  emptyCopy: {
    maxWidth: "54ch",
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
    textAlign: "center",
  },
  maintenancePlaceholder: {
    display: "grid",
    justifyItems: "center",
    alignContent: "center",
    gap: "12px",
    minHeight: "260px",
    marginTop: "24px",
    padding: "32px 24px",
    textAlign: "center",
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  status: {
    display: "grid",
    minHeight: "180px",
    placeItems: "center",
    gap: "12px",
    padding: "32px",
    textAlign: "center",
  },
  footer: { marginTop: "20px", color: tokens.colorNeutralForeground3 },
  authStatus: {
    display: "grid",
    minHeight: "100vh",
    placeContent: "center",
    justifyItems: "center",
    gap: "16px",
    padding: "24px",
  },
})

function isLocalUser(value: unknown): value is LocalUser {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "username" in value &&
    typeof value.username === "string" &&
    "role" in value &&
    (value.role === "admin" ||
      value.role === "supervisor" ||
      value.role === "user") &&
    "pagePermissions" in value &&
    isLocalPagePermissions(value.pagePermissions)
  )
}

function parseRecords<T>(value: unknown, isRecord: (item: unknown) => item is T) {
  if (
    typeof value !== "object" ||
    value === null ||
    !("records" in value) ||
    !Array.isArray(value.records) ||
    !value.records.every(isRecord)
  ) {
    throw new Error("Format data direktori yang diterima tidak valid.")
  }
  return value.records
}

function isSppgRow(value: unknown): value is SppgRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "nama" in value &&
    typeof value.nama === "string" &&
    "yayasan" in value &&
    typeof value.yayasan === "string" &&
    "yayasan_id" in value &&
    typeof value.yayasan_id === "string" &&
    "lokasi" in value &&
    typeof value.lokasi === "string" &&
    "kepala_sppg" in value &&
    typeof value.kepala_sppg === "string" &&
    "pic" in value &&
    typeof value.pic === "string" &&
    "jumlah_penerima_manfaat" in value &&
    (typeof value.jumlah_penerima_manfaat === "number" ||
      value.jumlah_penerima_manfaat === null) &&
    "alamat" in value &&
    typeof value.alamat === "string" &&
    "provinsi_kode" in value &&
    typeof value.provinsi_kode === "string" &&
    "provinsi_nama" in value &&
    typeof value.provinsi_nama === "string" &&
    "kabupaten_kode" in value &&
    typeof value.kabupaten_kode === "string" &&
    "kabupaten_nama" in value &&
    typeof value.kabupaten_nama === "string" &&
    "kecamatan_kode" in value &&
    typeof value.kecamatan_kode === "string" &&
    "kecamatan_nama" in value &&
    typeof value.kecamatan_nama === "string" &&
    "desa_kode" in value &&
    typeof value.desa_kode === "string" &&
    "desa_nama" in value &&
    typeof value.desa_nama === "string"
  )
}

function isYayasanRow(value: unknown): value is YayasanRow {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "nama" in value &&
    typeof value.nama === "string" &&
    "alamat_yayasan" in value &&
    typeof value.alamat_yayasan === "string" &&
    "nomor_telepon_yayasan" in value &&
    typeof value.nomor_telepon_yayasan === "string" &&
    "ketua_yayasan" in value &&
    typeof value.ketua_yayasan === "string" &&
    "alamat_ketua_yayasan" in value &&
    typeof value.alamat_ketua_yayasan === "string" &&
    "nomor_telepon_ketua_yayasan" in value &&
    typeof value.nomor_telepon_ketua_yayasan === "string" &&
    "sppg_count" in value &&
    typeof value.sppg_count === "number"
  )
}

function roleLabel(role: LocalRole) {
  return role === "admin" ? "Admin" : role === "supervisor" ? "Supervisor" : "User"
}

function errorFromPayload(payload: unknown, fallback: string) {
  return typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback
}

function DirectoryDataGrid<T extends { id: string }>({
  items,
  columns,
  label,
  className,
}: {
  items: T[]
  columns: TableColumnDefinition<T>[]
  label: string
  className: string
}) {
  return (
    <DataGrid
      aria-label={label}
      items={items}
      columns={columns}
      sortable
      getRowId={(item) => item.id}
      focusMode="composite"
      className={className}
    >
      <DataGridHeader>
        <DataGridRow>
          {({ renderHeaderCell }) => (
            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
          )}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<T>>
        {({ item, rowId }) => (
          <DataGridRow<T> key={rowId}>
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  )
}

function DirectoryRowActions<T extends { id: string; nama: string }>({
  item,
  restriction,
  canManage,
  onView,
  onEdit,
  onDelete,
}: {
  item: T
  restriction?: string
  canManage: boolean
  onView: (item: T) => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
}) {
  const styles = useStyles()

  return (
    <Menu>
      <MenuTrigger disableButtonEnhancement>
        <Button
          appearance="subtle"
          size="small"
          icon={<MoreHorizontalRegular />}
          aria-label={`Tindakan untuk ${item.nama}`}
        />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          <MenuItem
            className={styles.viewDetailMenuItem}
            icon={<EyeDetailIcon aria-hidden="true" />}
            onClick={() => onView(item)}
          >
            Lihat detail
          </MenuItem>
          {canManage && (
            <>
              <MenuItem
                className={styles.editMenuItem}
                icon={<EditRowIcon aria-hidden="true" />}
                onClick={() => onEdit(item)}
              >
                {restriction ? `Edit (${restriction})` : "Edit"}
              </MenuItem>
              <MenuItem
                className={styles.deleteMenuItem}
                icon={<DeleteRowIcon aria-hidden="true" />}
                disabled={Boolean(restriction)}
                onClick={() => onDelete(item)}
              >
                {restriction ? `Hapus (${restriction})` : "Hapus"}
              </MenuItem>
            </>
          )}
        </MenuList>
      </MenuPopover>
    </Menu>
  )
}

function createActionsColumn<T extends { id: string; nama: string }>(
  onView: (item: T) => void,
  onEdit: (item: T) => void,
  onDelete: (item: T) => void,
  canManage: boolean,
  getRestriction?: (item: T) => string | undefined,
): TableColumnDefinition<T> {
  return createTableColumn<T>({
    columnId: "actions",
    compare: () => 0,
    renderHeaderCell: () => "Tindakan",
    renderCell: (item) => (
      <DirectoryRowActions
        item={item}
        restriction={getRestriction?.(item)}
        canManage={canManage}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  })
}

function getDirectoryDetailRows(target: DirectoryEditTarget) {
  if (target.kind === "sppg") {
    const record = target.record
    return [
      { label: "Nama SPPG", value: record.nama },
      { label: "Yayasan", value: record.yayasan },
      { label: "Kepala SPPG", value: record.kepala_sppg },
      { label: "Nama PIC", value: record.pic },
      { label: "Provinsi", value: record.provinsi_nama },
      { label: "Kabupaten/Kota", value: record.kabupaten_nama },
      { label: "Kecamatan", value: record.kecamatan_nama },
      { label: "Desa/Kelurahan", value: record.desa_nama },
      { label: "Alamat lengkap", value: record.alamat },
    ]
  }

  return [
    { label: "Nama Yayasan", value: target.record.nama },
    {
      label: "Alamat Yayasan",
      value: target.record.alamat_yayasan || "Belum dicatat",
    },
    {
      label: "Nomor telepon Yayasan",
      value: target.record.nomor_telepon_yayasan || "Belum dicatat",
    },
    { label: "Ketua Yayasan", value: target.record.ketua_yayasan },
    {
      label: "Alamat Ketua Yayasan",
      value: target.record.alamat_ketua_yayasan || "Belum dicatat",
    },
    {
      label: "Nomor telepon Ketua Yayasan",
      value: target.record.nomor_telepon_ketua_yayasan || "Belum dicatat",
    },
    { label: "Jumlah SPPG", value: String(target.record.sppg_count) },
  ]
}

function DirectoryDetailDialog({
  target,
  onOpenChange,
}: {
  target: DirectoryEditTarget | null
  onOpenChange: (open: boolean) => void
}) {
  const styles = useStyles()
  const title = target?.kind === "sppg" ? "Detail SPPG" : "Detail Yayasan"
  const subtitle =
    target?.kind === "sppg"
      ? "Informasi lengkap SPPG, pengelola, dan lokasi."
      : "Informasi yayasan dan jumlah SPPG yang terhubung."

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(_, data) => onOpenChange(data.open)}
    >
      <DialogSurface>
        <DialogBody>
          <DialogTitle className={styles.detailTitle}>
            {title}
            <Text as="span" size={300} className={styles.detailSubtitle}>
              {subtitle}
            </Text>
          </DialogTitle>
          {target && (
            <DialogContent>
              <Divider className={styles.detailSeparator} />
              <dl className={styles.detailList}>
                {getDirectoryDetailRows(target).map(({ label, value }) => (
                  <div className={styles.detailItem} key={label}>
                    <dt className={styles.detailTerm}>{label}</dt>
                    <dd className={styles.detailValue}>{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              <Divider className={styles.detailSeparator} />
            </DialogContent>
          )}
          <DialogActions>
            <Button appearance="primary" onClick={() => onOpenChange(false)}>
              Tutup
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export function OperationsDashboard() {
  const styles = useStyles()
  const restoreFocusTargetAttributes = useRestoreFocusTarget()
  const uiState = useUiState()
  const dispatch = useUiDispatch()
  const [user, setUser] = React.useState<LocalUser | null>(null)
  const [setupRequired, setSetupRequired] = React.useState(false)
  const [authLoading, setAuthLoading] = React.useState(true)
  const [authError, setAuthError] = React.useState("")
  const [drawerType, setDrawerType] = React.useState<DrawerType>("inline")
  const [sppgRows, setSppgRows] = React.useState<SppgRow[]>([])
  const [yayasanRows, setYayasanRows] = React.useState<YayasanRow[]>([])
  const [hoveredDirectoryTab, setHoveredDirectoryTab] =
    React.useState<DirectoryKind | null>(null)
  const [focusedDirectoryTab, setFocusedDirectoryTab] =
    React.useState<DirectoryKind | null>(null)
  const [dismissedEmptyPrompts, setDismissedEmptyPrompts] = React.useState<
    Record<DirectoryKind, boolean>
  >({ sppg: false, yayasan: false })
  const [directoryLoading, setDirectoryLoading] = React.useState(false)
  const [directoryError, setDirectoryError] = React.useState("")
  const [refreshCount, setRefreshCount] = React.useState(0)
  const [deleting, setDeleting] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState("")
  const [logoutError, setLogoutError] = React.useState("")

  const loadAuth = React.useCallback(async () => {
    setAuthLoading(true)
    setAuthError("")
    try {
      const response = await fetch("/api/auth", { cache: "no-store" })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorFromPayload(payload, "Status akses gagal dimuat."))
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("setupRequired" in payload) ||
        typeof payload.setupRequired !== "boolean" ||
        !("user" in payload) ||
        (payload.user !== null && !isLocalUser(payload.user))
      ) {
        throw new Error("Respons status akses tidak valid.")
      }
      setSetupRequired(payload.setupRequired)
      setUser(payload.user)
    } catch (failure) {
      setAuthError(
        failure instanceof Error ? failure.message : "Status akses gagal dimuat.",
      )
    } finally {
      setAuthLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void Promise.resolve().then(loadAuth)
  }, [loadAuth])

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 820px)")
    const updateDrawerType = () => {
      setDrawerType(mediaQuery.matches ? "overlay" : "inline")
      dispatch({ type: "navigation/set-open", open: !mediaQuery.matches })
    }
    updateDrawerType()
    mediaQuery.addEventListener("change", updateDrawerType)
    return () => mediaQuery.removeEventListener("change", updateDrawerType)
  }, [dispatch])

  const activeSection = uiState.activeSection
  const assetTab = uiState.assetTab
  const directoryKind = uiState.directoryKind
  const isOpen = uiState.navigationOpen
  const directoryForm =
    uiState.dialog?.type === "directory-form" ? uiState.dialog : null
  const detailTarget =
    uiState.dialog?.type === "directory-detail" ? uiState.dialog.target : null
  const deleteTarget =
    uiState.dialog?.type === "directory-delete" ? uiState.dialog.target : null

  React.useEffect(() => {
    if (!user || hasSectionAccess(user, activeSection)) return
    dispatch({ type: "section/select", section: "overview" })
  }, [activeSection, dispatch, user])

  React.useEffect(() => {
    if (
      !user ||
      activeSection !== "directory" ||
      !hasPageAccess(user, "directory")
    ) {
      return
    }
    const controller = new AbortController()
    void (async () => {
      await Promise.resolve()
      if (controller.signal.aborted) return
      setDirectoryLoading(true)
      setDirectoryError("")
      try {
        const kinds: DirectoryKind[] = ["sppg", "yayasan"]
        const results = await Promise.all(
          kinds.map(async (kind) => {
            const response = await fetch(`/api/directory?kind=${kind}`, {
              cache: "no-store",
              signal: controller.signal,
            })
            const payload: unknown = await response.json().catch(() => null)
            if (!response.ok) {
              if (response.status === 401) setUser(null)
              throw new Error(errorFromPayload(payload, "Data direktori gagal dimuat."))
            }
            return { kind, payload }
          }),
        )
        for (const result of results) {
          if (result.kind === "sppg") {
            setSppgRows(parseRecords(result.payload, isSppgRow))
          } else {
            setYayasanRows(parseRecords(result.payload, isYayasanRow))
          }
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setDirectoryError(
            failure instanceof Error
              ? failure.message
              : "Data direktori gagal dimuat.",
          )
        }
      } finally {
        if (!controller.signal.aborted) setDirectoryLoading(false)
      }
    })()
    return () => controller.abort()
  }, [activeSection, refreshCount, user])

  const currentPage = pageInfo[activeSection]
  const isDirectory = activeSection === "directory"
  const canCreate =
    user?.role === "admin" ||
    user?.permissions?.directory === true
  const activeRows = directoryKind === "sppg" ? sppgRows : yayasanRows
  const foundationOptions = yayasanRows.map(({ id, nama }) => ({ id, nama }))
  const uniqueSppgProvinces = new Set(
    sppgRows
      .map((record) => record.provinsi_nama)
      .filter((value) => value.trim().length > 0),
  ).size
  const uniqueSppgCities = new Set(
    sppgRows
      .map((record) => record.kabupaten_nama)
      .filter((value) => value.trim().length > 0),
  ).size
  const connectedSppgCount = yayasanRows.reduce(
    (total, record) => total + record.sppg_count,
    0,
  )
  const foundationsWithSppgCount = yayasanRows.filter(
    (record) => record.sppg_count > 0,
  ).length

  function openEdit(target: DirectoryEditTarget) {
    dispatch({
      type: "dialog/open",
      dialog: {
        type: "directory-form",
        directoryKind: target.kind,
        target,
      },
    })
  }

  function openDetail(target: DirectoryEditTarget) {
    dispatch({ type: "dialog/open", dialog: { type: "directory-detail", target } })
  }

  function confirmDelete(target: DirectoryEditTarget) {
    setDeleteError("")
    dispatch({ type: "dialog/open", dialog: { type: "directory-delete", target } })
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError("")
    try {
      const params = new URLSearchParams({
        kind: deleteTarget.kind,
        id: deleteTarget.record.id,
      })
      const response = await fetch(`/api/directory?${params}`, {
        method: "DELETE",
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          errorFromPayload(payload, "Data direktori gagal dihapus."),
        )
      }
      dispatch({ type: "dialog/close" })
      setRefreshCount((count) => count + 1)
    } catch (failure) {
      setDeleteError(
        failure instanceof Error
          ? failure.message
          : "Data direktori gagal dihapus.",
      )
    } finally {
      setDeleting(false)
    }
  }

  const activeSppgColumns = [
    ...sppgColumns,
    createActionsColumn<SppgRow>(
      (record) => openDetail({ kind: "sppg", record }),
      (record) => openEdit({ kind: "sppg", record }),
      (record) => confirmDelete({ kind: "sppg", record }),
      canCreate,
    ),
  ]
  const activeYayasanColumns = [
    ...yayasanColumns,
    createActionsColumn<YayasanRow>(
      (record) => openDetail({ kind: "yayasan", record }),
      (record) => openEdit({ kind: "yayasan", record }),
      (record) => confirmDelete({ kind: "yayasan", record }),
      canCreate,
      (record) =>
        record.sppg_count > 0
          ? `terhubung ke ${record.sppg_count} SPPG`
          : undefined,
    ),
  ]

  async function handleLogout() {
    setLogoutError("")
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "logout" }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(errorFromPayload(payload, "Keluar gagal diproses."))
      }
      setUser(null)
      setSetupRequired(false)
      setDismissedEmptyPrompts({ sppg: false, yayasan: false })
      dispatch({ type: "session/reset" })
    } catch (failure) {
      setLogoutError(
        failure instanceof Error ? failure.message : "Keluar gagal diproses.",
      )
    }
  }

  if (authLoading) {
    return (
      <main className={styles.authStatus} role="status">
        <Text>Memeriksa akses lokal…</Text>
      </main>
    )
  }
  if (authError) {
    return (
      <main className={styles.authStatus}>
        <Text role="alert">{authError}</Text>
        <Button appearance="primary" onClick={() => void loadAuth()}>
          Coba lagi
        </Button>
      </main>
    )
  }
  if (!user) {
    return (
      <LocalAuthScreen
        setupRequired={setupRequired}
        onAuthenticated={(authenticatedUser) => {
          setUser(authenticatedUser)
          setSetupRequired(false)
          setDismissedEmptyPrompts({ sppg: false, yayasan: false })
        }}
      />
    )
  }

  const visibleAssetPages: Array<{ key: AppSection; label: string }> = [
    ...LOCAL_PAGE_PERMISSION_GROUPS.assets
      .filter(({ key }) => key !== "warehouse" && hasPageAccess(user, key))
      .map(({ key, label }) => ({ key, label })),
    ...(hasPageAccess(user, "asset-recording")
      ? [{ key: "asset-import" as const, label: "Impor Excel" }]
      : []),
  ]

  return (
    <div className={styles.shell}>
      <style>{`
        ::view-transition {
          pointer-events: none;
        }

        @media (prefers-reduced-motion: reduce) {
          ::view-transition-group(directory-tab-content),
          ::view-transition-old(directory-tab-content),
          ::view-transition-new(directory-tab-content) {
            animation-duration: 0s !important;
          }
        }
      `}</style>
      <NavDrawer
        className={styles.drawer}
        open={isOpen}
        type={drawerType}
        selectedValue={
          activeSection === "maintenance"
            ? `maintenance-${uiState.maintenanceTab}`
            : activeSection
        }
        selectedCategoryValue={
          activeSection === "asset-recording" ||
          activeSection === "asset-non-juknis" ||
          activeSection === "asset-surat-edaran" ||
          activeSection === "asset-completeness" ||
          activeSection === "asset-import"
            ? "assets"
            : activeSection === "maintenance"
              ? "maintenance"
              : activeSection === "warehouse" ||
                  activeSection === "warehouse-spare-parts" ||
                  activeSection === "warehouse-allocations"
                ? "warehouse-group"
            : activeSection === "accounts-application" ||
                activeSection === "accounts-personal"
              ? "accounts"
            : ""
        }
        onNavItemSelect={(_, data) => {
          const section = data.value
          if (
            section === "overview" ||
            (section === "directory" &&
              hasPageAccess(user, "directory")) ||
            (section === "asset-recording" &&
              hasPageAccess(user, "asset-recording")) ||
            (section === "asset-non-juknis" &&
              hasPageAccess(user, "asset-non-juknis")) ||
            (section === "asset-surat-edaran" &&
              hasPageAccess(user, "asset-surat-edaran")) ||
            (section === "asset-completeness" &&
              hasPageAccess(user, "asset-completeness")) ||
            (section === "asset-import" &&
              hasPageAccess(user, "asset-recording")) ||
            ((section === "warehouse" ||
              section === "warehouse-spare-parts" ||
              section === "warehouse-allocations") &&
              hasPageAccess(user, "warehouse")) ||
            ((section === "accounts-application" ||
              section === "accounts-personal") &&
              user.role === "admin")
          ) {
            dispatch({ type: "section/select", section })
          }
          if (hasPageAccess(user, "maintenance")) {
            const maintenanceTabs: Record<string, MaintenanceTab> = {
              "maintenance-schedule": "schedule",
              "maintenance-history": "history",
              "maintenance-rab": "rab",
            }
            const tab = maintenanceTabs[section]
            if (tab) {
              dispatch({ type: "maintenance-tab/select", tab })
            }
          }
          if (drawerType === "overlay") {
            dispatch({ type: "navigation/set-open", open: false })
          }
        }}
      >
        <NavDrawerBody className={styles.drawerBody}>
          <AppItem
            as="a"
            href="/"
            icon={
              <span
                className={styles.appLogo}
                role="img"
                aria-label="Logo Operasional"
              />
            }
            className={styles.appItem}
          >
            Operasional
          </AppItem>
          <NavSectionHeader>MENU UTAMA</NavSectionHeader>
          <NavItem value="overview" icon={<DashboardIcon />}>
            Ringkasan
          </NavItem>
          {(hasPageAccess(user, "directory") ||
            visibleAssetPages.length > 0 ||
            hasPageAccess(user, "maintenance") ||
            hasPageAccess(user, "warehouse")) && <NavDivider />}
          {hasPageAccess(user, "directory") && (
            <>
              <NavSectionHeader>DATA OPERASIONAL</NavSectionHeader>
              <NavItem value="directory" icon={<DirectoryIcon />}>
                SPPG & Yayasan
              </NavItem>
            </>
          )}
          {(visibleAssetPages.length > 0 ||
            hasPageAccess(user, "maintenance") ||
            hasPageAccess(user, "warehouse")) && (
            <NavSectionHeader>OPERASIONAL</NavSectionHeader>
          )}
          {visibleAssetPages.length > 0 && (
            <NavCategory value="assets">
              <NavCategoryItem icon={<AssetIcon />}>Aset</NavCategoryItem>
              <NavSubItemGroup>
                {visibleAssetPages.map(({ key, label }) => (
                  <NavSubItem key={key} value={key}>
                    {label}
                  </NavSubItem>
                ))}
              </NavSubItemGroup>
            </NavCategory>
          )}
          {hasPageAccess(user, "maintenance") && (
            <NavCategory value="maintenance">
              <NavCategoryItem icon={<MaintenanceIcon />}>
                Pemeliharaan
              </NavCategoryItem>
              <NavSubItemGroup>
                <NavSubItem value="maintenance-schedule">
                  Jadwal pemeliharaan
                </NavSubItem>
                <NavSubItem value="maintenance-history">
                  Riwayat pemeliharaan
                </NavSubItem>
                <NavSubItem value="maintenance-rab">RAB</NavSubItem>
              </NavSubItemGroup>
            </NavCategory>
          )}
          {hasPageAccess(user, "warehouse") && (
            <NavCategory value="warehouse-group">
              <NavCategoryItem icon={<WarehouseIcon />}>Gudang</NavCategoryItem>
              <NavSubItemGroup>
                <NavSubItem value="warehouse">Stok aset</NavSubItem>
                <NavSubItem value="warehouse-spare-parts">Spare Part</NavSubItem>
                <NavSubItem value="warehouse-allocations">
                  Alokasi &amp; mutasi SPPG
                </NavSubItem>
              </NavSubItemGroup>
            </NavCategory>
          )}
          {user.role === "admin" && (
            <>
              <NavDivider />
              <NavSectionHeader>PENGATURAN</NavSectionHeader>
              <NavCategory value="accounts">
                <NavCategoryItem icon={<AccountsIcon />}>
                  Manajemen akun
                </NavCategoryItem>
                <NavSubItemGroup>
                  <NavSubItem value="accounts-application">
                    Akun aplikasi
                  </NavSubItem>
                  <NavSubItem value="accounts-personal">
                    Akun pribadi
                  </NavSubItem>
                </NavSubItemGroup>
              </NavCategory>
            </>
          )}
        </NavDrawerBody>
        <NavDrawerFooter className={styles.drawerFooter}>
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button
                appearance="subtle"
                aria-label={`Menu akun ${user.username}`}
                className={styles.personaButton}
                icon={<ChevronUpDownRegular />}
                iconPosition="after"
              >
                <Persona
                  name={user.username}
                  secondaryText={roleLabel(user.role)}
                />
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <div className={styles.accountMenuHeader}>
                <Text weight="semibold">{user.username}</Text>
                <Text size={200}>{roleLabel(user.role)}</Text>
              </div>
              <MenuList>
                {user.role === "admin" && (
                  <MenuItem
                    icon={<AccountsIcon />}
                    onClick={() => {
                      dispatch({
                        type: "section/select",
                        section: "accounts-personal",
                      })
                      if (drawerType === "overlay") {
                        dispatch({
                          type: "navigation/set-open",
                          open: false,
                        })
                      }
                    }}
                  >
                    Akun pribadi
                  </MenuItem>
                )}
                <MenuItem
                  className={styles.themeMenuItem}
                  icon={
                    uiState.theme === "dark"
                      ? (
                          <>
                            <span data-theme-icon="regular">
                              <WeatherMoonRegular aria-hidden="true" />
                            </span>
                            <span data-theme-icon="filled">
                              <WeatherMoonFilled aria-hidden="true" />
                            </span>
                          </>
                        )
                      : (
                          <>
                            <span data-theme-icon="regular">
                              <WeatherSunnyRegular aria-hidden="true" />
                            </span>
                            <span data-theme-icon="filled">
                              <WeatherSunnyFilled aria-hidden="true" />
                            </span>
                          </>
                        )
                  }
                  onClick={() => dispatch({ type: "theme/toggle" })}
                >
                  {uiState.theme === "dark"
                    ? "Gunakan tema terang"
                    : "Gunakan tema gelap"}
                </MenuItem>
                <MenuItem
                  className={styles.signOutMenuItem}
                  icon={<SignOutIcon aria-hidden="true" />}
                  onClick={() => void handleLogout()}
                >
                  Keluar
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </NavDrawerFooter>
      </NavDrawer>

      <main className={styles.main}>
        <header className={styles.pageHeader}>
          <div className={styles.headingGroup}>
            <Tooltip
              content={isOpen ? "Tutup navigasi" : "Buka navigasi"}
              relationship="label"
            >
              <Hamburger
                {...restoreFocusTargetAttributes}
                onClick={() =>
                  dispatch({
                    type: "navigation/set-open",
                    open: !isOpen,
                  })
                }
                aria-label={isOpen ? "Tutup navigasi" : "Buka navigasi"}
                aria-expanded={isOpen}
                className={mergeClasses(
                  styles.menuTrigger,
                  styles.navigationToggle,
                )}
                icon={<NavigationToggleIcon aria-hidden="true" />}
              />
            </Tooltip>
            <div>
              <Text as="h1" size={800} weight="semibold" className={styles.pageHeading}>
                {currentPage.label}
              </Text>
              <Text size={300} className={styles.pageDescription}>
                {currentPage.description}
              </Text>
            </div>
          </div>
          <div className={styles.headerActions}>
            <Badge appearance="outline" color="informative">
              SQLite lokal
            </Badge>
          </div>
        </header>

        {logoutError && <Text role="alert">{logoutError}</Text>}

        {!hasSectionAccess(user, activeSection) ? (
          <section className={styles.emptyState} role="alert">
            <Text>Halaman ini tidak termasuk dalam akses akun Anda.</Text>
            <Button
              appearance="secondary"
              onClick={() =>
                dispatch({ type: "section/select", section: "overview" })
              }
            >
              Kembali ke ringkasan
            </Button>
          </section>
        ) : isDirectory ? (
          <section className={styles.directoryView} aria-label="Direktori">
            <TabList
              selectedValue={directoryKind}
              onTabSelect={(_, data) => {
                const nextKind = data.value
                if (nextKind === "sppg" || nextKind === "yayasan") {
                  React.startTransition(() =>
                    dispatch({
                      type: "directory-kind/select",
                      kind: nextKind,
                    }),
                  )
                }
              }}
            >
              <Tab
                value="sppg"
                icon={
                  directoryKind === "sppg" ||
                  hoveredDirectoryTab === "sppg" ||
                  focusedDirectoryTab === "sppg" ? (
                    <BuildingPeopleFilled aria-hidden="true" />
                  ) : (
                    <BuildingPeopleRegular aria-hidden="true" />
                  )
                }
                onMouseEnter={() => setHoveredDirectoryTab("sppg")}
                onMouseLeave={() => setHoveredDirectoryTab(null)}
                onFocus={() => setFocusedDirectoryTab("sppg")}
                onBlur={() => setFocusedDirectoryTab(null)}
              >
                SPPG
              </Tab>
              <Tab
                value="yayasan"
                icon={
                  directoryKind === "yayasan" ||
                  hoveredDirectoryTab === "yayasan" ||
                  focusedDirectoryTab === "yayasan" ? (
                    <PeopleQueueFilled aria-hidden="true" />
                  ) : (
                    <PeopleQueueRegular aria-hidden="true" />
                  )
                }
                onMouseEnter={() => setHoveredDirectoryTab("yayasan")}
                onMouseLeave={() => setHoveredDirectoryTab(null)}
                onFocus={() => setFocusedDirectoryTab("yayasan")}
                onBlur={() => setFocusedDirectoryTab(null)}
              >
                Yayasan
              </Tab>
            </TabList>
            {!directoryError && (
              <div
                className={styles.directoryOverview}
                aria-label={`Ringkasan tab ${directoryKind === "sppg" ? "SPPG" : "Yayasan"}`}
              >
                {directoryLoading ? (
                  <div className={styles.overviewMetric} role="status">
                    <Text size={200} className={styles.overviewLabel}>
                      Ringkasan
                    </Text>
                    <Text weight="semibold">Memuat data…</Text>
                  </div>
                ) : directoryKind === "sppg" ? (
                  <>
                    <div className={styles.overviewMetric}>
                      <Text size={200} className={styles.overviewLabel}>
                        SPPG tercatat
                      </Text>
                      <Text size={400} weight="semibold">
                        {sppgRows.length}
                      </Text>
                    </div>
                    <div className={styles.overviewMetric}>
                      <Text size={200} className={styles.overviewLabel}>
                        Provinsi tercatat
                      </Text>
                      <Text size={400} weight="semibold">
                        {uniqueSppgProvinces}
                      </Text>
                    </div>
                    <div className={styles.overviewMetric}>
                      <Text size={200} className={styles.overviewLabel}>
                        Kabupaten/Kota tercatat
                      </Text>
                      <Text size={400} weight="semibold">
                        {uniqueSppgCities}
                      </Text>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.overviewMetric}>
                      <Text size={200} className={styles.overviewLabel}>
                        Yayasan tercatat
                      </Text>
                      <Text size={400} weight="semibold">
                        {yayasanRows.length}
                      </Text>
                    </div>
                    <div className={styles.overviewMetric}>
                      <Text size={200} className={styles.overviewLabel}>
                        SPPG terhubung
                      </Text>
                      <Text size={400} weight="semibold">
                        {connectedSppgCount}
                      </Text>
                    </div>
                    <div className={styles.overviewMetric}>
                      <Text size={200} className={styles.overviewLabel}>
                        Yayasan dengan SPPG
                      </Text>
                      <Text size={400} weight="semibold">
                        {foundationsWithSppgCount}
                      </Text>
                    </div>
                  </>
                )}
              </div>
            )}
            <React.ViewTransition
              key={directoryKind}
              name="directory-tab-content"
              share="auto"
              enter="auto"
              default="none"
            >
              <div>
                <div className={styles.directoryToolbar}>
                  {canCreate && (
                    <Button
                      appearance="primary"
                      disabled={directoryLoading}
                      onClick={() => {
                        dispatch({
                          type: "dialog/open",
                          dialog: {
                            type: "directory-form",
                            directoryKind,
                            target: null,
                          },
                        })
                      }}
                    >
                      Tambah {directoryKind === "sppg" ? "SPPG" : "Yayasan"}
                    </Button>
                  )}
                </div>
                {directoryError ? (
                  <div className={styles.tableShell}>
                    <div className={styles.status} role="alert">
                      <Text>{directoryError}</Text>
                      <Button
                        appearance="secondary"
                        onClick={() => setRefreshCount((count) => count + 1)}
                      >
                        Coba lagi
                      </Button>
                    </div>
                  </div>
                ) : directoryLoading ? (
                  <div className={styles.tableShell}>
                    <div className={styles.status} role="status">
                      <Text>
                        Memuat data {directoryKind === "sppg" ? "SPPG" : "Yayasan"}…
                      </Text>
                    </div>
                  </div>
                ) : (
                  <div className={styles.tableShell}>
                    {directoryKind === "sppg" ? (
                      <DirectoryDataGrid
                        items={sppgRows}
                        columns={activeSppgColumns}
                        label="Daftar SPPG"
                        className={styles.dataGrid}
                      />
                    ) : (
                      <DirectoryDataGrid
                        items={yayasanRows}
                        columns={activeYayasanColumns}
                        label="Daftar Yayasan"
                        className={styles.dataGrid}
                      />
                    )}
                    {activeRows.length === 0 && (
                      <div className={styles.tableEmptyState} role="status">
                        <Text size={400} weight="semibold">
                          Belum ada data {directoryKind === "sppg" ? "SPPG" : "Yayasan"}
                        </Text>
                        <Text className={styles.emptyCopy} size={300}>
                          {directoryKind === "sppg"
                            ? "Daftar ini menampilkan nama SPPG, Yayasan, lokasi, dan Kepala SPPG."
                            : "Daftar ini menampilkan nama Yayasan, ketua Yayasan, dan jumlah SPPG yang terhubung."}
                        </Text>
                      </div>
                    )}
                  </div>
                )}
                {!directoryError &&
                  !directoryLoading &&
                  activeRows.length === 0 &&
                  !dismissedEmptyPrompts[directoryKind] && (
                    <MessageBar className={styles.emptyMessageBar}>
                      <MessageBarBody>
                        <MessageBarTitle>
                          Belum ada data {directoryKind === "sppg" ? "SPPG" : "Yayasan"}
                        </MessageBarTitle>
                        {canCreate
                          ? "Tambahkan catatan pertama untuk mulai mengisi direktori. Data tersimpan secara lokal."
                          : "Minta Admin atau Supervisor menambahkan catatan pertama ke direktori lokal."}
                      </MessageBarBody>
                      <MessageBarActions>
                        {canCreate && (
                          <Button
                            appearance="primary"
                            onClick={() => {
                              dispatch({
                                type: "dialog/open",
                                dialog: {
                                  type: "directory-form",
                                  directoryKind,
                                  target: null,
                                },
                              })
                            }}
                          >
                            Tambahkan
                          </Button>
                        )}
                        <Button
                          appearance="subtle"
                          onClick={() =>
                            setDismissedEmptyPrompts((current) => ({
                              ...current,
                              [directoryKind]: true,
                            }))
                          }
                        >
                          Abaikan
                        </Button>
                      </MessageBarActions>
                    </MessageBar>
                  )}
              </div>
            </React.ViewTransition>
            <DirectoryCreateDialog
              key={`${directoryForm?.directoryKind ?? directoryKind}-${directoryForm?.target?.kind ?? "new"}-${directoryForm?.target?.record.id ?? ""}`}
              kind={directoryForm?.directoryKind ?? directoryKind}
              open={directoryForm !== null}
              foundations={foundationOptions}
              editTarget={directoryForm?.target ?? null}
              onOpenChange={(open) => {
                if (!open) dispatch({ type: "dialog/close" })
              }}
              onSaved={() => setRefreshCount((count) => count + 1)}
            />
            <DirectoryDetailDialog
              target={detailTarget}
              onOpenChange={(open) => {
                if (!open) dispatch({ type: "dialog/close" })
              }}
            />
            <Dialog
              open={Boolean(deleteTarget)}
              onOpenChange={(_, data) => {
                if (!data.open && !deleting) {
                  dispatch({ type: "dialog/close" })
                  setDeleteError("")
                }
              }}
            >
              <DialogSurface>
                <DialogBody>
                  <DialogTitle>
                    Hapus {deleteTarget?.kind === "sppg" ? "SPPG" : "Yayasan"}?
                  </DialogTitle>
                  <DialogContent>
                    Apakah kamu yakin ingin menghapus “{deleteTarget?.record.nama}”?
                    Tindakan ini tidak dapat dibatalkan.
                    {deleteError && (
                      <MessageBar intent="error">
                        <MessageBarBody>{deleteError}</MessageBarBody>
                      </MessageBar>
                    )}
                  </DialogContent>
                  <DialogActions>
                    <Button
                      type="button"
                      appearance="secondary"
                      disabled={deleting}
                      onClick={() => {
                        dispatch({ type: "dialog/close" })
                        setDeleteError("")
                      }}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      appearance="primary"
                      disabled={deleting}
                      aria-busy={deleting}
                      onClick={() => void handleDelete()}
                    >
                      {deleting ? "Menghapus…" : "Hapus"}
                    </Button>
                  </DialogActions>
                </DialogBody>
              </DialogSurface>
            </Dialog>
          </section>
        ) : activeSection === "asset-recording" ||
          activeSection === "asset-non-juknis" ||
          activeSection === "asset-surat-edaran" ? (
          <AssetManagement
            user={user}
            selectedTab={assetTab}
            onSelectedTabChange={(tab) => {
              dispatch({ type: "asset-tab/select", tab })
            }}
          />
        ) : activeSection === "asset-completeness" ? (
          <AssetCompletenessManagement />
        ) : activeSection === "asset-import" ? (
          <AssetImportManagement user={user} />
        ) : activeSection === "maintenance" ? (
          uiState.maintenanceTab === "schedule" ? (
            <MaintenanceManagement user={user} />
          ) : uiState.maintenanceTab === "rab" ? (
            <RABManagement user={user} />
          ) : (
            <section
              className={styles.maintenancePlaceholder}
              aria-labelledby="maintenance-subpage-title"
              role="status"
            >
              <div className={styles.emptyIcon} aria-hidden="true">
                <Database24Regular fontSize={28} />
              </div>
              <Text
                id="maintenance-subpage-title"
                as="h2"
                size={500}
                weight="semibold"
              >
                Riwayat pemeliharaan
              </Text>
              <Text size={300} className={styles.emptyCopy}>
                Halaman riwayat pemeliharaan belum tersedia. Jadwal yang ada
                tetap dapat dilihat melalui Jadwal pemeliharaan.
              </Text>
            </section>
          )
        ) : activeSection === "warehouse" ||
          activeSection === "warehouse-spare-parts" ||
          activeSection === "warehouse-allocations" ? (
          <WarehouseManagement
            user={user}
            view={
              activeSection === "warehouse-allocations"
                ? "allocations"
                : "stock"
            }
            kind={
              activeSection === "warehouse-spare-parts"
                ? "spare-part"
                : "asset"
            }
          />
        ) : activeSection === "accounts-application" &&
          user.role === "admin" ? (
          <AccountManagement />
        ) : activeSection === "accounts-personal" &&
          user.role === "admin" ? (
          <PersonalAccountManagement user={user} />
        ) : (
          <section
            className={styles.emptyState}
            aria-labelledby="empty-state-title"
            aria-live="polite"
          >
            <div className={styles.emptyIcon} aria-hidden="true">
              <Database24Regular fontSize={28} />
            </div>
            <Text
              as="h2"
              size={600}
              weight="semibold"
              className={styles.emptyHeading}
              id="empty-state-title"
            >
              {currentPage.emptyTitle}
            </Text>
            <Text className={styles.emptyCopy}>{currentPage.emptyDescription}</Text>
            <Text size={200} className={styles.footer}>
              Data nyata disimpan secara lokal. Tidak ada data contoh.
            </Text>
          </section>
        )}

        <footer className={styles.footer}>
          <InfoLabel
            size="small"
            info={
              <Text size={200}>
                Admin memiliki akses penuh. Hak tulis Supervisor dan User
                mengikuti izin yang ditetapkan Admin.
              </Text>
            }
          >
            Hak akses
          </InfoLabel>
        </footer>
      </main>
    </div>
  )
}

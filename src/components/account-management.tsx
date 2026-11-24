"use client"

import * as React from "react"
import {
  Button,
  Checkbox,
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
  MessageBar,
  MessageBarBody,
  Option,
  Spinner,
  Text,
  Dropdown,
  Tab,
  TabList,
  createTableColumn,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import {
  LayerDiagonalPersonFilled,
  LayerDiagonalPersonRegular,
  PeopleQueueFilled,
  PeopleQueueRegular,
  PersonAccountsFilled,
  PersonAccountsRegular,
  SettingsRegular,
  bundleIcon,
} from "@fluentui/react-icons"
import type { TableColumnDefinition } from "@fluentui/react-components"
import {
  LOCAL_PAGE_PERMISSION_GROUPS,
  isLocalPagePermissions,
} from "@/lib/access-types"
import type {
  LocalPermissions,
  LocalPagePermissions,
  LocalRole,
  LocalUser,
  ManagedLocalAccount,
} from "@/lib/access-types"

type ConfigurableRole = Exclude<LocalRole, "admin">
type ConfigurablePermission = "directory" | "assets" | "maintenance"
type RolePermissions = Record<ConfigurableRole, LocalPermissions>
type RolePagePermissions = Record<ConfigurableRole, LocalPagePermissions>
type PermissionValue = "read" | "read-write"

const AccountTabIcon = bundleIcon(
  LayerDiagonalPersonFilled,
  LayerDiagonalPersonRegular,
)
const ApprovalTabIcon = bundleIcon(PeopleQueueFilled, PeopleQueueRegular)
const PermissionsTabIcon = bundleIcon(
  PersonAccountsFilled,
  PersonAccountsRegular,
)

const emptyPermissions: LocalPermissions = {
  directory: false,
  assets: false,
  maintenance: false,
}

const defaultPagePermissions: LocalPagePermissions = {
  directory: true,
  "asset-recording": true,
  "asset-non-juknis": true,
  "asset-surat-edaran": true,
  "asset-completeness": true,
  warehouse: true,
  maintenance: true,
}

const roleLabels: Record<LocalRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  user: "User",
}

const permissionLabels: Record<ConfigurablePermission, string> = {
  directory: "SPPG & Yayasan",
  assets: "Aset",
  maintenance: "Pemeliharaan",
}

type PendingRegistration = {
  id: string
  fullName: string
  username: string
  email: string
  createdAt: string
  provider: "local" | "google"
}

function formatRegistrationDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date)
}

const useStyles = makeStyles({
  page: { marginTop: "24px" },
  toolbar: {
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
  grid: { minWidth: "1280px" },
  accountActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: "4px",
    "& > button": { flexShrink: 0 },
  },
  accountStatus: { whiteSpace: "nowrap" },
  status: {
    display: "grid",
    minHeight: "180px",
    placeItems: "center",
    padding: "32px",
  },
  surface: { width: "min(440px, calc(100vw - 32px))" },
  form: { display: "grid", gap: "16px" },
  error: { marginTop: "16px" },
  tabs: { marginTop: "20px", marginBottom: "16px" },
  permissionActions: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "flex-end",
    gap: "8px",
    "& > button": { flexShrink: 0 },
  },
  approvalTab: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled, &[aria-selected='true'] .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular, &[aria-selected='true'] .fui-Icon-regular":
      { display: "none" },
  },
  iconTab: {
    "& .fui-Icon-filled": { display: "none" },
    "& .fui-Icon-regular": { display: "inline" },
    "&:hover .fui-Icon-filled, &:focus-visible .fui-Icon-filled, &[aria-selected='true'] .fui-Icon-filled":
      { display: "inline" },
    "&:hover .fui-Icon-regular, &:focus-visible .fui-Icon-regular, &[aria-selected='true'] .fui-Icon-regular":
      { display: "none" },
  },
  pendingGrid: { minWidth: "1040px" },
  pendingInfo: { display: "grid", gap: "4px", minWidth: 0 },
  pendingActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: "4px",
  },
  pendingDetails: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "16px",
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  pendingDetailValue: { overflowWrap: "anywhere" },
  permissionToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    padding: "16px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 560px)": {
      alignItems: "stretch",
      flexDirection: "column",
    },
  },
  permissionHeading: {
    display: "grid",
    flex: 1,
    minWidth: 0,
    gap: "4px",
  },
  permissionSummary: {
    lineHeight: "1.4",
    overflowWrap: "anywhere",
  },
  permissionValue: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "4px",
    minHeight: "32px",
  },
  permissionPageList: {
    display: "grid",
    gap: "8px",
    maxHeight: "176px",
    overflowY: "auto",
    overscrollBehavior: "contain",
    padding: "4px 8px 4px 0",
  },
  permissionRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(130px, 1fr))",
    alignItems: "start",
    gap: "12px",
    padding: "14px 16px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    "@media (max-width: 560px)": {
      gridTemplateColumns: "1fr",
    },
  },
})

function formatAccountDate(value: number) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function isManagedAccount(value: unknown): value is ManagedLocalAccount {
  return (
    isLocalUser(value) &&
    "accessRevokedAt" in value &&
    (typeof value.accessRevokedAt === "string" ||
      value.accessRevokedAt === null) &&
    "bannedUntil" in value &&
    (typeof value.bannedUntil === "number" || value.bannedUntil === null)
  )
}

type ManagedAccountAction =
  | "revoke-access"
  | "restore-access"
  | "ban-account"
  | "unban-account"
  | "delete-account"

type PendingManagedAccountAction = {
  action: ManagedAccountAction
  account: ManagedLocalAccount
}

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

function isLocalPermissions(value: unknown): value is LocalPermissions {
  return (
    typeof value === "object" &&
    value !== null &&
    "directory" in value &&
    typeof value.directory === "boolean" &&
    "assets" in value &&
    typeof value.assets === "boolean" &&
    "maintenance" in value &&
    typeof value.maintenance === "boolean"
  )
}

function isRolePagePermissions(
  value: unknown,
): value is RolePagePermissions {
  return (
    typeof value === "object" &&
    value !== null &&
    "supervisor" in value &&
    isLocalPagePermissions(value.supervisor) &&
    "user" in value &&
    isLocalPagePermissions(value.user)
  )
}

function isRolePermissions(value: unknown): value is RolePermissions {
  return (
    typeof value === "object" &&
    value !== null &&
    "supervisor" in value &&
    isLocalPermissions(value.supervisor) &&
    "user" in value &&
    isLocalPermissions(value.user)
  )
}

async function parseResponse(response: Response): Promise<unknown> {
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Permintaan akun gagal."
    throw new Error(message)
  }
  return payload
}

export function AccountManagement() {
  const styles = useStyles()
  const [accounts, setAccounts] = React.useState<ManagedLocalAccount[]>([])
  const [currentAccountId, setCurrentAccountId] = React.useState<string | null>(
    null,
  )
  const [pendingRegistrations, setPendingRegistrations] = React.useState<
    PendingRegistration[]
  >([])
  const [rolePermissions, setRolePermissions] = React.useState<RolePermissions>({
    supervisor: { ...emptyPermissions },
    user: { ...emptyPermissions },
  })
  const [rolePagePermissions, setRolePagePermissions] =
    React.useState<RolePagePermissions>({
      supervisor: { ...defaultPagePermissions },
      user: { ...defaultPagePermissions },
    })
  const [permissionRole, setPermissionRole] =
    React.useState<ConfigurableRole>("supervisor")
  const [editingPermission, setEditingPermission] =
    React.useState<ConfigurablePermission | null>(null)
  const [permissionDraft, setPermissionDraft] =
    React.useState<PermissionValue>("read")
  const [permissionPageDraft, setPermissionPageDraft] =
    React.useState<LocalPagePermissions>({ ...defaultPagePermissions })
  const [activeTab, setActiveTab] = React.useState<
    "accounts" | "pending" | "permissions"
  >("accounts")
  const [selectedRegistration, setSelectedRegistration] =
    React.useState<PendingRegistration | null>(null)
  const [approvalRoles, setApprovalRoles] = React.useState<
    Record<string, LocalRole>
  >({})
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState<LocalRole>("user")
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState("")
  const [editingAccount, setEditingAccount] =
    React.useState<ManagedLocalAccount | null>(null)
  const [managedRoleDraft, setManagedRoleDraft] =
    React.useState<LocalRole>("user")
  const [pendingAccountAction, setPendingAccountAction] =
    React.useState<PendingManagedAccountAction | null>(null)
  const [banDurationDays, setBanDurationDays] = React.useState(7)
  const [now, setNow] = React.useState(0)

  const permissionSummary = (
    ["directory", "assets", "maintenance"] as const
  )
    .map((permission) => {
      const pages = LOCAL_PAGE_PERMISSION_GROUPS[permission]
      const allowedPages = pages.filter(
        ({ key }) => rolePagePermissions[permissionRole][key],
      ).length
      return `${permissionLabels[permission]}: ${
        rolePermissions[permissionRole][permission]
          ? "Read & Write"
          : "Read"
      } (${allowedPages}/${pages.length} halaman)`
    })
    .join(" · ")

  const loadAccounts = React.useCallback(async () => {
    setLoading(true)
    setLoadError("")
    try {
      const response = await fetch("/api/accounts", { cache: "no-store" })
      const payload = await parseResponse(response)
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("accounts" in payload) ||
        !Array.isArray(payload.accounts) ||
        !payload.accounts.every(isManagedAccount) ||
        !("currentAccountId" in payload) ||
        typeof payload.currentAccountId !== "string" ||
        !("pendingRegistrations" in payload) ||
        !Array.isArray(payload.pendingRegistrations) ||
        !("rolePermissions" in payload) ||
        !isRolePermissions(payload.rolePermissions) ||
        !("rolePagePermissions" in payload) ||
        !isRolePagePermissions(payload.rolePagePermissions)
      ) {
        throw new Error("Format daftar akun yang diterima tidak valid.")
      }
      setAccounts(payload.accounts)
      setCurrentAccountId(payload.currentAccountId)
      setPendingRegistrations(payload.pendingRegistrations as PendingRegistration[])
      setRolePermissions(payload.rolePermissions)
      setRolePagePermissions(payload.rolePagePermissions)
    } catch (failure) {
      setLoadError(
        failure instanceof Error ? failure.message : "Akun gagal dimuat.",
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void Promise.resolve().then(loadAccounts)
  }, [loadAccounts])

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const updateRegistration = React.useCallback(async (
    action: "approve" | "reject",
    registration: PendingRegistration,
  ) => {
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          registrationId: registration.id,
          role: approvalRoles[registration.id] ?? "user",
        }),
      })
      await parseResponse(response)
      await loadAccounts()
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Pendaftaran gagal diproses.",
      )
    } finally {
      setSaving(false)
    }
  }, [approvalRoles, loadAccounts])

  const pendingColumns = React.useMemo<
    TableColumnDefinition<PendingRegistration>[]
  >(
    () => [
      createTableColumn<PendingRegistration>({
        columnId: "applicant",
        compare: (a, b) => a.fullName.localeCompare(b.fullName),
        renderHeaderCell: () => "Pendaftar",
        renderCell: (registration) => (
          <div className={styles.pendingInfo}>
            <Text weight="semibold">{registration.fullName}</Text>
            <Text size={200}>{registration.username}</Text>
          </div>
        ),
      }),
      createTableColumn<PendingRegistration>({
        columnId: "email",
        compare: (a, b) => a.email.localeCompare(b.email),
        renderHeaderCell: () => "Email",
        renderCell: (registration) => (
          <Text className={styles.pendingDetailValue}>
            {registration.email}
          </Text>
        ),
      }),
      createTableColumn<PendingRegistration>({
        columnId: "provider",
        compare: (a, b) => a.provider.localeCompare(b.provider),
        renderHeaderCell: () => "Metode",
        renderCell: (registration) =>
          registration.provider === "google" ? "Google" : "Lokal",
      }),
      createTableColumn<PendingRegistration>({
        columnId: "createdAt",
        compare: (a, b) => a.createdAt.localeCompare(b.createdAt),
        renderHeaderCell: () => "Tanggal daftar",
        renderCell: (registration) => (
          <Text size={200}>
            {formatRegistrationDate(registration.createdAt)}
          </Text>
        ),
      }),
      createTableColumn<PendingRegistration>({
        columnId: "role",
        renderHeaderCell: () => "Peran",
        renderCell: (registration) => (
          <Dropdown
            aria-label={`Peran untuk ${registration.username}`}
            value={roleLabels[approvalRoles[registration.id] ?? "user"]}
            selectedOptions={[approvalRoles[registration.id] ?? "user"]}
            disabled={saving}
            onOptionSelect={(_, data) => {
              const selectedRole = data.optionValue
              if (
                selectedRole === "admin" ||
                selectedRole === "supervisor" ||
                selectedRole === "user"
              ) {
                setApprovalRoles((current) => ({
                  ...current,
                  [registration.id]: selectedRole,
                }))
              }
            }}
          >
            {Object.entries(roleLabels).map(([value, label]) => (
              <Option key={value} value={value} text={label}>
                {label}
              </Option>
            ))}
          </Dropdown>
        ),
      }),
      createTableColumn<PendingRegistration>({
        columnId: "actions",
        renderHeaderCell: () => "Tindakan",
        renderCell: (registration) => (
          <div className={styles.pendingActions}>
            <Button
              type="button"
              size="small"
              appearance="primary"
              disabled={saving}
              aria-label={`Approve pendaftaran ${registration.username}`}
              onClick={() => void updateRegistration("approve", registration)}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="small"
              appearance="subtle"
              disabled={saving}
              aria-label={`Detail pendaftaran ${registration.username}`}
              onClick={() => setSelectedRegistration(registration)}
            >
              Detail
            </Button>
            <Button
              type="button"
              size="small"
              appearance="secondary"
              disabled={saving}
              aria-label={`Reject pendaftaran ${registration.username}`}
              onClick={() => void updateRegistration("reject", registration)}
            >
              Reject
            </Button>
          </div>
        ),
      }),
    ],
    [
      approvalRoles,
      saving,
      styles.pendingActions,
      styles.pendingDetailValue,
      styles.pendingInfo,
      updateRegistration,
    ],
  )

  async function updateRolePermission(
    permission: ConfigurablePermission,
    checked: boolean,
    pagePermissions: LocalPagePermissions,
  ): Promise<boolean> {
    const current = rolePermissions[permissionRole] ?? emptyPermissions
    const permissions = { ...current, [permission]: checked }
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "role-permissions",
          role: permissionRole,
          permissions,
          pagePermissions,
        }),
      })
      await parseResponse(response)
      await loadAccounts()
      return true
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Hak akses peran gagal diperbarui.",
      )
      return false
    } finally {
      setSaving(false)
    }
  }

  function openPermissionDialog(permission: ConfigurablePermission) {
    setSaveError("")
    setPermissionDraft(
      rolePermissions[permissionRole][permission] ? "read-write" : "read",
    )
    setPermissionPageDraft(rolePagePermissions[permissionRole])
    setEditingPermission(permission)
  }

  async function handlePermissionSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault()
    if (!editingPermission) return

    const saved = await updateRolePermission(
      editingPermission,
      permissionDraft === "read-write",
      permissionPageDraft,
    )
    if (saved) setEditingPermission(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      })
      await parseResponse(response)
      setOpen(false)
      setUsername("")
      setPassword("")
      await loadAccounts()
    } catch (failure) {
      setSaveError(
        failure instanceof Error ? failure.message : "Akun gagal dibuat.",
      )
    } finally {
      setSaving(false)
    }
  }

  const openManagedAccountAction = React.useCallback(
    (action: ManagedAccountAction, account: ManagedLocalAccount) => {
      setSaveError("")
      setBanDurationDays(7)
      setPendingAccountAction({ action, account })
    },
    [],
  )

  async function saveManagedAccountRole() {
    if (!editingAccount) return
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "account-role",
          accountId: editingAccount.id,
          role: managedRoleDraft,
        }),
      })
      await parseResponse(response)
      setEditingAccount(null)
      await loadAccounts()
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Hak akses akun gagal diperbarui.",
      )
    } finally {
      setSaving(false)
    }
  }

  async function confirmManagedAccountAction() {
    if (!pendingAccountAction) return
    const { action, account } = pendingAccountAction
    setSaving(true)
    setSaveError("")
    try {
      const response = await fetch("/api/accounts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          accountId: account.id,
          ...(action === "ban-account" ? { durationDays: banDurationDays } : {}),
        }),
      })
      await parseResponse(response)
      setPendingAccountAction(null)
      await loadAccounts()
    } catch (failure) {
      setSaveError(
        failure instanceof Error
          ? failure.message
          : "Tindakan akun gagal diproses.",
      )
    } finally {
      setSaving(false)
    }
  }

  const accountColumns = React.useMemo<
    TableColumnDefinition<ManagedLocalAccount>[]
  >(
    () => [
      createTableColumn<ManagedLocalAccount>({
        columnId: "username",
        compare: (a, b) => a.username.localeCompare(b.username),
        renderHeaderCell: () => "Username",
        renderCell: (account) => account.username,
      }),
      createTableColumn<ManagedLocalAccount>({
        columnId: "role",
        compare: (a, b) => roleLabels[a.role].localeCompare(roleLabels[b.role]),
        renderHeaderCell: () => "Peran",
        renderCell: (account) => roleLabels[account.role],
      }),
      createTableColumn<ManagedLocalAccount>({
        columnId: "status",
        compare: (a, b) => {
          const status = (account: ManagedLocalAccount) =>
            account.accessRevokedAt
              ? "Akses dicabut"
              : account.bannedUntil !== null && account.bannedUntil > now
                ? "Ban sementara"
                : "Aktif"
          return status(a).localeCompare(status(b))
        },
        renderHeaderCell: () => "Status",
        renderCell: (account) => {
          const status = account.accessRevokedAt
            ? "Akses dicabut"
            : account.bannedUntil !== null && account.bannedUntil > now
              ? `Ban sampai ${formatAccountDate(account.bannedUntil)}`
              : "Aktif"
          return (
            <Text size={200} className={styles.accountStatus}>
              {status}
            </Text>
          )
        },
      }),
      createTableColumn<ManagedLocalAccount>({
        columnId: "actions",
        renderHeaderCell: () => "Tindakan",
        renderCell: (account) => {
          const isSelf = account.id === currentAccountId
          const isBanned =
            account.bannedUntil !== null && account.bannedUntil > now
          return (
            <div className={styles.accountActions}>
              <Button
                type="button"
                size="small"
                appearance="subtle"
                disabled={saving || isSelf}
                title={isSelf ? "Akun yang sedang digunakan tidak dapat diubah." : undefined}
                aria-label={`Edit hak akses ${account.username}`}
                onClick={() => {
                  setSaveError("")
                  setManagedRoleDraft(account.role)
                  setEditingAccount(account)
                }}
              >
                Edit hak akses
              </Button>
              <Button
                type="button"
                size="small"
                appearance="subtle"
                disabled={saving || isSelf}
                title={isSelf ? "Akun yang sedang digunakan tidak dapat diubah." : undefined}
                aria-label={`${account.accessRevokedAt ? "Pulihkan" : "Cabut"} hak akses ${account.username}`}
                onClick={() =>
                  openManagedAccountAction(
                    account.accessRevokedAt
                      ? "restore-access"
                      : "revoke-access",
                    account,
                  )
                }
              >
                {account.accessRevokedAt ? "Pulihkan akses" : "Cabut akses"}
              </Button>
              <Button
                type="button"
                size="small"
                appearance="subtle"
                disabled={
                  saving ||
                  isSelf ||
                  (!isBanned && account.accessRevokedAt !== null)
                }
                title={
                  isSelf
                    ? "Akun yang sedang digunakan tidak dapat diubah."
                    : account.accessRevokedAt && !isBanned
                      ? "Pulihkan akses sebelum memberi ban sementara."
                      : undefined
                }
                aria-label={`${isBanned ? "Buka ban" : "Ban sementara"} ${account.username}`}
                onClick={() =>
                  openManagedAccountAction(
                    isBanned ? "unban-account" : "ban-account",
                    account,
                  )
                }
              >
                {isBanned ? "Buka ban" : "Ban sementara"}
              </Button>
              <Button
                type="button"
                size="small"
                appearance="secondary"
                disabled={saving || isSelf}
                title={isSelf ? "Akun yang sedang digunakan tidak dapat dihapus." : undefined}
                aria-label={`Hapus akun ${account.username}`}
                onClick={() =>
                  openManagedAccountAction("delete-account", account)
                }
              >
                Hapus akun
              </Button>
            </div>
          )
        },
      }),
    ],
    [currentAccountId, now, openManagedAccountAction, saving, styles.accountActions, styles.accountStatus],
  )

  return (
    <section className={styles.page} aria-label="Akun aplikasi">
      <div className={styles.toolbar}>
        <Button appearance="primary" onClick={() => setOpen(true)}>
          Tambah akun
        </Button>
      </div>
      <TabList
        className={styles.tabs}
        selectedValue={activeTab}
        onTabSelect={(_, data) =>
          setActiveTab(
            data.value as "accounts" | "pending" | "permissions",
          )
        }
      >
        <Tab
          value="accounts"
          className={styles.iconTab}
          icon={<AccountTabIcon aria-hidden="true" />}
        >
          Akun
        </Tab>
        <Tab
          value="pending"
          className={styles.approvalTab}
          icon={<ApprovalTabIcon aria-hidden="true" />}
        >
          Persetujuan
        </Tab>
        <Tab
          value="permissions"
          className={styles.iconTab}
          icon={<PermissionsTabIcon aria-hidden="true" />}
        >
          Hak akses
        </Tab>
      </TabList>
      {saveError && (
        <MessageBar intent="error" className={styles.error}>
          <MessageBarBody>{saveError}</MessageBarBody>
        </MessageBar>
      )}
      {loading ? (
        <div className={styles.status} role="status" aria-label="Memuat akun">
          <Spinner label="Memuat akun…" />
        </div>
      ) : loadError ? (
        <div className={styles.status} role="alert">
          <div>
            <Text>{loadError}</Text>
            <Button
              appearance="secondary"
              onClick={() => void loadAccounts()}
            >
              Coba lagi
            </Button>
          </div>
        </div>
      ) : activeTab === "pending" ? (
        pendingRegistrations.length === 0 ? (
          <div className={styles.status}>
            <Text>Tidak ada pendaftar yang menunggu persetujuan.</Text>
          </div>
        ) : (
          <div className={styles.tableShell}>
            <DataGrid
              aria-label="Daftar pendaftar menunggu persetujuan"
              items={pendingRegistrations}
              columns={pendingColumns}
              sortable
              getRowId={(item) => item.id}
              focusMode="composite"
              className={styles.pendingGrid}
            >
              <DataGridHeader>
                <DataGridRow>
                  {({ renderHeaderCell }) => (
                    <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                  )}
                </DataGridRow>
              </DataGridHeader>
              <DataGridBody<PendingRegistration>>
                {({ item, rowId }) => (
                  <DataGridRow<PendingRegistration> key={rowId}>
                    {({ renderCell }) => (
                      <DataGridCell>{renderCell(item)}</DataGridCell>
                    )}
                  </DataGridRow>
                )}
              </DataGridBody>
            </DataGrid>
          </div>
        )
      ) : activeTab === "permissions" ? (
        <div className={styles.tableShell}>
          <div className={styles.permissionToolbar}>
            <div className={styles.permissionHeading}>
              <Text as="h2" size={400} weight="semibold">
                Kuesioner hak akses
              </Text>
              <Text
                size={200}
                className={styles.permissionSummary}
                aria-live="polite"
              >
                {roleLabels[permissionRole]} · {permissionSummary}
              </Text>
            </div>
            <Dropdown
              aria-label="Peran yang diatur"
              value={roleLabels[permissionRole]}
              selectedOptions={[permissionRole]}
              onOptionSelect={(_, data) => {
                if (
                  data.optionValue === "supervisor" ||
                  data.optionValue === "user"
                ) {
                  setPermissionRole(data.optionValue)
                }
              }}
            >
              <Option value="supervisor" text="Supervisor">
                Supervisor
              </Option>
              <Option value="user" text="User">
                User
              </Option>
            </Dropdown>
          </div>
          <div className={styles.permissionRow}>
            {(
              ["directory", "assets", "maintenance"] as const
            ).map((permission) => (
              <Field key={permission} label={permissionLabels[permission]}>
                <div className={styles.permissionValue}>
                  <Text weight="semibold">
                    {rolePermissions[permissionRole][permission]
                      ? "Read & Write"
                      : "Read"}
                  </Text>
                  <Button
                    type="button"
                    appearance="subtle"
                    size="small"
                    icon={<SettingsRegular aria-hidden="true" />}
                    aria-label={`Atur izin ${permissionLabels[permission]}`}
                    aria-haspopup="dialog"
                    disabled={saving}
                    onClick={() => openPermissionDialog(permission)}
                  />
                </div>
              </Field>
            ))}
          </div>
          <div className={styles.permissionToolbar}>
            <Text size={200}>
              Read hanya dapat melihat data; Read &amp; Write dapat menambah,
              mengubah, dan menghapus data. Admin selalu memiliki akses penuh.
            </Text>
          </div>
        </div>
      ) : (
        <div className={styles.tableShell}>
          <DataGrid
            aria-label="Daftar akun aplikasi"
            items={accounts}
            columns={accountColumns}
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
            <DataGridBody<ManagedLocalAccount>>
              {({ item, rowId }) => (
                <DataGridRow<ManagedLocalAccount> key={rowId}>
                  {({ renderCell }) => (
                    <DataGridCell>{renderCell(item)}</DataGridCell>
                  )}
                </DataGridRow>
              )}
            </DataGridBody>
          </DataGrid>
        </div>
      )}
      <Dialog
        open={selectedRegistration !== null}
        onOpenChange={(_, data) => {
          if (!data.open) setSelectedRegistration(null)
        }}
      >
        <DialogSurface className={styles.surface}>
          <DialogBody>
            <DialogTitle>Detail pendaftar</DialogTitle>
            {selectedRegistration && (
              <DialogContent className={styles.pendingDetails}>
                <Field label="Nama lengkap">
                  <Text>{selectedRegistration.fullName}</Text>
                </Field>
                <Field label="Username">
                  <Text>{selectedRegistration.username}</Text>
                </Field>
                <Field label="Email">
                  <Text className={styles.pendingDetailValue}>
                    {selectedRegistration.email}
                  </Text>
                </Field>
                <Field label="Metode pendaftaran">
                  <Text>
                    {selectedRegistration.provider === "google"
                      ? "Google"
                      : "Lokal"}
                  </Text>
                </Field>
                <Field label="Tanggal pendaftaran">
                  <Text size={200}>
                    {formatRegistrationDate(selectedRegistration.createdAt)}
                  </Text>
                </Field>
                <Field label="Peran yang dipilih">
                  <Text>
                    {roleLabels[
                      approvalRoles[selectedRegistration.id] ?? "user"
                    ]}
                  </Text>
                </Field>
              </DialogContent>
            )}
            <DialogActions>
              <Button
                type="button"
                appearance="secondary"
                onClick={() => setSelectedRegistration(null)}
              >
                Tutup
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog
        open={editingAccount !== null}
        onOpenChange={(_, data) => {
          if (!data.open && !saving) setEditingAccount(null)
        }}
      >
        <DialogSurface className={styles.surface}>
          <DialogBody>
            <DialogTitle>
              Edit hak akses{editingAccount ? ` · ${editingAccount.username}` : ""}
            </DialogTitle>
            <DialogContent className={styles.form}>
              <Text size={200}>
                Hak akses akun mengikuti peran yang dipilih. Izin pada tab Hak
                akses berlaku untuk semua akun dengan peran tersebut; Admin
                memiliki akses penuh.
              </Text>
              <Field label="Peran akun" required>
                <Dropdown
                  aria-label="Peran akun"
                  value={roleLabels[managedRoleDraft]}
                  selectedOptions={[managedRoleDraft]}
                  disabled={saving}
                  onOptionSelect={(_, data) => {
                    if (
                      data.optionValue === "admin" ||
                      data.optionValue === "supervisor" ||
                      data.optionValue === "user"
                    ) {
                      setManagedRoleDraft(data.optionValue)
                    }
                  }}
                >
                  {Object.entries(roleLabels).map(([value, label]) => (
                    <Option key={value} value={value} text={label}>
                      {label}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                appearance="secondary"
                disabled={saving}
                onClick={() => setEditingAccount(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                appearance="primary"
                disabled={saving}
                aria-busy={saving}
                onClick={() => void saveManagedAccountRole()}
              >
                {saving && <Spinner size="tiny" />}
                Simpan hak akses
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog
        open={pendingAccountAction !== null}
        onOpenChange={(_, data) => {
          if (!data.open && !saving) setPendingAccountAction(null)
        }}
      >
        <DialogSurface className={styles.surface}>
          <DialogBody>
            <DialogTitle>
              {pendingAccountAction?.action === "revoke-access"
                ? "Cabut hak akses"
                : pendingAccountAction?.action === "restore-access"
                  ? "Pulihkan hak akses"
                  : pendingAccountAction?.action === "ban-account"
                    ? "Ban sementara"
                    : pendingAccountAction?.action === "unban-account"
                      ? "Buka ban"
                      : "Hapus akun"}
            </DialogTitle>
            <DialogContent className={styles.form}>
              <Text>
                {pendingAccountAction?.action === "revoke-access"
                  ? `Cabut akses ${pendingAccountAction.account.username}? Akun akan langsung keluar dan tidak dapat masuk sampai akses dipulihkan.`
                  : pendingAccountAction?.action === "restore-access"
                    ? `Pulihkan akses ${pendingAccountAction.account.username}? Akun dapat masuk kembali setelah login.`
                    : pendingAccountAction?.action === "ban-account"
                      ? `Akun ${pendingAccountAction.account.username} akan langsung keluar. Ban berakhir otomatis setelah durasi yang dipilih.`
                      : pendingAccountAction?.action === "unban-account"
                        ? `Buka ban ${pendingAccountAction.account.username} sekarang? Akun dapat masuk kembali setelah login.`
                        : pendingAccountAction
                          ? `Hapus akun ${pendingAccountAction.account.username} secara permanen? Data operasional yang dibuat akun tetap dipertahankan.`
                          : ""}
              </Text>
              {pendingAccountAction?.action === "ban-account" && (
                <Field label="Durasi ban" required>
                  <Dropdown
                    aria-label="Durasi ban"
                    value={`${banDurationDays} hari`}
                    selectedOptions={[String(banDurationDays)]}
                    disabled={saving}
                    onOptionSelect={(_, data) => {
                      const duration = Number(data.optionValue)
                      if (duration === 1 || duration === 7 || duration === 30) {
                        setBanDurationDays(duration)
                      }
                    }}
                  >
                    <Option value="1" text="1 hari">1 hari</Option>
                    <Option value="7" text="7 hari">7 hari</Option>
                    <Option value="30" text="30 hari">30 hari</Option>
                  </Dropdown>
                </Field>
              )}
              {saveError && (
                <MessageBar intent="error">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              )}
            </DialogContent>
            <DialogActions>
              <Button
                type="button"
                appearance="secondary"
                disabled={saving}
                onClick={() => setPendingAccountAction(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                appearance={
                  pendingAccountAction?.action === "delete-account"
                    ? "secondary"
                    : "primary"
                }
                disabled={saving}
                aria-busy={saving}
                onClick={() => void confirmManagedAccountAction()}
              >
                {saving && <Spinner size="tiny" />}
                {pendingAccountAction?.action === "revoke-access"
                  ? "Cabut akses"
                  : pendingAccountAction?.action === "restore-access"
                    ? "Pulihkan akses"
                    : pendingAccountAction?.action === "ban-account"
                      ? "Ban sementara"
                      : pendingAccountAction?.action === "unban-account"
                        ? "Buka ban"
                        : "Hapus akun"}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
      <Dialog
        open={editingPermission !== null}
        onOpenChange={(_, data) => {
          if (!data.open && !saving) setEditingPermission(null)
        }}
      >
        <DialogSurface className={styles.surface}>
          <form onSubmit={(event) => void handlePermissionSubmit(event)}>
            <DialogBody>
              <DialogTitle>
                Atur izin {editingPermission ? permissionLabels[editingPermission] : ""}
              </DialogTitle>
              <DialogContent className={styles.form}>
                <Text size={200}>
                  Peran {roleLabels[permissionRole]} dapat diberi akses baca saja
                  atau baca dan tulis.
                </Text>
                <Field label="Tingkat akses" required>
                  <Dropdown
                    aria-label="Tingkat akses"
                    value={
                      permissionDraft === "read-write"
                        ? "Read & Write"
                        : "Read"
                    }
                    selectedOptions={[permissionDraft]}
                    disabled={saving}
                    onOptionSelect={(_, data) => {
                      if (
                        data.optionValue === "read" ||
                        data.optionValue === "read-write"
                      ) {
                        setPermissionDraft(data.optionValue)
                      }
                    }}
                  >
                    <Option value="read" text="Read">
                      Read
                    </Option>
                    <Option value="read-write" text="Read & Write">
                      Read & Write
                    </Option>
                  </Dropdown>
                </Field>
                {editingPermission && (
                  <div>
                    <Text weight="semibold">
                      Halaman menu yang dapat diakses
                    </Text>
                    <div
                      className={styles.permissionPageList}
                      role="group"
                      aria-label={`Halaman menu ${permissionLabels[editingPermission]}`}
                    >
                      {LOCAL_PAGE_PERMISSION_GROUPS[editingPermission].map(
                        ({ key, label }) => (
                          <Checkbox
                            key={key}
                            label={label}
                            checked={permissionPageDraft[key]}
                            disabled={saving}
                            onChange={(_, data) =>
                              setPermissionPageDraft((current) => ({
                                ...current,
                                [key]: data.checked === true,
                              }))
                            }
                          />
                        ),
                      )}
                    </div>
                  </div>
                )}
                {saveError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{saveError}</MessageBarBody>
                  </MessageBar>
                )}
              </DialogContent>
              <DialogActions className={styles.permissionActions}>
                <Button
                  type="button"
                  appearance="secondary"
                  disabled={saving}
                  onClick={() => setEditingPermission(null)}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving && <Spinner size="tiny" />}
                  Simpan izin
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
      <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
        <DialogSurface className={styles.surface}>
          <form onSubmit={handleSubmit}>
            <DialogBody>
              <DialogTitle>Tambah akun lokal</DialogTitle>
              <DialogContent className={styles.form}>
                <Field label="Username" required>
                  <Input
                    autoComplete="username"
                    maxLength={32}
                    minLength={3}
                    required
                    value={username}
                    onChange={(_, data) => setUsername(data.value)}
                  />
                </Field>
                <Field label="Password akun" required>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    minLength={12}
                    required
                    value={password}
                    onChange={(_, data) => setPassword(data.value)}
                  />
                </Field>
                <Text size={200}>
                  Bagikan kredensial melalui cara yang aman. Password harus
                  terdiri dari 12–128 karakter.
                </Text>
                <Field label="Peran" required>
                  <Dropdown
                    aria-label="Peran akun"
                    value={roleLabels[role]}
                    selectedOptions={[role]}
                    onOptionSelect={(_, data) => {
                      if (
                        data.optionValue === "admin" ||
                        data.optionValue === "supervisor" ||
                        data.optionValue === "user"
                      ) {
                        setRole(data.optionValue)
                      }
                    }}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <Option key={value} value={value} text={label}>
                        {label}
                      </Option>
                    ))}
                  </Dropdown>
                </Field>
                {saveError && (
                  <MessageBar intent="error">
                    <MessageBarBody>{saveError}</MessageBarBody>
                  </MessageBar>
                )}
              </DialogContent>
              <DialogActions>
                <Button
                  type="button"
                  appearance="secondary"
                  onClick={() => setOpen(false)}
                >
                  Batal
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={saving}
                  aria-busy={saving}
                >
                  {saving && <Spinner size="tiny" />}
                  Buat akun
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </section>
  )
}

export type LocalRole = "admin" | "supervisor" | "user"

export type LocalPermission = "directory" | "assets" | "maintenance"

export type LocalPermissions = Record<LocalPermission, boolean>

export const LOCAL_PAGE_PERMISSION_KEYS = [
  "directory",
  "asset-recording",
  "asset-non-juknis",
  "asset-surat-edaran",
  "asset-completeness",
  "warehouse",
  "maintenance",
] as const

export type LocalPagePermission = (typeof LOCAL_PAGE_PERMISSION_KEYS)[number]

export const LOCAL_PAGE_PERMISSION_GROUPS = {
  directory: [{ key: "directory", label: "SPPG & Yayasan" }],
  assets: [
    { key: "asset-recording", label: "Pencatatan aset" },
    { key: "asset-non-juknis", label: "Aset non-juknis" },
    { key: "asset-surat-edaran", label: "Aset Surat Edaran" },
    { key: "asset-completeness", label: "Kelengkapan aset" },
    { key: "warehouse", label: "Gudang" },
  ],
  maintenance: [{ key: "maintenance", label: "Pemeliharaan" }],
} as const satisfies Record<
  LocalPermission,
  readonly { key: LocalPagePermission; label: string }[]
>

export type LocalPagePermissions = Record<LocalPagePermission, boolean>

export function isLocalPagePermission(
  value: unknown,
): value is LocalPagePermission {
  return (
    typeof value === "string" &&
    LOCAL_PAGE_PERMISSION_KEYS.some((permission) => permission === value)
  )
}

export function isLocalPagePermissions(
  value: unknown,
): value is LocalPagePermissions {
  return (
    typeof value === "object" &&
    value !== null &&
    LOCAL_PAGE_PERMISSION_KEYS.every(
      (permission) =>
        typeof (value as Record<string, unknown>)[permission] === "boolean",
    )
  )
}

export type LocalUser = {
  id: string
  username: string
  role: LocalRole
  permissions?: LocalPermissions
  pagePermissions?: LocalPagePermissions
}

export type ManagedLocalAccount = LocalUser & {
  accessRevokedAt: string | null
  bannedUntil: number | null
}

export type LocalAccountProfile = {
  email: string | null
  emailVerifiedAt: string | null
  avatarDataUrl: string | null
}

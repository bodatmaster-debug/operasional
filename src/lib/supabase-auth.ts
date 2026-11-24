import "server-only"

import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import type {
  LocalPagePermission,
  LocalPermissions,
  LocalPagePermissions,
  LocalRole,
  LocalUser,
} from "@/lib/access-types"

export type SupabaseProfile = {
  user_id: string
  email: string
  username: string
  full_name: string
  role: LocalRole
  status: "pending" | "active" | "rejected"
  yayasan_id: string | null
  access_revoked_at: string | null
  banned_until: string | null
  eula_version: string | null
  eula_accepted_at: string | null
  avatar_data: string | null
  avatar_mime_type: string | null
}

const pageKeys: readonly LocalPagePermission[] = [
  "directory",
  "asset-recording",
  "asset-non-juknis",
  "asset-surat-edaran",
  "asset-completeness",
  "warehouse",
  "maintenance",
]

export async function getSupabaseSession() {
  const supabase = createClient(await cookies())
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) return null

  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(
      "user_id,email,username,full_name,role,status,yayasan_id,access_revoked_at,banned_until,eula_version,eula_accepted_at,avatar_mime_type",
    )
    .eq("user_id", userData.user.id)
    .maybeSingle()

  if (profileError || !profile) return null
  const now = Date.now()
  if (
    profile.status !== "active" ||
    profile.access_revoked_at ||
    (profile.banned_until && Date.parse(profile.banned_until) > now)
  ) {
    return null
  }

  let permissions: LocalPermissions =
    profile.role === "admin"
      ? { directory: true, assets: true, maintenance: true }
      : { directory: false, assets: false, maintenance: false }
  const pagePermissions = Object.fromEntries(
    pageKeys.map((key) => [key, profile.role === "admin"]),
  ) as LocalPagePermissions

  if (profile.role !== "admin") {
    const { data: rolePermission } = await supabase
      .from("role_permissions")
      .select(
        "can_manage_directory,can_manage_assets,can_manage_maintenance",
      )
      .eq("role", profile.role)
      .maybeSingle()
    if (rolePermission) {
      permissions = {
        directory:
          rolePermission.can_manage_directory === true ||
          rolePermission.can_manage_directory === 1,
        assets:
          rolePermission.can_manage_assets === true ||
          rolePermission.can_manage_assets === 1,
        maintenance:
          rolePermission.can_manage_maintenance === true ||
          rolePermission.can_manage_maintenance === 1,
      }
    }

    const { data: rolePagePermissions } = await supabase
      .from("role_page_permissions")
      .select("page,can_access")
      .eq("role", profile.role)

    for (const row of rolePagePermissions ?? []) {
      if (pageKeys.includes(row.page as LocalPagePermission)) {
        pagePermissions[row.page as LocalPagePermission] =
          row.can_access === true
      }
    }
  }

  return {
    id: profile.user_id,
    username: profile.username,
    role: profile.role as LocalRole,
    permissions,
    pagePermissions,
  } satisfies LocalUser
}

import "server-only"

import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getSupabaseSession } from "@/lib/supabase-auth"

export async function getSupabaseProfile() {
  return getSupabaseSession()
}

export async function updateSupabaseProfile(input: {
  fullName?: string
  username?: string
  avatarData?: Uint8Array | null
  avatarMimeType?: string | null
}) {
  const supabase = createClient(await cookies())
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user) throw new Error("Sesi tidak valid")
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.fullName !== undefined) updates.full_name = input.fullName
  if (input.username !== undefined) updates.username = input.username
  if (input.avatarData !== undefined) {
    updates.avatar_data = input.avatarData
    updates.avatar_mime_type = input.avatarMimeType ?? null
  }
  const { data, error } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("user_id", auth.user.id)
    .select("*")
    .single()
  if (error) throw error
  return data
}

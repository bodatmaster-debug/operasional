import "server-only"

import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ORGANIZATION_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
])
const AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
])

export class SupabaseStorageError extends Error {}

export async function uploadOrganizationAsset(
  yayasanId: string,
  objectName: string,
  file: File,
) {
  if (!/^[a-zA-Z0-9_-]{1,160}$/.test(yayasanId)) {
    throw new SupabaseStorageError("ID Yayasan tidak valid.")
  }
  if (!ORGANIZATION_MIME_TYPES.has(file.type)) {
    throw new SupabaseStorageError(
      "Logo atau foto Yayasan harus berformat JPEG, PNG, WebP, atau AVIF.",
    )
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new SupabaseStorageError(
      "Logo atau foto Yayasan maksimal berukuran 5 MiB.",
    )
  }

  const supabase = createClient(await cookies())
  const path = `${yayasanId}/${objectName}`
  const { error } = await supabase.storage
    .from("organization-assets")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    })
  if (error) throw new SupabaseStorageError(error.message)
  return path
}

export async function uploadUserAvatar(userId: string, file: File) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    throw new SupabaseStorageError("ID pengguna tidak valid.")
  }
  if (!AVATAR_MIME_TYPES.has(file.type)) {
    throw new SupabaseStorageError(
      "Foto profil harus berformat JPEG, PNG, atau WebP.",
    )
  }
  if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    throw new SupabaseStorageError(
      "Foto profil maksimal berukuran 5 MiB.",
    )
  }

  const supabase = createClient(await cookies())
  const path = `${userId}/avatar`
  const { error } = await supabase.storage
    .from("user-avatars")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    })
  if (error) throw new SupabaseStorageError(error.message)
  return path
}

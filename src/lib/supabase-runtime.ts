import "server-only"

import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"

export async function getSupabaseRuntimeClient() {
  return createClient(await cookies())
}

export function supabaseErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "")
    if (message) return message
  }
  return fallback
}

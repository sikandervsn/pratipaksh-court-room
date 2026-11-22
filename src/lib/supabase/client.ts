"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL, authEnabled } from "./config";

let _client: SupabaseClient | null = null;

/** Browser Supabase client (null when accounts are not configured). */
export function supabaseBrowser(): SupabaseClient | null {
  if (!authEnabled) return null;
  return (_client ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY));
}

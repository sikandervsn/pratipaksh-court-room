// Supabase is optional: without these env vars the app runs without accounts.
// Accept common copy-paste variants of the URL (".../rest/v1/", trailing slash).
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .trim()
  .replace(/\/(rest|auth)\/v1\/?$/, "")
  .replace(/\/+$/, "");
export const SUPABASE_KEY =
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

export const authEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

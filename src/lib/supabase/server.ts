import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_KEY, SUPABASE_URL, authEnabled } from "./config";

/** Server Supabase client bound to the request cookies (route handlers / server components). */
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // called from a server component — middleware refreshes the session instead
        }
      },
    },
  });
}

/**
 * Guard for API routes. Returns null if the request may proceed,
 * or a 401 Response if accounts are enabled and nobody is signed in.
 */
export async function requireUser(): Promise<Response | null> {
  if (!authEnabled) return null;
  const sb = await supabaseServer();
  const { data, error } = await sb.auth.getUser();
  if (!error && data.user) return null;
  return Response.json({ error: "Please sign in to use Pratipaksh." }, { status: 401 });
}

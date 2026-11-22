import { supabaseServer } from "./supabase/server";
import { authEnabled } from "./supabase/config";

// ───────── Request guard: origin check + rate limits + body size ─────────
//
// Every AI route costs real API quota, so each caller (signed-in user, or IP when
// accounts are off) gets a small budget, AND the whole site has a daily ceiling so
// many throw-away accounts can't drain the provider quota. The limiter is in-memory:
// exact on a single server (e.g. one VM), approximate on serverless.

type Bucket = { hits: number[] };
const buckets = new Map<string, Bucket>();
const n = (v: string | undefined, d: number) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d);

const LIMITS = {
  // "heavy" = AI work that makes several model calls (hearing, fix, notice, compare)
  heavy: { perHour: n(process.env.RATE_LIMIT_HEARINGS_PER_HOUR, 6), perDay: n(process.env.RATE_LIMIT_HEARINGS_PER_DAY, 20) },
  // "light" = Hindi explanation, PDF extraction, .docx export, library search
  light: { perHour: n(process.env.RATE_LIMIT_LIGHT_PER_HOUR, 60), perDay: n(process.env.RATE_LIMIT_LIGHT_PER_DAY, 300) },
};
// Whole-site ceilings per day (protects the free AI quota from sign-up farms).
const GLOBAL = {
  heavy: n(process.env.RATE_LIMIT_GLOBAL_HEAVY_PER_DAY, 60),
  light: n(process.env.RATE_LIMIT_GLOBAL_LIGHT_PER_DAY, 3000),
};

function count(key: string, now: number) {
  const b = buckets.get(key) ?? { hits: [] };
  b.hits = b.hits.filter((t) => now - t < 86_400_000);
  buckets.set(key, b);
  return b;
}

function take(key: string, kind: keyof typeof LIMITS): string | null {
  const now = Date.now();
  const g = count(`global:${kind}`, now);
  if (g.hits.length >= GLOBAL[kind]) return "Pratipaksh has reached its daily usage limit. Please try again tomorrow.";
  const b = count(`${kind}:${key}`, now);
  const lastHour = b.hits.filter((t) => now - t < 3_600_000).length;
  const { perHour, perDay } = LIMITS[kind];
  const what = kind === "heavy" ? "AI analyses" : "requests";
  if (lastHour >= perHour) return `You've reached the limit of ${perHour} ${what} per hour. Please try again later.`;
  if (b.hits.length >= perDay) return `You've reached the daily limit of ${perDay} ${what}. Please try again tomorrow.`;
  b.hits.push(now);
  g.hits.push(now);
  // keep memory bounded (Map iterates oldest first)
  if (buckets.size > 5000) for (const k of buckets.keys()) if (buckets.size > 4000 && !k.startsWith("global:")) buckets.delete(k);
  return null;
}

/**
 * Client IP for rate limiting when accounts are off.
 * Only trust proxy headers when TRUST_PROXY=1 (i.e. the app runs behind your own Caddy/nginx,
 * which overwrites X-Real-IP / appends to X-Forwarded-For). Otherwise anyone could spoof them.
 */
function clientIp(req: Request) {
  if (process.env.TRUST_PROXY !== "1") return "direct";
  const real = req.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const xff = req.headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return xff?.length ? xff[xff.length - 1] : "unknown"; // right-most = added by our proxy
}

const json = (error: string, status: number) => Response.json({ error }, { status });

/** Blocks cross-site requests (CSRF): state-changing calls must come from our own pages. */
function sameOrigin(req: Request): boolean {
  if (req.method === "GET" || req.method === "HEAD") return true;
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients (curl) send no Origin; auth still applies
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Checks origin and identifies the caller. Sign-in is optional; anonymous
 * visitors are rate-limited by IP so the app remains usable without accounts.
 * Returns { deny } if the request must be refused, else { key } for rate limiting.
 */
export async function identify(req: Request): Promise<{ key: string; deny?: undefined } | { deny: Response; key?: undefined }> {
  if (!sameOrigin(req)) return { deny: json("Cross-site request blocked.", 403) };
  if (!authEnabled) return { key: `ip:${clientIp(req)}` };
  try {
    const sb = await supabaseServer();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return { deny: json("Please sign in to use Pratipaksh.", 401) };
    if (!data.user.email_confirmed_at && !data.user.phone_confirmed_at && process.env.REQUIRE_CONFIRMED_EMAIL === "1")
      return { deny: json("Please confirm your email address first.", 403) };
    return { key: `user:${data.user.id}` };
  } catch {
    return { deny: json("Could not verify your session. Please sign in again.", 401) };
  }
}

/** Consumes one unit of the caller's (and the site's) budget; returns a 429 Response when exhausted. */
export function limit(key: string, kind: keyof typeof LIMITS): Response | null {
  const limited = take(key, kind);
  return limited ? json(limited, 429) : null;
}

/** Reads the request body as text, aborting as soon as it exceeds maxBytes (works for chunked uploads too). */
export async function readCapped(req: Request, maxBytes: number): Promise<{ text?: string; error?: Response }> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) return { error: json("Request is too large.", 413) };
  if (!req.body) return { text: "" };
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        return { error: json("Request is too large.", 413) };
      }
      chunks.push(value);
    }
  } catch {
    return { error: json("Could not read the request.", 400) };
  }
  const buf = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) {
    buf.set(c, off);
    off += c.byteLength;
  }
  return { text: new TextDecoder().decode(buf) };
}

/** Reads a JSON body with a hard size cap (protects memory and API spend). */
export async function readJson<T>(req: Request, maxBytes: number): Promise<{ data?: T; error?: Response }> {
  const { text, error } = await readCapped(req, maxBytes);
  if (error) return { error };
  try {
    return { data: JSON.parse(text ?? "") as T };
  } catch {
    return { error: json("Invalid request body.", 400) };
  }
}

/** Remove anything that looks like a credential from text sent back to the browser. */
export function redact(message: string): string {
  return message
    .replace(/(sk-ant-|sk-or-|sk-|gsk_|sb_secret_|sb_publishable_|AIza|AQ\.)[A-Za-z0-9._-]{8,}/g, "[redacted]")
    .replace(/(key|token|apikey|password)=[^&\s]+/gi, "$1=[redacted]")
    .slice(0, 400);
}

import { hasLiveKey } from "@/lib/claude";
import { compareDrafts } from "@/lib/compare";
import { identify, limit, readJson, redact } from "@/lib/guard";
import { cleanState } from "@/lib/states";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const { data, error } = await readJson<{ v1?: unknown; v2?: unknown; side?: unknown; state?: unknown }>(req, 300_000);
  if (error) return error;
  const v1 = typeof data?.v1 === "string" ? data.v1.trim() : "";
  const v2 = typeof data?.v2 === "string" ? data.v2.trim() : "";
  if (v1.length < 80 || v2.length < 80) return Response.json({ error: "Paste both drafts (your version and their marked-up version)." }, { status: 400 });
  if (v1.length > 60_000 || v2.length > 60_000) return Response.json({ error: "Each draft must be under 60,000 characters." }, { status: 413 });
  const side = typeof data?.side === "string" ? data.side.replace(/[^\p{L}\p{N} .,&()/-]/gu, "").slice(0, 60) : "";
  if (!hasLiveKey()) return Response.json({ error: "Comparison needs an AI API key in .env.local." }, { status: 400 });
  const limited = limit(who.key, "heavy");
  if (limited) return limited;
  try {
    return Response.json(await compareDrafts(v1, v2, side, cleanState(data?.state)));
  } catch (e) {
    console.error("[compare]", redact(e instanceof Error ? e.message : String(e)));
    return Response.json({ error: redact(e instanceof Error ? e.message : "Comparison failed") }, { status: 500 });
  }
}

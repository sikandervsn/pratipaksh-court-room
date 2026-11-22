import { identify, limit, readJson, redact } from "@/lib/guard";
import { MAX_DOC_CHARS } from "@/lib/validate";
import { cleanState } from "@/lib/states";
import { hasLiveKey } from "@/lib/claude";
import { DEMO_ROUND1 } from "@/lib/demo";
import { runHearing } from "@/lib/pipeline";
import { RENTAL_SAMPLE } from "@/lib/samples";
import { ndjson, replayDemo } from "@/lib/stream";
import type { AgentName } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEMO_STEPS: [AgentName, string, string][] = [
  ["shield", "Masking names, addresses, phone numbers, IDs and account numbers…", "4 personal details masked — the AI never sees them"],
  ["clerk", "Reading the document and identifying parties & clauses…", "Residential Rental Agreement · 13 clauses · you are the Tenant"],
  ["opponent", "Opposing counsel (Landlord) is building the case against you…", "6 lines of attack prepared"],
  ["advocate", "Your advocate is preparing rebuttals for the Tenant…", "3 strong · 3 contested"],
  ["verifier", "Verifying 26 citations against the source corpus…", "16/26 verified · 1 fabricated blocked"],
  ["judge", "The bench is weighing both sides…", "Win probability: 27%"],
];

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const { data: body, error } = await readJson<{ text?: unknown; side?: unknown; state?: unknown }>(req, 300_000);
  if (error) return error;
  const text = typeof body?.text === "string" ? body.text : "";
  const side = typeof body?.side === "string" ? body.side.replace(/[^\p{L}\p{N} .,&()/-]/gu, "").slice(0, 60) : "";
  const doc = text.trim();
  const jurisdiction = cleanState(body?.state);
  if (doc.length > MAX_DOC_CHARS)
    return Response.json(
      { error: `Document is too long (${doc.length.toLocaleString()} characters). The limit is ${MAX_DOC_CHARS.toLocaleString()}: paste the main clauses only.` },
      { status: 413 },
    );
  const isSample = doc.replace(/\s+/g, " ") === RENTAL_SAMPLE.replace(/\s+/g, " ");
  // The recorded demo is free; live hearings spend API quota and are rate-limited.
  if (hasLiveKey() && doc.length >= 80) {
    const limited = limit(who.key, "heavy");
    if (limited) return limited;
  }

  return ndjson(async (emit) => {
    if (doc.length < 80) throw new Error("Please paste or upload a document (at least a few lines).");

    if (!hasLiveKey()) {
      if (!isSample)
        throw new Error("Live analysis needs an AI API key in .env.local (Claude, Gemini, Groq or OpenRouter — see .env.example). Without one, try the bundled rental sample (demo mode).");
      await replayDemo(emit, DEMO_STEPS);
      emit({ type: "result", hearing: DEMO_ROUND1 });
      return;
    }
    try {
      const hearing = await runHearing(doc, side, emit, { jurisdiction });
      emit({ type: "result", hearing });
    } catch (err) {
      // Stage safety net: if the live provider fails on the bundled sample, show the recorded hearing.
      if (!isSample || (err instanceof Error && err.message === "client disconnected")) throw err;
      console.error("[hearing] live failed, using recorded demo:", redact(err instanceof Error ? err.message : String(err)));
      emit({ type: "agent", agent: "judge", status: "done", detail: `Live provider failed (${redact(err instanceof Error ? err.message : "error")}) — showing the recorded hearing.` });
      emit({ type: "result", hearing: DEMO_ROUND1 });
    }
  });
}

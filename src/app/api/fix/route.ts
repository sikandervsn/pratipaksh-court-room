import { identify, limit, readJson } from "@/lib/guard";
import { validHearing } from "@/lib/validate";
import { hasLiveKey } from "@/lib/claude";
import { DEMO_ROUND2 } from "@/lib/demo";
import { runFixAndRehear } from "@/lib/pipeline";
import { ndjson, replayDemo } from "@/lib/stream";
import type { AgentName, Hearing } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const DEMO_STEPS: [AgentName, string, string][] = [
  ["drafter", "Redrafting 10 weak clauses for the Tenant, with fallback positions…", "10 clauses rewritten · fallback positions + negotiation message ready"],
  ["shield", "Masking personal details in the revised draft…", "4 personal details masked — the AI never sees them"],
  ["clerk", "Re-reading the revised document…", "Residential Rental Agreement · 13 clauses · you are the Tenant"],
  ["opponent", "Opposing counsel is attacking the new draft…", "3 lines of attack prepared"],
  ["advocate", "Your advocate is defending the new draft…", "3 strong · 0 contested"],
  ["verifier", "Verifying 8 citations against the source corpus…", "8/8 verified"],
  ["judge", "The bench is re-hearing the matter…", "Win probability: 84%"],
];

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const { data, error } = await readJson<{ hearing?: Hearing }>(req, 1_500_000);
  if (error) return error;
  const hearing = data?.hearing;
  if (!validHearing(hearing)) return Response.json({ error: "Run a hearing first, then fix it." }, { status: 400 });
  if (hearing.mode === "live" && hasLiveKey()) {
    const limited = limit(who.key, "heavy");
    if (limited) return limited;
  }
  return ndjson(async (emit) => {
    if (hearing.mode === "demo" || !hasLiveKey()) {
      if (hearing.mode !== "demo") throw new Error("Live re-hearing needs an AI API key in .env.local.");
      await replayDemo(emit, DEMO_STEPS);
      emit({ type: "result", hearing: DEMO_ROUND2 });
      return;
    }
    const next = await runFixAndRehear(hearing, emit);
    emit({ type: "result", hearing: next });
  });
}

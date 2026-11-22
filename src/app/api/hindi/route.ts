import { identify, limit, readJson, redact } from "@/lib/guard";
import { validHearing } from "@/lib/validate";
import { hasLiveKey, runText } from "@/lib/claude";
import { DEMO_HINDI, DEMO_HINDI_2 } from "@/lib/demo";
import type { Hearing } from "@/lib/types";
import { maskDocument, maskWith } from "@/lib/privacy";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const { data, error } = await readJson<{ hearing?: Hearing }>(req, 1_500_000);
  if (error) return error;
  const hearing = data?.hearing;
  if (!validHearing(hearing)) return Response.json({ error: "Run a hearing first." }, { status: 400 });
  if (hearing.mode === "demo") return Response.json({ text: hearing.round === 1 ? DEMO_HINDI : DEMO_HINDI_2 });
  if (!hasLiveKey()) return Response.json({ error: "Hindi explanation needs an AI API key in .env.local." }, { status: 400 });
  const limited = limit(who.key, "light");
  if (limited) return limited;
  try {
    // Privacy Shield: results contain real names — mask them before they go to the AI again.
    const { map } = maskDocument(hearing.documentText);
    const text = await runText(
      "You explain legal analysis to ordinary Indian citizens in simple, warm, spoken Hindi (Devanagari script). No legal jargon; where a legal term is unavoidable, explain it. 120-170 words. Plain prose only — no markdown, bullets or headings, because it will be read aloud.",
      maskWith(
        `Document: ${String(hearing.clerk.docType).slice(0, 120)}. The user is the ${hearing.clerk.userSide.slice(0, 60)}.
Win probability: ${hearing.judge.winProbability}%${hearing.previousWinProbability != null ? ` (was ${hearing.previousWinProbability}% before fixes)` : ""}.
Verdict: ${String(hearing.judge.headline).slice(0, 300)}
${String(hearing.judge.summary).slice(0, 1500)}
Main risks: ${hearing.issues.map((i) => String(i.attack?.title ?? "").slice(0, 150)).join("; ")}
Explain what this means for them and what they should do before signing. Refer to people generically ("you", "the landlord"), never by placeholder.`,
        map,
      ),
    );
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: redact(e instanceof Error ? e.message : "Failed") }, { status: 500 });
  }
}

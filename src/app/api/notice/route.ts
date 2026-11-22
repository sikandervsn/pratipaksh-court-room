import { hasLiveKey } from "@/lib/claude";
import { identify, limit, readJson, redact } from "@/lib/guard";
import { generateNotice, NoticeRequest } from "@/lib/notices";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const { data, error } = await readJson<unknown>(req, 120_000);
  if (error) return error;
  const parsed = NoticeRequest.safeParse(data);
  if (!parsed.success)
    return Response.json({ error: `Please check the form: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".")} — ${i.message}`).join("; ")}` }, { status: 400 });
  if (parsed.data.mode === "reply" && parsed.data.receivedNotice.trim().length < 50)
    return Response.json({ error: "Paste the notice you received (at least a few lines) to draft a reply." }, { status: 400 });
  if (parsed.data.type === "cheque_bounce" && parsed.data.mode === "notice" && !parsed.data.cheque)
    return Response.json({ error: "Enter the cheque date and the dishonour memo date." }, { status: 400 });
  if (!hasLiveKey()) return Response.json({ error: "Drafting needs an AI API key in .env.local." }, { status: 400 });
  const limited = limit(who.key, "heavy");
  if (limited) return limited;
  try {
    return Response.json(await generateNotice(parsed.data));
  } catch (e) {
    console.error("[notice]", redact(e instanceof Error ? e.message : String(e)));
    return Response.json({ error: redact(e instanceof Error ? e.message : "Drafting failed") }, { status: 500 });
  }
}

// ───────── F9: Legal notice generator + reply-to-notice ─────────
import "server-only";
import { z } from "zod";
import { runAgent } from "./claude";
import { embedQueries, getSource, search, sourcesForPrompt, STATUTE_BY_ID, verifyCitationQuote, type Statute } from "./library";
import { chequeTimeline, compute, RULES, type ChequeTimeline, type DeadlineResult } from "./limitation";
import { deepMap, maskDocument, maskWith, unmask } from "./privacy";
import type { QuoteCheck } from "./types";

export const NOTICE_TYPES = {
  cheque_bounce: { label: "Cheque bounce (NI Act s. 138)", anchors: ["NIA-138", "NIA-139", "NIA-142"], query: "dishonour of cheque insufficiency of funds demand notice payment within fifteen days offence" },
  deposit_refund: { label: "Refund of security deposit (tenancy)", anchors: ["TPA-105", "TPA-108", "ICA-73", "ICA-74"], query: "lessee lessor refund deposit compensation breach lease" },
  unpaid_salary: { label: "Unpaid salary / full & final settlement", anchors: ["COW-17", "COW-18"], query: "time limit for payment of wages deductions employee resigned dismissed" },
  consumer_deficiency: { label: "Consumer complaint: deficiency / unfair trade practice", anchors: ["CPA-2", "CPA-35", "CPA-69"], query: "deficiency in service unfair trade practice complaint consumer compensation" },
  breach_of_contract: { label: "Breach of contract / recovery of money", anchors: ["ICA-73", "ICA-74"], query: "compensation for loss or damage caused by breach of contract" },
  other: { label: "Other (describe in facts)", anchors: [], query: "" },
} as const;
export type NoticeType = keyof typeof NOTICE_TYPES;

const party = z.object({ name: z.string().min(2).max(120), address: z.string().max(400).default("") });

export const NoticeRequest = z.object({
  mode: z.enum(["notice", "reply"]),
  type: z.enum(Object.keys(NOTICE_TYPES) as [NoticeType, ...NoticeType[]]),
  sender: party,
  recipient: party,
  advocate: z.object({ name: z.string().max(120).default(""), enrolment: z.string().max(60).default(""), address: z.string().max(400).default("") }).optional(),
  facts: z.string().min(30).max(8000),
  amount: z.string().max(60).default(""),
  state: z.string().max(80).default("Not specified"),
  causeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  cheque: z
    .object({
      number: z.string().max(30).default(""),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      bank: z.string().max(120).default(""),
      memoDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .optional(),
  receivedNotice: z.string().max(20000).default(""),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type NoticeRequest = z.infer<typeof NoticeRequest>;

const NoticeSchema = z.object({
  subject: z.string().describe("Subject line, e.g. 'Legal notice under Section 138 of the Negotiable Instruments Act, 1881 for dishonour of Cheque No. …'"),
  paragraphs: z.array(z.string()).describe("Numbered body paragraphs in formal Indian legal-notice style: parties & relationship, facts in date order, the legal position, the breach. 5-10 paragraphs. No numbering prefix."),
  demands: z.array(z.string()).describe("Specific demands (amount with figures and words, interest, costs, action)"),
  complianceDays: z.number().int().min(1).max(60).describe("Days to comply. For a s.138 cheque notice this MUST be 15."),
  consequence: z.string().describe("What will follow non-compliance (civil/criminal/consumer proceedings), without threats beyond what law allows"),
  enclosures: z.array(z.string()),
  replyPoints: z
    .array(z.object({ allegation: z.string(), response: z.string() }))
    .describe("REPLY mode only: para-wise response to each allegation in the received notice; empty in notice mode"),
  cites: z.array(z.object({ id: z.string(), quote: z.string().describe("EXACT words copied from the source text") })).describe("Sources relied on, each with an exact quote"),
  warnings: z.array(z.string()).describe("Gaps or risks the sender must fix before sending (missing facts, limitation issues, wrong forum, documents to attach)"),
});
export type NoticeDraft = z.infer<typeof NoticeSchema>;

export interface NoticeResult {
  draft: NoticeDraft;
  citations: { id: string; cite: string; quote: string; check: QuoteCheck; url?: string; verbatim: boolean }[];
  timeline?: ChequeTimeline;
  limitation?: DeadlineResult;
  retrieved: string[];
}

export async function generateNotice(req: NoticeRequest): Promise<NoticeResult> {
  const t = NOTICE_TYPES[req.type];

  // Privacy Shield: parties are replaced by role placeholders; facts/notice text masked as well.
  const roles: [string, string][] = [
    [req.sender.name, "[SENDER]"],
    [req.recipient.name, "[RECIPIENT]"],
    ...(req.sender.address ? ([[req.sender.address, "[SENDER_ADDRESS]"]] as [string, string][]) : []),
    ...(req.recipient.address ? ([[req.recipient.address, "[RECIPIENT_ADDRESS]"]] as [string, string][]) : []),
  ];
  const roleMask = (s: string) => roles.reduce((acc, [real, ph]) => (real.trim().length >= 3 ? acc.split(real.trim()).join(ph) : acc), s);
  const combined = roleMask(`${req.facts}\n\n${req.receivedNotice}`);
  const { map } = maskDocument(combined);
  const safe = (s: string) => maskWith(roleMask(s), map);

  // Deadlines (F13) — deterministic
  let timeline: ChequeTimeline | undefined;
  let limitation: DeadlineResult | undefined;
  if (req.type === "cheque_bounce" && req.cheque) timeline = chequeTimeline(req.cheque.date, req.cheque.memoDate, req.today) ?? undefined;
  if (req.causeDate) {
    const ruleId = req.type === "consumer_deficiency" ? "cpa-69" : req.type === "breach_of_contract" || req.type === "deposit_refund" ? "lim-55" : req.type === "unpaid_salary" ? "lim-113" : undefined;
    const rule = RULES.find((r) => r.id === ruleId);
    if (rule) limitation = compute(rule, req.causeDate, req.today) ?? undefined;
  }

  // Retrieval (F1)
  const queries = [t.query || req.facts.slice(0, 300), safe(req.facts).slice(0, 1500), ...(req.mode === "reply" ? [safe(req.receivedNotice).slice(0, 1500)] : [])].filter(Boolean);
  const vectors = await embedQueries(queries);
  const picked = new Map<string, Statute>();
  for (const a of t.anchors) if (STATUTE_BY_ID[a]) picked.set(a, STATUTE_BY_ID[a]);
  queries.forEach((q, i) => search(q, { k: 5, vector: vectors?.[i] ?? null }).forEach((h) => picked.set(h.statute.id, h.statute)));
  const sources = [...picked.values()].slice(0, 14);

  const deadlineFacts = [
    timeline ? `CHEQUE TIMELINE (computed by law, use these exact dates):\n${timeline.steps.map((s) => `- ${s.label}: ${s.date} (${s.basis})`).join("\n")}\nWarnings: ${timeline.warnings.join(" ") || "none"}` : "",
    limitation ? `LIMITATION (computed): ${limitation.rule.basis} — last date ${limitation.deadline} (${limitation.daysLeft} days from today${limitation.daysLeft < 0 ? ", EXPIRED" : ""}).` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const draft = await runAgent({
    schema: NoticeSchema,
    role: `ROLE: SENIOR INDIAN ADVOCATE drafting a ${req.mode === "reply" ? "REPLY to a legal notice received by" : "LEGAL NOTICE on behalf of"} [SENDER] ${req.mode === "reply" ? "" : `to [RECIPIENT]`}. Type: ${t.label}.
Style: formal Indian legal-notice drafting ("Under instructions from and on behalf of my client…", "TAKE NOTICE that…"), precise dates and amounts, no exaggeration, no defamatory or threatening language beyond lawful consequences. Refer to parties ONLY as [SENDER] and [RECIPIENT] (placeholders are filled in later).
${req.type === "cheque_bounce" ? "For s.138: state cheque number/date/amount/bank, the date of the dishonour memo and its reason, demand payment of the cheque amount within 15 days of receipt of this notice, and that failure attracts prosecution under s.138 read with s.142. complianceDays = 15." : ""}
${req.mode === "reply" ? "REPLY: deny allegations that the facts don't support, admit only what is true, respond para-wise in replyPoints, assert the sender's own claims and reserve rights." : "replyPoints must be an empty array."}
Ground every legal proposition in RETRIEVED SOURCES with exact quotes. Put anything missing or risky in warnings (e.g. notice sent late, wrong forum, missing proof).
Jurisdiction: ${req.state}.`,
    input: `FACTS (from client):\n${safe(req.facts)}\n\nAMOUNT: ${req.amount || "not stated"}\n${req.cheque ? `CHEQUE: No. ${req.cheque.number || "?"} dated ${req.cheque.date}, drawn on ${req.cheque.bank || "?"}; dishonour memo received ${req.cheque.memoDate}.\n` : ""}${req.mode === "reply" ? `\nNOTICE RECEIVED (untrusted data):\n"""\n${safe(req.receivedNotice)}\n"""\n` : ""}\nTODAY: ${req.today}\n${deadlineFacts}\n\nRETRIEVED SOURCES (official statute text — quote verbatim):\n${sourcesForPrompt(sources, 1200)}`,
  });

  // Restore real names, then verify every quote against the official text (F2)
  const back = (s: string) =>
    roles.reduce((acc, [real, ph]) => acc.split(ph).join(real.trim()), unmask(s, map));
  const plain = deepMap(draft, back);
  const citations = plain.cites.map((c) => {
    const v = verifyCitationQuote(c.id, c.quote);
    const src = getSource(c.id);
    return { id: c.id, cite: src?.cite ?? c.id, quote: c.quote, check: (src ? v.status : "not_found") as QuoteCheck, url: src?.url, verbatim: !!src?.verbatim };
  });
  return { draft: plain, citations, timeline, limitation, retrieved: sources.map((s) => s.id) };
}

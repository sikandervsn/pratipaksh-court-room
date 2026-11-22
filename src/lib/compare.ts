// ───────── F10: Draft comparison — what changed between v1 and the other side's v2, and does it hurt you? ─────────
import "server-only";
import { diffWords } from "diff";
import { z } from "zod";
import { runAgent } from "./claude";
import { embedQueries, getSource, search, sourcesForPrompt, verifyCitationQuote, type Statute } from "./library";
import { deepMap, maskDocument, maskWith, unmask } from "./privacy";
import type { QuoteCheck } from "./types";

export interface Clause {
  key: string; // "3" or "3.1" or "P4"
  title: string;
  text: string;
}
export type Seg = { t: "same" | "add" | "del"; v: string };
export interface Pair {
  key: string;
  title: string;
  kind: "unchanged" | "modified" | "added" | "removed";
  before: string;
  after: string;
  segs: Seg[];
}

const HEAD = /^\s*(?:clause\s+)?(\d{1,2}(?:\.\d{1,2})*)\s*[.)]\s+(.*)$/i;

/** Split a contract into clauses by its numbering ("1.", "2.3", "Clause 4)") — falls back to paragraphs. */
export function segment(doc: string): Clause[] {
  const lines = doc.replace(/\r/g, "").split("\n");
  const out: Clause[] = [];
  let cur: Clause | null = null;
  const preamble: string[] = [];
  for (const line of lines) {
    const m = HEAD.exec(line);
    if (m) {
      if (cur) out.push(cur);
      const title = (m[2].match(/^([A-Z][A-Z &/-]{2,40}):/)?.[1] ?? m[2].split(/[.:—-]/)[0]).trim().slice(0, 60);
      cur = { key: m[1], title, text: line.trim() };
    } else if (cur) cur.text += "\n" + line;
    else preamble.push(line);
  }
  if (cur) out.push(cur);
  if (out.length >= 3) {
    const pre = preamble.join("\n").trim();
    return [...(pre ? [{ key: "Preamble", title: "Preamble", text: pre }] : []), ...out.map((c) => ({ ...c, text: c.text.trim() }))];
  }
  return doc
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p, i) => ({ key: `P${i + 1}`, title: p.slice(0, 50), text: p }));
}

const toks = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
const jaccard = (a: string, b: string) => {
  const A = toks(a),
    B = toks(b);
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / Math.max(1, A.size + B.size - i);
};

/** Align clauses by number when both drafts are numbered, else by text similarity; then word-diff each pair. */
export function align(v1: string, v2: string): Pair[] {
  const a = segment(v1);
  const b = segment(v2);
  const used = new Set<number>();
  const pairs: Pair[] = [];
  for (const c of a) {
    let j = b.findIndex((x, k) => !used.has(k) && x.key === c.key && jaccard(x.text, c.text) > 0.2);
    if (j < 0) {
      let best = -1,
        bs = 0.35;
      b.forEach((x, k) => {
        if (used.has(k)) return;
        const s = jaccard(x.text, c.text);
        if (s > bs) {
          bs = s;
          best = k;
        }
      });
      j = best;
    }
    if (j < 0) {
      pairs.push({ key: c.key, title: c.title, kind: "removed", before: c.text, after: "", segs: [{ t: "del", v: c.text }] });
      continue;
    }
    used.add(j);
    const after = b[j].text;
    // Ignore pure renumbering ("13. Both parties…" → "14. Both parties…").
    const strip = (s: string) => s.replace(/^\s*(?:clause\s+)?\d{1,2}(?:\.\d{1,2})*\s*[.)]\s*/i, "");
    // Bounded diff (no CPU blow-up on huge, totally different clauses): fall back to whole-clause replace.
    const parts = diffWords(c.text, after, { timeout: 1500 });
    const segs: Seg[] = parts
      ? parts.map((p) => ({ t: p.added ? "add" : p.removed ? "del" : "same", v: p.value }))
      : [
          { t: "del", v: c.text },
          { t: "add", v: after },
        ];
    const changed = strip(c.text).trim() !== strip(after).trim() && segs.some((s) => s.t !== "same" && s.v.trim());
    pairs.push({ key: b[j].key, title: b[j].title || c.title, kind: changed ? "modified" : "unchanged", before: c.text, after, segs });
  }
  b.forEach((x, k) => {
    if (!used.has(k)) pairs.push({ key: x.key, title: x.title, kind: "added", before: "", after: x.text, segs: [{ t: "add", v: x.text }] });
  });
  return pairs;
}

const AssessSchema = z.object({
  changes: z.array(
    z.object({
      key: z.string().describe("The clause key exactly as given"),
      effect: z.enum(["hurts_you", "helps_you", "neutral"]),
      severity: z.number().int().min(1).max(10),
      summary: z.string().describe("One or two sentences: what the change does in practice"),
      counterProposal: z.string().describe("What to send back — exact wording if possible; empty if acceptable"),
      cites: z.array(z.object({ id: z.string(), quote: z.string().describe("EXACT words from the source") })),
    }),
  ),
  overall: z.object({
    recommendation: z.enum(["accept", "negotiate", "reject"]),
    summary: z.string(),
    topConcerns: z.array(z.string()),
    hiddenChanges: z.array(z.string()).describe("Subtle changes that are easy to miss (a single word like 'may'→'shall', a removed 'reasonable', a changed number)"),
  }),
});

export interface CompareResult {
  pairs: Pair[];
  stats: { modified: number; added: number; removed: number; unchanged: number };
  assessment: z.infer<typeof AssessSchema> & {
    changes: (z.infer<typeof AssessSchema>["changes"][number] & { citations: { id: string; cite: string; quote: string; check: QuoteCheck; url?: string }[] })[];
  };
  privacyMasked: number;
}

export async function compareDrafts(v1: string, v2: string, side: string, state: string): Promise<CompareResult> {
  const pairs = align(v1, v2);
  const changed = pairs.filter((p) => p.kind !== "unchanged");
  const stats = {
    modified: pairs.filter((p) => p.kind === "modified").length,
    added: pairs.filter((p) => p.kind === "added").length,
    removed: pairs.filter((p) => p.kind === "removed").length,
    unchanged: pairs.filter((p) => p.kind === "unchanged").length,
  };
  if (!changed.length) {
    return { pairs, stats, assessment: { changes: [], overall: { recommendation: "accept", summary: "No textual changes were found between the two drafts.", topConcerns: [], hiddenChanges: [] } }, privacyMasked: 0 };
  }

  // One mask for both drafts so placeholders stay consistent.
  const { map, report } = maskDocument(`${v1}\n\n${v2}`);
  const m = (s: string) => maskWith(s, map);

  const changeBlock = changed
    .slice(0, 30)
    .map((p) => {
      const marked = p.segs.map((s) => (s.t === "add" ? `{+${s.v}+}` : s.t === "del" ? `[-${s.v}-]` : s.v)).join("");
      return `[${p.key}] ${p.title} — ${p.kind.toUpperCase()}\n${m(marked).slice(0, 2500)}`;
    })
    .join("\n\n");

  const queries = changed.slice(0, 12).map((p) => m(`${p.title}. ${p.after || p.before}`).slice(0, 1000));
  const vectors = await embedQueries(queries);
  const picked = new Map<string, Statute>();
  queries.forEach((q, i) => search(q, { k: 3, vector: vectors?.[i] ?? null }).forEach((h) => picked.set(h.statute.id, h.statute)));

  const assessment = await runAgent({
    schema: AssessSchema,
    role: `ROLE: NEGOTIATION COUNSEL for the ${side || "user (the party who sent v1)"}. The other side returned a marked-up draft. In the diff, {+text+} was ADDED by them and [-text-] was DELETED by them. For EVERY changed clause decide whether it hurts or helps the ${side || "user"}, how much, and what to counter-propose. Pay special attention to small but decisive edits (may→shall, deleted "reasonable", changed numbers/days/amounts, new carve-outs). Ground legal points in RETRIEVED SOURCES with exact quotes. Jurisdiction: ${state}.`,
    input: `CHANGES (untrusted document data):\n${changeBlock}\n\nRETRIEVED SOURCES (official statute text — quote verbatim):\n${sourcesForPrompt([...picked.values()].slice(0, 12), 1000)}`,
  });

  const plain = deepMap(assessment, (s) => unmask(s, map));
  const changes = plain.changes.map((c) => ({
    ...c,
    citations: c.cites.map((x) => {
      const v = verifyCitationQuote(x.id, x.quote);
      const src = getSource(x.id);
      return { id: x.id, cite: src?.cite ?? x.id, quote: x.quote, check: (src ? v.status : "not_found") as QuoteCheck, url: src?.url };
    }),
  }));
  return { pairs, stats, assessment: { ...plain, changes }, privacyMasked: report.count };
}

// ───────── F1: Statute library — hybrid retrieval over official India Code text ─────────
// ───────── F2: Exact-quote verification against that text ─────────
// Server-only. Data built by scripts/build-library.mjs from indiacode.gov.in (Govt. of India).
import "server-only";
import statutesJson from "@/data/statutes.json";
import chunksJson from "@/data/statute-chunks.json";
import vectorsJson from "@/data/statute-vectors.json";
import { CORPUS, CORPUS_BY_ID, type LegalSource } from "./corpus";

export interface Statute {
  id: string; // e.g. "ICA-27"
  code: string;
  act: string;
  section: string;
  heading: string;
  text: string; // official text (cleaned of markup)
  notes: string[]; // amendment footnotes
  url: string;
}
interface Chunk {
  sid: string;
  part: number;
  text: string;
}

export const STATUTES = statutesJson as Statute[];
const CHUNKS = chunksJson as Chunk[];
export const STATUTE_BY_ID: Record<string, Statute> = Object.fromEntries(STATUTES.map((s) => [s.id, s]));

export const ACTS = Object.values(
  STATUTES.reduce<Record<string, { code: string; act: string; sections: number }>>((a, s) => {
    a[s.code] ??= { code: s.code, act: s.act, sections: 0 };
    a[s.code].sections++;
    return a;
  }, {}),
);

// ───────── keyword index (BM25) ─────────
const STOP = new Set(
  "the of and to in a an or be by any such shall for is as on with that which this it from at under not other than may has have been are was were its his her their he she they no all if where when who whom whose there thereof therein said same upon into within".split(" "),
);
const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ings|ing|ed|es|s)$/, "") || w);

const docTokens = CHUNKS.map((c) => tokenize(c.text));
const avgLen = docTokens.reduce((a, t) => a + t.length, 0) / Math.max(1, docTokens.length);
const df = new Map<string, number>();
const tfs = docTokens.map((toks) => {
  const tf = new Map<string, number>();
  for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
  for (const t of tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  return tf;
});
// Plain-language → statutory vocabulary (lay users and contracts rarely use the Act's own words).
const SYNONYMS: [RegExp, string][] = [
  [/non[- ]?compete|restrictive covenant|restraint|join (a )?competitor|work for (a )?competitor/i, "restrained exercising lawful profession trade business agreement void"],
  [/\bdeposit\b|advance rent/i, "security deposit compensation lessee lessor"],
  [/landlord|owner of (the )?(flat|house|premises)/i, "lessor"],
  [/tenant|renter/i, "lessee"],
  [/evict|throw (me )?out|vacate|notice to quit/i, "determination lease notice quit possession"],
  [/salary|pay ?cheque|full and final|f ?& ?f|wages?/i, "wages payment time limit employee deductions"],
  [/fired|terminated|sacked|dismiss/i, "dismissed removed retrenched employee"],
  [/resign/i, "resigned employee"],
  [/cheque bounce|bounced cheque|cheque (was )?(returned|dishonou?red)|cheque return/i, "dishonour cheque insufficiency funds drawer notice demand"],
  [/penalty|late fee|fine per day|liquidated damages|forfeit/i, "penalty stipulated breach reasonable compensation sum named"],
  [/arbitrat/i, "arbitrator appointment arbitration agreement"],
  [/one[- ]?sided|unfair term|unconscionable/i, "unfair contract consumer terms"],
  [/refund|money back/i, "repayment refund compensation"],
  [/stamp|e-?stamp|stamp paper/i, "instrument duly stamped chargeable duty"],
  [/regist(er|ration)/i, "registration compulsory registrable documents"],
  [/privacy|personal data|monitor/i, "personal data consent data fiduciary processing"],
  [/time ?limit|deadline|limitation|too late/i, "period limitation prescribed"],
  [/waive|give up (my )?right/i, "restraint legal proceedings extinguishes rights"],
  [/indemn/i, "indemnity contract indemnify loss"],
  [/court|sue|lawsuit/i, "legal proceedings suit"],
  [/cheat|fraud|misrepresent/i, "cheating fraud dishonestly inducing"],
  [/loan|lent|borrow/i, "money lent debt liability repayment"],
  [/interest rate|interest at/i, "interest"],
];
export function expandQuery(q: string): string {
  const extra = SYNONYMS.filter(([re]) => re.test(q)).map(([, add]) => add);
  return extra.length ? `${q} ${extra.join(" ")}` : q;
}

function bm25(query: string, allow?: Set<string>): Map<number, number> {
  const q = [...new Set(tokenize(expandQuery(query)))];
  const N = CHUNKS.length;
  const scores = new Map<number, number>();
  for (let i = 0; i < N; i++) {
    if (allow && !allow.has(CHUNKS[i].sid.split("-")[0])) continue;
    let s = 0;
    const tf = tfs[i];
    for (const t of q) {
      const f = tf.get(t);
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (docTokens[i].length / avgLen))));
    }
    if (s > 0) scores.set(i, s);
  }
  return scores;
}

// ───────── vector index (Gemini embeddings, int8) ─────────
const V = vectorsJson as { dims: number; count: number; b64: string; model: string };
const VEC = V.count === CHUNKS.length ? new Int8Array(Buffer.from(V.b64, "base64").buffer.slice(0)) : null;
const DIMS = V.dims;

export async function embedQueries(queries: string[]): Promise<number[][] | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || !VEC || !queries.length) return null;
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: V.model, input: queries.map((q) => q.slice(0, 4000)), dimensions: DIMS }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { data: { embedding: number[] }[] };
    return j.data.map((d) => {
      const n = Math.sqrt(d.embedding.reduce((a, x) => a + x * x, 0)) || 1;
      return d.embedding.map((x) => x / n);
    });
  } catch {
    return null; // keyword-only fallback
  }
}

function cosineAll(q: number[], allow?: Set<string>): Map<number, number> {
  const out = new Map<number, number>();
  if (!VEC) return out;
  for (let i = 0; i < CHUNKS.length; i++) {
    if (allow && !allow.has(CHUNKS[i].sid.split("-")[0])) continue;
    let s = 0;
    const off = i * DIMS;
    for (let j = 0; j < DIMS; j++) s += q[j] * VEC[off + j];
    out.set(i, s / 127);
  }
  return out;
}

export interface Hit {
  statute: Statute;
  chunk: string;
  score: number;
  via: ("keyword" | "meaning")[];
}

/** Hybrid search: BM25 + embeddings, fused with Reciprocal Rank Fusion. Deduplicated by section. */
export function search(query: string, opts: { k?: number; acts?: string[]; vector?: number[] | null } = {}): Hit[] {
  const k = opts.k ?? 8;
  const allow = opts.acts?.length ? new Set(opts.acts) : undefined;
  const rank = (m: Map<number, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 60);
  const kw = rank(bm25(query, allow));
  const vec = opts.vector ? rank(cosineAll(opts.vector, allow)) : [];
  const fused = new Map<number, { s: number; via: Set<"keyword" | "meaning"> }>();
  kw.forEach(([i], r) => fused.set(i, { s: (fused.get(i)?.s ?? 0) + 1 / (60 + r), via: new Set(["keyword"]) }));
  vec.forEach(([i], r) => {
    const cur = fused.get(i) ?? { s: 0, via: new Set<"keyword" | "meaning">() };
    cur.s += 1 / (60 + r);
    cur.via.add("meaning");
    fused.set(i, cur);
  });
  const seen = new Set<string>();
  const hits: Hit[] = [];
  for (const [i, { s, via }] of [...fused.entries()].sort((a, b) => b[1].s - a[1].s)) {
    const st = STATUTE_BY_ID[CHUNKS[i].sid];
    if (!st || seen.has(st.id)) continue;
    seen.add(st.id);
    hits.push({ statute: st, chunk: CHUNKS[i].text, score: s, via: [...via] });
    if (st.text.length > 1400) rememberPassage(st.id, CHUNKS[i].text);
    if (hits.length >= k) break;
  }
  return hits;
}

/** Direct lookup like "ICA 27", "s. 138 NI Act", "BNS 318". */
export function lookupSection(q: string): Statute | undefined {
  const m = q.toUpperCase().match(/\b(ICA|TPA|SRA|LIM|ARB|CPA|NIA|REG|STAMP|COW|DPDP|BNSS|BNS|BSA|IT)\W*(?:S(?:ECTION)?\.?\s*)?(\d{1,3}[A-Z]{0,2})\b/);
  return m ? STATUTE_BY_ID[`${m[1]}-${m[2]}`] : undefined;
}

// ───────── unified source lookup (official statute text > curated summary) ─────────
export interface Source {
  id: string;
  kind: "statute" | "judgment" | "summary";
  cite: string;
  title: string;
  text: string;
  verbatim: boolean; // true = official text, quotes can be checked exactly
  url?: string;
}

export function getSource(id: string): Source | undefined {
  const st = STATUTE_BY_ID[id];
  if (st) return { id, kind: "statute", cite: `${st.act}, s. ${st.section}`, title: st.heading, text: st.text, verbatim: true, url: st.url };
  const c: LegalSource | undefined = CORPUS_BY_ID[id];
  if (c) return { id, kind: c.kind === "judgment" ? "judgment" : "summary", cite: c.cite, title: c.title, text: c.text, verbatim: false };
  return undefined;
}

export const JUDGMENTS = CORPUS.filter((c) => c.kind === "judgment");

// ───────── F2: quote verification ─────────
const normQ = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"‘’'`]/g, "")
    .replace(/[—–-]+/g, "-")
    .replace(/[^a-z0-9\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export type QuoteStatus = "exact" | "close" | "not_found" | "summary" | "missing";

/**
 * Checks that `quote` really appears in `text`.
 * exact: normalised substring. close: ≥ 85% of the quote's words appear as one contiguous run
 * (tolerates OCR/punctuation/ellipsis differences). Otherwise not_found.
 */
export function checkQuote(text: string, quote: string | undefined, verbatim = true): { status: QuoteStatus; coverage: number } {
  if (!quote || quote.trim().length < 8) return { status: "missing", coverage: 0 };
  if (!verbatim) {
    const ok = normQ(text).includes(normQ(quote));
    return { status: ok ? "summary" : "not_found", coverage: ok ? 1 : 0 };
  }
  const T = normQ(text);
  // Lawyer-style elided quotes ("… shall be void … unless …"): every part must appear, in order.
  const parts = quote.split(/\.{3}|…/).map((p) => normQ(p)).filter((p) => p.split(" ").length >= 4);
  if (parts.length > 1) {
    let from = 0;
    const ok = parts.every((p) => {
      const at = T.indexOf(p, from);
      if (at < 0) return false;
      from = at + p.length;
      return true;
    });
    if (ok) return { status: "close", coverage: 1 };
  }
  const Q = normQ(quote.replace(/\.{3}|…/g, " "));
  if (T.includes(Q)) return { status: "exact", coverage: 1 };
  // Spacing-insensitive match ("any one" vs "anyone", "sub-section" vs "sub section").
  if (Q.length >= 20 && T.replace(/[\s-]/g, "").includes(Q.replace(/[\s-]/g, ""))) return { status: "close", coverage: 1 };
  // longest common contiguous run of words
  const tw = T.split(" ");
  const qw = Q.split(" ");
  let best = 0;
  const prev = new Array(qw.length + 1).fill(0);
  for (let i = 1; i <= tw.length; i++) {
    let diag = 0;
    for (let j = 1; j <= qw.length; j++) {
      const tmp = prev[j];
      prev[j] = tw[i - 1] === qw[j - 1] ? diag + 1 : 0;
      if (prev[j] > best) best = prev[j];
      diag = tmp;
    }
  }
  const coverage = best / qw.length;
  return { status: coverage >= 0.85 ? "close" : "not_found", coverage };
}

export function verifyCitationQuote(id: string, quote?: string) {
  const src = getSource(id);
  if (!src) return { src: undefined, status: "not_found" as QuoteStatus, coverage: 0 };
  // Curated summaries (judgments, model laws) can't be quoted verbatim — accept summary text or no quote.
  if (!src.verbatim) {
    if (!quote) return { src, status: "summary" as QuoteStatus, coverage: 1 };
    const r = checkQuote(src.text, quote, false);
    return { src, status: r.status === "not_found" ? ("summary" as QuoteStatus) : r.status, coverage: r.coverage };
  }
  const r = checkQuote(src.text, quote, true);
  return { src, ...r };
}

/** Format retrieved sources for an agent prompt (verbatim text, trimmed). */
/** Remembers which passage of a long section matched, so prompts show the relevant part, not just the start. */
const matchedPassage = new Map<string, string>();
export function rememberPassage(id: string, chunk: string) {
  const body = chunk.split("\n").slice(1).join("\n").trim(); // drop the "Act, s. N — heading" header line
  if (body) matchedPassage.set(id, body);
  if (matchedPassage.size > 5000) matchedPassage.clear();
}

/** Format retrieved sources for an agent prompt (verbatim text; for long sections, the matched passage). */
export function sourcesForPrompt(statutes: Statute[], maxChars = 1400): string {
  return statutes
    .map((s) => {
      let body = s.text;
      if (s.text.length > maxChars) {
        const passage = matchedPassage.get(s.id);
        body = passage && passage.length <= maxChars + 400 ? `… ${passage} …` : s.text.slice(0, maxChars) + " …";
      }
      return `[${s.id}] ${s.act}, s. ${s.section} — ${s.heading}\n"""${body}"""`;
    })
    .join("\n\n");
}

export function judgmentsForPrompt(): string {
  return JUDGMENTS.map((j) => `[${j.id}] ${j.title}, ${j.cite} — HOLDING (summary, not verbatim): ${j.text}`).join("\n");
}

/** Curated non-statute sources that are NOT in the official library (e.g. Model Tenancy Act, Constitution, State Acts). */
export function curatedForPrompt(): string {
  return CORPUS.filter((c) => c.kind !== "judgment" && !STATUTE_BY_ID[c.id])
    .map((c) => `[${c.id}] ${c.cite} — ${c.title} (summary, not verbatim): ${c.text}`)
    .join("\n");
}

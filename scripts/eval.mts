// ───────── F3: Evaluation runner ─────────
// Runs every test contract through the REAL pipeline and scores it deterministically.
//   npm run eval            (all cases)
//   npm run eval -- nda gym (selected cases)
// Writes src/data/eval-results.json, shown on the "Evaluation" tab.
import fs from "node:fs";
import path from "node:path";

process.loadEnvFile(path.resolve(".env.local"));

const { CASES } = await import("../src/eval/cases");
const { runHearing } = await import("../src/lib/pipeline");
const { servingModel } = await import("../src/lib/claude");

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const only = process.argv.slice(2);
const cases = only.length ? CASES.filter((c) => only.includes(c.id)) : CASES;

type CaseResult = {
  id: string;
  title: string;
  ok: boolean;
  error?: string;
  seconds: number;
  expected: number;
  caught: number;
  missed: string[];
  safe: number;
  falseAlarms: string[];
  winProbability?: number;
  consistency?: { runs: number[]; spread: number };
  citations: { total: number; statute: number; exact: number; close: number; misquoted: number; fabricated: number; verified: number; caseLaw: number };
  docQuotes: { total: number; found: number };
  retrieved: number;
};

const results: CaseResult[] = [];
for (const c of cases) {
  const t0 = Date.now();
  process.stdout.write(`▶ ${c.id} … `);
  try {
    const h = await runHearing(c.doc, c.side, () => {}, { jurisdiction: c.state });
    const attackedClauses = new Set(h.issues.map((i) => i.attack.clauseId));
    const flagged = h.clerk.clauses.filter((cl) => cl.risk === "high" || cl.risk === "medium" || attackedClauses.has(cl.id));
    const flaggedText = flagged.map((cl) => norm(cl.text)).join(" | ");
    const attackText = norm(h.issues.map((i) => `${i.attack.docQuote ?? ""} ${i.attack.title}`).join(" | "));
    const adm = h.clerk.admissibility;
    const admFlagged = !!adm && (adm.registration === "required_not_registered" || adm.stampDuty === "likely_unpaid");
    const caught = c.expect.filter((e) => (e.via === "admissibility" && admFlagged) || flaggedText.includes(norm(e.anchor)) || attackText.includes(norm(e.anchor)));
    const high = h.clerk.clauses.filter((cl) => cl.risk === "high");
    const falseAlarms = c.safe.filter((s) => high.some((cl) => norm(cl.text).includes(norm(s.anchor))) && !c.expect.some((e) => high.some((cl) => norm(cl.text).includes(norm(e.anchor)) && norm(cl.text).includes(norm(s.anchor)))));
    const L = h.ledger;
    results.push({
      id: c.id,
      title: c.title,
      ok: true,
      seconds: Math.round((Date.now() - t0) / 1000),
      expected: c.expect.length,
      caught: caught.length,
      missed: c.expect.filter((e) => !caught.includes(e)).map((e) => e.issue),
      safe: c.safe.length,
      falseAlarms: falseAlarms.map((s) => s.what),
      winProbability: h.judge.winProbability,
      consistency: h.consistency ? { runs: h.consistency.runs, spread: h.consistency.spread } : undefined,
      citations: {
        total: L.length,
        statute: L.filter((l) => l.verbatim).length,
        caseLaw: L.filter((l) => l.verbatim === false).length,
        exact: L.filter((l) => l.quoteCheck === "exact").length,
        close: L.filter((l) => l.quoteCheck === "close").length,
        misquoted: L.filter((l) => l.status === "misquoted").length,
        fabricated: L.filter((l) => l.status === "fabricated").length,
        verified: L.filter((l) => l.status === "verified").length,
      },
      docQuotes: { total: h.issues.length, found: h.issues.filter((i) => i.attack.docQuoteFound).length },
      retrieved: h.retrieval?.sections.length ?? 0,
    });
    const r = results.at(-1)!;
    console.log(`caught ${r.caught}/${r.expected} · false alarms ${r.falseAlarms.length}/${r.safe} · ${r.winProbability}% · statute quotes ${r.citations.exact + r.citations.close}/${r.citations.statute} (+${r.citations.caseLaw} case-law) · ${r.seconds}s`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    results.push({ id: c.id, title: c.title, ok: false, error: msg, seconds: Math.round((Date.now() - t0) / 1000), expected: c.expect.length, caught: 0, missed: [], safe: c.safe.length, falseAlarms: [], citations: { total: 0, statute: 0, exact: 0, close: 0, misquoted: 0, fabricated: 0, verified: 0, caseLaw: 0 }, docQuotes: { total: 0, found: 0 }, retrieved: 0 });
    console.log(`FAILED: ${msg}`);
  }
}

const outFile = path.resolve("src/data/eval-results.json");
let merged = results;
if (only.length && fs.existsSync(outFile)) {
  const prev = JSON.parse(fs.readFileSync(outFile, "utf8")) as { results: CaseResult[] };
  merged = [...prev.results.filter((r) => !only.includes(r.id)), ...results];
}
const ok = merged.filter((r) => r.ok);
const sum = (f: (r: CaseResult) => number) => ok.reduce((a, r) => a + f(r), 0);
const expected = sum((r) => r.expected);
const safe = sum((r) => r.safe);
const cites = sum((r) => r.citations.total);
const statuteCites = sum((r) => r.citations.statute);
const spreads = ok.filter((r) => r.consistency && r.consistency.runs.length > 1).map((r) => r.consistency!.spread);
const summary = {
  runAt: new Date().toISOString(),
  model: servingModel(),
  judgeRuns: Number(process.env.JUDGE_RUNS ?? 3),
  cases: merged.length,
  completed: ok.length,
  recall: expected ? sum((r) => r.caught) / expected : null,
  falseAlarmRate: safe ? sum((r) => r.falseAlarms.length) / safe : null,
  quoteMatchRate: statuteCites ? sum((r) => r.citations.exact + r.citations.close) / statuteCites : null,
  misquoteRate: statuteCites ? sum((r) => r.citations.misquoted) / statuteCites : null,
  statuteCitations: statuteCites,
  caseLawCitations: sum((r) => r.citations.caseLaw),
  fabricated: sum((r) => r.citations.fabricated),
  verifiedRate: cites ? sum((r) => r.citations.verified) / cites : null,
  docQuoteRate: sum((r) => r.docQuotes.total) ? sum((r) => r.docQuotes.found) / sum((r) => r.docQuotes.total) : null,
  avgSpread: spreads.length ? spreads.reduce((a, b) => a + b, 0) / spreads.length : null,
  avgSeconds: ok.length ? sum((r) => r.seconds) / ok.length : null,
  controlScore: ok.find((r) => r.id === "fair-rent")?.winProbability ?? null,
};

fs.writeFileSync(outFile, JSON.stringify({ summary, results: merged }, null, 2));
console.log("\nSUMMARY", JSON.stringify(summary, null, 2));

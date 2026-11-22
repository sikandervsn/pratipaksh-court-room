import { FlaskConical } from "lucide-react";
import results from "@/data/eval-results.json";

type R = {
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
  citations: { total: number; statute?: number; exact: number; close: number; misquoted: number; fabricated: number; verified: number; caseLaw?: number };
  docQuotes: { total: number; found: number };
  retrieved: number;
};
type S = {
  runAt: string;
  model: string;
  judgeRuns: number;
  cases: number;
  completed: number;
  recall: number | null;
  falseAlarmRate: number | null;
  quoteMatchRate: number | null;
  misquoteRate: number | null;
  fabricated: number;
  verifiedRate: number | null;
  docQuoteRate: number | null;
  avgSpread: number | null;
  avgSeconds: number | null;
  controlScore: number | null;
};

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

function Metric({ label, value, hint, good }: { label: string; value: string; hint: string; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4">
      <div className="text-xs font-bold uppercase tracking-wider text-ink/50">{label}</div>
      <div className={`mt-1 font-serif text-3xl font-bold ${good === undefined ? "" : good ? "text-ally" : "text-warn"}`}>{value}</div>
      <div className="mt-0.5 text-xs text-ink/55">{hint}</div>
    </div>
  );
}

export function Evaluation() {
  const data = results as unknown as { summary: S | null; results: R[] };
  const s = data.summary;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
          <FlaskConical className="h-5 w-5 text-gold" /> Evaluation: does it actually work?
        </h2>
        <p className="mt-1 text-sm text-ink/65">
          {s ? s.cases : 10} test contracts (rental, employment, NDA, freelance, builder–buyer, loan, gym, leave &amp; licence, vendor, plus one deliberately <b>fair</b> control), each annotated with the clauses an Indian practitioner would flag. Every case runs through the real pipeline and is scored by fixed rules in code, not by an AI. Re-run it with <code className="rounded bg-paper-2 px-1">npm run eval</code>.
        </p>
        {s && (
          <p className="mt-2 text-xs text-ink/45">
            Last run {new Date(s.runAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · model {s.model} · Judge ×{s.judgeRuns} · {s.completed}/{s.cases} cases completed
          </p>
        )}
      </section>

      {!s ? (
        <p className="rounded-2xl border border-warn/30 bg-warn-soft p-4 text-sm">No evaluation has been run yet. Run <code>npm run eval</code>.</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Risk recall" value={pct(s.recall)} hint="Known risky clauses that were flagged" good={(s.recall ?? 0) >= 0.8} />
            <Metric label="False alarms" value={pct(s.falseAlarmRate)} hint="Fair clauses wrongly marked high-risk" good={(s.falseAlarmRate ?? 1) <= 0.15} />
            <Metric label="Quotes verified" value={pct(s.quoteMatchRate)} hint="Statute citations whose quote was found word-for-word in the official India Code text" good={(s.quoteMatchRate ?? 0) >= 0.8} />
            <Metric label="Fabricated citations" value={String(s.fabricated)} hint="Non-existent sources (all blocked)" good={s.fabricated === 0} />
            <Metric label="Support verified" value={pct(s.verifiedRate)} hint="Citations the Verifier found actually support the claim" />
            <Metric label="Clause quotes found" value={pct(s.docQuoteRate)} hint="Opposing counsel's quotes found verbatim in the contract" />
            <Metric label="Judge spread" value={s.avgSpread == null ? "—" : `±${(s.avgSpread / 2).toFixed(1)} pts`} hint="Average disagreement between independent Judge runs" good={(s.avgSpread ?? 99) <= 10} />
            <Metric label="Fair control contract" value={s.controlScore == null ? "—" : `${s.controlScore}%`} hint="Score for the balanced agreement (should be high)" good={(s.controlScore ?? 0) >= 70} />
          </div>

          <section className="overflow-x-auto rounded-2xl border border-ink/10 bg-white p-4">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-ink/50">
                <tr>
                  <th className="px-2 py-2">Case</th>
                  <th className="px-2 py-2">Caught</th>
                  <th className="px-2 py-2">False alarms</th>
                  <th className="px-2 py-2">Score</th>
                  <th className="px-2 py-2">Judge runs</th>
                  <th className="px-2 py-2">Statute quotes ✓</th>
                  <th className="px-2 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((r) => (
                  <tr key={r.id} className="border-t border-ink/5 align-top">
                    <td className="px-2 py-2">
                      <div className="font-medium">{r.title}</div>
                      {!r.ok && <div className="text-xs text-foe">Failed: {r.error}</div>}
                      {r.missed.length > 0 && <div className="text-xs text-warn">Missed: {r.missed.join("; ")}</div>}
                      {r.falseAlarms.length > 0 && <div className="text-xs text-foe">Over-flagged: {r.falseAlarms.join("; ")}</div>}
                    </td>
                    <td className="px-2 py-2 font-mono">{r.expected ? `${r.caught}/${r.expected}` : "n/a"}</td>
                    <td className="px-2 py-2 font-mono">
                      {r.falseAlarms.length}/{r.safe}
                    </td>
                    <td className="px-2 py-2 font-mono">{r.winProbability ?? "—"}%</td>
                    <td className="px-2 py-2 font-mono text-xs">{r.consistency?.runs.join(", ") ?? "—"}</td>
                    <td className="px-2 py-2 font-mono">
                      {r.citations.exact + r.citations.close}/{r.citations.statute ?? r.citations.total}
                      {r.citations.misquoted > 0 && <span className="text-foe"> ({r.citations.misquoted} misq.)</span>}
                    </td>
                    <td className="px-2 py-2 font-mono">{r.seconds}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

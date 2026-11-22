"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, CircleX, Download, GitCompare, Loader2 } from "lucide-react";
import { RENTAL_SAMPLE } from "@/lib/samples";
import { STATES } from "@/lib/states";

type Seg = { t: "same" | "add" | "del"; v: string };
interface Pair {
  key: string;
  title: string;
  kind: "unchanged" | "modified" | "added" | "removed";
  before: string;
  after: string;
  segs: Seg[];
}
interface Change {
  key: string;
  effect: "hurts_you" | "helps_you" | "neutral";
  severity: number;
  summary: string;
  counterProposal: string;
  citations: { id: string; cite: string; quote: string; check: string; url?: string }[];
}
interface Result {
  pairs: Pair[];
  stats: { modified: number; added: number; removed: number; unchanged: number };
  assessment: { changes: Change[]; overall: { recommendation: "accept" | "negotiate" | "reject"; summary: string; topConcerns: string[]; hiddenChanges: string[] } };
  privacyMasked: number;
}

// Sample: the landlord's "revised" draft quietly changes key words and numbers.
const THEIR_V2 = RENTAL_SAMPLE.replace("Rs. 3,50,000/- (ten months' rent)", "Rs. 3,50,000/- (ten months' rent), non-refundable in case of early exit")
  .replace("refunded within 90 days", "refunded within 120 days")
  .replace("The Landlord may terminate this agreement at any time by giving 15 days' notice without assigning any reason.", "The Landlord may terminate this agreement at any time by giving 7 days' notice without assigning any reason.")
  .replace("penalty of Rs. 1,000/- per day", "penalty of Rs. 1,500/- per day")
  .replace("The Landlord or his agents may enter and inspect the premises at any time without prior notice.", "The Landlord or his agents may enter and inspect the premises at reasonable times.")
  .replace("must be made in writing within 30 days of vacating", "must be made in writing within 15 days of vacating")
  .replace("13. Both parties", "13. PAINTING: The Tenant shall pay painting charges of two months' rent at the time of vacating, irrespective of the condition of the premises.\n\n14. Both parties");

const EFFECT = {
  hurts_you: { label: "Hurts you", cls: "bg-foe text-white" },
  helps_you: { label: "Helps you", cls: "bg-ally text-white" },
  neutral: { label: "Neutral", cls: "bg-ink/15 text-ink" },
};
const REC = { accept: "bg-ally-soft text-ally", negotiate: "bg-warn-soft text-warn", reject: "bg-foe-soft text-foe" };

export function Compare() {
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [side, setSide] = useState("");
  const [state, setState] = useState("Not specified");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const r = await fetch("/api/compare", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ v1, v2, side, state }) });
      const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
      if (!r.ok || j.error) throw new Error(j.error ?? "Comparison failed");
      setRes(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocx() {
    if (!res) return;
    const { Document, Packer, Paragraph, TextRun, InsertedTextRun, DeletedTextRun, HeadingLevel } = await import("docx");
    const date = new Date().toISOString();
    let id = 1;
    const children: InstanceType<typeof Paragraph>[] = [
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Pratipaksh — Draft comparison (their changes as tracked changes)")] }),
      new Paragraph({ children: [new TextRun({ text: `Recommendation: ${res.assessment.overall.recommendation.toUpperCase()} — ${res.assessment.overall.summary}`, bold: true })] }),
    ];
    for (const p of res.pairs) {
      if (p.kind === "unchanged") {
        children.push(new Paragraph({ children: [new TextRun(p.after)] }));
        continue;
      }
      children.push(
        new Paragraph({
          children: p.segs.map((s) =>
            s.t === "add"
              ? new InsertedTextRun({ text: s.v, id: id++, author: "Other side", date })
              : s.t === "del"
                ? new DeletedTextRun({ text: s.v, id: id++, author: "Other side", date })
                : new TextRun(s.v),
          ),
        }),
      );
      const a = res.assessment.changes.find((c) => c.key === p.key);
      if (a) children.push(new Paragraph({ children: [new TextRun({ text: `▶ ${EFFECT[a.effect].label} (${a.severity}/10): ${a.summary}${a.counterProposal ? ` Counter-proposal: ${a.counterProposal}` : ""}`, italics: true, color: "B42318" })] }));
    }
    const blob = await Packer.toBlob(new Document({ features: { trackRevisions: true }, sections: [{ children }] }));
    const el = document.createElement("a");
    el.href = URL.createObjectURL(blob);
    el.download = "draft-comparison-tracked.docx";
    document.body.appendChild(el);
    el.click();
    el.remove();
  }

  const box = "h-56 w-full resize-y rounded-xl border border-ink/15 bg-paper/60 p-3 font-mono text-[12.5px] leading-relaxed outline-none focus:border-gold";
  const changes = res?.assessment.changes ?? [];
  const hurt = changes.filter((c) => c.effect === "hurts_you").length;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
            <GitCompare className="h-5 w-5 text-gold" /> Compare drafts: what did the other side change?
          </h2>
          <button
            onClick={() => {
              setV1(RENTAL_SAMPLE);
              setV2(THEIR_V2);
              setSide("Tenant");
              setState("Karnataka");
            }}
            className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-sm hover:border-gold"
          >
            🏠 Example: landlord&apos;s &quot;revised&quot; draft
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink/60">Your version (v1)</span>
            <textarea value={v1} onChange={(e) => setV1(e.target.value)} maxLength={60000} className={box} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink/60">Their marked-up version (v2)</span>
            <textarea value={v2} onChange={(e) => setV2(e.target.value)} maxLength={60000} className={box} />
          </label>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input value={side} onChange={(e) => setSide(e.target.value)} placeholder="I am the… (e.g. Tenant)" className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm" />
          <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm">
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button onClick={run} disabled={busy || v1.trim().length < 80 || v2.trim().length < 80} className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 font-semibold text-paper disabled:opacity-40 sm:ml-auto">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GitCompare className="h-5 w-5" />} Compare &amp; assess
          </button>
        </div>
        {error && <p className="mt-3 rounded-lg bg-foe-soft px-3 py-2 text-sm text-foe">{error}</p>}
      </section>

      {res && (
        <div className="rise space-y-5">
          <section className="grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm md:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <span className={`inline-block rounded-full px-3 py-1 text-sm font-bold uppercase ${REC[res.assessment.overall.recommendation]}`}>{res.assessment.overall.recommendation}</span>
              <div className="text-sm text-ink/70">
                <b>{res.stats.modified}</b> modified · <b>{res.stats.added}</b> added · <b>{res.stats.removed}</b> removed · {res.stats.unchanged} unchanged
              </div>
              <div className="text-sm font-semibold text-foe">{hurt} change(s) hurt you</div>
              {res.privacyMasked > 0 && <div className="text-xs text-ally">🔒 {res.privacyMasked} personal details masked</div>}
            </div>
            <div>
              <p className="text-ink/80">{res.assessment.overall.summary}</p>
              {res.assessment.overall.hiddenChanges.length > 0 && (
                <div className="mt-3 rounded-xl border border-warn/30 bg-warn-soft p-3">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-warn">
                    <AlertTriangle className="h-3.5 w-3.5" /> Easy-to-miss changes
                  </div>
                  <ul className="list-inside list-disc text-sm">
                    {res.assessment.overall.hiddenChanges.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={downloadDocx} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink">
                <Download className="h-4 w-4" /> Download .docx (their edits as tracked changes)
              </button>
            </div>
          </section>

          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-semibold">Clause by clause</h3>
            <label className="flex items-center gap-2 text-sm text-ink/60">
              <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} /> show unchanged
            </label>
          </div>
          {res.pairs
            .filter((p) => showUnchanged || p.kind !== "unchanged")
            .map((p) => {
              const a = changes.find((c) => c.key === p.key);
              return (
                <article key={p.key + p.kind} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
                  <header className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 py-2.5">
                    <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper">{p.key}</span>
                    <span className="font-semibold">{p.title}</span>
                    <span className="text-xs uppercase text-ink/45">{p.kind}</span>
                    {a && (
                      <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-bold ${EFFECT[a.effect].cls}`}>
                        {EFFECT[a.effect].label} · {a.severity}/10
                      </span>
                    )}
                  </header>
                  <p className="px-4 py-3 text-sm leading-relaxed">
                    {p.segs.map((s, i) =>
                      s.t === "add" ? (
                        <ins key={i} className="rounded bg-ally-soft px-0.5 text-ally no-underline decoration-2">
                          {s.v}
                        </ins>
                      ) : s.t === "del" ? (
                        <del key={i} className="rounded bg-foe-soft px-0.5 text-foe">
                          {s.v}
                        </del>
                      ) : (
                        <span key={i}>{s.v}</span>
                      ),
                    )}
                  </p>
                  {a && (
                    <div className="border-t border-ink/10 bg-paper/60 px-4 py-3 text-sm">
                      <p>{a.summary}</p>
                      {a.counterProposal && (
                        <p className="mt-1.5 rounded-lg bg-white p-2">
                          <b className="text-ally">Send back:</b> {a.counterProposal}
                        </p>
                      )}
                      {a.citations.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {a.citations.map((c, i) => (
                            <span key={i} title={`"${c.quote}"`} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] ${c.check === "not_found" ? "border-foe/30 bg-foe-soft text-foe" : "border-ally/30 bg-ally-soft text-ally"}`}>
                              {c.check === "not_found" ? <CircleX className="h-3 w-3" /> : <BadgeCheck className="h-3 w-3" />} {c.id}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      )}
    </div>
  );
}

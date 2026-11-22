"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileUp,
  Lock,
  BookMarked,
  Quote,
  Gavel,
  Loader2,
  PenLine,
  RotateCcw,
  Scale,
  ScrollText,
  SearchCheck,
  Shield,
  Sparkles,
  Square,
  Swords,
  Volume2,
  Zap,
} from "lucide-react";
import { SAMPLES } from "@/lib/samples";
import { STATES } from "@/lib/states";
import type { AgentName, Hearing, Issue, LedgerEntry, StreamEvent } from "@/lib/types";
import { WinGauge } from "./WinGauge";
import { AdmissibilityCard, AuditLine, ConsistencyBadge, NegotiationMessage, NextSteps, PrivacyPanel, RetrievalPanel, VerdictExplainer } from "./Insights";
import { CitationChip, QUOTE_META, RiskDot, StatusPill, STATUS_META } from "./ui";

const AGENTS: Record<AgentName, { name: string; sub: string; Icon: typeof Swords; tone: string }> = {
  shield: { name: "Privacy Shield", sub: "Masks personal data before any AI sees it", Icon: Lock, tone: "text-ally" },
  librarian: { name: "Librarian", sub: "Retrieves official statute text (India Code)", Icon: BookMarked, tone: "text-ink-2" },
  clerk: { name: "Court Clerk", sub: "Parses parties, clauses, risk triage", Icon: ScrollText, tone: "text-ink" },
  drafter: { name: "Drafter", sub: "Rewrites losing clauses", Icon: PenLine, tone: "text-gold" },
  opponent: { name: "Opposing Counsel · प्रतिपक्ष", sub: "Attacks your position", Icon: Swords, tone: "text-foe" },
  advocate: { name: "Your Advocate", sub: "Builds your defence", Icon: Shield, tone: "text-ally" },
  verifier: { name: "Citation Verifier", sub: "Hallucination firewall", Icon: SearchCheck, tone: "text-ink-2" },
  judge: { name: "The Judge", sub: "Rules & computes win probability", Icon: Scale, tone: "text-gold" },
};

type TraceState = { order: AgentName[]; steps: Partial<Record<AgentName, { status: "running" | "done"; detail?: string }>> };

async function streamPost(url: string, body: unknown, onEvent: (e: StreamEvent) => void) {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Could not reach the Pratipaksh server. Is it running?");
  }
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    let msg = `Server error (${res.status}).`;
    try {
      msg = JSON.parse(t).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line));
      } catch {
        console.warn("Skipping malformed stream line", line.slice(0, 200));
      }
    }
  }
}

export function Courtroom({
  incoming,
  onResult,
}: {
  incoming?: { hearing: Hearing; nonce: number } | null;
  onResult?: (h: Hearing) => Promise<string | null> | void;
}) {
  const [text, setText] = useState("");
  const [side, setSide] = useState("");
  const [state, setState] = useState("Not specified");
  const [busy, setBusy] = useState<false | "hearing" | "fix">(false);
  const [trace, setTrace] = useState<TraceState | null>(null);
  const [hearing, setHearing] = useState<Hearing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ live: boolean; model: string } | null>(null);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // A saved hearing opened from "My hearings"
  useEffect(() => {
    if (!incoming) return;
    setHearing(incoming.hearing);
    setTrace(null);
    setError(null);
    setSaveNote(null);
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
  }, [incoming]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const traceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => {});
  }, []);

  const handleEvent = (e: StreamEvent) => {
    if (e.type === "agent")
      setTrace((t) => {
        const cur = t ?? { order: [], steps: {} };
        const order = cur.order.includes(e.agent) ? cur.order : [...cur.order, e.agent];
        return { order, steps: { ...cur.steps, [e.agent]: { status: e.status, detail: e.detail } } };
      });
    else if (e.type === "result") {
      setHearing(e.hearing);
      if (onResult) {
        setSaveNote("Saving to your account…");
        Promise.resolve(onResult(e.hearing)).then((err) => setSaveNote(err ? `Not saved: ${err}` : "✓ Saved to My hearings"));
      }
    }
    else if (e.type === "error") setError(e.message);
  };

  async function run(kind: "hearing" | "fix") {
    setBusy(kind);
    setError(null);
    setTrace({ order: [], steps: {} });
    setTimeout(() => traceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    const prev = hearing;
    if (kind === "hearing") setHearing(null);
    let gotResult = false;
    let gotError = false;
    try {
      await streamPost(kind === "hearing" ? "/api/hearing" : "/api/fix", kind === "hearing" ? { text, side, state } : { hearing: prev }, (e) => {
        if (e.type === "result") gotResult = true;
        if (e.type === "error") gotError = true;
        handleEvent(e);
      });
      if (!gotResult && !gotError) setError("The hearing was interrupted before the judgment arrived (server timeout or lost connection). Please try again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      if (kind === "fix" && !gotResult && prev) setHearing(prev);
      setBusy(false);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    }
  }

  async function upload(f: File) {
    setError(null);
    if (f.size > 10 * 1024 * 1024) return setError("File too large (max 10 MB).");
    const fd = new FormData();
    fd.append("file", f);
    try {
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({ error: `Upload failed (${r.status}).` }));
      if (j.error) setError(j.error);
      else if (!j.text?.trim()) setError("No text could be read from this file.");
      else setText(j.text);
    } catch {
      setError("Upload failed — could not reach the server.");
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Input ── */}
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-xl font-semibold">1 · File your document</h2>
          {status && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.live ? "bg-ally-soft text-ally" : "bg-gold-soft text-warn"}`}>
              {status.live ? `● LIVE · ${status.model}` : "● DEMO MODE · add an API key in .env.local for live analysis"}
            </span>
          )}
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {SAMPLES.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setText(s.text);
                setSide(s.side);
                setState(s.state);
              }}
              className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-sm hover:border-gold hover:bg-gold-soft"
            >
              {s.label}
            </button>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-ink/25 px-3 py-1.5 text-sm hover:border-gold">
            <FileUp className="h-4 w-4" /> Upload PDF / TXT
            <input
              type="file"
              accept=".pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = ""; // allow re-selecting the same file
                if (f) upload(f);
              }}
            />
          </label>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste a rental agreement, employment contract, NDA, vendor agreement or legal notice…"
          maxLength={60000}
          className="h-56 w-full resize-y rounded-xl border border-ink/15 bg-paper/60 p-4 font-mono text-[13px] leading-relaxed outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
        />
        <p className="mt-1.5 text-xs text-ink/50">
          🔒 Remove names, addresses, ID numbers and account details before pasting. Documents are sent to a third-party AI provider for analysis, and free AI tiers may use inputs to improve their models.
          {text.length > 50000 && <span className="ml-1 font-semibold text-warn">{text.length.toLocaleString()} / 60,000 characters</span>}
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex items-center gap-2 text-sm">
            <span className="whitespace-nowrap font-medium">I am the</span>
            <input
              value={side}
              onChange={(e) => setSide(e.target.value)}
              placeholder="Tenant / Employee / … (auto-detect)"
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 sm:w-56"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="whitespace-nowrap font-medium">State</span>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-lg border border-ink/15 bg-white px-3 py-2 sm:w-48"
              title="Tenancy, stamp duty and many employment rules are State-specific"
            >
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <button
            disabled={!!busy || text.trim().length < 80}
            onClick={() => run("hearing")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-6 py-3 font-semibold text-paper shadow-lg shadow-ink/20 transition hover:bg-ink-2 disabled:cursor-not-allowed disabled:opacity-40 sm:ml-auto"
          >
            {busy === "hearing" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Gavel className="h-5 w-5" />}
            Begin the hearing
          </button>
        </div>
      </section>

      {/* ── Live agent trace ── */}
      {trace && trace.order.length > 0 && (
        <section ref={traceRef} className="rise rounded-2xl border border-ink/10 bg-ink p-5 text-paper shadow-xl sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-gold" /> Courtroom in session {busy && <span className="text-sm font-normal text-paper/60">— agents are deliberating</span>}
          </h2>
          <ol className="space-y-2.5">
            {trace.order.map((a) => {
              const s = trace.steps[a];
              const M = AGENTS[a];
              return (
                <li key={a} className="rise flex items-start gap-3 rounded-xl bg-white/5 p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-paper ${M.tone} ${s?.status === "running" ? "pulse-ring" : ""}`}>
                    <M.Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2">
                      <span className="font-semibold">{M.name}</span>
                      <span className="text-xs text-paper/50">{M.sub}</span>
                    </div>
                    <div className="text-sm text-paper/75">{s?.detail}</div>
                  </div>
                  {s?.status === "running" ? <Loader2 className="h-5 w-5 animate-spin text-gold" /> : <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {error && (
        <div className="rise flex items-start gap-2 rounded-xl border border-foe/30 bg-foe-soft p-4 text-sm text-foe">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {saveNote && hearing && !busy && <p className="-mb-4 text-right text-xs text-ink/50">{saveNote}</p>}
      {hearing && !busy && (
        <div ref={resultsRef}>
          <Results hearing={hearing} onFix={() => run("fix")} />
        </div>
      )}
    </div>
  );
}

function Results({ hearing: h, onFix }: { hearing: Hearing; onFix: () => void }) {
  const ledgerByRef = useMemo(() => Object.fromEntries(h.ledger.map((l) => [l.ref, l])), [h.ledger]);
  const [focusClause, setFocusClause] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/* Verdict */}
      <section className="rise grid gap-6 rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6 md:grid-cols-[280px_1fr]">
        <WinGauge value={h.judge.winProbability} previous={h.previousWinProbability} side={h.clerk.userSide} />
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
            <Gavel className="gavel h-4 w-4 text-gold" /> Judgment · Round {h.round} · {h.clerk.docType}
          </div>
          <h2 className="font-serif text-2xl font-bold leading-snug">{h.judge.headline}</h2>
          <p className="mt-2 text-ink/75">{h.judge.summary}</p>
          <p className="mt-3 text-sm text-ink/55">
            <b>Parties:</b> {h.clerk.parties.join(" vs. ")}
          </p>
          <ConsistencyBadge h={h} />
          <VerdictExplainer h={h} />
          <Actions hearing={h} onFix={onFix} />
        </div>
      </section>

      <PrivacyPanel h={h} />
      <RetrievalPanel h={h} />
      <div className="grid gap-4 lg:grid-cols-2">
        <AdmissibilityCard h={h} />
        <NextSteps h={h} />
      </div>
      <NegotiationMessage h={h} />

      {h.ipcFlags.length > 0 && (
        <section className="rise rounded-2xl border border-warn/30 bg-warn-soft p-5">
          <h3 className="mb-2 flex items-center gap-2 font-semibold text-warn">
            <AlertTriangle className="h-5 w-5" /> This document cites repealed criminal law (replaced 1 July 2024)
          </h3>
          <ul className="space-y-1.5 text-sm">
            {h.ipcFlags.map((f) => (
              <li key={f.match}>
                <span className="font-mono line-through decoration-foe/60">{f.match}</span> → <b className="font-mono">{f.replacement}</b>{" "}
                <span className="text-ink/60">· {f.subject}</span>
                {f.change && <div className="text-xs text-ink/60">↳ {f.change}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Redlines (round 2+) */}
      {h.fixes && h.fixes.length > 0 && (
        <section className="rise">
          <h3 className="mb-3 font-serif text-xl font-semibold">✍️ The Drafter&apos;s redlines</h3>
          <div className="space-y-3">
            {h.fixes.map((f) => (
              <div key={f.clauseId} className="rounded-xl border border-ink/10 bg-white p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper">{f.clauseId}</span>
                  <span className="font-semibold">{f.title}</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <p className="rounded-lg bg-foe-soft p-3 text-sm text-foe/90 line-through decoration-foe/40">{f.original}</p>
                  <p className="rounded-lg bg-ally-soft p-3 text-sm text-ink">{f.revised}</p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink/60">
                  {f.rationale} {f.citations.map((c) => <CitationChip key={c} id={c} />)}
                </div>
                {(f.fallback || f.walkAway) && (
                  <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                    {f.fallback && (
                      <p className="rounded-lg border border-warn/30 bg-warn-soft/60 p-2">
                        <b className="text-warn">Fallback if refused:</b> {f.fallback}
                      </p>
                    )}
                    {f.walkAway && (
                      <p className="rounded-lg border border-foe/30 bg-foe-soft/60 p-2">
                        <b className="text-foe">Walk away if:</b> {f.walkAway}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Clause heatmap */}
      <section className="rise">
        <h3 className="mb-1 font-serif text-xl font-semibold">Clause risk heatmap</h3>
        <p className="mb-3 text-sm text-ink/60">Risk to the {h.clerk.userSide}. Click a clause to read it.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {h.clerk.clauses.map((c) => {
            const bg = { high: "border-foe/40 bg-foe-soft", medium: "border-warn/40 bg-warn-soft", low: "border-gold/40 bg-gold-soft/60", safe: "border-ally/40 bg-ally-soft" }[c.risk];
            return (
              <button
                key={c.id}
                onClick={() => setFocusClause(focusClause === c.id ? null : c.id)}
                className={`rounded-xl border p-3 text-left text-sm transition hover:shadow-md ${bg} ${focusClause === c.id ? "ring-2 ring-ink" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <RiskDot risk={c.risk} />
                  <span className="font-mono text-[11px] text-ink/50">{c.id}</span>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-ink/50">{c.risk}</span>
                </div>
                <div className="mt-1 font-medium leading-snug">{c.title}</div>
              </button>
            );
          })}
        </div>
        {focusClause && (
          <div className="rise mt-3 rounded-xl border border-ink/10 bg-white p-4 text-sm leading-relaxed">
            <b className="font-mono">{focusClause}</b> — {h.clerk.clauses.find((c) => c.id === focusClause)?.text}
          </div>
        )}
      </section>

      {/* Battles */}
      <section>
        <h3 className="mb-1 font-serif text-xl font-semibold">⚔️ The hearing: Opposing Counsel vs. Your Advocate</h3>
        <p className="mb-4 text-sm text-ink/60">Each citation chip is checked. Click one to see the source and the Verifier&apos;s finding.</p>
        <div className="space-y-4">
          {h.issues.map((i, idx) => (
            <IssueCard key={i.attack.id} issue={i} h={h} ledgerByRef={ledgerByRef} delay={idx * 60} />
          ))}
        </div>
      </section>

      <ProofLedger ledger={h.ledger} />
      <AuditLine h={h} />

      <p className="text-center text-xs text-ink/45">
        Pratipaksh is an AI legal-analysis tool, not a lawyer. Its output is not legal advice. Sources are summaries from a curated corpus. Verify them and consult an advocate.
      </p>
    </div>
  );
}

function IssueCard({ issue: i, h, ledgerByRef, delay }: { issue: Issue; h: Hearing; ledgerByRef: Record<string, LedgerEntry>; delay: number }) {
  const w = i.ruling?.winner;
  const verdictCls = w === "user" ? "bg-ally text-white" : w === "opponent" ? "bg-foe text-white" : "bg-gold text-ink";
  const verdictLabel = w === "user" ? `${h.clerk.userSide} wins` : w === "opponent" ? `${h.clerk.opponentSide} wins` : "Split";
  return (
    <article className="rise rounded-2xl [&>footer]:rounded-b-2xl border border-ink/10 bg-white shadow-sm" style={{ animationDelay: `${delay}ms` }}>
      <header className="flex flex-wrap items-center gap-2 border-b border-ink/10 px-4 py-3">
        <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper">{i.attack.clauseId}</span>
        <h4 className="font-semibold">{i.attack.title}</h4>
        <span className="ml-auto flex items-center gap-1 text-xs text-ink/50">
          Severity
          <span className="flex gap-0.5">
            {Array.from({ length: 10 }).map((_, k) => (
              <span key={k} className={`h-2.5 w-1.5 rounded-sm ${k < i.attack.severity ? "bg-foe" : "bg-ink/10"}`} />
            ))}
          </span>
        </span>
      </header>
      <div className="grid md:grid-cols-2">
        <div className="border-b border-ink/10 bg-foe-soft/40 p-4 md:border-r md:border-b-0">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foe">
            <Swords className="h-3.5 w-3.5" /> Opposing counsel
          </div>
          <p className="text-sm leading-relaxed">{i.attack.argument}</p>
          {i.attack.docQuote && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-ink/10 bg-white p-2 text-xs">
              <Quote className="mt-0.5 h-3 w-3 shrink-0 text-ink/40" />
              <span>
                <q className="italic text-ink/80">{i.attack.docQuote}</q>{" "}
                <span className={i.attack.docQuoteFound ? "font-semibold text-ally" : "font-semibold text-foe"}>
                  {i.attack.docQuoteFound ? "✓ found in your document" : "✗ not found in your document"}
                </span>
              </span>
            </p>
          )}
          <p className="mt-2 rounded-lg bg-white/70 p-2 text-xs italic text-ink/70">📍 {i.attack.exploitScenario}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {i.attack.citations.map((c) => (
              <CitationChip key={c} id={c} entry={ledgerByRef[`${i.attack.id}:${c}`]} />
            ))}
          </div>
        </div>
        <div className="bg-ally-soft/40 p-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ally">
            <Shield className="h-3.5 w-3.5" /> Your advocate
            {i.defense && <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-[10px] text-ink/60">{i.defense.strength}</span>}
          </div>
          <p className="text-sm leading-relaxed">{i.defense?.argument ?? "No defense offered."}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {i.defense?.citations.map((c) => (
              <CitationChip key={c} id={c} entry={ledgerByRef[`D-${i.attack.id}:${c}`]} />
            ))}
          </div>
        </div>
      </div>
      {i.ruling && (
        <footer className="flex flex-col gap-2 border-t border-ink/10 bg-paper/70 px-4 py-3 sm:flex-row sm:items-start">
          <span className={`inline-flex w-fit shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${verdictCls}`}>
            <Scale className="h-3.5 w-3.5" /> {verdictLabel}
          </span>
          <p className="text-sm text-ink/80">{i.ruling.reasoning}</p>
        </footer>
      )}
    </article>
  );
}

function ProofLedger({ ledger }: { ledger: LedgerEntry[] }) {
  const counts = ledger.reduce<Record<string, number>>((a, l) => ((a[l.status] = (a[l.status] ?? 0) + 1), a), {});
  const [filter, setFilter] = useState<string>("all");
  const rows = filter === "all" ? ledger : ledger.filter((l) => l.status === filter);
  return (
    <section className="rise rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="flex items-center gap-2 font-serif text-xl font-semibold">
        <SearchCheck className="h-5 w-5 text-gold" /> Proof Ledger
      </h3>
      <p className="mb-4 text-sm text-ink/60">
        Every legal claim carries an exact quote. Code checks the quote word-for-word against the official text, then an independent Verifier checks the source actually supports the claim. Fabricated and misquoted citations carry no weight with the Judge.
      </p>
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === "all" ? "border-ink bg-ink text-paper" : "border-ink/15"}`}>
          All · {ledger.length}
        </button>
        {(["verified", "weak", "contradicted", "misquoted", "fabricated"] as const).map((s) =>
          counts[s] ? (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs font-semibold ${filter === s ? "ring-2 ring-ink" : ""} ${STATUS_META[s].cls}`}>
              {STATUS_META[s].label} · {counts[s]}
            </button>
          ) : null,
        )}
      </div>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-ink/50">
            <tr>
              <th className="px-2 py-2">Ref</th>
              <th className="px-2 py-2">Raised by</th>
              <th className="px-2 py-2">Source</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Quote check</th>
              <th className="px-2 py-2">Verifier finding</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <tr key={l.ref} className="border-t border-ink/5 align-top">
                <td className="px-2 py-2 font-mono text-xs">{l.ref}</td>
                <td className={`px-2 py-2 text-xs font-semibold ${l.by === "Opposing Counsel" ? "text-foe" : "text-ally"}`}>{l.by}</td>
                <td className="px-2 py-2 text-xs">{l.sourceCite}</td>
                <td className="px-2 py-2">
                  <StatusPill status={l.status} />
                </td>
                <td className="max-w-[16rem] px-2 py-2 text-xs">
                  {l.quote ? <q className="block italic text-ink/70">{l.quote.length > 140 ? l.quote.slice(0, 140) + "…" : l.quote}</q> : <span className="text-ink/40">—</span>}
                  {l.quoteCheck && <span className={`mt-0.5 block font-semibold ${QUOTE_META[l.quoteCheck].cls}`}>{QUOTE_META[l.quoteCheck].label}</span>}
                </td>
                <td className="px-2 py-2 text-xs text-ink/70">{l.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Actions({ hearing: h, onFix }: { hearing: Hearing; onFix: () => void }) {
  const [hindi, setHindi] = useState<string | null>(null);
  const [loadingHindi, setLoadingHindi] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  async function speak() {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    let t = hindi;
    if (!t) {
      setLoadingHindi(true);
      setActionError(null);
      try {
        const r = await fetch("/api/hindi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hearing: h }) });
        const j = await r.json().catch(() => ({ error: `Hindi explanation failed (${r.status}).` }));
        if (j.error) setActionError(j.error);
        t = j.text ?? null;
        setHindi(t);
      } catch {
        setActionError("Could not reach the server for the Hindi explanation.");
      } finally {
        setLoadingHindi(false);
      }
    }
    if (!t) return;
    if (!("speechSynthesis" in window)) {
      setActionError("This browser can't read aloud — the Hindi text is shown below.");
      return;
    }
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "hi-IN";
    u.rate = 0.95;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang.startsWith("hi"));
    if (v) u.voice = v;
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  }

  async function exportDocx() {
    setExporting(true);
    setActionError(null);
    try {
      const r = await fetch("/api/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hearing: h }) });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `pratipaksh-review-round${h.round}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } catch {
      setActionError("Could not generate the .docx report. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const canFix = h.judge.mustFix.length > 0 || h.clerk.clauses.some((c) => c.risk === "high");

  return (
    <div className="mt-5 space-y-3">
      <div className="flex flex-wrap gap-2">
        {canFix ? (
          <button onClick={onFix} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 font-semibold text-ink shadow-md shadow-gold/30 hover:brightness-105">
            <Zap className="h-4 w-4" /> Fix weak clauses &amp; re-hear
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-xl bg-ally-soft px-4 py-2.5 font-semibold text-ally">
            <CheckCircle2 className="h-4 w-4" /> Safe to sign
          </span>
        )}
        <button onClick={speak} className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 font-semibold hover:border-gold">
          {loadingHindi ? <Loader2 className="h-4 w-4 animate-spin" /> : speaking ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          <span className="font-deva">{speaking ? "रोकें" : "हिंदी में सुनें"}</span>
        </button>
        <button onClick={exportDocx} className="inline-flex items-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 font-semibold hover:border-gold">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download .docx
        </button>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-ink/60 hover:text-ink">
          <RotateCcw className="h-4 w-4" /> New document
        </button>
      </div>
      {actionError && <p className="rise rounded-lg bg-foe-soft px-3 py-2 text-sm text-foe">{actionError}</p>}
      {hindi && <p className="rise rounded-xl bg-paper-2 p-3 font-deva text-[15px] leading-relaxed text-ink/85">{hindi}</p>}
    </div>
  );
}

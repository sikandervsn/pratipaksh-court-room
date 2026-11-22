"use client";

import { useState } from "react";
import { CalendarClock, Check, Copy, FileCheck2, ListChecks, Lock, ShieldCheck, TrendingUp } from "lucide-react";
import type { Hearing } from "@/lib/types";
import { CitationChip } from "./ui";

/** Privacy Shield summary — what was masked before the AI saw the document. */
export function PrivacyPanel({ h }: { h: Hearing }) {
  const [open, setOpen] = useState(false);
  if (!h.privacy) return null;
  const n = h.privacy.count;
  return (
    <section className="rise rounded-2xl border border-ally/30 bg-ally-soft/60 p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-2 text-left">
        <ShieldCheck className="h-5 w-5 text-ally" />
        <span className="font-semibold text-ally">Privacy Shield</span>
        <span className="text-sm text-ink/70">
          {n ? `${n} personal detail${n > 1 ? "s" : ""} masked before analysis — the AI only saw placeholders like [PERSON_1].` : "No personal identifiers detected in this document."}
        </span>
        {n > 0 && <span className="ml-auto text-xs font-semibold text-ally underline">{open ? "Hide" : "Show what was masked"}</span>}
      </button>
      {open && n > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {h.privacy.items.map((i) => (
            <li key={i.placeholder} className="flex items-center gap-1 rounded-md border border-ally/20 bg-white px-2 py-1 text-xs">
              <Lock className="h-3 w-3 text-ally" />
              <span className="font-mono text-ally">{i.placeholder}</span>
              <span className="text-ink/50">{i.preview}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STAMP_LABEL: Record<string, [string, string]> = {
  appears_paid: ["Stamp duty appears paid", "text-ally"],
  not_mentioned: ["Stamp duty not shown", "text-warn"],
  likely_unpaid: ["Likely unstamped", "text-foe"],
  not_applicable: ["Stamp duty n/a", "text-ink/60"],
};
const REG_LABEL: Record<string, [string, string]> = {
  registered: ["Registered", "text-ally"],
  required_not_registered: ["Registration required — not registered", "text-foe"],
  not_required: ["Registration not required", "text-ally"],
  unclear: ["Registration unclear", "text-warn"],
};

/** Stamp duty & registration — the first thing an Indian practitioner checks. */
export function AdmissibilityCard({ h }: { h: Hearing }) {
  const a = h.clerk.admissibility;
  if (!a) return null;
  const [st, stc] = STAMP_LABEL[a.stampDuty] ?? [a.stampDuty, ""];
  const [rg, rgc] = REG_LABEL[a.registration] ?? [a.registration, ""];
  return (
    <section className="rise rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold">
        <FileCheck2 className="h-5 w-5 text-gold" /> Is this document even admissible?
      </h3>
      <div className="mb-2 flex flex-wrap gap-2 text-sm font-semibold">
        <span className={`rounded-full bg-paper px-3 py-1 ${stc}`}>🧾 {st}</span>
        <span className={`rounded-full bg-paper px-3 py-1 ${rgc}`}>🏛 {rg}</span>
        {h.meta?.jurisdiction && h.meta.jurisdiction !== "Not specified" && <span className="rounded-full bg-paper px-3 py-1 text-ink/70">📍 {h.meta.jurisdiction}</span>}
      </div>
      <p className="text-sm text-ink/75">{a.note}</p>
      {a.citations.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.citations.map((c) => (
            <CitationChip key={c} id={c} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Why the number is what it is: weighted factors, range, and what would raise it. */
export function VerdictExplainer({ h }: { h: Hearing }) {
  const j = h.judge;
  if (!j.factors?.length) return null;
  return (
    <div className="mt-4 rounded-xl border border-ink/10 bg-paper/60 p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink/50">Why {j.winProbability}%?</span>
        {j.probabilityRange && (
          <span className="text-xs text-ink/60">
            Honest range: <b>{j.probabilityRange.low}–{j.probabilityRange.high}%</b> · decision support, not a guarantee
          </span>
        )}
      </div>
      <ul className="space-y-2.5">
        {j.factors.map((f) => {
          const tone = f.score >= 65 ? "bg-ally" : f.score >= 40 ? "bg-warn" : "bg-foe";
          return (
            <li key={f.name}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">
                  {f.name} <span className="text-xs font-normal text-ink/45">· weight {f.weight}%</span>
                </span>
                <span className="font-mono text-xs font-semibold">{f.score}/100</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-ink/10">
                <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(3, Math.min(100, f.score))}%` }} />
              </div>
              <p className="mt-0.5 text-xs text-ink/60">{f.note}</p>
            </li>
          );
        })}
      </ul>
      {j.toRaise?.length > 0 && (
        <div className="mt-3 border-t border-ink/10 pt-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ally">
            <TrendingUp className="h-3.5 w-3.5" /> What would raise it
          </div>
          <ul className="list-inside list-disc space-y-0.5 text-sm text-ink/75">
            {j.toRaise.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const URGENCY: Record<string, string> = { now: "bg-foe text-white", soon: "bg-warn text-white", later: "bg-ink/10 text-ink/70" };

/** Practical action plan with forum and limitation. */
export function NextSteps({ h }: { h: Hearing }) {
  const steps = h.judge.nextSteps;
  if (!steps?.length) return null;
  return (
    <section className="rise rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
        <ListChecks className="h-5 w-5 text-gold" /> What to do next
      </h3>
      <ol className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{s.step}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <span className={`rounded-full px-2 py-0.5 font-semibold uppercase ${URGENCY[s.urgency] ?? ""}`}>{s.urgency}</span>
                {s.forum && s.forum !== "none" && <span>🏛 {s.forum}</span>}
                {s.deadline && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarClock className="h-3 w-3" /> {s.deadline}
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Ready-to-send negotiation message (round 2+). */
export function NegotiationMessage({ h }: { h: Hearing }) {
  const [copied, setCopied] = useState(false);
  if (!h.negotiationMessage) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(h.negotiationMessage!);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <section className="rise rounded-2xl border border-gold/40 bg-gold-soft/40 p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold">✉️ Message to send the other side</h3>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm font-semibold hover:border-gold">
          {copied ? <Check className="h-4 w-4 text-ally" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap rounded-xl bg-white p-4 font-sans text-sm leading-relaxed text-ink/85">{h.negotiationMessage}</pre>
    </section>
  );
}

/** Audit trail — which model and corpus version produced this opinion. */
export function AuditLine({ h }: { h: Hearing }) {
  if (!h.meta) return null;
  return (
    <p className="text-center text-[11px] text-ink/40">
      Audit trail · model: {h.meta.model} · corpus v{h.meta.corpusVersion} · jurisdiction: {h.meta.jurisdiction} · generated{" "}
      {new Date(h.meta.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
    </p>
  );
}

/** F4: how much independent Judge runs agreed. */
export function ConsistencyBadge({ h }: { h: Hearing }) {
  const c = h.consistency;
  if (!c || c.runs.length < 2) return null;
  const tight = c.spread <= 10;
  return (
    <div className={`mt-3 inline-flex flex-wrap items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${tight ? "border-ally/30 bg-ally-soft/60" : "border-warn/30 bg-warn-soft/60"}`}>
      <span className="font-bold uppercase tracking-wider text-ink/60">{c.runs.length} independent rulings</span>
      <span className="font-mono">{[...c.runs].sort((a, b) => a - b).join(" · ")}</span>
      <span className={`font-semibold ${tight ? "text-ally" : "text-warn"}`}>
        median {c.median}% · spread ±{Math.ceil(c.spread / 2)} {tight ? "(consistent)" : "(uncertain, treat with care)"}
      </span>
    </div>
  );
}

/** F1: which official sections were retrieved for this hearing. */
export function RetrievalPanel({ h }: { h: Hearing }) {
  const [open, setOpen] = useState(false);
  const r = h.retrieval;
  if (!r?.sections.length) return null;
  const acts = [...new Set(r.sections.map((s) => s.cite.split(", s.")[0]))];
  return (
    <section className="rise rounded-2xl border border-ink/10 bg-white p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-2 text-left">
        <span className="font-semibold">📚 Law retrieved for this hearing</span>
        <span className="text-sm text-ink/60">
          {r.sections.length} official sections from {acts.length} Acts · {r.mode === "hybrid" ? "keyword + meaning search" : "keyword search"}
        </span>
        <span className="ml-auto text-xs font-semibold text-ink-2 underline">{open ? "Hide" : "Show sections"}</span>
      </button>
      {open && (
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {r.sections.map((s) => (
            <li key={s.id} className="rounded-lg border border-ink/10 bg-paper/60 px-2 py-1.5 text-xs">
              <b className="font-mono">{s.id}</b> · {s.cite}: {s.heading}
              <span className="ml-1 text-ink/40">({s.via.join(" + ")})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

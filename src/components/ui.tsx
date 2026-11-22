"use client";

import { useState } from "react";
import { BadgeCheck, CircleAlert, CircleX, Quote, ShieldOff } from "lucide-react";
import { CORPUS_BY_ID, sourceUrl } from "@/lib/corpus";
import type { LedgerEntry, LedgerStatus, QuoteCheck } from "@/lib/types";

export const STATUS_META: Record<LedgerStatus, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
  verified: { label: "Verified", cls: "bg-ally-soft text-ally border-ally/30", Icon: BadgeCheck },
  weak: { label: "Weak", cls: "bg-warn-soft text-warn border-warn/30", Icon: CircleAlert },
  contradicted: { label: "Contradicted", cls: "bg-foe-soft text-foe border-foe/30", Icon: CircleX },
  misquoted: { label: "Misquoted", cls: "bg-foe-soft text-foe border-foe/40 line-through decoration-foe/50", Icon: CircleX },
  fabricated: { label: "Fabricated · blocked", cls: "bg-foe text-white border-foe line-through decoration-white/60", Icon: ShieldOff },
};

export const QUOTE_META: Record<QuoteCheck, { label: string; cls: string }> = {
  exact: { label: "Quote found word-for-word in the official text", cls: "text-ally" },
  close: { label: "Quote found (minor punctuation differences)", cls: "text-ally" },
  summary: { label: "Case-law summary (not verbatim text)", cls: "text-ink/60" },
  missing: { label: "No quote given", cls: "text-warn" },
  not_found: { label: "Quote NOT found in the official text", cls: "text-foe" },
};

export function StatusPill({ status }: { status: LedgerStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.weak;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>
      <m.Icon className="h-3 w-3" /> {m.label}
    </span>
  );
}

/** A citation chip that opens its Proof Ledger entry on click. */
export function CitationChip({ id, entry }: { id: string; entry?: LedgerEntry }) {
  const [open, setOpen] = useState(false);
  const curated = CORPUS_BY_ID[id];
  // With a ledger entry we know exactly what was checked. Without one (e.g. Drafter rationale), show a neutral chip.
  const status: LedgerStatus | null = entry?.status ?? null;
  const m = status ? STATUS_META[status] : { ...STATUS_META.verified, cls: "bg-paper-2 text-ink-2 border-ink/15" };
  const cite = entry?.sourceCite ?? curated?.cite ?? id;
  const text = entry?.sourceText ?? curated?.text;
  const link = entry?.sourceUrl || (curated ? sourceUrl(curated) : `https://indiankanoon.org/search/?formInput=${encodeURIComponent(id)}`);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold transition hover:brightness-95 ${m.cls}`}
        title={cite}
      >
        <m.Icon className="h-3 w-3" />
        {id}
      </button>
      {open && (
        <span className="rise absolute left-0 z-30 mt-1 block w-[min(22rem,82vw)] rounded-lg border border-ink/10 bg-white p-3 text-left text-xs shadow-xl">
          <span className="mb-1 flex items-center justify-between gap-2">
            <span className="font-semibold text-ink">{cite}</span>
            {status && <StatusPill status={status} />}
          </span>
          {status === "fabricated" ? (
            <span className="block text-foe">This source does not exist in the library. The hallucination firewall blocked it, so it carried no weight with the Judge.</span>
          ) : (
            <>
              {entry?.quote && (
                <span className="mb-2 block rounded-md bg-paper p-2">
                  <span className="mb-0.5 flex items-center gap-1 font-semibold text-ink/70">
                    <Quote className="h-3 w-3" /> Quoted by {entry.by}
                  </span>
                  <q className="block italic text-ink/85">{entry.quote}</q>
                  {entry.quoteCheck && <span className={`mt-1 block font-semibold ${QUOTE_META[entry.quoteCheck].cls}`}>{QUOTE_META[entry.quoteCheck].label}</span>}
                </span>
              )}
              {text && <span className="block max-h-40 overflow-auto whitespace-pre-line text-ink/70">{text}</span>}
            </>
          )}
          <a href={link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-semibold text-ink-2 underline">
            {entry?.verbatim ? "Official text on India Code ↗" : "Read the source ↗"}
          </a>
          {entry?.note && status !== "fabricated" && <span className="mt-2 block border-t border-ink/10 pt-2 italic text-ink/60">Verifier: {entry.note}</span>}
        </span>
      )}
    </span>
  );
}

export function RiskDot({ risk }: { risk: "high" | "medium" | "low" | "safe" }) {
  const cls = { high: "bg-foe", medium: "bg-warn", low: "bg-gold", safe: "bg-ally" }[risk];
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${cls}`} />;
}

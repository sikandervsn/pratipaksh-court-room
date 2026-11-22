"use client";

import { useEffect, useState } from "react";
import { BookMarked, CalendarClock, ChevronRight, FileSignature, FlaskConical, FolderClock, Gavel, GitCompare, HelpCircle, Repeat } from "lucide-react";
import { AccountDialog, HistoryPanel, saveHearing, UserMenu, useUser } from "@/components/Account";
import { Compare } from "@/components/Compare";
import { Courtroom } from "@/components/Courtroom";
import { Deadlines } from "@/components/Deadlines";
import { Evaluation } from "@/components/Evaluation";
import { Library } from "@/components/Library";
import { Notices } from "@/components/Notices";
import { HowItWorks } from "@/components/HowItWorks";
import { IpcConverter } from "@/components/IpcConverter";
import evalResults from "@/data/eval-results.json";
import type { Hearing } from "@/lib/types";

type Tab = "court" | "notice" | "compare" | "deadlines" | "library" | "history" | "bns" | "eval" | "how";

interface NavItem {
  id: Tab;
  label: string;
  hint: string;
  Icon: typeof Gavel;
  isNew?: boolean;
  disabled?: boolean;
}

const pct = (x: number | null | undefined) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function Home() {
  const [tab, setTab] = useState<Tab>("court");
  const { user } = useUser();
  const [accountOpen, setAccountOpen] = useState(false);
  const [incoming, setIncoming] = useState<{ hearing: Hearing; nonce: number } | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [status, setStatus] = useState<{ live: boolean; model: string } | null>(null);
  const [sections, setSections] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  }, []);
  useEffect(() => {
    // Statute count for the header (needs a signed-in session when accounts are on).
    fetch("/api/library")
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { acts?: { sections: number }[] } | null) => j?.acts && setSections(j.acts.reduce((a, x) => a + x.sections, 0)))
      .catch(() => {});
  }, [user]);

  const ev = (evalResults as { summary: { recall: number | null; quoteMatchRate: number | null; falseAlarmRate: number | null; cases: number } | null }).summary;

  const rows: { label: string; items: NavItem[] }[] = [
    {
      label: "Analyse & draft",
      items: [
        { id: "court", label: "Courtroom", hint: "Put a contract on trial", Icon: Gavel },
        { id: "notice", label: "Notices", hint: "Draft or reply to a notice", Icon: FileSignature, isNew: true },
        { id: "compare", label: "Compare drafts", hint: "What did they change?", Icon: GitCompare, isNew: true },
        { id: "deadlines", label: "Deadlines", hint: "Limitation & s.138 timeline", Icon: CalendarClock },
      ],
    },
    {
      label: "Research & records",
      items: [
        { id: "library", label: "Statute library", hint: sections ? `Search ${sections.toLocaleString("en-IN")} sections` : "Search 15 Acts", Icon: BookMarked },
        { id: "history", label: "My hearings", hint: user ? "Saved privately" : "Sign in to save", Icon: FolderClock, disabled: !user },
        { id: "bns", label: "IPC → BNS", hint: "Old to new criminal codes", Icon: Repeat },
        { id: "eval", label: "Evaluation", hint: "How accurate is it?", Icon: FlaskConical },
      ],
    },
  ];
  const all = rows.flatMap((r) => r.items);
  const current = tab === "how" ? { label: "How it works" } : all.find((i) => i.id === tab);

  return (
    <div className="paper-grain min-h-screen">
      <header className="bg-ink text-paper" style={{ backgroundImage: "radial-gradient(1200px 400px at 85% -10%, rgba(200,150,30,.22), transparent 60%)" }}>
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-7">
          {/* Top bar */}
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold text-2xl text-ink shadow-lg shadow-gold/30">⚖</span>
            <div className="min-w-0">
              <h1 className="font-serif text-2xl font-bold tracking-tight sm:text-3xl">
                Pratipaksh <span className="font-deva text-xl font-normal text-gold sm:text-2xl">प्रतिपक्ष</span>
              </h1>
              <p className="hidden text-sm text-paper/60 sm:block">The AI opposing counsel, built for Indian law</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {status && (
                <span
                  className={`hidden items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold md:inline-flex ${status.live ? "border-emerald-300/25 bg-emerald-500/15 text-emerald-300" : "border-gold/30 bg-gold/15 text-gold"}`}
                >
                  ● {status.live ? `LIVE · ${status.model.replace(/^[^·]*·\s*/, "")}` : "DEMO MODE"}
                </span>
              )}
              <button
                onClick={() => setTab("how")}
                title="How it works"
                aria-label="How it works"
                className={`grid h-9 w-9 place-items-center rounded-full border transition ${tab === "how" ? "border-gold bg-gold text-ink" : "border-white/20 text-paper/80 hover:bg-white/10"}`}
              >
                <HelpCircle className="h-5 w-5" />
              </button>
              {user && <UserMenu user={user} onOpenAccount={() => setAccountOpen(true)} />}
            </div>
          </div>

          {/* Hero + proof */}
          <div className="grid items-end gap-6 py-6 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="font-serif text-[28px] leading-tight font-bold tracking-tight sm:text-4xl">
                Know how you&apos;ll lose, <span className="text-gold">before you sign.</span>
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper/70 sm:text-[15px]">
                Opposing counsel attacks, your advocate defends, every quote is checked against India Code, and three judges rule. One click rewrites the losing clauses.
              </p>
            </div>
            <div className="hidden grid-cols-3 gap-2.5 sm:grid">
              {[
                [sections ? sections.toLocaleString("en-IN") : "2,300+", "official sections from 15 Acts"],
                [pct(ev?.quoteMatchRate), "statute quotes verified (eval)"],
                [ev?.recall != null ? `${pct(ev.recall)}` : "—", `risks caught · ${pct(ev?.falseAlarmRate)} false alarms`],
              ].map(([v, l]) => (
                <div key={l} className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
                  <b className="block font-serif text-2xl text-gold">{v}</b>
                  <span className="block text-[11.5px] leading-snug text-paper/65">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2 × 4 navigation */}
          <nav className="pb-6" aria-label="Sections">
            {rows.map((row, ri) => (
              <div key={row.label} className={ri ? "mt-3" : ""}>
                <div className="mb-2 hidden text-[11px] font-bold tracking-[0.14em] text-paper/45 uppercase sm:block">{row.label}</div>
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
                  {row.items.map((t) => {
                    const active = tab === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => !t.disabled && setTab(t.id)}
                        disabled={t.disabled}
                        aria-current={active ? "page" : undefined}
                        title={t.disabled ? "Sign in to save and reopen hearings" : t.hint}
                        className={`relative flex min-h-[68px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-1 py-2 text-center transition sm:min-h-16 sm:flex-row sm:justify-start sm:gap-3 sm:px-3.5 sm:text-left ${
                          active
                            ? "border-paper bg-paper text-ink shadow-xl shadow-black/25"
                            : t.disabled
                              ? "cursor-not-allowed border-white/5 bg-white/[0.03] text-paper/40"
                              : "border-white/10 bg-white/5 text-paper hover:bg-white/10"
                        }`}
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 ${active ? "bg-gold text-ink" : "bg-white/10"}`}>
                          <t.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                        </span>
                        <span className="min-w-0">
                          <b className="block text-[11px] leading-tight font-semibold sm:text-[14.5px]">{t.label}</b>
                          <small className={`hidden truncate text-[11.5px] sm:block ${active ? "text-ink/55" : "text-paper/55"}`}>{t.hint}</small>
                        </span>
                        {t.isNew && !active && <span className="absolute top-2 right-2.5 hidden rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] font-bold text-gold lg:inline">NEW</span>}
                        {active && <span className="absolute right-4 bottom-0 left-4 h-[3px] rounded-full bg-gold" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center gap-1.5 text-sm text-ink/55">
          <span>Pratipaksh</span>
          <ChevronRight className="h-3.5 w-3.5" />
          <b className="text-ink">{current?.label}</b>
        </div>

        {/* Courtroom stays mounted so a running hearing survives tab switches */}
        <div className={tab === "court" ? "" : "hidden"}>
          <Courtroom
            incoming={incoming}
            onResult={
              user
                ? async (h) => {
                    const err = await saveHearing(h);
                    if (!err) setHistoryKey((k) => k + 1);
                    return err;
                  }
                : undefined
            }
          />
        </div>
        {tab === "history" && user && (
          <HistoryPanel
            refreshKey={historyKey}
            onOpen={(h) => {
              setIncoming({ hearing: h, nonce: Date.now() });
              setTab("court");
            }}
          />
        )}
        <div className={tab === "notice" ? "" : "hidden"}>
          <Notices />
        </div>
        <div className={tab === "compare" ? "" : "hidden"}>
          <Compare />
        </div>
        {tab === "deadlines" && <Deadlines />}
        <div className={tab === "library" ? "" : "hidden"}>
          <Library />
        </div>
        {tab === "eval" && <Evaluation />}
        {tab === "bns" && <IpcConverter />}
        {tab === "how" && <HowItWorks />}
      </main>
      <footer className="border-t border-ink/10 py-6 text-center text-xs text-ink/45">
        Pratipaksh · AI for Lawyers Hackathon 2026 · Not legal advice ·{" "}
        <button onClick={() => setTab("how")} className="underline">
          How it works
        </button>
      </footer>
      {accountOpen && user && <AccountDialog user={user} onClose={() => setAccountOpen(false)} onHistoryCleared={() => setHistoryKey((k) => k + 1)} />}
    </div>
  );
}

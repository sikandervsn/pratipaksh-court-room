"use client";

import { useEffect, useState } from "react";
import { BookMarked, Loader2, Search } from "lucide-react";

interface Act {
  code: string;
  act: string;
  sections: number;
}
interface Hit {
  id: string;
  act: string;
  section: string;
  heading: string;
  text: string;
  url: string;
  via: string[];
}

const EXAMPLES = ["landlord keeps security deposit", "non-compete after leaving job", "ICA 27", "cheque returned unpaid notice", "arbitrator appointed by one party", "salary not paid after resignation", "unstamped agreement evidence"];

export function Library() {
  const [acts, setActs] = useState<Act[]>([]);
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<string>("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/library")
      .then((r) => r.json())
      .then((j) => setActs(j.acts ?? []))
      .catch(() => {});
  }, []);

  async function run(query = q) {
    if (!query.trim()) return;
    setQ(query);
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`/api/library?q=${encodeURIComponent(query)}&acts=${sel.join(",")}`);
      const j = await r.json();
      if (!r.ok || j.error) throw new Error(j.error ?? "Search failed");
      setHits(j.results);
      setMode(j.mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  const total = acts.reduce((a, x) => a + x.sections, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
          <BookMarked className="h-5 w-5 text-gold" /> Statute library
        </h2>
        <p className="mb-4 text-sm text-ink/60">
          {total ? `${total.toLocaleString()} sections from ${acts.length} central Acts. ` : ""}
          Official text from India Code (Government of India). Every agent retrieves from this library, and every quote it makes is checked word-for-word against it.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Describe a situation in plain words, or type a citation like 'NIA 138'"
            className="w-full rounded-xl border border-ink/15 bg-paper/60 py-2.5 pr-28 pl-10 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
          <button disabled={busy} className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-sm font-semibold text-paper">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </form>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {EXAMPLES.map((e) => (
            <button key={e} onClick={() => run(e)} className="rounded-full border border-ink/10 bg-paper px-2.5 py-1 text-xs hover:border-gold">
              {e}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {acts.map((a) => (
            <button
              key={a.code}
              onClick={() => setSel((s) => (s.includes(a.code) ? s.filter((x) => x !== a.code) : [...s, a.code]))}
              title={a.act}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${sel.includes(a.code) ? "border-ink bg-ink text-paper" : "border-ink/15 text-ink/60"}`}
            >
              {a.code} · {a.sections}
            </button>
          ))}
        </div>
        {error && <p className="mt-3 rounded-lg bg-foe-soft px-3 py-2 text-sm text-foe">{error}</p>}
      </section>

      {hits && (
        <section className="space-y-3">
          <p className="text-xs text-ink/50">
            {hits.length} results · {mode === "hybrid" ? "keyword + meaning (embedding) search" : "keyword search"}
          </p>
          {hits.map((h) => (
            <article key={h.id} className="rise rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper">{h.id}</span>
                <span className="font-semibold">
                  {h.act}, s. {h.section}: {h.heading}
                </span>
                <span className="ml-auto flex gap-1">
                  {h.via.map((v) => (
                    <span key={v} className="rounded-full bg-paper-2 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink/60">
                      {v}
                    </span>
                  ))}
                </span>
              </div>
              <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-ink/80 ${open === h.id ? "" : "line-clamp-4"}`}>{h.text}</p>
              <div className="mt-2 flex gap-3 text-xs">
                <button onClick={() => setOpen(open === h.id ? null : h.id)} className="font-semibold text-ink-2 underline">
                  {open === h.id ? "Show less" : "Read full section"}
                </button>
                {h.url && (
                  <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-ink/50 underline">
                    India Code ↗
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

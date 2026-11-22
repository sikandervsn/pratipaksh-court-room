"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { MAPPINGS, findOldReferences, lookup, type Mapping } from "@/lib/bns-map";

const EXAMPLE = `The accused is charged u/s 420 IPC and Section 406 of IPC. The complainant also seeks action under Section 506 IPC. Anticipatory bail is sought under Section 438 CrPC, and the WhatsApp chats are relied on with a certificate under Section 65B of the Evidence Act.`;

function Row({ m }: { m: Mapping }) {
  return (
    <div className="rise rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-foe-soft px-2 py-1 font-mono text-sm font-semibold text-foe line-through decoration-foe/40">
          {m.old === "IEA" ? "Evidence Act" : m.old} {m.oldSection}
        </span>
        <ArrowRight className="h-4 w-4 text-ink/40" />
        <span className={`rounded-md px-2 py-1 font-mono text-sm font-semibold ${m.newCode === "—" ? "bg-ink/10 text-ink/60" : "bg-ally-soft text-ally"}`}>
          {m.newCode === "—" ? m.newSection : `${m.newCode} ${m.newSection}`}
        </span>
        <span className="text-sm text-ink/70">{m.subject}</span>
      </div>
      {m.change && <p className="mt-2 text-xs text-ink/60">↳ What changed: {m.change}</p>}
    </div>
  );
}

export function IpcConverter() {
  const [q, setQ] = useState("IPC 302");
  const [text, setText] = useState(EXAMPLE);
  const results = useMemo(() => lookup(q), [q]);
  const found = useMemo(() => findOldReferences(text), [text]);
  const converted = useMemo(() => {
    let out = text;
    for (const f of found) {
      const rep = f.mapping.newCode === "—" ? "[no equivalent in BNS]" : `Section ${f.mapping.newSection} ${f.mapping.newCode}`;
      const re = new RegExp(`(?:sections?|secs?\\.?|u\\/s|s\\.)\\s*${f.mapping.oldSection}\\s*(?:of\\s+(?:the\\s+)?)?(?:${f.mapping.old === "IPC" ? "IPC|Indian Penal Code" : f.mapping.old === "CrPC" ? "Cr\\.?P\\.?C\\.?|Code of Criminal Procedure" : "(?:Indian\\s+)?Evidence Act"})`, "gi");
      out = out.replace(re, `⟦${rep}⟧`);
    }
    return out;
  }, [text, found]);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-xl font-semibold">Section lookup</h2>
        <p className="mb-3 text-sm text-ink/60">On 1 July 2024, IPC, CrPC and the Evidence Act were replaced by BNS, BNSS and BSA. Type an old section number.</p>
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 h-5 w-5 text-ink/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. IPC 420, CrPC 438, Evidence Act 65B, murder"
            className="w-full rounded-xl border border-ink/15 bg-paper/60 py-2.5 pr-3 pl-10 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div className="mt-4 space-y-2">
          {results.length ? results.map((m) => <Row key={m.old + m.oldSection} m={m} />) : q.trim() && <p className="text-sm text-ink/50">This section isn&apos;t in the curated table ({MAPPINGS.length} high-use sections). Check the official correspondence table.</p>}
        </div>
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-xl font-semibold">Convert a draft automatically</h2>
        <p className="mb-3 text-sm text-ink/60">Paste a petition, notice or FIR draft. Pratipaksh finds every repealed reference and rewrites it to the new code.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} className="h-48 w-full rounded-xl border border-ink/15 bg-paper/60 p-3 text-sm outline-none focus:border-gold" />
          <div className="h-48 overflow-auto rounded-xl border border-ally/30 bg-ally-soft/50 p-3 text-sm whitespace-pre-wrap">
            {converted.split(/(⟦[^⟧]+⟧)/).map((part, i) =>
              part.startsWith("⟦") ? (
                <mark key={i} className="rounded bg-ally px-1 font-semibold text-white">{part.slice(1, -1)}</mark>
              ) : (
                <span key={i}>{part}</span>
              ),
            )}
          </div>
        </div>
        {found.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{found.length} repealed references found</p>
            {found.map((f) => <Row key={f.match} m={f.mapping} />)}
          </div>
        )}
      </section>
      <p className="text-center text-xs text-ink/45">Curated correspondence table. Always confirm against the official text of BNS, BNSS and BSA 2023.</p>
    </div>
  );
}

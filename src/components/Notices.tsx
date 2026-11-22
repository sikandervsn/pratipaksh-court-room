"use client";

import { useState } from "react";
import { AlertTriangle, BadgeCheck, CircleX, Copy, Download, FileSignature, Loader2, Mail, Reply } from "lucide-react";
import { STATES } from "@/lib/states";

type QuoteCheck = "exact" | "close" | "not_found" | "summary" | "missing";
interface Result {
  draft: {
    subject: string;
    paragraphs: string[];
    demands: string[];
    complianceDays: number;
    consequence: string;
    enclosures: string[];
    replyPoints: { allegation: string; response: string }[];
    warnings: string[];
  };
  citations: { id: string; cite: string; quote: string; check: QuoteCheck; url?: string; verbatim: boolean }[];
  timeline?: { steps: { label: string; date: string; basis: string; daysLeft: number; status: string }[]; warnings: string[] };
  limitation?: { deadline: string; daysLeft: number; rule: { basis: string; title: string } };
  retrieved: string[];
}

const TYPES: [string, string][] = [
  ["cheque_bounce", "Cheque bounce (NI Act s. 138)"],
  ["deposit_refund", "Refund of security deposit (tenancy)"],
  ["unpaid_salary", "Unpaid salary / full & final settlement"],
  ["consumer_deficiency", "Consumer: deficiency / unfair trade practice"],
  ["breach_of_contract", "Breach of contract / recovery of money"],
  ["other", "Other (describe in facts)"],
];

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};
const shiftDays = (n: number) => {
  const d = new Date(Date.now() + n * 86_400_000);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const EMPTY = {
  mode: "notice" as "notice" | "reply",
  type: "cheque_bounce",
  senderName: "",
  senderAddress: "",
  recipientName: "",
  recipientAddress: "",
  advName: "",
  advEnrol: "",
  amount: "",
  state: "Not specified",
  causeDate: "",
  chequeNo: "",
  chequeDate: "",
  chequeBank: "",
  memoDate: "",
  facts: "",
  received: "",
};

const CHECK_META: Record<QuoteCheck, { label: string; cls: string; Icon: typeof BadgeCheck }> = {
  exact: { label: "Quote matches official text", cls: "bg-ally-soft text-ally", Icon: BadgeCheck },
  close: { label: "Quote matches (minor differences)", cls: "bg-ally-soft text-ally", Icon: BadgeCheck },
  summary: { label: "Case-law summary", cls: "bg-paper-2 text-ink/70", Icon: BadgeCheck },
  missing: { label: "No quote given", cls: "bg-warn-soft text-warn", Icon: AlertTriangle },
  not_found: { label: "MISQUOTED — not in the official text", cls: "bg-foe-soft text-foe", Icon: CircleX },
};

export function Notices() {
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [res, setRes] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const set = (k: keyof typeof EMPTY, v: string) => setF((x) => ({ ...x, [k]: v }));

  function sample(kind: "cheque" | "reply") {
    if (kind === "cheque")
      setF({
        ...EMPTY,
        mode: "notice",
        type: "cheque_bounce",
        senderName: "Meera Kulkarni",
        senderAddress: "Flat 12, Shanti Apartments, Kothrud, Pune 411038",
        recipientName: "Rohit Sharma",
        recipientAddress: "Shop 4, MG Road, Camp, Pune 411001",
        amount: "Rs. 2,50,000",
        state: "Maharashtra",
        chequeNo: "004512",
        chequeDate: shiftDays(-40),
        chequeBank: "HDFC Bank, Camp Branch, Pune",
        memoDate: shiftDays(-6),
        facts:
          "Meera Kulkarni lent Rs. 2,50,000 to Rohit Sharma by bank transfer for his shop's working capital, repayable in 3 months. Towards repayment, Rohit Sharma issued cheque no. 004512. Meera presented it and it was returned unpaid with the remark 'Funds Insufficient'. Rohit has stopped answering calls.",
      });
    else
      setF({
        ...EMPTY,
        mode: "reply",
        type: "deposit_refund",
        senderName: "Ananya Iyer",
        senderAddress: "Flat 3B, Lakeview Residency, HSR Layout, Bengaluru",
        recipientName: "Rakesh Malhotra",
        recipientAddress: "14, 5th Cross, Indiranagar, Bengaluru",
        amount: "Rs. 3,50,000 (deposit)",
        state: "Karnataka",
        causeDate: shiftDays(-75),
        facts:
          "Ananya Iyer was a tenant of Rakesh Malhotra and vacated the flat after giving one month's written notice, handing over keys with a joint inspection video showing the flat in good condition. Rent was fully paid. The landlord has not refunded the Rs. 3,50,000 deposit after 75 days and now claims Rs. 2,10,000 for 'painting and damages' without bills.",
        received:
          "LEGAL NOTICE. Under instructions from my client Mr. Rakesh Malhotra, you are hereby called upon to pay Rs. 60,000 within 7 days towards damages to the flat, repainting, deep cleaning and loss of rent, failing which my client will forfeit the entire security deposit of Rs. 3,50,000 and initiate criminal proceedings against you for cheating under Section 420 IPC since you misrepresented your income at the time of renting.",
      });
    setRes(null);
    setError(null);
  }

  async function submit() {
    setBusy(true);
    setError(null);
    setRes(null);
    try {
      const body = {
        mode: f.mode,
        type: f.type,
        sender: { name: f.senderName, address: f.senderAddress },
        recipient: { name: f.recipientName, address: f.recipientAddress },
        advocate: f.advName ? { name: f.advName, enrolment: f.advEnrol, address: "" } : undefined,
        facts: f.facts,
        amount: f.amount,
        state: f.state,
        causeDate: f.causeDate || "",
        cheque: f.type === "cheque_bounce" && f.chequeDate && f.memoDate ? { number: f.chequeNo, date: f.chequeDate, bank: f.chequeBank, memoDate: f.memoDate } : undefined,
        receivedNotice: f.received,
        today: todayISO(),
      };
      const r = await fetch("/api/notice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({ error: `Server error (${r.status})` }));
      if (!r.ok || j.error) throw new Error(j.error ?? "Drafting failed");
      setRes(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drafting failed");
    } finally {
      setBusy(false);
    }
  }

  const letterText = () => {
    if (!res) return "";
    const d = res.draft;
    const lines = [
      f.mode === "reply" ? "REPLY TO LEGAL NOTICE" : "LEGAL NOTICE",
      "By Registered Post A.D. / Speed Post / Email",
      `Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
      "",
      "To,",
      f.recipientName,
      f.recipientAddress,
      "",
      `Subject: ${d.subject}`,
      "",
      "Sir/Madam,",
      "",
      ...d.paragraphs.map((p, i) => `${i + 1}. ${p}`),
      ...(d.replyPoints.length ? ["", "PARA-WISE REPLY:", ...d.replyPoints.map((r, i) => `${i + 1}. As to "${r.allegation}": ${r.response}`)] : []),
      "",
      `You are therefore called upon, within ${d.complianceDays} days of receipt of this ${f.mode === "reply" ? "reply" : "notice"}, to:`,
      ...d.demands.map((x, i) => `   (${String.fromCharCode(97 + i)}) ${x}`),
      "",
      d.consequence,
      "",
      ...(d.enclosures.length ? ["Enclosures:", ...d.enclosures.map((e, i) => `   ${i + 1}. ${e}`), ""] : []),
      f.advName ? `${f.advName}\nAdvocate${f.advEnrol ? ` (Enrolment No. ${f.advEnrol})` : ""}\nfor ${f.senderName}` : `${f.senderName}\n${f.senderAddress}`,
    ];
    return lines.join("\n");
  };

  async function downloadDocx() {
    const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
    const text = letterText();
    const doc = new Document({
      styles: { default: { document: { run: { font: "Times New Roman", size: 24 } } } },
      sections: [
        {
          children: text.split("\n").map(
            (line, i) =>
              new Paragraph({
                alignment: i === 0 ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
                spacing: { after: 80 },
                children: [new TextRun({ text: line, bold: i === 0 || line.startsWith("Subject:") })],
              }),
          ),
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${f.mode === "reply" ? "reply-to-notice" : "legal-notice"}-${f.type}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const input = "w-full rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/20";

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
            <FileSignature className="h-5 w-5 text-gold" /> Legal notice drafter
          </h2>
          <div className="flex gap-2">
            <button onClick={() => sample("cheque")} className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-sm hover:border-gold">
              🧾 Example: cheque bounce
            </button>
            <button onClick={() => sample("reply")} className="rounded-full border border-ink/15 bg-paper px-3 py-1.5 text-sm hover:border-gold">
              ↩️ Example: reply to landlord
            </button>
          </div>
        </div>

        <div className="mb-4 inline-grid grid-cols-2 rounded-xl bg-paper-2 p-1 text-sm font-semibold">
          {(["notice", "reply"] as const).map((m) => (
            <button key={m} onClick={() => set("mode", m)} className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 ${f.mode === m ? "bg-white shadow" : "text-ink/55"}`}>
              {m === "notice" ? <Mail className="h-4 w-4" /> : <Reply className="h-4 w-4" />} {m === "notice" ? "Send a notice" : "Reply to a notice"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-ink/60">Matter type</span>
            <select value={f.type} onChange={(e) => set("type", e.target.value)} className={input}>
              {TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          {(
            [
              ["senderName", f.mode === "reply" ? "Your name (replying party)" : "Your client / sender name"],
              ["recipientName", f.mode === "reply" ? "Who sent you the notice" : "Recipient name"],
              ["senderAddress", "Sender address"],
              ["recipientAddress", "Recipient address"],
              ["amount", "Amount involved"],
            ] as const
          ).map(([k, l]) => (
            <label key={k} className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-ink/60">{l}</span>
              <input value={f[k]} onChange={(e) => set(k, e.target.value)} className={input} />
            </label>
          ))}
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink/60">State</span>
            <select value={f.state} onChange={(e) => set("state", e.target.value)} className={input}>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          {f.type === "cheque_bounce" ? (
            <>
              {(
                [
                  ["chequeNo", "Cheque number", "text"],
                  ["chequeBank", "Drawee bank & branch", "text"],
                  ["chequeDate", "Cheque date", "date"],
                  ["memoDate", "Return memo received on", "date"],
                ] as const
              ).map(([k, l, type]) => (
                <label key={k} className="text-sm">
                  <span className="mb-1 block text-xs font-semibold text-ink/60">{l}</span>
                  <input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} className={input} />
                </label>
              ))}
            </>
          ) : (
            <label className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-ink/60">Date the cause of action arose (for limitation)</span>
              <input type="date" value={f.causeDate} onChange={(e) => set("causeDate", e.target.value)} className={input} />
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink/60">Advocate name (optional)</span>
            <input value={f.advName} onChange={(e) => set("advName", e.target.value)} className={input} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-semibold text-ink/60">Enrolment no. (optional)</span>
            <input value={f.advEnrol} onChange={(e) => set("advEnrol", e.target.value)} className={input} />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-ink/60">Facts, in order (who, what, when, amounts, documents)</span>
            <textarea value={f.facts} onChange={(e) => set("facts", e.target.value)} maxLength={8000} className={`${input} h-28`} />
          </label>
          {f.mode === "reply" && (
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-ink/60">Paste the notice you received</span>
              <textarea value={f.received} onChange={(e) => set("received", e.target.value)} maxLength={20000} className={`${input} h-32`} />
            </label>
          )}
        </div>
        <p className="mt-2 text-xs text-ink/50">🔒 Names and addresses are replaced with placeholders before the AI drafts. They are filled back in only in your browser.</p>
        <button
          onClick={submit}
          disabled={busy || f.facts.trim().length < 30 || !f.senderName || !f.recipientName}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-6 py-3 font-semibold text-paper shadow-lg disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSignature className="h-5 w-5" />} {f.mode === "reply" ? "Draft the reply" : "Draft the notice"}
        </button>
        {error && <p className="mt-3 rounded-lg bg-foe-soft px-3 py-2 text-sm text-foe">{error}</p>}
      </section>

      {res && (
        <div className="rise grid gap-6 lg:grid-cols-[1fr_340px]">
          <article className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm sm:p-10" style={{ fontFamily: "'Times New Roman', Georgia, serif" }}>
            <pre className="whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-ink">{letterText()}</pre>
            <div className="mt-6 flex flex-wrap gap-2 font-sans">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(letterText()).catch(() => {});
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold hover:border-gold"
              >
                <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy text"}
              </button>
              <button onClick={downloadDocx} className="inline-flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-ink">
                <Download className="h-4 w-4" /> Download .docx
              </button>
            </div>
          </article>

          <aside className="space-y-4">
            {res.draft.warnings.length > 0 && (
              <div className="rounded-2xl border border-warn/30 bg-warn-soft p-4">
                <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-warn">
                  <AlertTriangle className="h-4 w-4" /> Fix before sending
                </h3>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {res.draft.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
            {res.timeline && (
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <h3 className="mb-2 text-sm font-bold">⏱ s. 138 timeline (computed)</h3>
                {res.timeline.steps.map((s) => (
                  <div key={s.label} className="flex justify-between gap-2 border-b border-ink/5 py-1 text-xs">
                    <span>{s.label}</span>
                    <b className={s.status === "expired" ? "text-foe" : ""}>{s.date}</b>
                  </div>
                ))}
                {res.timeline.warnings.map((w) => (
                  <p key={w} className="mt-1 text-xs text-warn">
                    ⚠ {w}
                  </p>
                ))}
              </div>
            )}
            {res.limitation && (
              <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm">
                <h3 className="mb-1 font-bold">⏱ Limitation (computed)</h3>
                Last date to file: <b>{res.limitation.deadline}</b> ({res.limitation.daysLeft < 0 ? "EXPIRED" : `${res.limitation.daysLeft} days left`})
                <div className="text-xs text-ink/55">{res.limitation.rule.basis}</div>
              </div>
            )}
            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <h3 className="mb-2 text-sm font-bold">📚 Law relied on, with quotes checked against India Code</h3>
              <ul className="space-y-2">
                {res.citations.map((c, i) => {
                  const m = CHECK_META[c.check];
                  return (
                    <li key={i} className="rounded-lg border border-ink/10 p-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <b className="font-mono">{c.id}</b>
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ${m.cls}`}>
                          <m.Icon className="h-3 w-3" /> {m.label}
                        </span>
                      </div>
                      <div className="text-ink/60">{c.cite}</div>
                      <q className="mt-1 block italic text-ink/80">{c.quote}</q>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" className="text-ink-2 underline">
                          Official text ↗
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

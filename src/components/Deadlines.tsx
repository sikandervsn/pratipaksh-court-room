"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, Landmark } from "lucide-react";
import { chequeTimeline, compute, RULES } from "@/lib/limitation";

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const TONE = {
  expired: "bg-foe text-white",
  urgent: "bg-foe-soft text-foe",
  soon: "bg-warn-soft text-warn",
  ok: "bg-ally-soft text-ally",
  info: "bg-paper-2 text-ink/70",
} as const;

function DaysBadge({ status, days }: { status: keyof typeof TONE; days: number }) {
  const label = status === "info" ? (days >= 0 ? `in ${days} days` : `${-days} days ago`) : days < 0 ? `EXPIRED ${-days} days ago` : days === 0 ? "TODAY is the last day" : `${days} days left`;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${TONE[status]}`}>{label}</span>;
}

export function Deadlines() {
  const [today, setToday] = useState(todayISO());
  const [ruleId, setRuleId] = useState(RULES[0].id);
  const [trigger, setTrigger] = useState("");
  const [cheque, setCheque] = useState({ date: "", memo: "", received: "" });

  const rule = RULES.find((r) => r.id === ruleId)!;
  const result = useMemo(() => (trigger ? compute(rule, trigger, today) : null), [rule, trigger, today]);
  const ct = useMemo(() => (cheque.date && cheque.memo ? chequeTimeline(cheque.date, cheque.memo, today, cheque.received || undefined) : null), [cheque, today]);
  const cats = [...new Set(RULES.map((r) => r.category))];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-serif text-xl font-semibold">
            <CalendarClock className="h-5 w-5 text-gold" /> Limitation &amp; deadline calculator
          </h2>
          <label className="flex items-center gap-2 text-sm">
            Today
            <input type="date" value={today} onChange={(e) => setToday(e.target.value)} className="rounded-lg border border-ink/15 bg-white px-2 py-1" />
          </label>
        </div>
        <p className="mb-4 text-sm text-ink/60">
          Computed by rules, not AI. The day of the event is excluded (Limitation Act s. 12), and calendar months and years are used. Always confirm court holidays and any period excluded for obtaining certified copies.
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <select value={ruleId} onChange={(e) => setRuleId(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2.5">
            {cats.map((c) => (
              <optgroup key={c} label={c}>
                {RULES.filter((r) => r.category === c).map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} — {r.period.n} {r.period.unit}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <input type="date" value={trigger} onChange={(e) => setTrigger(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2.5" aria-label={rule.trigger} />
        </div>
        <p className="mt-1.5 text-xs text-ink/55">Date to enter: {rule.trigger}</p>

        {result && (
          <div className="rise mt-4 rounded-xl border border-ink/10 bg-paper/60 p-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className="text-sm text-ink/60">Last date</span>
              <span className="font-serif text-3xl font-bold">
                {new Date(result.deadline + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", weekday: "short", timeZone: "UTC" })}
              </span>
              <DaysBadge status={result.status} days={result.daysLeft} />
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-sm">
              <Landmark className="h-4 w-4 text-ink/50" /> {rule.basis} · {rule.period.n} {rule.period.unit}
              {rule.condonable ? " · delay may be condoned on sufficient cause" : " · no condonation of delay"}
            </p>
            {rule.note && <p className="mt-1 text-xs text-ink/60">↳ {rule.note}</p>}
            {result.weekendNote && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-warn-soft p-2 text-xs text-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {result.weekendNote}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-xl font-semibold">Cheque bounce timeline (NI Act s. 138 / 142)</h2>
        <p className="mb-4 text-sm text-ink/60">Strict statutory windows. Missing one usually kills the criminal complaint.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["date", "Date written on the cheque"],
              ["memo", "Date you received the bank's return memo"],
              ["received", "Date the drawer received your notice (optional)"],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="text-sm">
              <span className="mb-1 block text-xs font-semibold text-ink/60">{label}</span>
              <input type="date" value={cheque[k]} onChange={(e) => setCheque({ ...cheque, [k]: e.target.value })} className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2" />
            </label>
          ))}
        </div>
        {ct && (
          <div className="rise mt-4 space-y-2">
            {ct.steps.map((s) => (
              <div key={s.label} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink/10 bg-paper/60 px-4 py-2.5">
                <span className="min-w-[16rem] flex-1 text-sm font-medium">{s.label}</span>
                <span className="font-mono text-sm font-semibold">{s.date}</span>
                <DaysBadge status={s.status} days={s.daysLeft} />
                <span className="w-full text-xs text-ink/50">{s.basis}</span>
              </div>
            ))}
            {ct.warnings.map((w) => (
              <p key={w} className="flex items-start gap-1.5 rounded-lg bg-warn-soft p-2 text-xs text-warn">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {w}
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

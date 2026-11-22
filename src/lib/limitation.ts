// ───────── F13: Limitation & deadline calculator (deterministic — no AI) ─────────
// Computation follows the Limitation Act, 1963:
//  • s. 12(1): the day from which the period is reckoned is EXCLUDED → deadline = trigger + period.
//  • Calendar months/years (General Clauses Act s. 3(35)): same date in the later month; if that date
//    doesn't exist (e.g. 31 Feb), the last day of that month.
//  • s. 4: if the last day falls on a day the court is closed, the filing may be made on the day it
//    reopens. We flag Sundays; court holidays/vacations vary by court and must be checked locally.

export type Unit = "days" | "months" | "years";

export interface LimitationRule {
  id: string;
  category: "Civil suits" | "Appeals & review" | "Execution" | "Cheque bounce (NI Act)" | "Consumer" | "Arbitration" | "Tenancy" | "RTI";
  title: string;
  period: { n: number; unit: Unit };
  trigger: string; // what the date input means
  basis: string; // legal basis, human-readable
  sourceId?: string; // id in the statute library, when the section is available
  condonable: boolean; // can delay be condoned (e.g. Limitation Act s. 5)?
  note?: string;
}

export const RULES: LimitationRule[] = [
  // Civil suits — Limitation Act, Schedule
  { id: "lim-55", category: "Civil suits", title: "Suit for compensation for breach of contract", period: { n: 3, unit: "years" }, trigger: "Date the contract was broken", basis: "Limitation Act, 1963, Sch. Art. 55", condonable: false, note: "s. 5 condonation does not apply to suits. For successive breaches, time runs from each breach." },
  { id: "lim-19", category: "Civil suits", title: "Suit to recover money lent", period: { n: 3, unit: "years" }, trigger: "Date the loan was made", basis: "Limitation Act, 1963, Sch. Art. 19", condonable: false, note: "A written acknowledgment of liability before expiry restarts limitation (s. 18); a part-payment acknowledged in writing does too (s. 19)." },
  { id: "lim-54", category: "Civil suits", title: "Suit for specific performance of a contract", period: { n: 3, unit: "years" }, trigger: "Date fixed for performance (or date you had notice of refusal, if no date fixed)", basis: "Limitation Act, 1963, Sch. Art. 54", condonable: false },
  { id: "lim-113", category: "Civil suits", title: "Any other suit (residuary)", period: { n: 3, unit: "years" }, trigger: "Date the right to sue accrued", basis: "Limitation Act, 1963, Sch. Art. 113", condonable: false },
  { id: "lim-65", category: "Civil suits", title: "Suit for possession of immovable property based on title", period: { n: 12, unit: "years" }, trigger: "Date the defendant's possession became adverse to you", basis: "Limitation Act, 1963, Sch. Art. 65", condonable: false },
  { id: "lim-137", category: "Civil suits", title: "Any other application (residuary)", period: { n: 3, unit: "years" }, trigger: "Date the right to apply accrued", basis: "Limitation Act, 1963, Sch. Art. 137", condonable: true },

  // Appeals, review, revision
  { id: "lim-116a", category: "Appeals & review", title: "Civil appeal (CPC) to the High Court", period: { n: 90, unit: "days" }, trigger: "Date of the decree or order", basis: "Limitation Act, 1963, Sch. Art. 116(a)", condonable: true, note: "Time taken to obtain a certified copy of the decree/judgment is excluded (s. 12(2)–(3))." },
  { id: "lim-116b", category: "Appeals & review", title: "Civil appeal (CPC) to any other court", period: { n: 30, unit: "days" }, trigger: "Date of the decree or order", basis: "Limitation Act, 1963, Sch. Art. 116(b)", condonable: true, note: "Time taken to obtain a certified copy is excluded (s. 12)." },
  { id: "lim-123", category: "Appeals & review", title: "Set aside an ex parte decree", period: { n: 30, unit: "days" }, trigger: "Date of the decree (or date you learnt of it, if summons not duly served)", basis: "Limitation Act, 1963, Sch. Art. 123", condonable: true },
  { id: "lim-124", category: "Appeals & review", title: "Review of a judgment", period: { n: 30, unit: "days" }, trigger: "Date of the decree or order", basis: "Limitation Act, 1963, Sch. Art. 124", condonable: true },
  { id: "lim-131", category: "Appeals & review", title: "Revision petition", period: { n: 90, unit: "days" }, trigger: "Date of the decree or order", basis: "Limitation Act, 1963, Sch. Art. 131", condonable: true },
  { id: "lim-136", category: "Execution", title: "Execution of a decree (other than mandatory injunction)", period: { n: 12, unit: "years" }, trigger: "Date the decree became enforceable", basis: "Limitation Act, 1963, Sch. Art. 136", condonable: false },

  // Consumer
  { id: "cpa-69", category: "Consumer", title: "Consumer complaint (District/State/National Commission)", period: { n: 2, unit: "years" }, trigger: "Date the cause of action arose", basis: "Consumer Protection Act, 2019, s. 69(1)", condonable: true, note: "The Commission may admit a later complaint if you show sufficient cause (s. 69(2))." },
  { id: "cpa-41", category: "Consumer", title: "Appeal to the State Commission (against District Commission order)", period: { n: 45, unit: "days" }, trigger: "Date of the District Commission's order", basis: "Consumer Protection Act, 2019, s. 41", condonable: true, note: "Pre-deposit of 50% of the amount ordered is required." },
  { id: "cpa-51", category: "Consumer", title: "Appeal to the National Commission (against State Commission order)", period: { n: 30, unit: "days" }, trigger: "Date of the State Commission's order", basis: "Consumer Protection Act, 2019, s. 51", condonable: true },

  // Arbitration
  { id: "arb-34", category: "Arbitration", title: "Challenge an arbitral award (s. 34)", period: { n: 3, unit: "months" }, trigger: "Date you received the signed award", basis: "Arbitration and Conciliation Act, 1996, s. 34(3)", condonable: true, note: "The court may condone a further 30 days ONLY — never beyond (s. 34(3) proviso)." },

  // Tenancy
  { id: "tpa-106", category: "Tenancy", title: "Notice to quit a month-to-month lease", period: { n: 15, unit: "days" }, trigger: "Date the notice is received by the other party", basis: "Transfer of Property Act, 1882, s. 106(1)", condonable: false, note: "Applies only absent a contract or local law to the contrary; State Rent Acts often require more. The notice must be in writing, signed and properly served." },

  // RTI
  { id: "rti-19-1", category: "RTI", title: "RTI first appeal", period: { n: 30, unit: "days" }, trigger: "Date of the PIO's decision (or expiry of the 30-day reply period)", basis: "Right to Information Act, 2005, s. 19(1)", condonable: true },
  { id: "rti-19-3", category: "RTI", title: "RTI second appeal to the Information Commission", period: { n: 90, unit: "days" }, trigger: "Date of the first appellate decision (or when it should have been made)", basis: "Right to Information Act, 2005, s. 19(3)", condonable: true },
];

// ───────── date arithmetic (UTC, date-only) ─────────
export function parseDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
}

export const fmt = (d: Date) => d.toISOString().slice(0, 10);

export function addPeriod(d: Date, n: number, unit: Unit): Date {
  if (unit === "days") return new Date(d.getTime() + n * 86_400_000);
  const months = unit === "years" ? n * 12 : n;
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + months;
  const targetY = y + Math.floor(m / 12);
  const targetM = ((m % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetY, targetM + 1, 0)).getUTCDate();
  return new Date(Date.UTC(targetY, targetM, Math.min(d.getUTCDate(), lastDay)));
}

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86_400_000);

export interface DeadlineResult {
  rule: LimitationRule;
  trigger: string;
  deadline: string;
  daysLeft: number;
  status: "expired" | "urgent" | "soon" | "ok";
  weekendNote?: string;
}

export function compute(rule: LimitationRule, triggerISO: string, todayISO: string): DeadlineResult | null {
  const t = parseDate(triggerISO);
  const today = parseDate(todayISO);
  if (!t || !today) return null;
  const dl = addPeriod(t, rule.period.n, rule.period.unit);
  const daysLeft = daysBetween(today, dl);
  const status = daysLeft < 0 ? "expired" : daysLeft <= 7 ? "urgent" : daysLeft <= 30 ? "soon" : "ok";
  const weekendNote =
    dl.getUTCDay() === 0
      ? "The last day is a Sunday. If the court/office is closed, you may file on the next day it reopens (Limitation Act s. 4 / General Clauses Act s. 10). Check court holidays."
      : undefined;
  return { rule, trigger: triggerISO, deadline: fmt(dl), daysLeft, status, weekendNote };
}

// ───────── Cheque bounce (NI Act s. 138 / 142) timeline ─────────
export interface ChequeTimeline {
  steps: { label: string; date: string; basis: string; daysLeft: number; status: DeadlineResult["status"] | "info" }[];
  warnings: string[];
}

/**
 * @param chequeDate date written on the cheque
 * @param memoDate date you received the bank's dishonour memo (information of dishonour)
 * @param noticeReceived date the drawer received your demand notice (optional)
 */
export function chequeTimeline(chequeDate: string, memoDate: string, today: string, noticeReceived?: string): ChequeTimeline | null {
  const c = parseDate(chequeDate);
  const memo = parseDate(memoDate);
  const now = parseDate(today);
  if (!c || !memo || !now) return null;
  const st = (d: Date) => {
    const left = daysBetween(now, d);
    return { daysLeft: left, status: (left < 0 ? "expired" : left <= 7 ? "urgent" : left <= 30 ? "soon" : "ok") as DeadlineResult["status"] };
  };
  const warnings: string[] = [];
  const validity = addPeriod(c, 3, "months");
  if (daysBetween(validity, memo) > 0) warnings.push("The dishonour memo is dated after the cheque's 3-month validity — the cheque may not have been presented within validity, which defeats s. 138(a).");
  const noticeBy = addPeriod(memo, 30, "days");
  const steps: ChequeTimeline["steps"] = [
    { label: "Cheque valid for presentation until", date: fmt(validity), basis: "NI Act s. 138(a) proviso + RBI 3-month validity", ...st(validity), status: "info" },
    { label: "Send the written demand notice by", date: fmt(noticeBy), basis: "NI Act s. 138(b): within 30 days of receiving information of dishonour", ...st(noticeBy) },
  ];
  if (noticeReceived) {
    const nr = parseDate(noticeReceived);
    if (nr) {
      if (daysBetween(noticeBy, nr) > 0) warnings.push("The notice appears to have been received after the 30-day window — check the date it was SENT (it must be sent within 30 days).");
      const payBy = addPeriod(nr, 15, "days");
      const causeOfAction = addPeriod(payBy, 1, "days");
      // One month from the cause of action, excluding that day (Saketh India v. India Securities, (1999) 3 SCC 1).
      const complaintBy = addPeriod(causeOfAction, 1, "months");
      steps.push(
        { label: "Drawer must pay by", date: fmt(payBy), basis: "NI Act s. 138(c): within 15 days of receiving the notice", ...st(payBy), status: "info" },
        { label: "Cause of action arises (if unpaid) on", date: fmt(causeOfAction), basis: "Day after the 15-day period ends", ...st(causeOfAction), status: "info" },
        { label: "File the criminal complaint by", date: fmt(complaintBy), basis: "NI Act s. 142(1)(b): within one month of the cause of action", ...st(complaintBy) },
      );
    }
  } else {
    warnings.push("Enter the date the drawer received your notice to compute the payment and complaint deadlines.");
  }
  return { steps, warnings };
}

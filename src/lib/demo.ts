// Pre-computed hearings for the bundled rental sample so the app demos
// reliably without an API key (and offline on stage). Live mode runs the
// real multi-agent pipeline on any document.
import { CORPUS_BY_ID } from "./corpus";
import { findOldReferences } from "./bns-map";
import { RENTAL_SAMPLE } from "./samples";
import type { Clerk, Hearing, Issue, LedgerEntry, LedgerStatus } from "./types";
import { CORPUS_VERSION } from "./corpus";
import { maskDocument } from "./privacy";

const PRIVACY = maskDocument(RENTAL_SAMPLE).report;
const META = (createdAt: string) => ({ model: "recorded demo", corpusVersion: CORPUS_VERSION, createdAt, jurisdiction: "Karnataka" });

const clauses1: Clerk["clauses"] = [
  { id: "C1", title: "Term — 11 months", risk: "low", text: "The Landlord lets the residential flat No. 3B, Lakeview Residency, HSR Layout, Bengaluru to the Tenant for a period of eleven (11) months commencing 1st December 2026." },
  { id: "C2", title: "Rent & unilateral increase", risk: "high", text: "The Landlord may increase the rent at any time during the term by giving 7 days' notice, and the Tenant shall pay the increased rent." },
  { id: "C3", title: "Security deposit (10 months)", risk: "high", text: "The Tenant has paid an interest-free security deposit of Rs. 3,50,000/- (ten months' rent). The deposit shall be refunded within 90 days after the Tenant vacates, after deducting painting charges of one month's rent, cleaning charges, and any other amounts the Landlord deems fit. The Landlord's decision on deductions shall be final." },
  { id: "C4", title: "Lock-in, forfeiture & termination", risk: "high", text: "There is a lock-in of 11 months for the Tenant. If the Tenant vacates for any reason before 11 months, the entire security deposit shall stand forfeited. The Landlord may terminate this agreement at any time by giving 15 days' notice without assigning any reason." },
  { id: "C5", title: "Late fee & utility disconnection", risk: "high", text: "If rent is delayed beyond the 5th, the Tenant shall pay a penalty of Rs. 1,000/- per day. If rent remains unpaid for 10 days, the Landlord shall be entitled to disconnect electricity and water supply to the premises until payment." },
  { id: "C6", title: "Inspection without notice", risk: "medium", text: "The Landlord or his agents may enter and inspect the premises at any time without prior notice." },
  { id: "C7", title: "All repairs on tenant", risk: "medium", text: "All repairs of whatever nature, including structural repairs, seepage, plumbing and electrical faults, shall be done by the Tenant at her own cost." },
  { id: "C8", title: "Guest restriction", risk: "medium", text: "The Tenant shall not have overnight guests without prior written permission of the Landlord." },
  { id: "C9", title: "Unlimited indemnity", risk: "high", text: "The Tenant shall indemnify the Landlord against all losses, damages and claims of whatever nature arising in relation to the premises, howsoever caused, including due to the Landlord's own negligence." },
  { id: "C10", title: "30-day claim waiver", risk: "high", text: "Any claim by the Tenant arising out of this Agreement, including for refund of deposit, must be made in writing within 30 days of vacating, failing which the claim shall stand waived and extinguished forever." },
  { id: "C11", title: "Landlord-nominated arbitrator, Delhi seat", risk: "high", text: "All disputes shall be referred to the sole arbitration of a person nominated by the Landlord, whose decision shall be final and binding. The seat of arbitration shall be Delhi." },
  { id: "C12", title: "Criminal threat clause (IPC 420)", risk: "medium", text: "Any misrepresentation by the Tenant regarding her employment or income shall be treated as cheating punishable under Section 420 IPC, and the Landlord may lodge a complaint under Section 154 CrPC." },
  { id: "C13", title: "Free-will declaration", risk: "low", text: "Both parties have read and understood the terms of this agreement and sign it out of their own free will." },
];

const clerk1: Clerk = {
  docTitle: "Rental Agreement — Flat 3B, Lakeview Residency, HSR Layout",
  docType: "Residential Rental Agreement (11-month leave & licence style)",
  userSide: "Tenant",
  opponentSide: "Landlord",
  parties: ["Mr. Rakesh Malhotra (Landlord)", "Ms. Ananya Iyer (Tenant)"],
  summary:
    "An 11-month residential tenancy in Bengaluru at ₹35,000/month with a ₹3.5 lakh deposit. The landlord drafted it: nearly every risk-allocating clause — deposit, termination, penalties, repairs, disputes — is tilted heavily in his favour.",
  clauses: clauses1,
  admissibility: {
    stampDuty: "not_mentioned",
    registration: "not_required",
    note: "The agreement does not say it is on stamp paper or e-stamped. If unstamped, it is inadmissible in evidence until deficit duty and a penalty are paid under the Stamp Act (Karnataka has its own schedule), though not void. At 11 months it escapes compulsory registration under s. 17, which is why landlords use 11-month terms.",
    citations: ["STAMP-35", "SC-INTERPLAY-2023", "REG-17"],
  },
};

type Cite = [string, LedgerStatus, string];

interface IssueSpec {
  attack: Issue["attack"];
  attackChecks: Cite[];
  defense: NonNullable<Issue["defense"]>;
  defenseChecks: Cite[];
  ruling: NonNullable<Issue["ruling"]>;
}

const issues1: IssueSpec[] = [
  {
    attack: {
      id: "A1",
      clauseId: "C3",
      title: "Keep the ₹3.5 lakh deposit — 'Landlord's decision is final'",
      argument:
        "Clause 3 lets my client deduct 'any other amounts the Landlord deems fit' and makes his decision final; clause 10 extinguishes any claim not raised within 30 days. The tenant signed freely (clause 13). We will deduct painting, cleaning and 'damages' and simply hold the balance — the tenant must sue to get a rupee back.",
      exploitScenario:
        "Ananya vacates in November 2027. The landlord WhatsApps a deduction list of ₹2.1 lakh ('repainting, deep-cleaning, wear on fittings') and refunds ₹1.4 lakh after 90 days. Fighting it means a civil suit or arbitration in Delhi.",
      citations: ["ICA-10", "SC-ORIENTAL-2011"],
      severity: 9,
    },
    attackChecks: [
      ["ICA-10", "weak", "s. 10 states the general conditions of a valid contract; it does not make one-sided deduction rights immune from ss. 23, 28 and 74."],
      ["SC-ORIENTAL-2011", "fabricated", ""],
    ],
    defense: {
      attackId: "A1",
      argument:
        "A deposit is security, not a windfall. Deductions must be tied to proven loss — s. 74 caps recovery at reasonable compensation and Kailash Nath bars forfeiture without loss. The 30-day waiver in clause 10 is void under s. 28 because it extinguishes rights before the 3-year limitation period. Ten months' deposit is also five times the 2-month cap the Model Tenancy Act sets where adopted.",
      citations: ["ICA-74", "SC-KAILASHNATH-2015", "ICA-28", "LIM-55", "MTA-11"],
      strength: "moderate",
    },
    defenseChecks: [
      ["ICA-74", "verified", "Directly supports that only reasonable compensation up to the named sum is recoverable."],
      ["SC-KAILASHNATH-2015", "verified", "Holds forfeiture without actual loss is impermissible."],
      ["ICA-28", "verified", "s. 28 voids clauses that extinguish rights on expiry of a specified period."],
      ["LIM-55", "verified", "Three-year limitation for breach of contract claims."],
      ["MTA-11", "weak", "Cap is persuasive only — Karnataka has not adopted the Model Tenancy Act."],
    ],
    ruling: {
      attackId: "A1",
      winner: "split",
      reasoning:
        "In law the tenant wins: arbitrary deductions and the 30-day waiver will not survive ss. 28 and 74. But the landlord holds ₹3.5 lakh and the tenant must litigate to recover it — the practical leverage sits with the landlord. The fabricated precedent cited by opposing counsel was disregarded.",
    },
  },
  {
    attack: {
      id: "A2",
      clauseId: "C4",
      title: "Forfeit the whole deposit on early exit — and evict on 15 days' notice",
      argument:
        "Clause 4 binds the tenant to an 11-month lock-in with full forfeiture as pre-agreed liquidated damages, while my client may terminate on 15 days' notice without reasons. 15 days is the statutory default notice in any case.",
      exploitScenario:
        "Ananya gets a job transfer in month 5 — the landlord claims all ₹3.5 lakh. Or the landlord finds a tenant paying ₹45,000 and gives her 15 days to leave mid-term.",
      citations: ["SC-SAWPIPES-2003", "TPA-106"],
      severity: 8,
    },
    attackChecks: [
      ["SC-SAWPIPES-2003", "weak", "Saw Pipes protects a GENUINE pre-estimate of loss; forfeiting 10 months' rent for a vacancy that can be re-let in weeks is not one."],
      ["TPA-106", "verified", "15 days' notice is the default for month-to-month leases absent contrary contract."],
    ],
    defense: {
      attackId: "A2",
      argument:
        "Forfeiting ten months' rent bears no relation to actual loss (re-letting takes weeks) — a penalty capped by s. 74 and Kailash Nath. The one-way termination right is the classic unconscionable standard-form term struck down in Brojo Nath Ganguly.",
      citations: ["ICA-74", "SC-KAILASHNATH-2015", "SC-BROJONATH-1986"],
      strength: "moderate",
    },
    defenseChecks: [
      ["ICA-74", "verified", "Named sum is a ceiling; only reasonable compensation recoverable."],
      ["SC-KAILASHNATH-2015", "verified", "Forfeiture without loss not permitted."],
      ["SC-BROJONATH-1986", "weak", "Principle applies to unequal bargaining in standard forms; courts apply it cautiously to private tenancies."],
    ],
    ruling: {
      attackId: "A2",
      winner: "opponent",
      reasoning:
        "Full forfeiture would likely be cut down to a month or two of rent, but the landlord's 15-day no-reason termination right is enforceable as drafted and leaves the tenant with no security of tenure.",
    },
  },
  {
    attack: {
      id: "A3",
      clauseId: "C5",
      title: "₹1,000/day late penalty and switching off power & water",
      argument:
        "The tenant agreed to ₹1,000 per day — that is the agreed price of late payment. After 10 days my client may disconnect utilities; it is a contractual right she signed up to.",
      exploitScenario:
        "Salary is credited late one month; rent goes on the 20th. The landlord demands ₹15,000 in 'penalty' and cuts water until paid.",
      citations: ["ICA-10"],
      severity: 8,
    },
    attackChecks: [["ICA-10", "weak", "General validity provision; does not authorise penalties or self-help."]],
    defense: {
      attackId: "A3",
      argument:
        "₹30,000 a month in 'penalty' on ₹35,000 rent is a penalty, not a pre-estimate — recoverable only as reasonable compensation (s. 74). Cutting essential supplies is unlawful self-help; the Model Tenancy Act expressly forbids it and an agreement to do so is opposed to public policy.",
      citations: ["ICA-74", "MTA-20", "ICA-23"],
      strength: "strong",
    },
    defenseChecks: [
      ["ICA-74", "verified", "Penalty stipulations recoverable only as reasonable compensation."],
      ["MTA-20", "weak", "Express bar exists in the Model Act; persuasive in Karnataka."],
      ["ICA-23", "verified", "Agreements opposed to public policy are void."],
    ],
    ruling: {
      attackId: "A3",
      winner: "user",
      reasoning:
        "A ₹1,000/day charge is a penalty that a court will reduce to nominal interest; disconnecting water and power is unlawful self-help that no court will enforce.",
    },
  },
  {
    attack: {
      id: "A4",
      clauseId: "C11",
      title: "Our arbitrator, our city — Delhi",
      argument:
        "Clause 11 is a valid written arbitration agreement. My client nominates the arbitrator and the seat is Delhi, so the tenant must travel 2,000 km and pay for a forum we chose.",
      exploitScenario:
        "Any deposit dispute goes to the landlord's chosen arbitrator in Delhi — travel and fees exceed what Ananya is trying to recover.",
      citations: ["ARB-7"],
      severity: 7,
    },
    attackChecks: [["ARB-7", "verified", "A written arbitration clause is a valid arbitration agreement."]],
    defense: {
      attackId: "A4",
      argument:
        "Unilateral appointment by an interested party is void — s. 12(5) with the Seventh Schedule, Perkins Eastman, and the 2024 Constitution Bench in CORE. The tenant can seek a neutral appointment from the court.",
      citations: ["ARB-12-5", "SC-PERKINS-2019", "SC-CORE-2024"],
      strength: "strong",
    },
    defenseChecks: [
      ["ARB-12-5", "verified", "Interested persons are ineligible as arbitrators absent post-dispute written waiver."],
      ["SC-PERKINS-2019", "verified", "Interested party cannot unilaterally appoint sole arbitrator."],
      ["SC-CORE-2024", "verified", "Constitution Bench: unilateral appointment clauses unenforceable."],
    ],
    ruling: {
      attackId: "A4",
      winner: "user",
      reasoning:
        "The appointment mechanism is unenforceable under CORE (2024). The Delhi seat survives, which still adds cost, but the tenant wins this point.",
    },
  },
  {
    attack: {
      id: "A5",
      clauseId: "C9",
      title: "Make the tenant pay for everything — even the landlord's negligence",
      argument:
        "Clause 7 puts all repairs, including structural seepage, on the tenant, and clause 9 makes her indemnify my client for every loss 'howsoever caused'. Section 108 TPA expressly yields to a contrary contract.",
      exploitScenario:
        "The building's old wiring shorts and damages the landlord's sofa and the neighbour's flat. The landlord bills Ananya for both — plus the rewiring.",
      citations: ["TPA-108"],
      severity: 7,
    },
    attackChecks: [["TPA-108", "verified", "Lessor/lessee duties under s. 108 apply 'absent contrary contract' — the clause is a contrary contract."]],
    defense: {
      attackId: "A5",
      argument:
        "Shifting liability for the landlord's own negligence and structural defects onto a tenant with no bargaining power is unconscionable and against public policy.",
      citations: ["ICA-23", "SC-BROJONATH-1986"],
      strength: "weak",
    },
    defenseChecks: [
      ["ICA-23", "weak", "Public-policy challenge to indemnities is fact-dependent and uncertain."],
      ["SC-BROJONATH-1986", "weak", "Applied mainly against State/standard-form employers; extension to private leases is arguable."],
    ],
    ruling: {
      attackId: "A5",
      winner: "opponent",
      reasoning:
        "Indian courts generally enforce negotiated indemnities between private parties. The public-policy argument is arguable but uncertain — this is a real exposure for the tenant.",
    },
  },
  {
    attack: {
      id: "A6",
      clauseId: "C12",
      title: "Threaten a cheating FIR to pressure her",
      argument:
        "If her income disclosure was inaccurate, it is cheating. Police must register an FIR for a cognizable offence — that threat alone will secure payment.",
      exploitScenario:
        "During a deposit dispute, the landlord threatens to file an FIR alleging she lied about her salary.",
      citations: ["SC-LALITA-2014"],
      severity: 6,
    },
    attackChecks: [["SC-LALITA-2014", "weak", "Lalita Kumari requires an FIR only where information discloses a cognizable offence — a civil tenancy dispute does not."]],
    defense: {
      attackId: "A6",
      argument:
        "A contract cannot convert a civil breach into a crime. The clause also cites repealed law — IPC 420 and CrPC 154 were replaced on 1 July 2024 by BNS 318(4) and BNSS 173. And for offences punishable up to seven years, Arnesh Kumar bars automatic arrest.",
      citations: ["SC-ARNESH-2014", "ICA-23"],
      strength: "strong",
    },
    defenseChecks: [
      ["SC-ARNESH-2014", "verified", "Guards against automatic arrest for offences up to 7 years."],
      ["ICA-23", "verified", "A clause intended to intimidate a party with criminal process is opposed to public policy."],
    ],
    ruling: {
      attackId: "A6",
      winner: "user",
      reasoning:
        "This clause has no legal effect and shows the drafter relied on intimidation. It also cites repealed provisions.",
    },
  },
];

function assemble(specs: IssueSpec[]) {
  const issues: Issue[] = specs.map((s) => ({ attack: s.attack, defense: s.defense, ruling: s.ruling }));
  const ledger: LedgerEntry[] = [];
  for (const s of specs) {
    for (const [id, status, note] of s.attackChecks) {
      const src = CORPUS_BY_ID[id];
      ledger.push({
        ref: `${s.attack.id}:${id}`,
        by: "Opposing Counsel",
        claim: s.attack.argument,
        sourceId: id,
        sourceCite: src?.cite ?? id,
        sourceText: src?.text ?? "",
        status,
        note: status === "fabricated" ? "Source does not exist in the verified corpus — blocked by the hallucination firewall." : note,
      });
    }
    for (const [id, status, note] of s.defenseChecks) {
      const src = CORPUS_BY_ID[id];
      ledger.push({
        ref: `D-${s.attack.id}:${id}`,
        by: "Your Advocate",
        claim: s.defense.argument,
        sourceId: id,
        sourceCite: src?.cite ?? id,
        sourceText: src?.text ?? "",
        status,
        note,
      });
    }
  }
  return { issues, ledger };
}

function ipcFlags(text: string) {
  return findOldReferences(text).map((f) => ({
    match: f.match,
    replacement: f.mapping.newCode === "—" ? "No equivalent in new codes" : `${f.mapping.newCode} s. ${f.mapping.newSection}`,
    subject: f.mapping.subject,
    change: f.mapping.change,
  }));
}

const r1 = assemble(issues1);

export const DEMO_ROUND1: Hearing = {
  mode: "demo",
  round: 1,
  clerk: clerk1,
  issues: r1.issues,
  ledger: r1.ledger,
  ipcFlags: ipcFlags(RENTAL_SAMPLE),
  documentText: RENTAL_SAMPLE,
  judge: {
    rulings: issues1.map((s) => s.ruling),
    winProbability: 27,
    headline: "Signed as-is, the tenant loses most disputes — not on the law, but on leverage.",
    summary:
      "Several clauses are unenforceable (the 30-day claim waiver, the landlord-appointed arbitrator, utility disconnection, the criminal threat). But the landlord holds ₹3.5 lakh, can end the tenancy on 15 days' notice, and has shifted all repair and indemnity risk to the tenant. Enforcing her rights would mean costly proceedings, possibly in Delhi. Renegotiate before signing.",
    mustFix: ["C2", "C3", "C4", "C5", "C6", "C7", "C9", "C10", "C11", "C12"],
    probabilityRange: { low: 20, high: 35 },
    factors: [
      { name: "Legal merit", score: 55, weight: 30, note: "Several clauses are void (ss. 28, 74, CORE 2024), so on pure law the tenant does reasonably well." },
      { name: "Practical leverage", score: 10, weight: 30, note: "The landlord holds ₹3.5 lakh and possession, and can evict on 15 days' notice." },
      { name: "Cost & delay of enforcement", score: 15, weight: 25, note: "Recovering the deposit means a civil suit or a Delhi-seated arbitration, which takes months to years." },
      { name: "Evidence & paperwork", score: 25, weight: 15, note: "Stamp duty isn't shown. An unstamped copy is inadmissible until duty and a penalty are paid." },
    ],
    toRaise: [
      "Cut the deposit to 2 months and tie deductions to itemised bills.",
      "Make the lock-in and termination mutual, and drop the 15-day no-reason eviction right.",
      "Get the agreement e-stamped at the Karnataka rate before signing.",
      "Take dated move-in photos and video of the flat, and have both parties sign an inventory.",
    ],
    nextSteps: [
      { step: "Don't sign this draft. Send the redrafted clauses to the landlord.", forum: "Landlord (negotiation)", deadline: "Before signing", urgency: "now" },
      { step: "Insist the agreement is printed on e-stamp paper for the correct Karnataka stamp duty.", forum: "Sub-Registrar / e-stamp vendor", deadline: "Before signing", urgency: "now" },
      { step: "Pay the deposit by bank transfer only, with 'refundable security deposit' in the narration.", forum: "none", deadline: "At payment", urgency: "soon" },
      { step: "If the deposit is withheld after you vacate, send a legal notice demanding refund with interest.", forum: "Advocate's legal notice", deadline: "Within weeks of vacating", urgency: "later" },
      { step: "If still unpaid, file a civil recovery suit.", forum: "Civil Court", deadline: "Within 3 years (Limitation Act, Art. 55)", urgency: "later" },
    ],
  },
  privacy: PRIVACY,
  meta: META("2026-11-14T10:00:00.000Z"),
};

// ───────── Round 2: after the Drafter's fixes ─────────

const FALLBACKS: Record<string, [string, string]> = {
  C2: ["Accept one revision at renewal, capped at 7%.", "Any right to raise rent mid-term."],
  C3: ["Accept a 3-month deposit (₹1.05 lakh), refunded within 15 days with itemised bills.", "More than 3 months' deposit, or deductions at the landlord's sole discretion."],
  C4: ["Accept an 8-month lock-in if it binds both parties.", "Full deposit forfeiture, or eviction without reason."],
  C5: ["Accept a flat ₹100/day late fee, capped at 10% of monthly rent.", "Any right to cut water or electricity."],
  C6: ["Accept 12 hours' notice for inspections.", "Entry without notice."],
  C7: ["Raise the minor-repairs cap to ₹5,000.", "Paying for structural repairs or seepage."],
  C9: ["Accept an indemnity limited to the tenant's own negligence.", "Indemnifying the landlord's own negligence."],
  C10: ["Accept a 6-month notice-of-claim window that doesn't extinguish rights.", "Any clause that extinguishes the right to the deposit."],
  C11: ["Accept arbitration from an institution's panel (e.g. a local arbitration centre).", "A landlord-appointed arbitrator."],
  C12: ["Delete the clause entirely.", "Any criminal-threat clause."],
};

const NEGOTIATION_MESSAGE = `Dear Mr. Malhotra,

Thank you for sharing the draft rental agreement for Flat 3B. I'm keen to proceed, but I'd like a few clauses made fair to both of us before signing. These changes are already standard under Indian law:

1. A security deposit of 2 months' rent (₹70,000), refunded within 7 days of handover, with any deductions supported by bills.
2. A mutual 6-month lock-in, with one month's notice on either side after that.
3. Simple interest of 12% p.a. on late rent instead of ₹1,000 per day, and essential supplies are never disconnected.
4. Structural repairs stay with the owner, and minor repairs up to ₹2,000 are mine.
5. Any dispute goes to a mutually appointed arbitrator in Bengaluru. Under the Supreme Court's 2024 Constitution Bench ruling, a one-sided appointment clause isn't enforceable anyway.

I've attached a marked-up copy. I'm happy to discuss.

Warm regards,
Ananya Iyer`;

const fixSpecs: { clauseId: string; revised: string; rationale: string; citations: string[] }[] = [
  { clauseId: "C2", revised: "The rent shall remain fixed for the term of this Agreement. On renewal, rent may be revised by mutual written agreement, subject to a maximum increase of 5%.", rationale: "Removes the landlord's power to change the price mid-contract on his own; changes now need both parties' consent.", citations: ["ICA-14"] },
  { clauseId: "C3", revised: "The Tenant has paid a refundable security deposit of Rs. 70,000/- (two months' rent). The deposit shall be refunded within 7 days of the Tenant handing over vacant possession, less only reasonable costs of repairing damage beyond normal wear and tear, supported by itemised bills shared with the Tenant. Painting charges shall not be deducted.", rationale: "Deposit sized to Model Tenancy Act norms; deductions tied to proven loss per s. 74.", citations: ["MTA-11", "ICA-74"] },
  { clauseId: "C4", revised: "There is a lock-in of 6 months for both parties. After the lock-in, either party may terminate by giving one month's written notice. If the Tenant vacates during the lock-in, she shall pay rent for the unexpired lock-in period or one month's rent, whichever is lower. The Landlord may terminate during the term only for non-payment of rent for two consecutive months or material breach, after 30 days' written notice to cure.", rationale: "Lock-in and termination rights now bind both sides equally; the early-exit charge reflects the landlord's real loss.", citations: ["ICA-74", "SC-BROJONATH-1986"] },
  { clauseId: "C5", revised: "Rent paid after the 10th of the month shall carry simple interest at 12% per annum for the period of delay. The Landlord shall not, under any circumstances, disconnect or restrict electricity, water or any essential supply to the premises.", rationale: "Replaces the ₹1,000/day penalty with a reasonable interest charge and removes self-help.", citations: ["ICA-74", "MTA-20"] },
  { clauseId: "C6", revised: "The Landlord may inspect the premises between 8 a.m. and 8 p.m. after giving at least 24 hours' written or electronic notice, except in an emergency.", rationale: "Protects the tenant's privacy and quiet enjoyment.", citations: ["MTA-17", "TPA-108"] },
  { clauseId: "C7", revised: "Minor day-to-day repairs costing up to Rs. 2,000/- per instance shall be borne by the Tenant. Structural repairs, seepage, plumbing and electrical faults not caused by the Tenant's negligence shall be the Landlord's responsibility.", rationale: "Divides repair costs the way the Transfer of Property Act does by default.", citations: ["TPA-108"] },
  { clauseId: "C9", revised: "Each party shall indemnify the other for losses caused by its own negligence or wilful breach of this Agreement.", rationale: "The indemnity is now mutual and based on fault.", citations: ["ICA-73"] },
  { clauseId: "C10", revised: "Claims arising under this Agreement may be brought within the period prescribed by the Limitation Act, 1963.", rationale: "Replaces the 30-day waiver, which s. 28 makes void.", citations: ["ICA-28", "LIM-55"] },
  { clauseId: "C11", revised: "Disputes shall be referred to a sole arbitrator appointed by mutual consent of both parties, failing which by the competent court under the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Bengaluru. Proceedings may be conducted online.", rationale: "Neutral appointment as required by CORE (2024); seat moved to where the property is.", citations: ["SC-CORE-2024", "ARB-12-5"] },
  { clauseId: "C12", revised: "Any breach of this Agreement shall be addressed through the civil remedies available under this Agreement and applicable law.", rationale: "Removes the intimidation clause that cited repealed criminal law.", citations: ["ICA-23"] },
];

const fixes = fixSpecs.map((f) => {
  const orig = clauses1.find((c) => c.id === f.clauseId)!;
  const [fallback, walkAway] = FALLBACKS[f.clauseId] ?? ["", ""];
  return { ...f, original: orig.text, title: orig.title, fallback, walkAway };
});

let revisedDoc = RENTAL_SAMPLE;
for (const f of fixes) revisedDoc = revisedDoc.replace(f.original, f.revised);

const clauses2: Clerk["clauses"] = clauses1.map((c) => {
  const f = fixes.find((x) => x.clauseId === c.id);
  if (!f) return c.id === "C8" ? { ...c, risk: "low" } : c;
  const risk = c.id === "C4" || c.id === "C3" ? "low" : "safe";
  return { ...c, text: f.revised, risk };
});

const issues2: IssueSpec[] = [
  {
    attack: {
      id: "A1",
      clauseId: "C3",
      title: "Dispute 'wear and tear' to keep part of the deposit",
      argument: "The deposit has shrunk to ₹70,000, but whether damage is 'beyond normal wear and tear' is a matter of opinion. My client will still claim repainting and fixture damage.",
      exploitScenario: "The landlord claims ₹25,000 for scuffed walls and a broken towel rail.",
      citations: ["ICA-73"],
      severity: 4,
    },
    attackChecks: [["ICA-73", "verified", "Compensation for loss that naturally arises from breach is recoverable."]],
    defense: {
      attackId: "A1",
      argument: "Deductions now require itemised bills, painting is excluded, and the refund window is 7 days. Joint move-in and move-out photos settle any wear-and-tear disagreement.",
      citations: ["ICA-74", "SC-KAILASHNATH-2015"],
      strength: "strong",
    },
    defenseChecks: [
      ["ICA-74", "verified", "Recovery is limited to reasonable, proven compensation."],
      ["SC-KAILASHNATH-2015", "verified", "No forfeiture without actual loss."],
    ],
    ruling: { attackId: "A1", winner: "user", reasoning: "With bills required and painting excluded, any remaining dispute is small and the tenant holds the stronger evidence." },
  },
  {
    attack: {
      id: "A2",
      clauseId: "C4",
      title: "Use the lock-in charge as leverage",
      argument: "If she leaves in month 3, she owes up to a month's rent. We will hold that from the deposit.",
      exploitScenario: "Early transfer: ₹35,000 is deducted.",
      citations: ["ICA-74"],
      severity: 3,
    },
    attackChecks: [["ICA-74", "verified", "A named sum is recoverable as reasonable compensation up to the cap."]],
    defense: {
      attackId: "A2",
      argument: "The charge is capped at the lower of the unexpired lock-in rent or one month's rent — a genuine pre-estimate of re-letting loss, and it applies to both sides.",
      citations: ["SC-SAWPIPES-2003"],
      strength: "strong",
    },
    defenseChecks: [["SC-SAWPIPES-2003", "verified", "A genuine pre-estimate of loss is enforceable."]],
    ruling: { attackId: "A2", winner: "split", reasoning: "This is a fair, mutual commercial term. The tenant knows her maximum exposure in advance." },
  },
  {
    attack: {
      id: "A3",
      clauseId: "C11",
      title: "Delay through arbitration",
      argument: "Even with neutral appointment, arbitration takes months. My client can wait longer than she can.",
      exploitScenario: "A deposit dispute takes six months to resolve.",
      citations: ["ARB-7"],
      severity: 3,
    },
    attackChecks: [["ARB-7", "verified", "Valid written arbitration agreement."]],
    defense: {
      attackId: "A3",
      argument: "The seat is now Bengaluru, online hearings are allowed, and the arbitrator is neutral. At these amounts both parties have reason to settle quickly.",
      citations: ["SC-CORE-2024", "ARB-12-5"],
      strength: "strong",
    },
    defenseChecks: [
      ["SC-CORE-2024", "verified", "Mutual appointment satisfies equal treatment."],
      ["ARB-12-5", "verified", "Neutrality requirement met."],
    ],
    ruling: { attackId: "A3", winner: "user", reasoning: "The forum is now neutral and local. Delay is a minor residual risk." },
  },
];

const r2 = assemble(issues2);

export const DEMO_ROUND2: Hearing = {
  mode: "demo",
  round: 2,
  clerk: { ...clerk1, clauses: clauses2, summary: clerk1.summary.replace("The landlord drafted it", "Originally landlord-drafted; after Pratipaksh's redraft") },
  issues: r2.issues,
  ledger: r2.ledger,
  ipcFlags: ipcFlags(revisedDoc),
  documentText: revisedDoc,
  fixes,
  negotiationMessage: NEGOTIATION_MESSAGE,
  privacy: PRIVACY,
  meta: META("2026-11-14T10:05:00.000Z"),
  previousWinProbability: 27,
  judge: {
    rulings: issues2.map((s) => s.ruling),
    winProbability: 84,
    headline: "After the redraft, the risks are balanced and the tenant's exposure is capped.",
    summary:
      "The deposit, termination, penalty, repair, indemnity and dispute clauses are now mutual and enforceable. The tenant's worst case is one month's rent on early exit, plus small deductions backed by bills. Opposing counsel's remaining arguments are commercial points, not traps. This draft is safe to sign.",
    mustFix: [],
    probabilityRange: { low: 76, high: 90 },
    factors: [
      { name: "Legal merit", score: 95, weight: 30, note: "Every key clause is now mutual and enforceable." },
      { name: "Practical leverage", score: 75, weight: 30, note: "The deposit is small and refunded quickly, and eviction needs cause plus a chance to cure." },
      { name: "Cost & delay of enforcement", score: 80, weight: 25, note: "A neutral arbitrator in Bengaluru with online hearings. At these amounts both sides will want to settle." },
      { name: "Evidence & paperwork", score: 85, weight: 15, note: "Bills-based deductions and an inventory create a clear paper trail. Still make sure it's e-stamped." },
    ],
    toRaise: ["Get it e-stamped at the correct Karnataka rate.", "Sign a dated inventory and photo record at move-in."],
    nextSteps: [
      { step: "Send the negotiation message and the marked-up .docx to the landlord.", forum: "Landlord (negotiation)", deadline: "Before signing", urgency: "now" },
      { step: "Sign the agreed version on e-stamp paper. Both parties sign each page, with two witnesses.", forum: "e-stamp vendor", deadline: "Before moving in", urgency: "soon" },
      { step: "Keep the bank-transfer proof of the deposit and the move-in photos.", forum: "none", deadline: "At move-in", urgency: "soon" },
    ],
  },
};

export const DEMO_HINDI =
  "यह किराया अनुबंध अभी जैसा है, वैसे ही साइन करने पर किराएदार के जीतने की संभावना सिर्फ़ 27% है। मकान मालिक ने दस महीने का, यानी साढ़े तीन लाख रुपये का डिपॉज़िट लिया है, और कटौती का फ़ैसला भी अपने हाथ में रखा है। वह सिर्फ़ 15 दिन के नोटिस पर आपको निकाल सकता है, देर होने पर रोज़ एक हज़ार रुपये जुर्माना लेगा, और बिजली-पानी काट सकता है। अच्छी बात यह है कि कई शर्तें क़ानून में टिकती नहीं हैं। 30 दिन में दावा ख़त्म होने वाली शर्त, मकान मालिक का चुना हुआ मध्यस्थ, और बिजली-पानी काटना अवैध है। आईपीसी 420 वाली धमकी तो पुराने, रद्द हो चुके क़ानून पर टिकी है। प्रतिपक्ष के सुझाए बदलावों के बाद आपकी जीत की संभावना 84% हो जाती है। साइन करने से पहले इन शर्तों पर बात ज़रूर करें।";

export const DEMO_HINDI_2 =
  "अच्छी ख़बर है। प्रतिपक्ष ने दस कमज़ोर शर्तें दोबारा लिखी हैं, और अब आपकी जीत की संभावना 27% से बढ़कर 84% हो गई है। डिपॉज़िट अब सिर्फ़ दो महीने का, यानी सत्तर हज़ार रुपये है। यह घर ख़ाली करने के सात दिन के अंदर लौटाना होगा, और कटौती सिर्फ़ असली नुक़सान के बिल दिखाकर ही हो सकेगी। लॉक-इन अब दोनों तरफ़ छह महीने का है। जल्दी घर छोड़ने पर ज़्यादा से ज़्यादा एक महीने का किराया देना होगा। रोज़ के जुर्माने की जगह अब मामूली ब्याज लगेगा, और बिजली-पानी कभी नहीं काटा जा सकता। बड़ी मरम्मत मकान मालिक कराएगा। विवाद होने पर दोनों की सहमति से चुना गया मध्यस्थ, बेंगलुरु में ही फ़ैसला करेगा। यह नया मसौदा मकान मालिक को भेजें और इसी पर साइन करें।";

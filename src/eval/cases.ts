// ───────── F3: Evaluation set ─────────
// Each case lists the risky clauses an Indian practitioner would expect flagged ("expect") and
// clauses that are fair and should NOT be flagged high-risk ("safe"). Matching is by an anchor
// phrase that appears verbatim in the clause, so scoring is deterministic.
import { EMPLOYMENT_SAMPLE, RENTAL_SAMPLE } from "../lib/samples";

export interface EvalCase {
  id: string;
  title: string;
  side: string;
  state: string;
  doc: string;
  /** via "admissibility": counted as caught when the Clerk flags registration/stamp problems for this document */
  expect: { anchor: string; issue: string; via?: "admissibility" }[];
  safe: { anchor: string; what: string }[];
}

export const CASES: EvalCase[] = [
  {
    id: "rent-blr",
    title: "One-sided rental agreement (Bengaluru)",
    side: "Tenant",
    state: "Karnataka",
    doc: RENTAL_SAMPLE,
    expect: [
      { anchor: "ten months' rent", issue: "Excessive deposit with discretionary deductions" },
      { anchor: "without assigning any reason", issue: "Landlord's unilateral 15-day termination" },
      { anchor: "1,000/- per day", issue: "Penal late fee" },
      { anchor: "disconnect electricity", issue: "Utility disconnection (self-help)" },
      { anchor: "without prior notice", issue: "Entry without notice" },
      { anchor: "structural repairs", issue: "All repairs on tenant" },
      { anchor: "Landlord's own negligence", issue: "Indemnity for landlord's negligence" },
      { anchor: "within 30 days of vacating", issue: "Claim waiver (s. 28)" },
      { anchor: "nominated by the Landlord", issue: "Unilateral arbitrator" },
      { anchor: "Section 420 IPC", issue: "Criminal threat / repealed law" },
    ],
    safe: [{ anchor: "eleven (11) months", what: "Term of 11 months" }],
  },
  {
    id: "emp-pune",
    title: "Predatory employment contract (Pune)",
    side: "Employee",
    state: "Maharashtra",
    doc: EMPLOYMENT_SAMPLE,
    expect: [
      { anchor: "refuse to accept the resignation", issue: "Asymmetric notice / refusal of resignation" },
      { anchor: "5,00,000", issue: "Service bond penalty" },
      { anchor: "2 years after leaving", issue: "Post-employment non-compete (s. 27)" },
      { anchor: "within 90 days of the last working day", issue: "Delayed full & final (Code on Wages s. 17)" },
      { anchor: "without limit", issue: "Unlimited deductions (s. 18)" },
      { anchor: "personal time", issue: "Overbroad IP assignment" },
      { anchor: "personal devices", issue: "Invasive monitoring (privacy)" },
      { anchor: "waives the right to approach any court", issue: "Ouster of courts / HR as arbiter" },
    ],
    safe: [{ anchor: "Senior Software Engineer", what: "Designation & CTC" }],
  },
  {
    id: "nda",
    title: "One-way NDA with a startup",
    side: "Recipient (consultant)",
    state: "Karnataka",
    doc: `NON-DISCLOSURE AGREEMENT
This Agreement is made on 2 November 2026 between Zentrix AI Pvt. Ltd. ("Company") and Mr. Kabir Rao ("Consultant").
1. CONFIDENTIAL INFORMATION: All information disclosed by the Company in any form, including information that is already public or later becomes public, is Confidential Information.
2. OBLIGATIONS: The Consultant shall keep Confidential Information secret and shall return all Confidential Information on request.
3. TERM: The obligations under this Agreement shall survive in perpetuity.
4. NON-SOLICITATION: For five years after the engagement ends, the Consultant shall not work for or provide services to any client or competitor of the Company anywhere in the world.
5. LIQUIDATED DAMAGES: For every breach, the Consultant shall pay Rs. 50,00,000 as liquidated damages without proof of any loss.
6. JURISDICTION: Only the courts of New York, USA shall have jurisdiction, and the laws of the State of New York shall apply.
7. NOTICES: Notices shall be sent by email to the addresses on record.`,
    expect: [
      { anchor: "already public", issue: "Public information treated as confidential" },
      { anchor: "survive in perpetuity", issue: "Perpetual obligations" },
      { anchor: "five years after the engagement ends", issue: "Post-term restraint (s. 27)" },
      { anchor: "50,00,000", issue: "Penal liquidated damages (s. 74)" },
      { anchor: "courts of New York", issue: "Foreign exclusive jurisdiction / cost" },
    ],
    safe: [{ anchor: "sent by email", what: "Notice by email" }],
  },
  {
    id: "freelance",
    title: "Freelance design services agreement",
    side: "Freelancer",
    state: "Delhi",
    doc: `SERVICES AGREEMENT
Between BrightLeaf Media Pvt. Ltd. ("Client") and Ms. Sana Qureshi ("Designer"), dated 1 November 2026.
1. SERVICES: The Designer shall create brand identity designs as described in Annexure A.
2. INVOICING: The Designer shall invoice monthly for work completed.
3. PAYMENT: The Client shall pay within 120 days of invoice, and may withhold any payment at its sole discretion if it is not satisfied, without giving reasons.
4. INTELLECTUAL PROPERTY: All work product, and all pre-existing tools, templates, fonts and know-how of the Designer used in the work, shall vest in the Client absolutely.
5. LIABILITY: The Designer shall be liable without limit for all direct, indirect and consequential losses of the Client.
6. TERMINATION: The Client may terminate at any time and shall not be required to pay for work already completed.
7. GOVERNING LAW: This agreement is governed by the laws of India and courts at Delhi.`,
    expect: [
      { anchor: "within 120 days", issue: "Long payment term" },
      { anchor: "withhold any payment at its sole discretion", issue: "Discretionary withholding" },
      { anchor: "pre-existing tools", issue: "Assignment of pre-existing IP" },
      { anchor: "without limit", issue: "Unlimited liability incl. consequential" },
      { anchor: "not be required to pay for work already completed", issue: "No payment for completed work on termination" },
    ],
    safe: [
      { anchor: "invoice monthly", what: "Monthly invoicing" },
      { anchor: "laws of India and courts at Delhi", what: "Governing law" },
    ],
  },
  {
    id: "builder",
    title: "Builder–buyer agreement (flat purchase)",
    side: "Buyer",
    state: "Haryana",
    doc: `AGREEMENT FOR SALE
Between Skyline Infra Developers Ltd. ("Developer") and Mr. Vikram Sethi ("Allottee"), for Flat 1204, Tower C, Sector 89, Gurugram, carpet area 1,150 sq. ft.
1. PRICE: The total price is Rs. 1,20,00,000 payable as per the construction-linked plan.
2. POSSESSION: The tentative date of possession is 31 December 2028, with a grace period of 12 months, which may be further extended at the Developer's discretion.
3. DELAY COMPENSATION: For delay beyond the grace period, the Developer shall pay Rs. 5 per sq. ft. per month.
4. ALLOTTEE'S DEFAULT: Any delayed instalment shall carry interest at 18% per annum.
5. CANCELLATION: If the Allottee cancels for any reason, 20% of the total price shall be forfeited as earnest money.
6. CHANGES: The Developer may change the layout, specifications and common areas without the consent of the Allottee.
7. CARPET AREA: The carpet area of the flat is 1,150 sq. ft. as defined under applicable law.`,
    expect: [
      { anchor: "further extended at the Developer's discretion", issue: "Open-ended possession date" },
      { anchor: "Rs. 5 per sq. ft.", issue: "Token delay compensation vs 18% buyer interest" },
      { anchor: "20% of the total price shall be forfeited", issue: "Disproportionate forfeiture (Pioneer, s. 74)" },
      { anchor: "without the consent of the Allottee", issue: "Unilateral layout changes" },
    ],
    safe: [{ anchor: "as defined under applicable law", what: "Carpet-area definition" }],
  },
  {
    id: "loan",
    title: "Private loan agreement",
    side: "Borrower",
    state: "Uttar Pradesh",
    doc: `LOAN AGREEMENT
Between Mr. Harish Gupta ("Lender") and Mr. Deepak Yadav ("Borrower"), dated 5 November 2026.
1. LOAN AMOUNT: The Lender lends Rs. 5,00,000 to the Borrower by bank transfer.
2. INTEREST: Interest shall be charged at 36% per annum, compounded monthly.
3. SECURITY: The Borrower shall hand over three signed blank cheques as security.
4. RECOVERY: On any default, the Lender or his agents may enter the Borrower's house and take away goods of equivalent value without any court order.
5. NOTICE: The Borrower waives the right to receive any notice before recovery action.
6. REPAYMENT: The loan is repayable in 12 equal monthly instalments.`,
    expect: [
      { anchor: "36% per annum, compounded monthly", issue: "Usurious compound interest" },
      { anchor: "signed blank cheques", issue: "Blank cheques as security (s. 138 exposure)" },
      { anchor: "without any court order", issue: "Self-help recovery / trespass" },
      { anchor: "waives the right to receive any notice", issue: "Waiver of notice" },
    ],
    safe: [
      { anchor: "by bank transfer", what: "Disbursal by bank transfer" },
      { anchor: "12 equal monthly instalments", what: "Repayment schedule" },
    ],
  },
  {
    id: "gym",
    title: "Gym membership terms (consumer)",
    side: "Member",
    state: "Tamil Nadu",
    doc: `MEMBERSHIP TERMS — IronPeak Fitness Pvt. Ltd.
1. MEMBERSHIP: Membership is personal and non-transferable.
2. FEES: Annual fees of Rs. 36,000 are payable in advance.
3. REFUNDS: No refund shall be given under any circumstances, including closure of the gym, relocation or medical unfitness.
4. LIABILITY: The member waives all claims for injury or loss, including those caused by the negligence of IronPeak staff or faulty equipment.
5. AUTO-RENEWAL: Membership renews automatically for 12 months and can be cancelled only by a written letter delivered in person 90 days before renewal.
6. TIMINGS: The gym is open from 6 a.m. to 10 p.m.`,
    expect: [
      { anchor: "No refund shall be given under any circumstances", issue: "No refund even if gym closes (unfair contract)" },
      { anchor: "negligence of IronPeak staff", issue: "Exclusion of liability for own negligence" },
      { anchor: "delivered in person 90 days before renewal", issue: "Onerous auto-renewal cancellation" },
    ],
    safe: [
      { anchor: "personal and non-transferable", what: "Non-transferable membership" },
      { anchor: "6 a.m. to 10 p.m.", what: "Timings" },
    ],
  },
  {
    id: "lnl-mumbai",
    title: "Leave & licence (Mumbai) — unregistered",
    side: "Licensee",
    state: "Maharashtra",
    doc: `LEAVE AND LICENCE AGREEMENT
This agreement is made at Mumbai on 1 November 2026 between Mrs. Leela Desai ("Licensor") and Mr. Arun Pillai ("Licensee") for Flat 702, Sea Breeze CHS, Andheri West, Mumbai. This agreement is executed on plain paper and the parties agree that it need not be registered.
1. PERIOD: The licence is for 24 months from 1 November 2026.
2. FEE: The licence fee is Rs. 55,000 per month.
3. DEPOSIT: An interest-free deposit of Rs. 3,00,000 is payable.
4. CHARGES: The Licensee shall pay all society charges including sinking fund, major repair fund and property tax.
5. EVICTION: If the fee is unpaid for 5 days, the Licensor may change the locks and remove the Licensee's belongings.
6. USE: The premises shall be used for residence only.`,
    expect: [
      { anchor: "need not be registered", issue: "Unregistered/unstamped L&L (MRCA s. 55)", via: "admissibility" },
      { anchor: "major repair fund and property tax", issue: "Owner's outgoings shifted to licensee" },
      { anchor: "change the locks", issue: "Self-help eviction" },
    ],
    safe: [{ anchor: "residence only", what: "Residential use" }],
  },
  {
    id: "vendor",
    title: "Vendor supply agreement (MSME supplier)",
    side: "Supplier",
    state: "Gujarat",
    doc: `SUPPLY AGREEMENT
Between MegaMart Retail Ltd. ("Buyer") and Patel Packaging Works ("Supplier"), dated 3 November 2026.
1. SUPPLY: The Supplier shall supply corrugated boxes as per purchase orders.
2. PAYMENT: The Buyer shall pay within 180 days of delivery.
3. LIABILITY: The Supplier shall be liable for all consequential losses of the Buyer, including loss of profit, without any cap.
4. TERMINATION: The Buyer may terminate for convenience on 1 day's notice and shall not pay for stock already manufactured for its orders.
5. QUALITY: Goods shall conform to the specifications in each purchase order.
6. DISPUTES: Disputes shall be resolved by an arbitrator appointed solely by the Buyer.`,
    expect: [
      { anchor: "within 180 days of delivery", issue: "Payment term far beyond MSME 45-day norm" },
      { anchor: "without any cap", issue: "Uncapped consequential liability" },
      { anchor: "shall not pay for stock already manufactured", issue: "Termination without paying for committed stock" },
      { anchor: "appointed solely by the Buyer", issue: "Unilateral arbitrator (CORE 2024)" },
    ],
    safe: [{ anchor: "conform to the specifications", what: "Quality clause" }],
  },
  {
    id: "fair-rent",
    title: "CONTROL: a fair, balanced rental agreement",
    side: "Tenant",
    state: "Karnataka",
    doc: `RENTAL AGREEMENT
Made at Bengaluru on 1 December 2026 between Mr. Suresh Nair ("Landlord") and Ms. Priya Menon ("Tenant") for Flat 5A, Palm Grove, Koramangala. Executed on e-stamp paper of appropriate value.
1. TERM: Eleven months from 1 December 2026, renewable by mutual consent.
2. RENT: Rs. 30,000 per month, payable by the 5th of each month by bank transfer.
3. DEPOSIT: A refundable deposit of Rs. 60,000 (two months' rent), refunded within 7 days of handover, less only documented costs of damage beyond normal wear and tear.
4. LOCK-IN: A mutual lock-in of 6 months; thereafter either party may terminate with one month's written notice.
5. INSPECTION: The Landlord may inspect with 24 hours' notice between 9 a.m. and 7 p.m.
6. REPAIRS: Minor repairs up to Rs. 2,000 are the Tenant's; structural repairs are the Landlord's.
7. ESSENTIAL SERVICES: The Landlord shall not disconnect water or electricity.
8. DISPUTES: Disputes shall be referred to a sole arbitrator appointed by mutual consent, seated at Bengaluru.`,
    expect: [],
    safe: [
      { anchor: "two months' rent", what: "Reasonable deposit" },
      { anchor: "mutual lock-in", what: "Mutual lock-in" },
      { anchor: "24 hours' notice", what: "Inspection with notice" },
      { anchor: "shall not disconnect water", what: "Essential services protected" },
      { anchor: "appointed by mutual consent", what: "Neutral arbitration" },
    ],
  },
];

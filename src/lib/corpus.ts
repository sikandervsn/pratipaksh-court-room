// Curated Indian legal source corpus used for retrieval-grounded argumentation.
// Every agent may ONLY cite IDs from this corpus. The Verifier agent checks
// that each cited source exists AND actually supports the claim (Proof Ledger).
//
// Texts are concise plain-English summaries of the provision / holding written
// for this project — not verbatim reproductions. Always confirm against the
// official text (indiacode.nic.in / sci.gov.in) before relying on them.

export type SourceKind = "statute" | "judgment";

export interface LegalSource {
  id: string;
  kind: SourceKind;
  title: string; // short human title
  cite: string; // formal citation
  text: string; // summary of what it says / holds
  tags: string[];
}

export const CORPUS: LegalSource[] = [
  // ───────────── Indian Contract Act, 1872 ─────────────
  {
    id: "ICA-10",
    kind: "statute",
    title: "What agreements are contracts",
    cite: "Indian Contract Act, 1872, s. 10",
    text: "Agreements are contracts if made by free consent of parties competent to contract, for a lawful consideration and with a lawful object, and not expressly declared void.",
    tags: ["contract", "validity"],
  },
  {
    id: "ICA-14",
    kind: "statute",
    title: "Free consent",
    cite: "Indian Contract Act, 1872, s. 14",
    text: "Consent is free when not caused by coercion, undue influence, fraud, misrepresentation or mistake.",
    tags: ["contract", "consent"],
  },
  {
    id: "ICA-16",
    kind: "statute",
    title: "Undue influence",
    cite: "Indian Contract Act, 1872, s. 16",
    text: "A contract is induced by undue influence where one party is in a position to dominate the will of the other and uses that position to obtain an unfair advantage; where the transaction appears unconscionable, the burden of proving no undue influence lies on the dominant party.",
    tags: ["contract", "consent", "unequal bargaining"],
  },
  {
    id: "ICA-23",
    kind: "statute",
    title: "Unlawful consideration / object; opposed to public policy",
    cite: "Indian Contract Act, 1872, s. 23",
    text: "The consideration or object of an agreement is unlawful if forbidden by law, would defeat any law, is fraudulent, injures person or property, or is immoral or opposed to public policy. Such agreements are void.",
    tags: ["contract", "public policy", "void"],
  },
  {
    id: "ICA-27",
    kind: "statute",
    title: "Agreement in restraint of trade void",
    cite: "Indian Contract Act, 1872, s. 27",
    text: "Every agreement by which anyone is restrained from exercising a lawful profession, trade or business of any kind is void to that extent. The only statutory exception is a seller of goodwill agreeing not to carry on a similar business within specified local limits, if reasonable.",
    tags: ["contract", "non-compete", "employment", "restraint of trade"],
  },
  {
    id: "ICA-28",
    kind: "statute",
    title: "Agreements in restraint of legal proceedings void",
    cite: "Indian Contract Act, 1872, s. 28",
    text: "An agreement that absolutely restricts a party from enforcing contractual rights through ordinary legal proceedings, limits the time within which rights may be enforced, or extinguishes rights / discharges liability on expiry of a specified period, is void to that extent. Agreements to refer disputes to arbitration are saved.",
    tags: ["contract", "limitation", "jurisdiction", "arbitration"],
  },
  {
    id: "ICA-56",
    kind: "statute",
    title: "Impossibility / frustration",
    cite: "Indian Contract Act, 1872, s. 56",
    text: "An agreement to do an act impossible in itself is void; a contract to do an act which, after it is made, becomes impossible or unlawful through events the promisor could not prevent, becomes void when the act becomes impossible or unlawful.",
    tags: ["contract", "force majeure", "frustration"],
  },
  {
    id: "ICA-73",
    kind: "statute",
    title: "Compensation for breach",
    cite: "Indian Contract Act, 1872, s. 73",
    text: "On breach, the injured party is entitled to compensation for loss which naturally arose in the usual course of things or which the parties knew, when contracting, to be likely to result. No compensation for remote or indirect loss.",
    tags: ["contract", "damages", "breach"],
  },
  {
    id: "ICA-74",
    kind: "statute",
    title: "Penalty / liquidated damages capped at reasonable compensation",
    cite: "Indian Contract Act, 1872, s. 74",
    text: "Where a contract names a sum payable on breach (or contains a penalty stipulation), the aggrieved party may recover only reasonable compensation not exceeding the amount named — the named sum is a ceiling, not an automatic entitlement.",
    tags: ["contract", "penalty", "liquidated damages", "forfeiture", "deposit"],
  },

  // ───────────── Property / tenancy ─────────────
  {
    id: "TPA-105",
    kind: "statute",
    title: "Lease defined",
    cite: "Transfer of Property Act, 1882, s. 105",
    text: "A lease of immovable property is a transfer of a right to enjoy the property for a certain time, in consideration of a price paid or promised (rent).",
    tags: ["tenancy", "lease"],
  },
  {
    id: "TPA-106",
    kind: "statute",
    title: "Duration of leases absent written contract; notice to quit",
    cite: "Transfer of Property Act, 1882, s. 106",
    text: "Absent a contract or local law to the contrary, a lease for purposes other than agriculture/manufacture is deemed month-to-month, terminable by either party on 15 days' notice. Notice must be in writing, signed and properly served.",
    tags: ["tenancy", "notice", "termination", "eviction"],
  },
  {
    id: "TPA-108",
    kind: "statute",
    title: "Rights and liabilities of lessor and lessee",
    cite: "Transfer of Property Act, 1882, s. 108",
    text: "Absent contrary contract, the lessor must put the lessee in possession and the lessee is entitled to quiet enjoyment; the lessee must keep and restore the property in as good condition as received, subject to reasonable wear and tear and irresistible force.",
    tags: ["tenancy", "repairs", "quiet enjoyment", "maintenance"],
  },
  {
    id: "REG-17",
    kind: "statute",
    title: "Compulsory registration of leases over one year",
    cite: "Registration Act, 1908, s. 17(1)(d)",
    text: "Leases of immovable property from year to year, or for any term exceeding one year, or reserving a yearly rent, must be registered.",
    tags: ["tenancy", "registration", "lease term"],
  },
  {
    id: "REG-49",
    kind: "statute",
    title: "Effect of non-registration",
    cite: "Registration Act, 1908, s. 49",
    text: "A document required to be registered but not registered does not affect the immovable property comprised in it and cannot be received as evidence of the transaction affecting that property (save for collateral purposes / specific performance).",
    tags: ["tenancy", "registration", "evidence"],
  },
  {
    id: "MTA-11",
    kind: "statute",
    title: "Security deposit cap",
    cite: "Model Tenancy Act, 2021, s. 11",
    text: "Security deposit for residential premises may not exceed two months' rent (six months for non-residential), and must be refunded at the time of taking over vacant possession, after due deductions. (Model law — applies only in States that have adopted it; elsewhere the State Rent Act governs.)",
    tags: ["tenancy", "deposit", "refund"],
  },
  {
    id: "MTA-17",
    kind: "statute",
    title: "Landlord's entry requires prior notice",
    cite: "Model Tenancy Act, 2021, s. 17",
    text: "The landlord may enter the premises for inspection or repairs only after giving at least 24 hours' prior written or electronic notice, and at reasonable hours. (Model law — applies where adopted.)",
    tags: ["tenancy", "entry", "privacy", "quiet enjoyment"],
  },
  {
    id: "MTA-20",
    kind: "statute",
    title: "No withholding of essential supplies",
    cite: "Model Tenancy Act, 2021, s. 20",
    text: "The landlord shall not cut off or withhold essential supplies or services (water, electricity, etc.) in the premises let out to the tenant; the Rent Authority may order restoration. (Model law — applies where adopted.)",
    tags: ["tenancy", "essential services", "self-help eviction"],
  },
  {
    id: "MTA-23",
    kind: "statute",
    title: "Tenant holding over — enhanced rent",
    cite: "Model Tenancy Act, 2021, s. 23",
    text: "A tenant who fails to vacate on expiry/termination becomes liable to pay double the monthly rent for two months and four times the monthly rent thereafter. (Model law — applies where adopted.)",
    tags: ["tenancy", "holding over", "penalty"],
  },

  {
    id: "MRCA-55",
    kind: "statute",
    title: "Maharashtra: tenancy / leave & licence must be written and registered",
    cite: "Maharashtra Rent Control Act, 1999, s. 55",
    text: "Any agreement for leave and licence or letting of premises in Maharashtra must be in writing and registered; the responsibility to register is on the landlord, and absent a registered written agreement the tenant's version of the terms prevails unless otherwise proved. Failure is also punishable.",
    tags: ["tenancy", "registration", "maharashtra", "leave and licence"],
  },

  // ───────────── Stamp duty / admissibility / privilege ─────────────
  {
    id: "STAMP-35",
    kind: "statute",
    title: "Unstamped instruments inadmissible until duty and penalty paid",
    cite: "Indian Stamp Act, 1899, s. 35",
    text: "An instrument chargeable with stamp duty is not admissible in evidence for any purpose, nor acted upon, unless duly stamped; it may be admitted on payment of the deficit duty and a penalty (up to ten times the deficiency). States have their own Stamp Acts / schedules fixing the rates.",
    tags: ["stamp duty", "admissibility", "evidence", "tenancy"],
  },
  {
    id: "SC-INTERPLAY-2023",
    kind: "judgment",
    title: "In re: Interplay between Arbitration Agreements and the Indian Stamp Act",
    cite: "2023 INSC 1066 (Seven-Judge Bench)",
    text: "Agreements that are unstamped or insufficiently stamped are inadmissible in evidence under s. 35 of the Stamp Act but are not void or unenforceable ab initio; the defect is curable by paying duty and penalty, and does not bar the appointment of an arbitrator.",
    tags: ["stamp duty", "arbitration", "admissibility"],
  },
  {
    id: "BSA-132",
    kind: "statute",
    title: "Professional communications are privileged",
    cite: "Bharatiya Sakshya Adhiniyam, 2023, s. 132 (earlier Evidence Act s. 126)",
    text: "An advocate shall not, without the client's express consent, disclose any communication made in the course and for the purpose of professional employment, or the contents of documents with which the advocate became acquainted in that course.",
    tags: ["privilege", "confidentiality", "evidence"],
  },

  // ───────────── Employment / wages ─────────────
  {
    id: "COW-17",
    kind: "statute",
    title: "Time limit for payment of wages",
    cite: "Code on Wages, 2019, s. 17",
    text: "Monthly wages must be paid before the expiry of the seventh day of the succeeding month; where an employee is removed, dismissed, retrenched or resigns, wages due must be paid within two working days.",
    tags: ["employment", "wages", "full and final", "settlement"],
  },
  {
    id: "COW-18",
    kind: "statute",
    title: "Only authorised deductions from wages",
    cite: "Code on Wages, 2019, s. 18",
    text: "Deductions from wages may be made only as authorised by the Code (e.g., fines, absence, damage or loss directly attributable to the employee, advances, taxes), and total deductions are capped at 50% of wages.",
    tags: ["employment", "wages", "deduction", "recovery"],
  },

  // ───────────── Arbitration ─────────────
  {
    id: "ARB-7",
    kind: "statute",
    title: "Arbitration agreement",
    cite: "Arbitration and Conciliation Act, 1996, s. 7",
    text: "An arbitration agreement must be in writing and may be a clause in a contract or a separate agreement, including via exchange of letters or electronic communications.",
    tags: ["arbitration", "dispute resolution"],
  },
  {
    id: "ARB-12-5",
    kind: "statute",
    title: "Ineligibility of interested arbitrators",
    cite: "Arbitration and Conciliation Act, 1996, s. 12(5) r/w Seventh Schedule",
    text: "Notwithstanding any prior agreement, a person whose relationship with the parties, counsel or subject-matter falls in the Seventh Schedule (e.g., employee, consultant, or person with business relationship with a party) is ineligible to be appointed arbitrator, unless the parties expressly waive this in writing after the dispute arises.",
    tags: ["arbitration", "unilateral appointment", "neutrality"],
  },

  // ───────────── Consumer protection ─────────────
  {
    id: "CPA-2-46",
    kind: "statute",
    title: "Unfair contract defined",
    cite: "Consumer Protection Act, 2019, s. 2(46)",
    text: "An 'unfair contract' is one between a manufacturer/trader/service provider and a consumer with terms causing significant change in consumer rights, including: excessive security deposits; disproportionate penalties for breach; refusing early repayment; unilateral termination without reasonable cause; assignment to the consumer's detriment; or unreasonable charges/obligations.",
    tags: ["consumer", "unfair terms", "deposit", "penalty", "termination"],
  },
  {
    id: "CPA-49",
    kind: "statute",
    title: "Commissions can declare unfair contract terms void",
    cite: "Consumer Protection Act, 2019, ss. 49(2) & 59(2)",
    text: "The State Commission and National Commission may declare any terms of a contract which are unfair to a consumer to be null and void.",
    tags: ["consumer", "unfair terms", "remedy"],
  },
  {
    id: "CPA-69",
    kind: "statute",
    title: "Limitation for consumer complaints",
    cite: "Consumer Protection Act, 2019, s. 69",
    text: "A consumer complaint must be filed within two years from the date on which the cause of action arose, with condonation for sufficient cause.",
    tags: ["consumer", "limitation"],
  },

  // ───────────── Procedure / notices / limitation ─────────────
  {
    id: "LIM-55",
    kind: "statute",
    title: "Limitation for breach of contract",
    cite: "Limitation Act, 1963, Schedule, Article 55",
    text: "A suit for compensation for breach of any contract must be filed within three years from when the contract is broken.",
    tags: ["limitation", "breach", "contract"],
  },
  {
    id: "CPC-80",
    kind: "statute",
    title: "Notice before suing the Government",
    cite: "Code of Civil Procedure, 1908, s. 80",
    text: "No suit may be instituted against the Government or a public officer (for official acts) until two months after written notice stating the cause of action has been delivered.",
    tags: ["notice", "government", "procedure"],
  },
  {
    id: "NIA-138",
    kind: "statute",
    title: "Dishonour of cheque",
    cite: "Negotiable Instruments Act, 1881, s. 138",
    text: "Dishonour of a cheque for insufficiency of funds, issued to discharge a legally enforceable debt, is an offence if the payee issues a written demand notice within 30 days of being informed of dishonour and the drawer fails to pay within 15 days of receiving the notice.",
    tags: ["cheque", "notice", "criminal", "debt"],
  },
  {
    id: "ITA-10A",
    kind: "statute",
    title: "Validity of electronic contracts",
    cite: "Information Technology Act, 2000, s. 10A",
    text: "A contract shall not be deemed unenforceable solely because its formation used electronic form or means.",
    tags: ["e-contract", "digital signature"],
  },
  {
    id: "DPDP-6",
    kind: "statute",
    title: "Consent for processing personal data",
    cite: "Digital Personal Data Protection Act, 2023, s. 6",
    text: "Consent must be free, specific, informed, unconditional and unambiguous with a clear affirmative action, limited to data necessary for the specified purpose; any part of a consent that infringes the Act is invalid to that extent, and consent may be withdrawn as easily as given.",
    tags: ["privacy", "data", "consent", "employment"],
  },

  // ───────────── Constitution ─────────────
  {
    id: "COI-14",
    kind: "statute",
    title: "Equality before law",
    cite: "Constitution of India, Art. 14",
    text: "The State shall not deny to any person equality before the law or the equal protection of the laws; arbitrariness is antithetical to equality.",
    tags: ["constitution", "equality", "arbitrariness"],
  },
  {
    id: "COI-21",
    kind: "statute",
    title: "Protection of life and personal liberty",
    cite: "Constitution of India, Art. 21",
    text: "No person shall be deprived of life or personal liberty except according to procedure established by law; includes the right to privacy and to livelihood.",
    tags: ["constitution", "privacy", "livelihood"],
  },

  // ───────────── Landmark judgments ─────────────
  {
    id: "SC-BROJONATH-1986",
    kind: "judgment",
    title: "Central Inland Water Transport Corp. v. Brojo Nath Ganguly",
    cite: "(1986) 3 SCC 156",
    text: "Unfair and unreasonable clauses in contracts entered between parties of grossly unequal bargaining power (e.g., standard-form contracts the weaker party must accept) are unconscionable, opposed to public policy and void under s. 23 of the Contract Act.",
    tags: ["unequal bargaining", "standard form", "unconscionable", "public policy", "termination"],
  },
  {
    id: "SC-PIONEER-2019",
    kind: "judgment",
    title: "Pioneer Urban Land & Infrastructure Ltd. v. Govindan Raghavan",
    cite: "(2019) 5 SCC 725",
    text: "Wholly one-sided terms in a builder-buyer agreement (e.g., disproportionate forfeiture/interest favouring the builder) are an unfair trade practice; a consumer cannot be bound by such one-sided contractual terms.",
    tags: ["consumer", "one-sided", "unfair terms", "penalty"],
  },
  {
    id: "SC-KAILASHNATH-2015",
    kind: "judgment",
    title: "Kailash Nath Associates v. Delhi Development Authority",
    cite: "(2015) 4 SCC 136",
    text: "Under s. 74, even where a sum is named as liquidated damages, only reasonable compensation for loss actually suffered can be awarded (save where loss is hard to prove and the sum is a genuine pre-estimate); forfeiture of earnest money without loss is not permitted.",
    tags: ["penalty", "forfeiture", "liquidated damages", "deposit"],
  },
  {
    id: "SC-SAWPIPES-2003",
    kind: "judgment",
    title: "ONGC Ltd. v. Saw Pipes Ltd.",
    cite: "(2003) 5 SCC 705",
    text: "A liquidated damages clause that is a genuine pre-estimate of loss may be enforced without strict proof of loss where loss is difficult to prove, provided the sum is not by way of penalty or unreasonable.",
    tags: ["liquidated damages", "penalty"],
  },
  {
    id: "SC-PERCEPT-2006",
    kind: "judgment",
    title: "Percept D'Mark (India) Pvt. Ltd. v. Zaheer Khan",
    cite: "(2006) 4 SCC 227",
    text: "Restrictive covenants operating after the termination of a contract are void under s. 27 of the Contract Act; the 'reasonableness' test of English law does not apply to post-contract restraints in India.",
    tags: ["non-compete", "restraint of trade", "post-termination"],
  },
  {
    id: "SC-MURGAI-1981",
    kind: "judgment",
    title: "Superintendence Co. of India v. Krishan Murgai",
    cite: "(1981) 2 SCC 246",
    text: "A clause restraining an employee from competing after leaving service is void under s. 27, regardless of reasonableness of time or area.",
    tags: ["non-compete", "employment", "post-termination"],
  },
  {
    id: "SC-GOLIKARI-1967",
    kind: "judgment",
    title: "Niranjan Shankar Golikari v. Century Spinning & Mfg. Co.",
    cite: "AIR 1967 SC 1098",
    text: "A negative covenant operating DURING the term of employment (not to serve a competitor while employed) is not a restraint of trade under s. 27 and may be enforced if reasonable.",
    tags: ["non-compete", "employment", "during employment", "exclusivity"],
  },
  {
    id: "SC-PERKINS-2019",
    kind: "judgment",
    title: "Perkins Eastman Architects DPC v. HSCC (India) Ltd.",
    cite: "(2020) 20 SCC 760",
    text: "A party (or its officer) with an interest in the outcome cannot unilaterally appoint the sole arbitrator; such a clause offends the neutrality mandated by s. 12(5).",
    tags: ["arbitration", "unilateral appointment", "neutrality"],
  },
  {
    id: "SC-CORE-2024",
    kind: "judgment",
    title: "Central Organisation for Railway Electrification v. ECI-SPIC-SMO-MCML (JV)",
    cite: "2024 INSC 857 (Constitution Bench)",
    text: "Clauses allowing one party to unilaterally appoint a sole arbitrator, or to curate a panel from which the other party must choose, violate the equal-treatment principle under the Arbitration Act and are unenforceable.",
    tags: ["arbitration", "unilateral appointment", "equality"],
  },
  {
    id: "SC-SATYABRATA-1954",
    kind: "judgment",
    title: "Satyabrata Ghose v. Mugneeram Bangur & Co.",
    cite: "AIR 1954 SC 44",
    text: "'Impossible' in s. 56 means impracticable or useless in view of the object of the contract; an unforeseen supervening event that destroys the foundation of the contract frustrates it.",
    tags: ["frustration", "force majeure"],
  },
  {
    id: "SC-LALITA-2014",
    kind: "judgment",
    title: "Lalita Kumari v. Government of Uttar Pradesh",
    cite: "(2014) 2 SCC 1",
    text: "Registration of an FIR is mandatory when information discloses a cognizable offence; a preliminary inquiry is permissible only in limited categories.",
    tags: ["criminal", "FIR", "police"],
  },
  {
    id: "SC-ARNESH-2014",
    kind: "judgment",
    title: "Arnesh Kumar v. State of Bihar",
    cite: "(2014) 8 SCC 273",
    text: "Police must not arrest automatically for offences punishable up to seven years; they must record reasons satisfying arrest criteria and issue a notice of appearance where arrest is not required.",
    tags: ["criminal", "arrest", "bail", "498A"],
  },
  {
    id: "SC-ANVAR-2014",
    kind: "judgment",
    title: "Anvar P.V. v. P.K. Basheer",
    cite: "(2014) 10 SCC 473",
    text: "Secondary electronic evidence is admissible only with the certificate required under the electronic-records provision (s. 65B Evidence Act, now s. 63 BSA).",
    tags: ["evidence", "electronic", "whatsapp", "certificate"],
  },
  {
    id: "SC-PUTTASWAMY-2017",
    kind: "judgment",
    title: "Justice K.S. Puttaswamy (Retd.) v. Union of India",
    cite: "(2017) 10 SCC 1",
    text: "The right to privacy is a fundamental right protected under Article 21 and Part III of the Constitution.",
    tags: ["privacy", "constitution", "data"],
  },
];

/** Bump when any source summary is reviewed or changed (shown in every report's audit trail). */
export const CORPUS_VERSION = "2026-11-15";

/** Link to the primary text on Indian Kanoon so a lawyer can verify the summary. */
export function sourceUrl(s: LegalSource): string {
  const q = s.kind === "judgment" ? s.title : s.cite.replace(/\(.*?\)/g, "");
  return `https://indiankanoon.org/search/?formInput=${encodeURIComponent(q)}`;
}

export const CORPUS_BY_ID: Record<string, LegalSource> = Object.fromEntries(
  CORPUS.map((s) => [s.id, s]),
);

/** Compact rendering of the corpus for agent system prompts (stable → cacheable). */
export function corpusForPrompt(): string {
  return CORPUS.map(
    (s) => `[${s.id}] ${s.cite} — ${s.title}: ${s.text}`,
  ).join("\n");
}

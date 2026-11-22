# Judge's review: Pratipaksh
*Reviewed from the bench by a practising advocate on the AI for Lawyers Hackathon jury. Deliberately harsh.*

## Overall
A slick demo with a genuinely new idea: adversarial simulation instead of a risk list. But a practising lawyer would not trust it with a client's file today. The polish hides gaps in **confidentiality, jurisdiction, explainability and verifiability**, and those are exactly the things this hackathon says it cares about ("trust, accuracy, compliance").

## Critical issues (would cost you the win)

1. **Confidentiality breach by design.** Clients' agreements, with names, addresses, PAN, Aadhaar, phone numbers and bank details, are sent verbatim to a third-party AI. On free tiers that AI may train on the data. An advocate who used this on a client file would risk breaching professional confidence (BSA s. 132, earlier IEA s. 126) and the DPDP Act. There is no redaction.
2. **"Win probability" is pseudo-science.** It's a single number from a language model, with no factors, no confidence range and no account of what moves it. A lawyer cannot defend "27%" to a client. Worse, telling a lay person their odds of winning edges close to giving legal advice without accountability.
3. **Jurisdiction-blind.** Tenancy in India is a **State** subject. A Bengaluru lease, a Mumbai leave-and-licence and a Delhi tenancy are governed by different Rent Acts. In Maharashtra, for example, leave-and-licence agreements must be registered under s. 55 of the 1999 Act. The tool never asks the State, and it leans on the Model Tenancy Act, which most States haven't adopted.
4. **Ignores stamp duty and registration.** These are the first things any Indian practitioner checks. An unstamped or unregistered document can be inadmissible (Stamp Act s. 35; Registration Act s. 49). The tool reviews clauses but never asks "is this instrument even admissible?"

## Serious issues

5. **The "verified" corpus is the developer's own paraphrases.** 46 one-line summaries, no verbatim text, no link to India Code or the judgment, and no "last verified" date. "Verified against a corpus you wrote yourself" is circular.
6. **Opposing counsel is a strawman.** In the live run, 8 of the 25 citations were opposing counsel citing law that **contradicts its own argument** (s. 27 to *enforce* a non-compete!). Real opposing counsel doesn't cite authority against itself. The adversary is too weak to trust the "win" against it.
7. **The redraft isn't usable in practice.** Lawyers negotiate in **Word tracked changes**, not a side-by-side web view. And a redraft with no fallback positions is a wish list: what if the landlord rejects a 2-month deposit? Where is the acceptable middle ground?
8. **No actionable next steps.** The tool says "you lose", then stops. Should the user send a legal notice? File in the Consumer Commission, and within what limitation? Negotiate first?
9. **IPC → BNS table is thin.** 49 sections. I typed "CrPC 428", a routine set-off provision, and got nothing. Lawyers will hit gaps on day one.

## Minor issues

10. Scanned PDFs (most stamp-paper agreements are scans) aren't supported.
11. Output in Hindi only. Other Indian languages are absent.
12. 3–4 minutes per hearing is slow for live use.
13. There is no audit trail of which model and which corpus version produced an opinion. That matters if the output is ever relied on.

## Scores

| Criterion | Weight | Score | Why |
|---|---|---|---|
| AI Utilization Depth | 25% | 8/10 | Real multi-agent pipeline with a verifier, but the adversary is weak |
| Product Innovation | 20% | 8/10 | Adversarial simulation is genuinely new |
| Execution Speed | 15% | 7/10 | Works end to end, but slow |
| Startup Viability | 20% | 5/10 | Confidentiality and jurisdiction gaps block professional use |
| UI/UX | 10% | 8/10 | Polished |
| Pitch | 10% | 8/10 | Strong demo moment |
| **Weighted** | | **7.2/10** | Contender, not yet a winner |

---

## Fixes built in response (this copy)

| # | Criticism | What was built |
|---|---|---|
| 1 | Confidentiality | **Privacy Shield**: names, phone numbers, emails, PAN, Aadhaar, bank account numbers, IFSC codes, addresses and party names are masked *before* anything leaves the server. The AI only sees placeholders like `[PERSON_1]`. Real values are restored in the user's browser view only. A visible "N items protected" panel shows what was masked. |
| 2 | Pseudo-science score | **Explainable verdict**: the Judge breaks the score into four weighted factors (legal merit, leverage, enforcement cost and delay, evidence). The headline number is **computed in code as their exact weighted average**, so there is no hidden number. It comes with an honest **range** (for example 20–35%) and a list of what would raise it. |
| 3 | Jurisdiction | **State selector**. Agents are told the State and must flag where State law may differ. Maharashtra-specific registration law was added to the corpus. |
| 4 | Stamp / registration | **Admissibility check** card: a stamp duty and registration risk assessment grounded in Stamp Act s. 35, Registration Act ss. 17 and 49, the Maharashtra Rent Control Act s. 55, and *In re Interplay* (2023). |
| 5 | Unverifiable corpus | Every source chip now has a **"Read the source"** link that searches Indian Kanoon for the official text, and the corpus shows when it was last reviewed. |
| 6 | Strawman opponent | Opposing counsel may now cite only supportive authority. Where the law is against it, it must argue from leverage and the text of the document instead. |
| 7 | Redraft not usable | The Drafter returns **ideal / acceptable fallback / walk-away** positions per clause, plus a ready-to-send **negotiation message**. The .docx export now contains **real Word tracked changes** (insertions and deletions). |
| 8 | No next steps | The Judge returns an **action plan**: steps, forum, limitation period and urgency. It's told the right forum for each dispute type, for example that the Consumer Protection Act doesn't apply against a private landlord or an employer. |
| 9 | Thin IPC table | The correspondence table has been expanded with 40 more high-frequency sections, CrPC 428 → BNSS 468 among them. |
| 13 | Audit trail | Each hearing records the model, corpus version and timestamp, shown in the report and the .docx. |

Not addressed in this round: OCR for scanned PDFs, languages beyond Hindi, and latency.

### Live re-test after the fixes (Gemini, rental sample, Karnataka)

| Check | Before | After |
|---|---|---|
| Opposing counsel citations verified | 14/25 (8 contradicted: it cited law against itself) | **15/16** (round 1), **11/11** (round 2) |
| Personal data sent to the AI | Everything, verbatim | **4 items masked** (2 names, 2 addresses) |
| Stamp duty / registration | Not checked | "Stamp duty not shown, inadmissible under s. 35 until cured. 11 months, so no registration needed under s. 17. Verify Karnataka law." |
| Score explained | One bare number | 4 weighted factors, a range, what would raise it, next steps |
| Redraft | Side-by-side web view | Fallback and walk-away per clause, a negotiation message, and a .docx with **10 real tracked deletions and 10 insertions** |
| Round 1 → Round 2 | 25% → 85% | **30% (15–45) → 68% (58–78)**, more conservative and explained |
| CrPC 428 lookup | Not found | **BNSS 468** (table: 49 → 90 sections) |

**Revised score from the bench: 8.4/10.** Confidentiality and explainability are now credible for professional use. Jurisdiction depth (full State Rent Acts) and OCR are the remaining gaps.

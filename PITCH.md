# Pratipaksh: pitch kit

## One-liner
**Pratipaksh is an AI opposing counsel. It argues against your contract before the other side does, checks every citation, and rewrites the contract until you win.**

## The problem
* Around 5 crore cases are pending in Indian courts. Most disputes start from a document someone signed without understanding it: an 11-month rent agreement, an offer letter with a ₹5 lakh bond, a builder-buyer agreement.
* Lawyers are expensive and slow for everyday documents. Generic AI chatbots **hallucinate citations**, which is the main reason lawyers don't trust legal AI.
* India replaced IPC, CrPC and the Evidence Act on **1 July 2024**. Templates and drafts across the country still cite repealed sections.

## What existing tools do, and what we do
| Existing tools (Niyam, LeXi, NYAI, Nyaya Setu…) | Pratipaksh |
|---|---|
| List risky clauses | **Simulate the dispute**: an attacker, a defender and a judge |
| Leave you to check the citations | A **Proof Ledger** checks every citation, and fabricated ones are **blocked** before the Judge rules |
| Give a "risk score" | Give a **win probability**, show **how you'd lose**, then **fix it and re-hear** (27% → 84%) |
| Mostly English | **Spoken Hindi** explanation, plus **IPC → BNS** auto-conversion |

## AI workflow (for the "explain AI workflows & models" deliverable)
* **Model:** Claude Opus 5.5 (`claude-opus-5-5`) through the Anthropic API. Effort is tuned per agent: low for the Clerk and the Verifier, medium for the agents that argue.
* **Six specialised agents**, each with its own role prompt and a **Zod-validated structured output schema**:
  Clerk → Opposing Counsel → Your Advocate → Citation Verifier → Judge, plus the Drafter for the fix loop.
* **Retrieval-grounded:** all agents share a prompt-cached corpus of Indian statutes and SC judgments, and may cite only by corpus ID.
* **Two-layer hallucination firewall:**
  1. A deterministic check: any citation ID outside the corpus is marked FABRICATED.
  2. A semantic check: the Verifier agent reads the source text and decides whether it actually supports the claim (verified, weak or contradicted).
* **The Judge only sees ledger-annotated arguments**, so fabricated or contradicted law carries no weight.
* **Self-improving loop:** the Drafter rewrites the losing clauses, then the whole adversarial pipeline runs again on the new draft. The change in win probability is measured, not claimed.

## Business model
* **Free for citizens:** check a rent agreement, offer letter or notice. Funnel: "Talk to a verified advocate" (referral fee).
* **Pro for advocates and small firms (₹999/month):** unlimited hearings, client-ready .docx reports, BNS conversion of whole petitions.
* **API for platforms:** NoBroker / Housing (rent agreements), HRMS tools (offer letters), legal-tech platforms.
* **Market:** lakhs of practising advocates, about 6.3 crore MSMEs, and tens of millions of rent agreements signed every year.

## Demo video script (≈ 2:30)
| Time | Screen | Voice-over |
|---|---|---|
| 0:00 | Title card: "Know how you'll lose, before you sign." | "Ananya is about to sign this rent agreement in Bengaluru. ₹3.5 lakh deposit. Looks normal. Let's put it on trial." |
| 0:12 | Click 🏠 sample → Begin the hearing | "Pratipaksh opens a courtroom. Six AI agents, each with one job." |
| 0:20 | Agent trace animating | "The Clerk splits the contract into clauses. Opposing counsel, the landlord's lawyer, attacks. Her advocate defends. A verifier checks every citation. Then the judge rules." |
| 0:40 | 27% gauge + headline | "Verdict: if she signs this as-is, she has a 27% chance of winning a dispute. Not because the law is against her, but because the landlord holds the money." |
| 0:55 | Scroll to battle card C3, click the red SC-ORIENTAL-2011 chip | "Here opposing counsel cited a Supreme Court case that doesn't exist. Our hallucination firewall caught it and blocked it before the judge saw it." |
| 1:10 | Proof Ledger filters | "Every legal claim is in the Proof Ledger, linked to its source and checked." |
| 1:20 | IPC → BNS banner | "It even noticed the agreement threatens her under IPC 420, a law repealed in 2024. Today that's BNS 318(4)." |
| 1:30 | Click "Fix weak clauses & re-hear" | "Now the magic. One click: the Drafter rewrites ten losing clauses, and the whole trial runs again." |
| 1:45 | Gauge animates 27 → 84%, redlines | "84%. Deposit cut to two months, a mutual lock-in, a neutral arbitrator in Bengaluru, no utility cut-offs." |
| 2:00 | Click "हिंदी में सुनें" | "And for the person who actually signs, it explains everything in Hindi, out loud." |
| 2:10 | Download .docx, then the IPC → BNS tab | "Export a redlined report for your lawyer, or convert a whole FIR draft to the new criminal codes." |
| 2:20 | Logo | "Pratipaksh. Know how you'll lose, before you sign." |

## Pitch deck outline (8 slides)
1. **Title.** Pratipaksh, the AI opposing counsel. Tagline. Team VISON.
2. **Problem.** Signed blind, sued later. Pending cases, cost of a lawyer, AI hallucination.
3. **Insight.** You don't need a risk list. You need to see how the other side will beat you.
4. **Product.** Screenshot of the courtroom: attack vs. defence, the judge, the win gauge.
5. **Trust.** The Proof Ledger and the two-layer hallucination firewall (diagram).
6. **Demo moment.** 27% → 84% after one-click redraft, plus Hindi voice and IPC→BNS.
7. **Business.** Free citizen tier, Pro for advocates, API. Market size.
8. **Roadmap.** Full India Code and SC judgment index, WhatsApp bot, 10 Indian languages, advocate marketplace.

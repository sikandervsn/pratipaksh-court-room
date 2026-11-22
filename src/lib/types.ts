import { z } from "zod";

// ───────── Agent output schemas (structured outputs) ─────────

export const ClerkSchema = z.object({
  docTitle: z.string(),
  docType: z.string().describe("e.g. Residential Rental Agreement, Employment Contract, Legal Notice"),
  userSide: z.string().describe("The party the user represents, e.g. Tenant"),
  opponentSide: z.string().describe("The opposing party, e.g. Landlord"),
  parties: z.array(z.string()),
  summary: z.string().describe("2-3 sentence neutral summary of the document"),
  clauses: z.array(
    z.object({
      id: z.string().describe("Short id like C1, C2…"),
      title: z.string(),
      text: z.string().describe("Exact clause text from the document (may be trimmed to the operative part)"),
      risk: z.enum(["high", "medium", "low", "safe"]).describe("Risk TO THE USER'S SIDE"),
    }),
  ),
  admissibility: z
    .object({
      stampDuty: z.enum(["appears_paid", "not_mentioned", "likely_unpaid", "not_applicable"]),
      registration: z.enum(["registered", "required_not_registered", "not_required", "unclear"]),
      note: z.string().describe("2-3 sentences: is this instrument admissible/enforceable as executed? Stamp duty, registration, State-specific rules"),
      citations: z.array(z.string()).describe("Corpus IDs ONLY"),
    })
    .describe("Is the instrument itself admissible in evidence? Check stamp duty and registration FIRST, as an Indian practitioner would"),
});
export type Clerk = z.infer<typeof ClerkSchema>;

export const OpponentSchema = z.object({
  attacks: z.array(
    z.object({
      id: z.string().describe("A1, A2…"),
      clauseId: z.string(),
      title: z.string().describe("Short headline of the attack"),
      argument: z.string().describe("How opposing counsel will use this clause against the user, as argued in court / in a notice"),
      exploitScenario: z.string().describe("Concrete real-world scenario where the user gets hurt"),
      docQuote: z.string().describe("The EXACT words copied character-for-character from the document clause you are exploiting (8-40 words)"),
      cites: z
        .array(
          z.object({
            id: z.string().describe("Source ID exactly as shown in RETRIEVED SOURCES or CASE LAW, e.g. ICA-74"),
            quote: z.string().describe("The EXACT words (8-40 words) copied character-for-character from that source's text that support your point. For CASE LAW summaries, copy words from the summary."),
          }),
        ).describe("Supporting sources with exact quotes; empty if arguing from leverage only"),
      severity: z.number().int().min(1).max(10),
    }),
  ),
});
export type Opponent = z.infer<typeof OpponentSchema>;

export const AdvocateSchema = z.object({
  defenses: z.array(
    z.object({
      attackId: z.string(),
      argument: z.string().describe("Best rebuttal for the user's side"),
      cites: z
        .array(
          z.object({
            id: z.string().describe("Source ID exactly as shown in RETRIEVED SOURCES or CASE LAW, e.g. ICA-74"),
            quote: z.string().describe("The EXACT words (8-40 words) copied character-for-character from that source's text that support your point. For CASE LAW summaries, copy words from the summary."),
          }),
        ).describe("Supporting sources with exact quotes"),
      strength: z.enum(["strong", "moderate", "weak"]),
    }),
  ),
});
export type Advocate = z.infer<typeof AdvocateSchema>;

export const VerifierSchema = z.object({
  checks: z.array(
    z.object({
      ref: z.string().describe("The claim ref, e.g. A1:ICA-74 or D1:SC-PERCEPT-2006"),
      status: z.enum(["verified", "weak", "contradicted"]),
      note: z.string().describe("One sentence: why the source does / doesn't support the claim"),
    }),
  ),
});
export type Verifier = z.infer<typeof VerifierSchema>;

export const JudgeSchema = z.object({
  rulings: z.array(
    z.object({
      attackId: z.string(),
      winner: z.enum(["user", "opponent", "split"]),
      reasoning: z.string(),
    }),
  ),
  winProbability: z.number().int().min(0).max(100).describe("Probability (0-100) the USER's side prevails if this document is litigated as-is"),
  headline: z.string().describe("One-line verdict, punchy"),
  summary: z.string().describe("3-4 sentence judgment summary in plain English"),
  mustFix: z.array(z.string()).describe("clauseIds the user must renegotiate"),
  probabilityRange: z.object({ low: z.number().int().min(0).max(100), high: z.number().int().min(0).max(100) }).describe("Honest uncertainty band around winProbability"),
  factors: z
    .array(
      z.object({
        name: z.enum(["Legal merit", "Practical leverage", "Cost & delay of enforcement", "Evidence & paperwork"]),
        score: z.number().int().min(0).max(100).describe("How favourable this factor is to the user, 0-100"),
        weight: z.number().int().min(0).max(100).describe("Weight in the overall estimate; the four weights sum to 100"),
        note: z.string().describe("One sentence"),
      }),
    )
    .describe("Exactly these four factors. winProbability should be close to the weighted average of the scores."),
  toRaise: z.array(z.string()).describe("2-4 concrete things that would raise the user's probability"),
  nextSteps: z
    .array(
      z.object({
        step: z.string(),
        forum: z.string().describe("Where/with whom, e.g. Landlord (negotiation), Rent Authority, Consumer Commission, Civil Court, Labour Commissioner, none"),
        deadline: z.string().describe("Limitation period or timing, e.g. Before signing, within 30 days, within 3 years (Limitation Act Art. 55)"),
        urgency: z.enum(["now", "soon", "later"]),
      }),
    )
    .describe("3-5 practical next steps in order"),
});
export type Judge = z.infer<typeof JudgeSchema>;

export const DrafterSchema = z.object({
  fixes: z.array(
    z.object({
      clauseId: z.string(),
      revised: z.string().describe("Full rewritten clause text, fair and enforceable"),
      rationale: z.string().describe("One sentence why, referencing law"),
      citations: z.array(z.string()),
      fallback: z.string().describe("Acceptable middle-ground version if the other side rejects the revised clause"),
      walkAway: z.string().describe("The point at which the user should refuse to sign, one sentence"),
    }),
  ),
  negotiationMessage: z.string().describe("A polite, firm message (120-200 words) the user can send to the other party proposing these changes, citing the law briefly. Use placeholders as they appear in the text for names."),
});
export type Drafter = z.infer<typeof DrafterSchema>;

// ───────── Assembled result shown in the UI ─────────

export type LedgerStatus = "verified" | "weak" | "contradicted" | "fabricated" | "misquoted";
export type QuoteCheck = "exact" | "close" | "not_found" | "summary" | "missing";

export interface LedgerEntry {
  ref: string;
  by: "Opposing Counsel" | "Your Advocate" | "Drafter";
  claim: string;
  sourceId: string;
  sourceCite: string;
  sourceText: string;
  status: LedgerStatus;
  note: string;
  /** F2: the words the agent claimed the source says, and whether code found them in the source. */
  quote?: string;
  quoteCheck?: QuoteCheck;
  verbatim?: boolean;
  sourceUrl?: string;
}

type RawAttack = Opponent["attacks"][number];
type RawDefense = Advocate["defenses"][number];
export type Attack = Omit<RawAttack, "cites" | "docQuote"> & {
  citations: string[];
  quotes?: { id: string; quote: string }[];
  docQuote?: string;
  /** F2: true when docQuote was found verbatim in the user's document */
  docQuoteFound?: boolean;
};
export type Defense = Omit<RawDefense, "cites"> & { citations: string[]; quotes?: { id: string; quote: string }[] };

export interface Issue {
  attack: Attack;
  defense?: Defense;
  ruling?: Judge["rulings"][number];
}

/** F4: independent Judge runs */
export interface Consistency {
  runs: number[];
  median: number;
  spread: number;
}

export interface RetrievalInfo {
  sections: { id: string; cite: string; heading: string; via: string[] }[];
  mode: "hybrid" | "keyword";
}

export interface IpcFlag {
  match: string;
  replacement: string;
  subject: string;
  change?: string;
}

export interface PrivacyInfo {
  count: number;
  items: { placeholder: string; kind: string; preview: string }[];
}

export interface HearingMeta {
  model: string;
  corpusVersion: string;
  createdAt: string;
  jurisdiction: string;
}

export interface Hearing {
  mode: "live" | "demo";
  consistency?: Consistency;
  retrieval?: RetrievalInfo;
  privacy?: PrivacyInfo;
  meta?: HearingMeta;
  negotiationMessage?: string;
  round: number; // 1 = original, 2 = after fixes
  clerk: Clerk;
  issues: Issue[];
  judge: Judge;
  ledger: LedgerEntry[];
  ipcFlags: IpcFlag[];
  fixes?: (Drafter["fixes"][number] & { original: string; title: string })[];
  // NOTE: judge.probabilityRange / factors / toRaise / nextSteps and clerk.admissibility
  // may be missing on hearings saved before these fields existed — UI must guard.
  previousWinProbability?: number;
  documentText: string;
}

export type AgentName = "shield" | "clerk" | "librarian" | "opponent" | "advocate" | "verifier" | "judge" | "drafter";

export type StreamEvent =
  | { type: "agent"; agent: AgentName; status: "running" | "done"; detail?: string }
  | { type: "result"; hearing: Hearing }
  | { type: "error"; message: string };

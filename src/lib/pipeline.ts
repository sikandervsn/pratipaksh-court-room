import { runAgent, servingModel } from "./claude";
import { CORPUS_VERSION } from "./corpus";
import { findOldReferences } from "./bns-map";
import { checkQuote, embedQueries, search, sourcesForPrompt, verifyCitationQuote, type Statute } from "./library";
import { deepMap, maskDocument, maskWith, unmask } from "./privacy";
import {
  AdvocateSchema,
  ClerkSchema,
  DrafterSchema,
  JudgeSchema,
  OpponentSchema,
  VerifierSchema,
  type AgentName,
  type Attack,
  type Consistency,
  type Defense,
  type Hearing,
  type Issue,
  type Judge,
  type LedgerEntry,
  type RetrievalInfo,
  type StreamEvent,
} from "./types";

type Emit = (e: StreamEvent) => void;

const step = async <T>(emit: Emit, agent: AgentName, detail: string, fn: () => Promise<T>, doneDetail?: (r: T) => string) => {
  emit({ type: "agent", agent, status: "running", detail });
  const r = await fn();
  emit({ type: "agent", agent, status: "done", detail: doneDetail?.(r) });
  return r;
};

/** Make the score fully explainable: it IS the weighted average of the factors (no hidden number). */
function normalizeJudge<J extends { winProbability: number; probabilityRange: { low: number; high: number }; factors: { score: number; weight: number }[] }>(judge: J): J {
  const totalW = judge.factors.reduce((a, f) => a + Math.max(0, f.weight), 0);
  if (!judge.factors.length || totalW <= 0) return judge;
  const computed = Math.round(judge.factors.reduce((a, f) => a + f.score * Math.max(0, f.weight), 0) / totalW);
  const half = Math.max(5, Math.round(Math.abs(judge.probabilityRange.high - judge.probabilityRange.low) / 2));
  return { ...judge, winProbability: computed, probabilityRange: { low: Math.max(0, computed - half), high: Math.min(100, computed + half) } };
}

const jurisdictionLine = (j: string) =>
  j && j !== "Not specified"
    ? `JURISDICTION: ${j}, India. Apply central law and flag where ${j}'s State law (Rent Act, Stamp Act schedule, Shops & Establishments Act, etc.) may differ — say "verify ${j} law" rather than inventing State provisions.`
    : `JURISDICTION: not specified. Apply central law and explicitly flag points that depend on State law.`;

const JUDGE_RUNS = Math.max(1, Math.min(5, Number(process.env.JUDGE_RUNS ?? 3)));

// ───────── F1: retrieval ─────────
async function retrieve(queries: string[], k = 24): Promise<{ statutes: Statute[]; info: RetrievalInfo }> {
  const vectors = await embedQueries(queries);
  const best = new Map<string, { st: Statute; score: number; via: Set<string> }>();
  queries.forEach((q, i) => {
    for (const h of search(q, { k: 4, vector: vectors?.[i] ?? null })) {
      const cur = best.get(h.statute.id);
      if (!cur || h.score > cur.score) best.set(h.statute.id, { st: h.statute, score: Math.max(h.score, cur?.score ?? 0), via: new Set([...(cur?.via ?? []), ...h.via]) });
      else h.via.forEach((v) => cur.via.add(v));
    }
  });
  const top = [...best.values()].sort((a, b) => b.score - a.score).slice(0, k);
  return {
    statutes: top.map((t) => t.st),
    info: {
      mode: vectors ? "hybrid" : "keyword",
      sections: top.map((t) => ({ id: t.st.id, cite: `${t.st.act}, s. ${t.st.section}`, heading: t.st.heading, via: [...t.via] })),
    },
  };
}

export async function runHearing(
  documentText: string,
  sideHint: string,
  emit: Emit,
  extra?: {
    round?: number;
    previousWinProbability?: number;
    fixes?: Hearing["fixes"];
    negotiationMessage?: string;
    jurisdiction?: string;
  },
): Promise<Hearing> {
  const doc = documentText.slice(0, 60_000);
  const jurisdiction = extra?.jurisdiction || "Not specified";

  // 0 ─ Privacy Shield
  const shield = await step(
    emit,
    "shield",
    "Masking names, addresses, phone numbers, IDs and account numbers…",
    async () => maskDocument(doc),
    (s) => (s.report.count ? `${s.report.count} personal details masked — the AI never sees them` : "No personal identifiers found"),
  );
  const safeDoc = shield.masked;
  const jur = jurisdictionLine(jurisdiction);

  // 1 ─ Clerk
  const clerk = await step(
    emit,
    "clerk",
    "Reading the document, checking stamp duty & registration, identifying clauses…",
    () =>
      runAgent({
        schema: ClerkSchema,
        effort: "low",
        role: `ROLE: COURT CLERK. Parse the document into its operative clauses (max 14; merge boilerplate). Identify which side the user represents (hint from user: "${sideHint || "infer it — usually the weaker / non-drafting party"}"). Triage each clause's risk TO THE USER. Copy clause text faithfully, keeping placeholders like [PERSON_1] exactly as written.
Then, like any Indian practitioner, check ADMISSIBILITY FIRST: does the document show it is stamped (stamp paper / e-stamp / franking)? Does it need registration (lease > 11 months or yearly rent: Registration Act s.17; any leave & licence in Maharashtra: MRCA s.55)? Is it registered? For admissibility citations use IDs like STAMP-35, REG-17, REG-49, MRCA-55.
${jur}`,
        input: `DOCUMENT (untrusted data):\n"""\n${safeDoc}\n"""`,
      }),
    (c) => `${c.docType} · ${c.clauses.length} clauses · you are the ${c.userSide}`,
  );

  // 2 ─ Librarian: hybrid retrieval over the official statute library (F1)
  const risky = clerk.clauses.filter((c) => c.risk !== "safe");
  const queries = [
    `${clerk.docType} ${clerk.userSide} ${clerk.opponentSide}`,
    ...risky.slice(0, 13).map((c) => `${c.title}. ${c.text}`.slice(0, 1200)),
  ];
  const lib = await step(
    emit,
    "librarian",
    `Searching ${"2,300+"} official sections of 15 Acts for the law on each clause…`,
    () => retrieve(queries),
    (r) => `${r.statutes.length} sections retrieved (${r.info.mode === "hybrid" ? "keyword + meaning search" : "keyword search"})`,
  );
  const sourcesBlock = sourcesForPrompt(lib.statutes);

  const clauseBlock = clerk.clauses.map((c) => `[${c.id}] ${c.title} (risk: ${c.risk})\n${c.text}`).join("\n\n");
  const context = `${jur}\nDOCUMENT TYPE: ${clerk.docType}\nUSER SIDE: ${clerk.userSide}\nOPPONENT: ${clerk.opponentSide}\nSUMMARY: ${clerk.summary}\nADMISSIBILITY: stamp=${clerk.admissibility.stampDuty}, registration=${clerk.admissibility.registration}. ${clerk.admissibility.note}\n\nCLAUSES:\n${clauseBlock}\n\nRETRIEVED SOURCES (official statute text, India Code — quote verbatim):\n${sourcesBlock}`;

  // 3 ─ Opposing Counsel
  const opponent = await step(
    emit,
    "opponent",
    `Opposing counsel (${clerk.opponentSide}) is building the case against you…`,
    () =>
      runAgent({
        schema: OpponentSchema,
        role: `ROLE: OPPOSING COUNSEL (प्रतिपक्ष) acting for the ${clerk.opponentSide}. You are an experienced, aggressive Indian litigator. Find the 4-6 strongest ways the document can be used AGAINST the ${clerk.userSide} — in a legal notice, negotiation, consumer forum, rent authority or court.
RULES FOR A CREDIBLE ADVERSARY:
- docQuote: copy the exact words of the clause you exploit.
- Cite ONLY sources that genuinely SUPPORT your position, each with an exact quote. NEVER cite a source that says the clause is void or that favours the ${clerk.userSide}.
- Where black-letter law is against you, argue from LEVERAGE instead (who holds the money/possession/relieving letter, cost and delay of litigation, burden of proof, the ${clerk.userSide}'s own signature, inadmissibility of their unstamped copy) and cite nothing.`,
        input: context,
      }),
    (o) => `${o.attacks.length} lines of attack prepared`,
  );

  const attacks: Attack[] = opponent.attacks.map(({ cites, docQuote, ...a }) => {
    const dq = checkQuote(safeDoc, docQuote, true);
    return { ...a, citations: cites.map((c) => c.id), quotes: cites, docQuote, docQuoteFound: dq.status === "exact" || dq.status === "close" };
  });

  // 4 ─ Your Advocate
  const attacksBlock = attacks
    .map((a) => `[${a.id}] on ${a.clauseId} — ${a.title} (severity ${a.severity}/10)\nArgument: ${a.argument}\nScenario: ${a.exploitScenario}\nCites: ${a.citations.join(", ") || "none"}`)
    .join("\n\n");
  const advocate = await step(
    emit,
    "advocate",
    `Your advocate is preparing rebuttals for the ${clerk.userSide}…`,
    () =>
      runAgent({
        schema: AdvocateSchema,
        role: `ROLE: YOUR ADVOCATE, representing the ${clerk.userSide}. Rebut EVERY attack (one defense per attackId). Use statutory protections from RETRIEVED SOURCES and binding Supreme Court precedent from CASE LAW, each with an exact quote. Be candid about strength: if the clause genuinely hurts the user and the law doesn't save them — or if leverage/cost makes the legal win hollow — mark it "weak" or "moderate".`,
        input: `${context}\n\nOPPOSING COUNSEL'S ATTACKS:\n${attacksBlock}`,
      }),
    (a) => `${a.defenses.filter((d) => d.strength === "strong").length} strong · ${a.defenses.filter((d) => d.strength !== "strong").length} contested`,
  );
  const defenses: Defense[] = advocate.defenses.map(({ cites, ...d }) => ({ ...d, citations: cites.map((c) => c.id), quotes: cites }));

  // 5 ─ Verifier: deterministic quote check (F2) + semantic support check
  type Claim = { ref: string; by: LedgerEntry["by"]; claim: string; sourceId: string; quote: string };
  const claims: Claim[] = [];
  for (const a of attacks) for (const c of a.quotes ?? []) claims.push({ ref: `${a.id}:${c.id}`, by: "Opposing Counsel", claim: a.argument, sourceId: c.id, quote: c.quote });
  for (const d of defenses) for (const c of d.quotes ?? []) claims.push({ ref: `D-${d.attackId}:${c.id}`, by: "Your Advocate", claim: d.argument, sourceId: c.id, quote: c.quote });

  const checked = claims.map((c) => ({ c, v: verifyCitationQuote(c.sourceId, c.quote) }));
  const semantic = checked.filter(({ v }) => v.src && v.status !== "not_found");
  const fabricatedN = checked.filter(({ v }) => !v.src).length;
  const misquotedN = checked.filter(({ v }) => v.src && v.status === "not_found").length;

  const verifier = await step(
    emit,
    "verifier",
    `Checking ${claims.length} quotes word-for-word against the official text, then whether each source supports its claim…`,
    async () =>
      semantic.length === 0
        ? { checks: [] }
        : runAgent({
            schema: VerifierSchema,
            effort: "low",
            role: `ROLE: CITATION VERIFIER. The quotes below have already been machine-matched to the source text. Now decide strictly whether the SOURCE supports the specific legal proposition the claim relies on it for. "verified" = directly supports; "weak" = related but stretched / needs extra facts; "contradicted" = the source says otherwise or is irrelevant. Return one check per ref, same ref string.`,
            input: semantic
              .map(({ c, v }) => `REF ${c.ref}\nCLAIM: ${c.claim}\nQUOTED: "${c.quote}"\nSOURCE ${v.src!.cite}: ${v.src!.text.slice(0, 2500)}`)
              .join("\n\n"),
          }),
    (v) => {
      const ok = v.checks.filter((x) => x.status === "verified").length;
      return `${ok}/${claims.length} verified · ${checked.filter(({ v }) => v.status === "exact" || v.status === "close").length} quotes matched word-for-word${misquotedN ? ` · ${misquotedN} misquoted` : ""}${fabricatedN ? ` · ${fabricatedN} fabricated blocked` : ""}`;
    },
  );

  const ledger: LedgerEntry[] = checked.map(({ c, v }) => {
    const base = { ...c, quoteCheck: v.status, verbatim: v.src?.verbatim, sourceUrl: v.src?.url };
    if (!v.src) return { ...base, sourceCite: c.sourceId, sourceText: "", status: "fabricated", note: "Source does not exist in the library — blocked by the hallucination firewall." };
    const sourceText = v.src.text.length > 1500 ? v.src.text.slice(0, 1500) + " …" : v.src.text;
    if (v.status === "not_found")
      return { ...base, sourceCite: v.src.cite, sourceText, status: "misquoted", note: `The quoted words were not found in the official text of ${v.src.cite} (best match ${Math.round(v.coverage * 100)}%). Treated as unsupported.` };
    const chk = verifier.checks.find((x) => x.ref === c.ref);
    return { ...base, sourceCite: v.src.cite, sourceText, status: chk?.status ?? "weak", note: chk?.note ?? "Not individually checked." };
  });

  // 6 ─ Judge × N independent runs (F4) — median by score
  const ledgerBlock = ledger.map((l) => `${l.ref} → ${l.status.toUpperCase()}${l.status !== "verified" ? ` (${l.note})` : ""}`).join("\n");
  const defensesBlock = defenses.map((d) => `[defense to ${d.attackId}] (${d.strength}) ${d.argument} Cites: ${d.citations.join(", ") || "none"}`).join("\n\n");
  const judgeRole = `ROLE: THE JUDGE — an impartial, experienced Indian civil judge. Rule on each attack (one ruling per attackId). Arguments resting on CONTRADICTED, MISQUOTED or FABRICATED citations carry no legal weight.
Then estimate the probability (0-100) that the ${clerk.userSide} comes out of a dispute under this document WHOLE — i.e. keeps their money/rights without loss, delay or costly litigation. Calibrate it this way:
- A clause being void in law does NOT protect the ${clerk.userSide} in practice: they still have to sue or defend to prove it, Indian courts and forums take years, and the ${clerk.opponentSide} keeps the leverage meanwhile. Every void-but-present one-sided clause therefore LOWERS the score.
- A heavily one-sided draft with several high-risk clauses should typically score 15-45, even if many of those clauses are unenforceable.
- A balanced, mutual draft with clear, enforceable protections and only commercial residual risk should typically score 75-95.
- Admissibility problems (unstamped / unregistered) lower "Evidence & paperwork".
EXPLAIN the number: give the four factors with scores and weights (the system sets winProbability to the exact weighted average of your factor scores, so score the factors with the calibration above in mind), an honest probabilityRange (width 10-25 points), what would raise it, and 3-5 practical next steps with forum and deadline/limitation. This is decision support for the user and their advocate, not a guarantee.
FORUM ACCURACY: the Consumer Protection Act applies only against a trader/manufacturer/service provider (e.g. a builder, bank, company) — NOT against a private individual landlord or an employer in an employment dispute. Employment wage disputes go to the authority under the Code on Wages / Labour Commissioner; private tenancy disputes to the Rent Authority/Court (State law) or civil court.
${jur}`;
  const judgeInput = `${context}\n\nATTACKS:\n${attacksBlock}\n\nDEFENSES:\n${defensesBlock}\n\nPROOF LEDGER (machine quote-check + citation verification):\n${ledgerBlock}`;

  const { judge, consistency } = await step(
    emit,
    "judge",
    JUDGE_RUNS > 1 ? `${JUDGE_RUNS} independent benches are weighing both sides…` : "The bench is weighing both sides…",
    async () => {
      const settled = await Promise.allSettled(
        Array.from({ length: JUDGE_RUNS }, () => runAgent({ schema: JudgeSchema, role: judgeRole, input: judgeInput }).then((j) => normalizeJudge(j))),
      );
      const ok = settled.filter((s): s is PromiseFulfilledResult<Judge> => s.status === "fulfilled").map((s) => s.value);
      if (!ok.length) throw (settled[0] as PromiseRejectedResult).reason;
      const sorted = [...ok].sort((a, b) => a.winProbability - b.winProbability);
      const median = sorted[Math.floor((sorted.length - 1) / 2)];
      const runs = ok.map((j) => j.winProbability);
      const c: Consistency = { runs, median: median.winProbability, spread: Math.max(...runs) - Math.min(...runs) };
      return { judge: median, consistency: c };
    },
    (r) =>
      r.consistency.runs.length > 1
        ? `Median ${r.judge.winProbability}% of ${r.consistency.runs.length} independent rulings (${r.consistency.runs.join(", ")}) · spread ±${Math.ceil(r.consistency.spread / 2)}`
        : `Win probability: ${r.judge.winProbability}% (range ${r.judge.probabilityRange.low}–${r.judge.probabilityRange.high}%)`,
  );

  const issues: Issue[] = attacks.map((attack) => ({
    attack,
    defense: defenses.find((d) => d.attackId === attack.id),
    ruling: judge.rulings.find((r) => r.attackId === attack.id),
  }));

  const ipcFlags = findOldReferences(doc).map((f) => ({
    match: f.match,
    replacement: f.mapping.newCode === "—" ? "No equivalent in new codes" : `${f.mapping.newCode} s. ${f.mapping.newSection}`,
    subject: f.mapping.subject,
    change: f.mapping.change,
  }));

  const un = (s: string) => unmask(s, shield.map);
  return {
    mode: "live",
    round: extra?.round ?? 1,
    clerk: deepMap(clerk, un),
    issues: deepMap(issues, un),
    judge: deepMap(judge, un),
    ledger: deepMap(ledger, un),
    ipcFlags,
    fixes: extra?.fixes,
    negotiationMessage: extra?.negotiationMessage,
    previousWinProbability: extra?.previousWinProbability,
    documentText: doc,
    privacy: shield.report,
    consistency,
    retrieval: lib.info,
    meta: { model: servingModel(), corpusVersion: CORPUS_VERSION, createdAt: new Date().toISOString(), jurisdiction },
  };
}

export async function runFixAndRehear(prev: Hearing, emit: Emit): Promise<Hearing> {
  const jurisdiction = prev.meta?.jurisdiction || "Not specified";
  const { map } = maskDocument(prev.documentText);
  const mask = (s: string) => maskWith(s, map);

  const targets = prev.clerk.clauses.filter((c) => prev.judge.mustFix.includes(c.id) || c.risk === "high");
  const related = prev.issues
    .filter((i) => targets.some((t) => t.id === i.attack.clauseId))
    .map((i) => `On ${i.attack.clauseId}: ${i.attack.title} — ${i.attack.argument}${i.ruling ? ` | Judge: ${i.ruling.reasoning}` : ""}`)
    .join("\n");

  const lib = await retrieve(targets.slice(0, 10).map((c) => `${c.title}. ${c.text}`.slice(0, 1200)), 14);

  const drafter = await step(
    emit,
    "drafter",
    `Redrafting ${targets.length} weak clauses for the ${prev.clerk.userSide}, with fallback positions…`,
    () =>
      runAgent({
        schema: DrafterSchema,
        role: `ROLE: DRAFTER for the ${prev.clerk.userSide}. Rewrite each listed clause so it is fair, balanced, legally enforceable under Indian law and likely acceptable to a reasonable ${prev.clerk.opponentSide} (don't over-reach — a clause the other side will never sign is useless). Keep the document's style and keep placeholders like [PERSON_1] unchanged. One fix per clauseId. For each, also give a FALLBACK (acceptable compromise) and a WALK-AWAY point. Finish with a short negotiation message to the ${prev.clerk.opponentSide}. Cite source IDs from RETRIEVED SOURCES or CASE LAW only.
${jurisdictionLine(jurisdiction)}`,
        input: mask(`CLAUSES TO FIX:\n${targets.map((c) => `[${c.id}] ${c.title}\n${c.text}`).join("\n\n")}\n\nWHY THEY LOSE:\n${related}`) + `\n\nRETRIEVED SOURCES (official statute text):\n${sourcesForPrompt(lib.statutes, 900)}`,
      }),
    (d) => `${d.fixes.length} clauses rewritten · fallback positions + negotiation message ready`,
  );

  const un = (s: string) => unmask(s, map);
  const fixesPlain = deepMap(drafter.fixes, un);

  let revised = prev.documentText;
  for (const f of fixesPlain) {
    const orig = prev.clerk.clauses.find((c) => c.id === f.clauseId);
    if (orig && revised.includes(orig.text)) revised = revised.replace(orig.text, f.revised);
    else if (orig) revised += `\n\n[Revised — ${orig.title}]\n${f.revised}`;
  }

  return runHearing(revised, prev.clerk.userSide, emit, {
    round: prev.round + 1,
    previousWinProbability: prev.judge.winProbability,
    jurisdiction,
    negotiationMessage: un(drafter.negotiationMessage),
    fixes: fixesPlain.map((f) => {
      const orig = prev.clerk.clauses.find((c) => c.id === f.clauseId);
      return { ...f, original: orig?.text ?? "", title: orig?.title ?? f.clauseId };
    }),
  });
}

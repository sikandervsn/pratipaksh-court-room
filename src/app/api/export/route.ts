import { identify, limit, readJson } from "@/lib/guard";
import { validHearing, xmlSafe } from "@/lib/validate";
import { deepMap } from "@/lib/privacy";
import {
  AlignmentType,
  BorderStyle,
  DeletedTextRun,
  Document,
  InsertedTextRun,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { Hearing } from "@/lib/types";

export const runtime = "nodejs";

// Helpers coerce missing values to "" so a partially-shaped hearing can't crash the export.
const str = (v: unknown) => (v == null ? "" : String(v));
const H = (text: unknown, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) =>
  new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text: str(text) })] });
const P = (text: unknown, opts: { bold?: boolean; italics?: boolean; color?: string; size?: number } = {}) =>
  new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: str(text), ...opts })] });

const cell = (text: unknown, opts: { bold?: boolean; fill?: string; width?: number } = {}) =>
  new TableCell({
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: str(text)
      .split("\n")
      .map((t) => new Paragraph({ children: [new TextRun({ text: t, bold: opts.bold, size: 19 })] })),
  });

export async function POST(req: Request) {
  const who = await identify(req);
  if (who.deny) return who.deny;
  const limited = limit(who.key, "light");
  if (limited) return limited;
  const { data, error } = await readJson<{ hearing?: Hearing }>(req, 1_500_000);
  if (error) return error;
  const raw = data?.hearing;
  if (!validHearing(raw)) return Response.json({ error: "Run a hearing first." }, { status: 400 });
  // Strip XML-illegal characters (incl. NUL, which we also use as an internal marker below).
  const h = deepMap(raw, xmlSafe);
  try {
    return await buildDocx(h);
  } catch (e) {
    console.error("[export] could not build docx:", e instanceof Error ? e.message : e);
    return Response.json({ error: "This hearing could not be exported. Run it again and retry." }, { status: 422 });
  }
}

async function buildDocx(h: Hearing): Promise<Response> {
  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "PRATIPAKSH — Adversarial Contract Review", bold: true, size: 32, color: "1E2A4A" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: `${h.clerk.docTitle} · ${h.clerk.docType} · Prepared for the ${h.clerk.userSide}`, italics: true, size: 20 })],
    }),
    H("Verdict"),
    P(`Win probability for the ${h.clerk.userSide}: ${h.judge.winProbability}%${h.previousWinProbability != null ? ` (was ${h.previousWinProbability}% before redraft)` : ""}`, { bold: true, size: 26, color: h.judge.winProbability >= 60 ? "1B7F4B" : "B42318" }),
    P(h.judge.headline, { italics: true }),
    P(h.judge.summary),
  );

  const j = h.judge;
  if (j.probabilityRange) children.push(P(`Honest range: ${j.probabilityRange.low}–${j.probabilityRange.high}%. This is decision support, not a guarantee of outcome.`, { italics: true, color: "555555" }));
  if (j.factors?.length) {
    children.push(H("Why this number", HeadingLevel.HEADING_3));
    for (const fc of j.factors) children.push(P(`• ${fc.name} — ${fc.score}/100 (weight ${fc.weight}%): ${fc.note}`));
  }
  if (j.toRaise?.length) {
    children.push(H("What would raise it", HeadingLevel.HEADING_3));
    for (const t of j.toRaise) children.push(P(`• ${t}`));
  }
  const adm = h.clerk.admissibility;
  if (adm) {
    children.push(H("Admissibility: stamp duty & registration"));
    children.push(P(`Stamp duty: ${adm.stampDuty.replace(/_/g, " ")} · Registration: ${adm.registration.replace(/_/g, " ")}${h.meta?.jurisdiction ? ` · Jurisdiction: ${h.meta.jurisdiction}` : ""}`, { bold: true }));
    children.push(P(adm.note));
    if (adm.citations.length) children.push(P(`Sources: ${adm.citations.join(", ")}`, { italics: true, color: "555555" }));
  }
  if (j.nextSteps?.length) {
    children.push(H("What to do next"));
    j.nextSteps.forEach((st, i) => children.push(P(`${i + 1}. [${st.urgency.toUpperCase()}] ${st.step} — ${st.forum}${st.deadline ? ` · ${st.deadline}` : ""}`)));
  }
  if (h.negotiationMessage) {
    children.push(H("Message to send the other side"));
    for (const line of h.negotiationMessage.split(/\n/)) children.push(P(line));
  }

  if (h.fixes?.length) {
    children.push(H("Redlined clauses"));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: [cell("Clause", { bold: true, fill: "E8ECF5", width: 16 }), cell("Original", { bold: true, fill: "FDECEC", width: 34 }), cell("Revised", { bold: true, fill: "E7F6EC", width: 34 }), cell("Why", { bold: true, fill: "E8ECF5", width: 16 })] }),
          ...h.fixes.map((f) => new TableRow({ children: [cell(f.title), cell(f.original), cell(f.revised), cell(`${f.rationale}\n[${f.citations.join(", ")}]${f.fallback ? `\nFallback: ${f.fallback}` : ""}${f.walkAway ? `\nWalk away if: ${f.walkAway}` : ""}`)] })),
        ],
      }),
    );
  }

  children.push(H("Issues — Opposing Counsel vs. Your Advocate"));
  for (const i of h.issues) {
    children.push(
      P(`${i.attack.id} · ${i.attack.title} (clause ${i.attack.clauseId}, severity ${i.attack.severity}/10)`, { bold: true }),
      P(`⚔ Opposing counsel: ${i.attack.argument}`),
      P(`Scenario: ${i.attack.exploitScenario}`, { italics: true }),
    );
    if (i.defense) children.push(P(`🛡 Your advocate (${i.defense.strength}): ${i.defense.argument}`));
    if (i.ruling) children.push(P(`⚖ Ruling — ${i.ruling.winner === "user" ? `${h.clerk.userSide} wins` : i.ruling.winner === "opponent" ? `${h.clerk.opponentSide} wins` : "Split"}: ${i.ruling.reasoning}`, { color: "1E2A4A" }));
  }

  children.push(H("Proof Ledger — citation verification"));
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ tableHeader: true, children: [cell("Ref", { bold: true, fill: "E8ECF5" }), cell("Source", { bold: true, fill: "E8ECF5" }), cell("Status", { bold: true, fill: "E8ECF5" }), cell("Verifier note", { bold: true, fill: "E8ECF5" })] }),
        ...h.ledger.map(
          (l) =>
            new TableRow({
              children: [
                cell(`${l.ref}\n${l.by}`),
                cell(l.sourceCite),
                cell(l.status.toUpperCase(), { fill: l.status === "verified" ? "E7F6EC" : l.status === "weak" ? "FFF4D6" : "FDECEC" }),
                cell(l.note),
              ],
            }),
        ),
      ],
    }),
  );

  if (h.ipcFlags.length) {
    children.push(H("Repealed criminal law references"));
    for (const f of h.ipcFlags) children.push(P(`${f.match} → ${f.replacement} (${f.subject})${f.change ? ` — ${f.change}` : ""}`));
  }

  if (h.fixes?.length) {
    children.push(H("Marked-up agreement (Word tracked changes)"));
    children.push(P("Open in Microsoft Word → Review tab to accept or reject each change individually.", { italics: true, color: "555555" }));
    const date = new Date().toISOString();
    let rev = 1;
    // Mark each revised clause inside the current draft with a sentinel, then emit del/ins runs for it.
    let marked = h.documentText ?? "";
    h.fixes.forEach((fx, idx) => {
      if (fx.revised && marked.includes(fx.revised)) marked = marked.replace(fx.revised, `\u0000${idx}\u0000`);
    });
    for (const line of marked.split(/\n/)) {
      const runs: (TextRun | InsertedTextRun | DeletedTextRun)[] = [];
      for (const part of line.split(/\u0000/)) {
        const idx = /^\d+$/.test(part) ? Number(part) : -1;
        const fx = idx >= 0 ? h.fixes[idx] : undefined;
        if (fx) {
          if (fx.original) runs.push(new DeletedTextRun({ text: fx.original, id: rev++, author: "Pratipaksh", date, size: 20 }));
          runs.push(new InsertedTextRun({ text: fx.revised, id: rev++, author: "Pratipaksh", date, size: 20 }));
        } else if (part) runs.push(new TextRun({ text: part, size: 20 }));
      }
      children.push(new Paragraph({ children: runs }));
    }
  }

  children.push(H("Full document (current draft)"));
  for (const line of (h.documentText ?? "").split(/\n/)) children.push(new Paragraph({ children: [new TextRun({ text: line, size: 20 })] }));

  children.push(
    new Paragraph({
      spacing: { before: 300 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 6 } },
      children: [new TextRun({ text: "Generated by Pratipaksh, an AI legal-analysis tool. This is not legal advice. Verify all sources and consult an advocate before acting.", italics: true, size: 16, color: "666666" })],
    }),
  );
  if (h.meta)
    children.push(P(`Audit trail — model: ${h.meta.model} · corpus version: ${h.meta.corpusVersion} · jurisdiction: ${h.meta.jurisdiction} · generated: ${h.meta.createdAt}${h.privacy ? ` · personal details masked before AI analysis: ${h.privacy.count}` : ""}`, { size: 16, color: "666666" }));

  const doc = new Document({
    creator: "Pratipaksh",
    title: `Pratipaksh review — ${h.clerk.docTitle}`,
    styles: { default: { document: { run: { font: "Calibri", size: 21 } } } },
    features: { trackRevisions: true },
    sections: [{ children }],
  });
  const buf = await Packer.toBuffer(doc);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="pratipaksh-review-round${h.round}.docx"`,
    },
  });
}

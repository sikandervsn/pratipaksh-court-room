import type { Hearing } from "./types";

export const MAX_DOC_CHARS = 60_000;

/**
 * Hearings come back from the browser for the fix / Hindi / export routes.
 * Validate the shape and sizes so a crafted payload can't crash a route or
 * smuggle a huge document past the hearing route's limit.
 */
export function validHearing(h: unknown): h is Hearing {
  if (!h || typeof h !== "object") return false;
  const x = h as Partial<Hearing>;
  return (
    (x.mode === "live" || x.mode === "demo") &&
    typeof x.round === "number" &&
    x.round >= 1 &&
    x.round < 20 &&
    !!x.clerk &&
    Array.isArray(x.clerk.clauses) &&
    x.clerk.clauses.length <= 60 &&
    typeof x.clerk.docTitle === "string" &&
    typeof x.clerk.userSide === "string" &&
    !!x.judge &&
    typeof x.judge.winProbability === "number" &&
    Array.isArray(x.judge.mustFix) &&
    Array.isArray(x.issues) &&
    x.issues.length <= 40 &&
    Array.isArray(x.ledger) &&
    x.ledger.length <= 300 &&
    Array.isArray(x.ipcFlags) &&
    typeof x.documentText === "string" &&
    x.documentText.length <= MAX_DOC_CHARS + 20_000 &&
    // Optional fields added later — validate shape when present.
    (x.fixes === undefined ||
      (Array.isArray(x.fixes) &&
        x.fixes.length <= 60 &&
        x.fixes.every(
          (f) =>
            f &&
            typeof f.clauseId === "string" &&
            typeof f.revised === "string" &&
            f.revised.length <= 10_000 &&
            typeof (f.original ?? "") === "string" &&
            Array.isArray(f.citations),
        ))) &&
    (x.negotiationMessage === undefined || (typeof x.negotiationMessage === "string" && x.negotiationMessage.length <= 6_000)) &&
    (x.privacy === undefined || (typeof x.privacy === "object" && Array.isArray(x.privacy?.items) && x.privacy.items.length <= 500)) &&
    (x.meta === undefined || (typeof x.meta === "object" && typeof x.meta?.jurisdiction === "string" && x.meta.jurisdiction.length <= 80))
  );
}

/** Strip characters that are illegal in XML (would corrupt a .docx) and NULs. */
export function xmlSafe(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "");
}

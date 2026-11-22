// ───────── Privacy Shield ─────────
// Masks personal data BEFORE any text is sent to a third-party AI model.
// The model only ever sees placeholders like [PERSON_1]; real values are
// restored in the result returned to the user's own browser.

export type PiiKind = "PERSON" | "ORG" | "EMAIL" | "PHONE" | "AADHAAR" | "PAN" | "IFSC" | "ACCOUNT" | "ADDRESS";

export interface MaskMap {
  /** placeholder → original */
  byPlaceholder: Record<string, string>;
}

export interface PrivacyReport {
  count: number;
  items: { placeholder: string; kind: PiiKind; preview: string }[];
}

const HONORIFIC = String.raw`(?:Mr|Mrs|Ms|Miss|Shri|Smt|Sri|Kumari|Dr|Adv|Advocate)\.?`;
const NAME = String.raw`[A-Z][a-z]+(?:[ ]+[A-Z][a-z]+){0,3}`; // spaces only — never span lines

/** Partially hide a value for display, e.g. "Ananya Iyer" → "A****a I*r". */
function preview(v: string): string {
  return v
    .split(/\s+/)
    .map((w) => (w.length <= 2 ? w[0] + "*" : w[0] + "*".repeat(Math.min(w.length - 2, 4)) + w[w.length - 1]))
    .join(" ");
}

export function maskDocument(text: string): { masked: string; map: MaskMap; report: PrivacyReport } {
  const byOriginal = new Map<string, string>();
  const byPlaceholder: Record<string, string> = {};
  const kinds: Record<string, PiiKind> = {};
  const counters: Partial<Record<PiiKind, number>> = {};

  const register = (original: string, kind: PiiKind) => {
    const o = original.trim();
    if (o.length < (kind === "ADDRESS" ? 10 : 3)) return null;
    const existing = byOriginal.get(o);
    if (existing) return existing;
    counters[kind] = (counters[kind] ?? 0) + 1;
    const ph = `[${kind}_${counters[kind]}]`;
    byOriginal.set(o, ph);
    byPlaceholder[ph] = o;
    kinds[ph] = kind;
    return ph;
  };

  // 1) Collect candidates (order matters: specific → generic).
  const collect = (re: RegExp, kind: PiiKind, group = 0) => {
    for (const m of text.matchAll(re)) {
      const v = m[group];
      if (v) register(v, kind);
    }
  };

  // Bounded quantifiers (RFC limits) keep this linear-time on hostile input (no ReDoS).
  collect(/(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,8}\.[A-Za-z]{2,24}\b/g, "EMAIL");
  collect(/\b[A-Z]{5}\d{4}[A-Z]\b/g, "PAN");
  collect(/\b[A-Z]{4}0[A-Z0-9]{6}\b/g, "IFSC");
  collect(/\b(?:A\/c|Account|Acct)\.?\s*(?:No\.?|Number)?\s*[:#-]?\s*(\d{9,18})\b/gi, "ACCOUNT", 1);
  collect(/\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, "AADHAAR");
  collect(/(?:\+91[\s-]?|\b0)?\b[6-9]\d{4}[\s-]?\d{5}\b/g, "PHONE");
  // Addresses introduced by "residing at / r/o / office at …" up to "(" or line end
  collect(
    /(?:residing at|resident of|r\/o|R\/o|having (?:its )?(?:registered )?office at|address[:\s]+)\s*([^()\n]{6,140}?)(?=\s*\(|\s*\n|\s*,\s*(?:hereinafter|the\s)|$)/gi,
    "ADDRESS",
    1,
  );
  // Companies
  for (const m of text.matchAll(/\b((?:[A-Z][A-Za-z&-]*\.?[ ]+){1,5}(?:Pvt\.?[ ]*Ltd\.?|Private Limited|Limited|Ltd\.?|LLP))/g)) {
    const org = m[1].replace(/^(?:(?:For|And|The|Between|With|By|To|Of|M\/s\.?)[ ]+)+/, "");
    if (org.split(/[ ]+/).length >= 2) register(org, "ORG");
  }
  // People: honorific + name, and "Name (the TENANT)"-style signature lines
  collect(new RegExp(`${HONORIFIC}\\s+(${NAME})`, "g"), "PERSON", 1);
  collect(new RegExp(`(?:LANDLORD|TENANT|LICENSOR|LICENSEE|EMPLOYEE|EMPLOYER|LESSOR|LESSEE|BUYER|SELLER)\\s*[:\\-]\\s*(${NAME})`, "g"), "PERSON", 1);

  // 2) Replace — longest originals first so "Ananya Iyer" wins over "Ananya".
  let masked = text;
  const originals = [...byOriginal.keys()].sort((a, b) => b.length - a.length);
  for (const o of originals) masked = masked.split(o).join(byOriginal.get(o)!);

  // Also mask bare first names / surnames of detected people when used alone (e.g. "Ananya shall…").
  for (const [o, ph] of byOriginal) {
    if (kinds[ph] !== "PERSON") continue;
    for (const part of o.split(/\s+/)) {
      if (part.length >= 4) masked = masked.replace(new RegExp(`\\b${part}\\b`, "g"), ph);
    }
  }

  const items = Object.entries(byPlaceholder).map(([placeholder, original]) => ({
    placeholder,
    kind: kinds[placeholder],
    preview: preview(original),
  }));
  return { masked, map: { byPlaceholder }, report: { count: items.length, items } };
}

/** Apply an existing mask to any string (used when re-sending results to the AI). */
export function maskWith(text: string, map: MaskMap): string {
  let out = text;
  const pairs = Object.entries(map.byPlaceholder).sort((a, b) => b[1].length - a[1].length);
  for (const [ph, original] of pairs) out = out.split(original).join(ph);
  for (const [ph, original] of pairs) {
    if (!/^\[PERSON_/.test(ph)) continue;
    for (const part of original.split(/\s+/)) if (part.length >= 4) out = out.replace(new RegExp(`\\b${part}\\b`, "g"), ph);
  }
  return out;
}

export function unmask(text: string, map: MaskMap): string {
  return text.replace(/\[(?:PERSON|ORG|EMAIL|PHONE|AADHAAR|PAN|IFSC|ACCOUNT|ADDRESS)_\d+\]/g, (ph) => map.byPlaceholder[ph] ?? ph);
}

/** Deep-apply a string transform to every string inside a JSON-like value. */
export function deepMap<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => deepMap(v, fn)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepMap(v, fn);
    return out as T;
  }
  return value;
}

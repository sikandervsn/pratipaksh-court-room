// Old criminal codes → new criminal codes (in force from 1 July 2024).
// IPC → Bharatiya Nyaya Sanhita (BNS), CrPC → Bharatiya Nagarik Suraksha
// Sanhita (BNSS), Evidence Act → Bharatiya Sakshya Adhiniyam (BSA).
// Curated table of the most-used sections. Verify against the official text.

export type OldCode = "IPC" | "CrPC" | "IEA";

export interface Mapping {
  old: OldCode;
  oldSection: string;
  newCode: "BNS" | "BNSS" | "BSA" | "—";
  newSection: string;
  subject: string;
  change?: string; // what materially changed
}

export const MAPPINGS: Mapping[] = [
  // IPC → BNS
  { old: "IPC", oldSection: "34", newCode: "BNS", newSection: "3(5)", subject: "Acts done by several persons in furtherance of common intention" },
  { old: "IPC", oldSection: "120B", newCode: "BNS", newSection: "61(2)", subject: "Punishment of criminal conspiracy" },
  { old: "IPC", oldSection: "124A", newCode: "BNS", newSection: "152", subject: "Sedition → acts endangering sovereignty, unity and integrity of India", change: "'Sedition' dropped as a term; new offence framed around endangering sovereignty, unity and integrity, expressly covering electronic communication and financial means." },
  { old: "IPC", oldSection: "279", newCode: "BNS", newSection: "281", subject: "Rash driving on a public way" },
  { old: "IPC", oldSection: "294", newCode: "BNS", newSection: "296", subject: "Obscene acts and songs" },
  { old: "IPC", oldSection: "299", newCode: "BNS", newSection: "100", subject: "Culpable homicide" },
  { old: "IPC", oldSection: "300", newCode: "BNS", newSection: "101", subject: "Murder (definition)" },
  { old: "IPC", oldSection: "302", newCode: "BNS", newSection: "103(1)", subject: "Punishment for murder", change: "New s. 103(2) separately punishes murder by a group of five or more on grounds of race, caste, community, sex, place of birth, language or personal belief (mob lynching)." },
  { old: "IPC", oldSection: "304A", newCode: "BNS", newSection: "106(1)", subject: "Causing death by negligence", change: "Maximum punishment raised from 2 to 5 years; s. 106(2) adds a harsher hit-and-run offence." },
  { old: "IPC", oldSection: "304B", newCode: "BNS", newSection: "80", subject: "Dowry death" },
  { old: "IPC", oldSection: "306", newCode: "BNS", newSection: "108", subject: "Abetment of suicide" },
  { old: "IPC", oldSection: "307", newCode: "BNS", newSection: "109", subject: "Attempt to murder" },
  { old: "IPC", oldSection: "323", newCode: "BNS", newSection: "115(2)", subject: "Punishment for voluntarily causing hurt" },
  { old: "IPC", oldSection: "354", newCode: "BNS", newSection: "74", subject: "Assault or criminal force to woman with intent to outrage her modesty" },
  { old: "IPC", oldSection: "375", newCode: "BNS", newSection: "63", subject: "Rape (definition)" },
  { old: "IPC", oldSection: "376", newCode: "BNS", newSection: "64", subject: "Punishment for rape" },
  { old: "IPC", oldSection: "377", newCode: "—", newSection: "No equivalent", subject: "Unnatural offences", change: "Not re-enacted in BNS." },
  { old: "IPC", oldSection: "378", newCode: "BNS", newSection: "303(1)", subject: "Theft (definition)" },
  { old: "IPC", oldSection: "379", newCode: "BNS", newSection: "303(2)", subject: "Punishment for theft", change: "Community service introduced as a punishment for certain first-time petty theft." },
  { old: "IPC", oldSection: "384", newCode: "BNS", newSection: "308(2)", subject: "Punishment for extortion" },
  { old: "IPC", oldSection: "392", newCode: "BNS", newSection: "309(4)", subject: "Punishment for robbery" },
  { old: "IPC", oldSection: "406", newCode: "BNS", newSection: "316(2)", subject: "Punishment for criminal breach of trust" },
  { old: "IPC", oldSection: "415", newCode: "BNS", newSection: "318(1)", subject: "Cheating (definition)" },
  { old: "IPC", oldSection: "420", newCode: "BNS", newSection: "318(4)", subject: "Cheating and dishonestly inducing delivery of property" },
  { old: "IPC", oldSection: "463", newCode: "BNS", newSection: "336(1)", subject: "Forgery (definition)" },
  { old: "IPC", oldSection: "467", newCode: "BNS", newSection: "338", subject: "Forgery of valuable security, will, etc." },
  { old: "IPC", oldSection: "468", newCode: "BNS", newSection: "336(3)", subject: "Forgery for purpose of cheating" },
  { old: "IPC", oldSection: "471", newCode: "BNS", newSection: "340(2)", subject: "Using as genuine a forged document" },
  { old: "IPC", oldSection: "497", newCode: "—", newSection: "No equivalent", subject: "Adultery", change: "Struck down in Joseph Shine (2018); not re-enacted." },
  { old: "IPC", oldSection: "498A", newCode: "BNS", newSection: "85", subject: "Cruelty by husband or relatives (definition of cruelty now in s. 86)" },
  { old: "IPC", oldSection: "499", newCode: "BNS", newSection: "356(1)", subject: "Defamation (definition)" },
  { old: "IPC", oldSection: "500", newCode: "BNS", newSection: "356(2)", subject: "Punishment for defamation", change: "Community service added as a possible punishment." },
  { old: "IPC", oldSection: "503", newCode: "BNS", newSection: "351(1)", subject: "Criminal intimidation (definition)" },
  { old: "IPC", oldSection: "506", newCode: "BNS", newSection: "351(2)", subject: "Punishment for criminal intimidation" },
  { old: "IPC", oldSection: "509", newCode: "BNS", newSection: "79", subject: "Word, gesture or act intended to insult the modesty of a woman" },

  // CrPC → BNSS
  { old: "CrPC", oldSection: "41A", newCode: "BNSS", newSection: "35(3)", subject: "Notice of appearance before police officer" },
  { old: "CrPC", oldSection: "125", newCode: "BNSS", newSection: "144", subject: "Maintenance of wives, children and parents" },
  { old: "CrPC", oldSection: "154", newCode: "BNSS", newSection: "173", subject: "Information in cognizable cases (FIR)", change: "Expressly permits e-FIR and Zero FIR; preliminary enquiry allowed for offences punishable 3–7 years." },
  { old: "CrPC", oldSection: "161", newCode: "BNSS", newSection: "180", subject: "Examination of witnesses by police" },
  { old: "CrPC", oldSection: "164", newCode: "BNSS", newSection: "183", subject: "Recording of confessions and statements" },
  { old: "CrPC", oldSection: "167", newCode: "BNSS", newSection: "187", subject: "Procedure when investigation cannot be completed in 24 hours (remand)", change: "Police custody of up to 15 days may be sought in parts during the first 40/60 days of detention." },
  { old: "CrPC", oldSection: "313", newCode: "BNSS", newSection: "351", subject: "Power to examine the accused" },
  { old: "CrPC", oldSection: "437", newCode: "BNSS", newSection: "480", subject: "Bail in non-bailable offences" },
  { old: "CrPC", oldSection: "438", newCode: "BNSS", newSection: "482", subject: "Anticipatory bail" },
  { old: "CrPC", oldSection: "439", newCode: "BNSS", newSection: "483", subject: "Special powers of High Court / Sessions Court regarding bail" },
  { old: "CrPC", oldSection: "482", newCode: "BNSS", newSection: "528", subject: "Inherent powers of High Court" },

  // ── Expanded set (v2) — high-frequency sections in day-to-day practice
  { old: "IPC", oldSection: "107", newCode: "BNS", newSection: "45", subject: "Abetment of a thing" },
  { old: "IPC", oldSection: "109", newCode: "BNS", newSection: "49", subject: "Punishment of abetment if act abetted is committed" },
  { old: "IPC", oldSection: "120A", newCode: "BNS", newSection: "61(1)", subject: "Definition of criminal conspiracy" },
  { old: "IPC", oldSection: "141", newCode: "BNS", newSection: "189(1)", subject: "Unlawful assembly" },
  { old: "IPC", oldSection: "147", newCode: "BNS", newSection: "191(2)", subject: "Punishment for rioting" },
  { old: "IPC", oldSection: "148", newCode: "BNS", newSection: "191(3)", subject: "Rioting, armed with deadly weapon" },
  { old: "IPC", oldSection: "149", newCode: "BNS", newSection: "190", subject: "Every member of unlawful assembly guilty of offence committed in prosecution of common object" },
  { old: "IPC", oldSection: "186", newCode: "BNS", newSection: "221", subject: "Obstructing public servant in discharge of public functions" },
  { old: "IPC", oldSection: "201", newCode: "BNS", newSection: "238", subject: "Causing disappearance of evidence of offence" },
  { old: "IPC", oldSection: "304", newCode: "BNS", newSection: "105", subject: "Punishment for culpable homicide not amounting to murder" },
  { old: "IPC", oldSection: "308", newCode: "BNS", newSection: "110", subject: "Attempt to commit culpable homicide" },
  { old: "IPC", oldSection: "324", newCode: "BNS", newSection: "118(1)", subject: "Voluntarily causing hurt by dangerous weapons or means" },
  { old: "IPC", oldSection: "325", newCode: "BNS", newSection: "117(2)", subject: "Punishment for voluntarily causing grievous hurt" },
  { old: "IPC", oldSection: "326", newCode: "BNS", newSection: "118(2)", subject: "Voluntarily causing grievous hurt by dangerous weapons or means" },
  { old: "IPC", oldSection: "341", newCode: "BNS", newSection: "126(2)", subject: "Punishment for wrongful restraint" },
  { old: "IPC", oldSection: "342", newCode: "BNS", newSection: "127(2)", subject: "Punishment for wrongful confinement" },
  { old: "IPC", oldSection: "363", newCode: "BNS", newSection: "137(2)", subject: "Punishment for kidnapping" },
  { old: "IPC", oldSection: "366", newCode: "BNS", newSection: "87", subject: "Kidnapping, abducting or inducing woman to compel her marriage, etc." },
  { old: "IPC", oldSection: "380", newCode: "BNS", newSection: "305", subject: "Theft in a dwelling house, or means of transportation or place of worship, etc." },
  { old: "IPC", oldSection: "395", newCode: "BNS", newSection: "310(2)", subject: "Punishment for dacoity" },
  { old: "IPC", oldSection: "403", newCode: "BNS", newSection: "314", subject: "Dishonest misappropriation of property" },
  { old: "IPC", oldSection: "409", newCode: "BNS", newSection: "316(5)", subject: "Criminal breach of trust by public servant, banker, merchant or agent" },
  { old: "IPC", oldSection: "411", newCode: "BNS", newSection: "317(2)", subject: "Dishonestly receiving stolen property" },
  { old: "IPC", oldSection: "427", newCode: "BNS", newSection: "324(4)", subject: "Mischief causing damage (amount-based)" },
  { old: "IPC", oldSection: "447", newCode: "BNS", newSection: "329(3)", subject: "Punishment for criminal trespass" },
  { old: "IPC", oldSection: "448", newCode: "BNS", newSection: "329(4)", subject: "Punishment for house-trespass" },
  { old: "IPC", oldSection: "494", newCode: "BNS", newSection: "82(1)", subject: "Marrying again during lifetime of husband or wife" },
  { old: "IPC", oldSection: "511", newCode: "BNS", newSection: "62", subject: "Punishment for attempting to commit offences punishable with imprisonment for life or other imprisonment" },
  { old: "CrPC", oldSection: "41", newCode: "BNSS", newSection: "35", subject: "When police may arrest without warrant" },
  { old: "CrPC", oldSection: "91", newCode: "BNSS", newSection: "94", subject: "Summons to produce document or other thing", change: "Expressly covers electronic communications and devices." },
  { old: "CrPC", oldSection: "156", newCode: "BNSS", newSection: "175", subject: "Police officer's power to investigate cognizable case (156(3) → 175(3) Magistrate's order)", change: "Magistrate must consider the complainant's affidavit and the police officer's submissions before ordering investigation under 175(3)." },
  { old: "CrPC", oldSection: "173", newCode: "BNSS", newSection: "193", subject: "Report of police officer on completion of investigation (charge-sheet)", change: "Victim to be informed of progress within 90 days; further investigation during trial to be completed within 90 days unless extended." },
  { old: "CrPC", oldSection: "197", newCode: "BNSS", newSection: "218", subject: "Prosecution of judges and public servants (sanction)", change: "Deemed sanction if the authority does not decide within 120 days." },
  { old: "CrPC", oldSection: "200", newCode: "BNSS", newSection: "223", subject: "Examination of complainant (private complaint)", change: "Accused must be given an opportunity of being heard before the Magistrate takes cognizance." },
  { old: "CrPC", oldSection: "320", newCode: "BNSS", newSection: "359", subject: "Compounding of offences" },
  { old: "CrPC", oldSection: "397", newCode: "BNSS", newSection: "438", subject: "Calling for records to exercise powers of revision" },
  { old: "CrPC", oldSection: "428", newCode: "BNSS", newSection: "468", subject: "Period of detention undergone by the accused to be set off against the sentence of imprisonment" },
  { old: "CrPC", oldSection: "436", newCode: "BNSS", newSection: "478", subject: "In what cases bail to be taken (bailable offences)" },
  { old: "CrPC", oldSection: "436A", newCode: "BNSS", newSection: "479", subject: "Maximum period for which an undertrial prisoner can be detained", change: "First-time offenders may be released on bond after one-third of the maximum sentence." },
  { old: "IEA", oldSection: "24", newCode: "BSA", newSection: "22", subject: "Confession caused by inducement, threat, coercion or promise" },
  { old: "IEA", oldSection: "126", newCode: "BSA", newSection: "132", subject: "Professional communications (advocate–client privilege)" },

  // Evidence Act → BSA
  { old: "IEA", oldSection: "3", newCode: "BSA", newSection: "2", subject: "Definitions (document now expressly includes electronic and digital records)" },
  { old: "IEA", oldSection: "45", newCode: "BSA", newSection: "39", subject: "Opinions of experts" },
  { old: "IEA", oldSection: "65B", newCode: "BSA", newSection: "63", subject: "Admissibility of electronic records", change: "Certificate format prescribed in a Schedule; certificate to be signed by person in charge and an expert." },
];

const OLD_ALIASES: Record<string, OldCode> = {
  ipc: "IPC",
  "indian penal code": "IPC",
  crpc: "CrPC",
  "cr.p.c": "CrPC",
  "cr.p.c.": "CrPC",
  "code of criminal procedure": "CrPC",
  iea: "IEA",
  "evidence act": "IEA",
};

export function lookup(query: string): Mapping[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  let code: OldCode | undefined;
  for (const [alias, c] of Object.entries(OLD_ALIASES)) {
    if (q.includes(alias)) code = c;
  }
  const sec = q.match(/\b(\d{1,3}[a-z]?)\b/i)?.[1]?.toUpperCase();
  return MAPPINGS.filter((m) => {
    if (code && m.old !== code) return false;
    if (sec) return m.oldSection.toUpperCase() === sec;
    return m.subject.toLowerCase().includes(q);
  });
}

export interface FoundReference {
  match: string;
  mapping: Mapping;
}

/** Scan free text for references to repealed codes, e.g. "u/s 420 IPC", "Section 438 of CrPC", "65B of the Evidence Act". */
export function findOldReferences(text: string): FoundReference[] {
  const found: FoundReference[] = [];
  const seen = new Set<string>();
  const re =
    /(?:sections?|secs?\.?|u\/s|s\.)\s*((?:\d{1,3}[A-Z]?)(?:\s*(?:,|\/|and|&)\s*\d{1,3}[A-Z]?)*)\s*(?:of\s+(?:the\s+)?)?(IPC|Indian Penal Code|Cr\.?P\.?C\.?|Code of Criminal Procedure|(?:Indian\s+)?Evidence Act)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const codeRaw = m[2].toLowerCase().replace(/^indian\s+(?=evidence)/, "");
    const code: OldCode = codeRaw.startsWith("ipc") || codeRaw.startsWith("indian penal")
      ? "IPC"
      : codeRaw.includes("evidence")
        ? "IEA"
        : "CrPC";
    for (const s of m[1].split(/\s*(?:,|\/|and|&)\s*/i)) {
      const sec = s.trim().toUpperCase();
      const mapping = MAPPINGS.find((x) => x.old === code && x.oldSection.toUpperCase() === sec);
      const key = `${code}-${sec}`;
      if (mapping && !seen.has(key)) {
        seen.add(key);
        found.push({ match: `Section ${sec} ${code === "IEA" ? "Evidence Act" : code}`, mapping });
      }
    }
  }
  return found;
}

import { BookMarked, PenLine, Scale, ScrollText, SearchCheck, Shield, ShieldCheck, Swords } from "lucide-react";
import { CORPUS } from "@/lib/corpus";

const STEPS = [
  { Icon: ShieldCheck, name: "Privacy Shield", tone: "bg-ally text-white", body: "Masks names, addresses, phone numbers, emails, PAN, Aadhaar and bank details before anything leaves the server. The AI only sees placeholders like [PERSON_1], protecting client confidentiality (BSA s. 132)." },
  { Icon: ScrollText, name: "Court Clerk", tone: "bg-ink text-paper", body: "Reads the contract, identifies the parties and which side you are on, splits the text into clauses, rates the risk of each one, and checks stamp duty and registration first." },
  { Icon: BookMarked, name: "Librarian", tone: "bg-ink-2 text-paper", body: "Searches 2,300+ official sections of 15 central Acts, downloaded from India Code (Government of India), by keyword and by meaning. The agents argue from the actual statutory text retrieved for each clause, not from memory." },
  { Icon: Swords, name: "Opposing Counsel · प्रतिपक्ष", tone: "bg-foe text-white", body: "Acts for the other side. Finds the 4–6 strongest ways each clause can be used against you, with a concrete real-life scenario for each." },
  { Icon: Shield, name: "Your Advocate", tone: "bg-ally text-white", body: "Answers every attack using statutes and Supreme Court precedent, and says honestly how strong each defence is." },
  { Icon: SearchCheck, name: "Citation Verifier", tone: "bg-ink-2 text-paper", body: "The hallucination firewall. Every citation must carry an exact quote. Code checks the quote word-for-word against the official text, so an invented section is blocked and a paraphrased quote is flagged as misquoted. An AI verifier then checks that the source actually supports the claim." },
  { Icon: Scale, name: "The Judge", tone: "bg-gold text-ink", body: "Three independent benches rule in parallel, and the median is used, with the spread shown so you can see how certain it is. The score is the weighted average of four explained factors, and misquoted or fabricated law carries no weight." },
  { Icon: PenLine, name: "Drafter → Re-hearing", tone: "bg-gold-soft text-ink", body: "Rewrites the losing clauses so they are fair and enforceable, then runs the whole hearing again. You see the win probability rise." },
];

export function HowItWorks() {
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
        <h2 className="font-serif text-2xl font-semibold">An adversarial multi-agent courtroom</h2>
        <p className="mt-2 max-w-3xl text-ink/70">
          Most legal AI tools list risks. Pratipaksh simulates the dispute itself: one AI argues against you, another defends you, a verifier checks every citation, and a judge decides. Then it rewrites the contract until you win.
        </p>
        <ol className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.name} className="rounded-xl border border-ink/10 bg-paper/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className={`grid h-8 w-8 place-items-center rounded-full ${s.tone}`}>
                  <s.Icon className="h-4 w-4" />
                </span>
                <span className="font-mono text-xs text-ink/40">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-semibold">{s.name}</span>
              </div>
              <p className="text-sm text-ink/70">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Grounded in official text", "2,300+ sections of 15 Acts from India Code, retrieved per clause. Every quote is checked word-for-word in code, and a made-up citation can't reach the Judge."],
          ["Structured agent outputs", "Every agent returns JSON validated against a Zod schema (native structured outputs on Claude, JSON-schema mode on Gemini and others), so the courtroom UI, the Proof Ledger and the .docx export are built from data, not from parsed prose."],
          ["Built for Bharat", "Explains the result in spoken Hindi, flags references to the repealed IPC and CrPC with their BNS and BNSS replacements, and handles the documents people actually sign: rent agreements, offer letters and notices."],
        ].map(([t, b]) => (
          <div key={t} className="rounded-2xl border border-ink/10 bg-white p-5">
            <h3 className="font-serif text-lg font-semibold">{t}</h3>
            <p className="mt-1 text-sm text-ink/70">{b}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
        <h3 className="font-serif text-lg font-semibold">Case law &amp; curated sources · {CORPUS.length} entries (statutes: see the Statute library tab)</h3>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {CORPUS.map((s) => (
            <span key={s.id} title={s.text} className={`rounded-md border px-2 py-1 text-xs ${s.kind === "judgment" ? "border-gold/40 bg-gold-soft/50" : "border-ink/10 bg-paper"}`}>
              <b className="font-mono">{s.id}</b> · {s.cite}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

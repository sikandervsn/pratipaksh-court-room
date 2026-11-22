# ⚖ Pratipaksh (प्रतिपक्ष): the AI opposing counsel

**Know how you'll lose, before you sign.**

**Live testing app for judges:** [pratipaksh.vercel.app](https://pratipaksh.vercel.app) — hosted to make it easy to try and evaluate the project.

Pratipaksh is an adversarial multi-agent AI built for Indian law. Upload a rental agreement, employment contract, NDA or legal notice. The AI then runs a hearing on it:

1. **Opposing Counsel** attacks your position and shows how the other side would use each clause against you.
2. **Your Advocate** defends you using statutes and Supreme Court precedent.
3. **The Citation Verifier** checks every legal citation against a curated corpus. It blocks fabricated citations and marks weak ones (the **Proof Ledger**).
4. **The Judge** rules on each issue and gives a calibrated **win probability**.
5. **Fix loop:** with one click the **Drafter** rewrites the losing clauses, and the hearing runs again. In the bundled demo the win probability goes from 27% to 84%.

Pratipaksh also explains the verdict in **spoken Hindi**. It flags references to repealed **IPC/CrPC/Evidence Act** sections with their **BNS/BNSS/BSA** replacements, and exports a redlined **.docx** report.

Hackathon tracks covered: AI Contract Drafting · AI Legal Research · Compliance & Risk AI · Legal Assistants · Access to Justice.

## What's new in this version

| Feature | What it does | How it works |
|---|---|---|
| **Statute library (F1)** | 2,339 official sections of 15 central Acts: Contract Act, TPA, Specific Relief, Limitation, Arbitration, Consumer Protection 2019, NI Act, Registration, Stamp, Code on Wages, DPDP 2023, BNS, BNSS, BSA and IT Act | Harvested from **India Code** (indiacode.gov.in, Govt. of India) through its public API, then cleaned and chunked. Search is hybrid: BM25 keyword search plus a legal-synonym expansion, plus Gemini embeddings when available, fused with reciprocal rank fusion. A **Librarian** agent retrieves the law for every clause before anyone argues. The **Statute library** tab searches it directly |
| **Exact-quote verification (F2)** | Every citation must quote the source word-for-word; code checks it | Normalised substring match, then a spacing-insensitive match, then a longest-common-run fallback. Quotes that aren't found are marked **MISQUOTED** and carry no weight. Opposing counsel must also quote the clause it attacks, and that quote is checked against your document |
| **Evaluation suite (F3)** | 10 annotated contracts (9 risky, 1 fair control), scored by fixed rules in code | `npm run eval` runs the real pipeline and measures risk recall, false alarms, quote-match rate, fabricated citations, Judge spread and latency. Results appear in the **Evaluation** tab |
| **Judge consistency (F4)** | 3 independent Judge runs in parallel; median shown with its spread | Change the number of runs with the `JUDGE_RUNS` env var (1–5) |
| **Legal notices (F9)** | Drafts an Indian legal notice (s.138 cheque bounce, deposit refund, unpaid salary, consumer, breach), or a point-by-point **reply** to a notice you received | Grounded in retrieved sections with checked quotes. s.138 and limitation deadlines are computed by rules, not AI. Party names are masked before drafting. Exports to .docx |
| **Compare drafts (F10)** | Paste your v1 and their v2: a clause-aligned word diff, a hurts/helps verdict per change, counter-proposals, and an "easy-to-miss changes" list | Clauses are aligned by number or similarity, and renumbering is ignored. Exports a .docx with their edits as **Word tracked changes** |
| **Deadlines (F13)** | Limitation Act articles, CPA 2019 s.69/41/51, Arbitration s.34, TPA s.106, RTI s.19, plus a full **NI Act s.138/142 timeline** | Pure date arithmetic: s.12 day-exclusion, calendar months, Sunday warning (s.4). Covered by unit tests, including leap years and month ends |

Rebuild the statute library: `npm run build:library` (uses `data/india-code-raw.json`; re-harvest with `node scripts/harvest-india-code.mjs data/india-code-raw.json`). **Embeddings:** the free Gemini embedding quota ran out during this build, so search currently uses keyword + legal-synonym matching. Run `npm run build:library` again on another day to add meaning-based search. The embedding step resumes from a checkpoint if it hits Gemini's free-tier quota.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # add ONE API key (see below)
npm run dev                  # http://localhost:3000
```

* **No API key?** The app runs in **demo mode**. Click "🏠 Rental agreement" and then "Begin the hearing". It replays a pre-recorded hearing, so the demo also works offline on stage.
* **With a key**, every document goes through the live pipeline. Pratipaksh uses the first key it finds:

| Key in `.env.local` | Provider | Cost | Default model |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Claude | Paid (a new account gets a small starter credit) | `claude-opus-5-5`. Set `LLM_MODEL=claude-haiku-5-5` for about 40x cheaper |
| `GEMINI_API_KEY` | Google Gemini | **Free tier** ([get key](https://aistudio.google.com/apikey)) | `gemini-3.8-flash` |
| `GROQ_API_KEY` | Groq | **Free tier**, but a small tokens-per-minute cap | `openai/gpt-oss-120b` |
| `OPENROUTER_API_KEY` | OpenRouter | **Free `:free` models**, about 50 requests/day | `openrouter/free` |

Force a provider with `LLM_PROVIDER=gemini` and choose any model with `LLM_MODEL=...`. **Restart `npm run dev` after editing `.env.local`.** The badge at the top of the page shows which provider and model are active.

> ⚠ Don't run `npm run build` while `npm run dev` is running. Both write to `.next/`, and the dev page loses its styles. If that happens, stop the server, delete `.next` and start it again.

## Accounts, saved hearings and data deletion (Supabase, free)

Accounts are optional. Without the Supabase keys, the app works with no login.

1. Create a free project at [supabase.com](https://supabase.com).
2. In **SQL Editor**, paste [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. It creates:
   * the `hearings` table, with Row Level Security so each user can only read and delete their own rows;
   * the `delete_my_account()` function.
3. In **Project Settings → API**, copy the **Project URL** and the **anon / publishable key** into `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
4. Optional, for hackathon judges: in **Authentication → Sign In / Providers → Email**, turn off **Confirm email**. New accounts can then sign in immediately.
5. **For "Forgot password":** in **Authentication → URL Configuration**, add each app address under **Redirect URLs**: `http://localhost:3003/reset-password` and, once deployed, `https://<your-app>.vercel.app/reset-password`. Without this, Supabase sends the reset link to your Site URL instead.
6. **Branded emails (optional):** in **Authentication → Emails**, paste [`supabase/email-templates/confirm-signup.html`](supabase/email-templates/confirm-signup.html) into **Confirm signup** and [`reset-password.html`](supabase/email-templates/reset-password.html) into **Reset password**. Each file's first comment line has the suggested subject.
7. Restart `npm run dev`.

What you get once accounts are on:

* **Login and registration page** at `/login`. Every page and API route requires sign-in, which also protects your free AI quota.
* **Forgot password:** "Forgot password?" on the sign-in form emails a one-time link, valid for 1 hour, to `/reset-password`. There the user sets a new password; every session is then signed out, and the user signs in again. The app never reveals whether an email is registered.
* **My hearings:** every hearing is saved to your account. Open or delete any hearing.
* **Account & privacy → Delete my data**, unlocked by typing `DELETE`:
  * **Delete all my hearings** removes your saved hearings and keeps your login.
  * **Delete account & all data** removes your hearings and your login (`auth.users` row), then signs you out.
  * Both only ever touch the signed-in user's own data, enforced in the database.

## Architecture

```
            ┌───────────── shared, prompt-cached system prefix: rules + verified legal corpus ─────────────┐
Document ──► Clerk ──► Opposing Counsel ──► Your Advocate ──► Verifier ──► Judge ──► Hearing (UI / .docx)
 (PDF/TXT)   parse,     4-6 attacks,         rebuttal per      corpus ID      rulings,          │
             clauses,   exploit scenario,    attack, strength  check +        win %, must-fix   │
             risk       citations                              semantic check                   ▼
                                                                                   Drafter ──► re-hearing (round 2)
```

* **Next.js 15 (App Router) + Tailwind 4.** API routes stream agent progress as NDJSON, and the UI renders a live "courtroom in session" trace.
* **Anthropic TypeScript SDK.** Every agent returns **schema-validated structured output** (Zod + `messages.parse`), so the UI, the Proof Ledger and the .docx export are built from data, not from parsed prose.
* **Grounding / hallucination firewall:** agents may cite only IDs from `src/lib/corpus.ts`, which holds 46 Indian statutes and landmark Supreme Court judgments. Any ID outside the corpus is marked **fabricated** without an extra model call. The Verifier agent marks every other citation as verified, weak or contradicted. The Judge is told to give no weight to arguments that rest on contradicted or fabricated sources.
* **Prompt caching:** the corpus sits in a byte-stable system block marked `cache_control`, so all five or six agent calls in a hearing reuse it.
* **Works with any provider:**
  * **Claude** uses native structured outputs, prompt caching and refusal fallbacks.
  * **Gemini, Groq and OpenRouter** use the OpenAI-compatible API. They are asked for JSON-schema output, falling back to plain JSON mode if a model doesn't support it. The result is checked against a Zod schema, and the model gets one chance to repair invalid output.
  * Hitting a rate limit triggers an automatic retry.
* **Stage safety net:** if a live provider fails on the bundled sample, the recorded hearing is shown instead, so the demo never dies on stage.
* **IPC → BNS:** the deterministic correspondence table in `src/lib/bns-map.ts` handles both lookup and automatic rewriting of a draft.
* **Hindi voice:** the model writes a plain-language Hindi explanation, and the browser's `speechSynthesis` (`hi-IN`) reads it aloud.

| Path | What it does |
|---|---|
| `src/lib/pipeline.ts` | Multi-agent orchestration (hearing + fix-and-re-hear) |
| `src/lib/claude.ts` | Provider layer (Claude / Gemini / Groq / OpenRouter), structured outputs, error messages |
| `src/lib/corpus.ts` | Verified legal source corpus |
| `src/lib/bns-map.ts` | IPC/CrPC/IEA → BNS/BNSS/BSA mappings and the reference finder |
| `src/lib/demo.ts` | Pre-recorded demo hearings (round 1 and round 2) |
| `src/app/api/*` | `hearing`, `fix`, `extract` (PDF), `hindi`, `export` (.docx), `status` |
| `src/components/*` | Courtroom UI, win gauge, Proof Ledger, IPC converter |
| `sample-outputs/` | Example .docx reports generated by the app |

## Deploy (Vercel)

1. Push this folder to GitHub, then import it at vercel.com/new.
2. In **Settings → Environment Variables**, add your AI key (for example `GEMINI_API_KEY`), `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy. The API routes set `maxDuration = 300` because a live hearing makes five model calls in a row.
4. In Supabase, go to **Authentication → URL Configuration** and set **Site URL** to your Vercel URL (for example `https://pratipaksh.vercel.app`). Add the same URL under **Redirect URLs**. Otherwise, sign-up confirmation links point to localhost.

## Security

| Area | Protection |
|---|---|
| Secrets | AI keys are server-only. They have no `NEXT_PUBLIC_` prefix and never reach the browser bundle (checked after build). `.env*` files are git-ignored, except `.env.example`, which holds no values. |
| Supabase key | Only the **publishable/anon** key is used in the app, and it's designed to be public. Never put the `service_role` / `sb_secret_…` key in this project. |
| Data isolation | Row Level Security on `hearings`: a user can only read, insert and delete their own rows. Signed-out visitors have no table access. `delete_my_account()` can only delete the caller. |
| Auth | Middleware sends signed-out visitors to `/login`. **Every API route also checks the session itself**, so the app stays protected even if the middleware is bypassed. |
| Cost / abuse | Per-user rate limits (per IP when accounts are off). Defaults: 6 live hearings per hour and 20 per day, plus 40 light requests per hour. Tune them with `RATE_LIMIT_*` env vars. The recorded demo is free. |
| Input limits | JSON bodies are capped at 300 KB for hearings and 1.5 MB for hearing payloads. Documents are capped at 60,000 characters and uploads at 10 MB, PDF/TXT/MD only. Hearings sent back from the browser are shape-validated. |
| Database limits | Each saved hearing is capped at 2 MB, and each user at 500 saved hearings (enforced in `schema.sql`). |
| Errors | Anything that looks like a key or token is removed from error messages before they reach the browser. |
| Prompt injection | Agents are told that document text is untrusted data. Outputs are schema-validated JSON, and the agents have no tools or web access. |
| Headers | `X-Frame-Options: DENY`, `nosniff`, HSTS, `Referrer-Policy` and `Permissions-Policy`. `X-Powered-By` is removed. |
| Dependencies | Next.js 15.5.29 and React 19.1.10, patched for the 2025 React Server Components RCE. `npm audit`: 0 vulnerabilities. |

**Privacy note:** documents are sent to the configured AI provider. On Gemini's free tier, Google may use inputs to improve its products. Tell testers not to upload real confidential documents, or use a paid tier.

## Limitations (stated openly)

* The corpus is a curated set of summaries, not a complete law database. Production use would plug in a full statute and judgment index (for example India Code, or SCC/Manupatra APIs) behind the same verifier.
* The Model Tenancy Act applies only in States that have adopted it, and the agents are told to say so.
* Scanned PDFs without a text layer have to be pasted as text.
* **This is not legal advice.** Pratipaksh helps people prepare. Always consult an advocate.

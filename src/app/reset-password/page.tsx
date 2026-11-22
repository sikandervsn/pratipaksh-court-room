"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Lock } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

type Stage = "checking" | "ready" | "invalid" | "saving" | "done";

/** Landing page for the password-reset email link. */
export default function ResetPasswordPage() {
  const [stage, setStage] = useState<Stage>("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      setStage("invalid");
      return;
    }
    (async () => {
      // Expired / already-used links come back with an error in the URL hash or query.
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      if (hash.get("error") || query.get("error")) {
        window.location.replace("/login?reset=expired");
        return;
      }
      // The client may already have exchanged the code automatically; otherwise exchange it now.
      let { data } = await sb.auth.getSession();
      const code = query.get("code");
      if (!data.session && code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          window.location.replace("/login?reset=expired");
          return;
        }
        data = (await sb.auth.getSession()).data;
      }
      if (data.session) {
        setEmail(data.session.user.email ?? null);
        setStage("ready");
        // Remove the one-time code from the address bar.
        window.history.replaceState(null, "", "/reset-password");
      } else setStage("invalid");
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) return setError("Use at least 8 characters.");
    if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return setError("Use a mix of letters and numbers.");
    if (pw !== pw2) return setError("The two passwords don't match.");
    const sb = supabaseBrowser()!;
    setStage("saving");
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) {
      setStage("ready");
      setError(/same/i.test(error.message) ? "The new password must be different from your old one." : error.message);
      return;
    }
    setStage("done");
    // Sign out everywhere so any old sessions on other devices are ended, then sign in fresh.
    await sb.auth.signOut({ scope: "global" }).catch(() => {});
    setTimeout(() => window.location.replace("/login?reset=done"), 1500);
  }

  return (
    <div className="paper-grain flex min-h-screen items-center justify-center bg-paper px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-xl shadow-ink/5 sm:p-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold text-xl text-ink">⚖</span>
          <span className="font-serif text-xl font-bold">Pratipaksh</span>
        </div>

        {stage === "checking" && (
          <p className="flex items-center gap-2 text-sm text-ink/60">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your reset link…
          </p>
        )}

        {stage === "invalid" && (
          <>
            <h1 className="font-serif text-2xl font-semibold">Link not valid</h1>
            <p className="mt-2 text-sm text-ink/65">This reset link is invalid or has expired. Links work once and expire after 1 hour.</p>
            <Link href="/login?reset=expired" className="mt-5 inline-block rounded-xl bg-ink px-5 py-2.5 font-semibold text-paper">
              Request a new link
            </Link>
          </>
        )}

        {(stage === "ready" || stage === "saving") && (
          <>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold">
              <KeyRound className="h-6 w-6 text-gold" /> Set a new password
            </h1>
            <p className="mt-1 mb-5 text-sm text-ink/60">{email ? `For ${email}` : "Choose a new password for your account."}</p>
            <form onSubmit={save} className="space-y-3" noValidate>
              {[
                [pw, setPw, "New password", "new-password"],
                [pw2, setPw2, "Repeat new password", "new-password"],
              ].map(([v, set, label, ac], i) => (
                <label key={i} className="block">
                  <span className="mb-1 block text-xs font-semibold text-ink/60">{label as string}</span>
                  <span className="flex items-center gap-2 rounded-xl border border-ink/15 bg-paper/50 px-3 py-2.5 focus-within:border-gold focus-within:ring-2 focus-within:ring-gold/20">
                    <Lock className="h-4 w-4 shrink-0 text-ink/40" />
                    <input
                      type={show ? "text" : "password"}
                      value={v as string}
                      onChange={(e) => (set as (s: string) => void)(e.target.value)}
                      autoComplete={ac as string}
                      className="w-full bg-transparent outline-none"
                    />
                    {i === 0 && (
                      <button type="button" onClick={() => setShow((s) => !s)} className="text-ink/40 hover:text-ink" aria-label={show ? "Hide password" : "Show password"}>
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    )}
                  </span>
                </label>
              ))}
              <p className="text-xs text-ink/50">At least 8 characters, with letters and numbers.</p>
              {error && <p className="rounded-lg bg-foe-soft px-3 py-2 text-sm text-foe">{error}</p>}
              <button
                type="submit"
                disabled={stage === "saving"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink py-3 font-semibold text-paper disabled:opacity-50"
              >
                {stage === "saving" && <Loader2 className="h-4 w-4 animate-spin" />} Save new password
              </button>
            </form>
          </>
        )}

        {stage === "done" && (
          <p className="flex items-center gap-2 rounded-xl bg-ally-soft p-4 text-sm font-semibold text-ally">
            <CheckCircle2 className="h-5 w-5" /> Password changed. Taking you to sign in…
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AlertTriangle, ChevronDown, FolderOpen, Loader2, LogOut, Trash2, UserRound, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Hearing } from "@/lib/types";

// ───────── current user ─────────
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) {
      setReady(true);
      return;
    }
    sb.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setReady(true);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { user, ready };
}

// ───────── persistence ─────────
export async function saveHearing(h: Hearing): Promise<string | null> {
  const sb = supabaseBrowser();
  if (!sb) return null;
  const { error } = await sb.from("hearings").insert({
    title: h.clerk.docTitle.slice(0, 200),
    doc_type: h.clerk.docType.slice(0, 200),
    user_side: h.clerk.userSide.slice(0, 80),
    round: h.round,
    win_probability: h.judge.winProbability,
    data: h,
  });
  return error ? error.message : null;
}

interface Row {
  id: string;
  title: string;
  doc_type: string | null;
  user_side: string | null;
  round: number;
  win_probability: number | null;
  created_at: string;
}

// ───────── header menu ─────────
export function UserMenu({ user, onOpenAccount }: { user: User; onOpenAccount: () => void }) {
  const [open, setOpen] = useState(false);
  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "Account";
  async function signOut() {
    await supabaseBrowser()?.auth.signOut();
    window.location.href = "/login";
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pr-3 pl-1.5 text-sm hover:bg-white/15">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gold font-bold text-ink">{name.charAt(0).toUpperCase()}</span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{name}</span>
        <ChevronDown className="h-4 w-4 opacity-60" />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="rise absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-ink/10 bg-white text-sm text-ink shadow-2xl">
            <div className="border-b border-ink/10 px-4 py-3">
              <div className="font-semibold">{name}</div>
              <div className="truncate text-xs text-ink/55">{user.email}</div>
            </div>
            <button onClick={() => (setOpen(false), onOpenAccount())} className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-paper">
              <UserRound className="h-4 w-4" /> Account &amp; privacy
            </button>
            <button onClick={signOut} className="flex w-full items-center gap-2 px-4 py-2.5 hover:bg-paper">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ───────── saved hearings ─────────
export function HistoryPanel({ onOpen, refreshKey }: { onOpen: (h: Hearing) => void; refreshKey: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    setError(null);
    const { data, error } = await sb
      .from("hearings")
      .select("id,title,doc_type,user_side,round,win_probability,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) setError(/relation|does not exist|schema cache/i.test(error.message) ? "The database table is missing — run supabase/schema.sql in your Supabase SQL editor." : error.message);
    else setRows(data as Row[]);
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function open(id: string) {
    setBusyId(id);
    const { data, error } = await supabaseBrowser()!.from("hearings").select("data").eq("id", id).single();
    setBusyId(null);
    if (error || !data) return setError(error?.message ?? "Could not open this hearing.");
    onOpen(data.data as Hearing);
  }

  async function remove(id: string) {
    if (!confirm("Delete this saved hearing permanently?")) return;
    setBusyId(id);
    const { error } = await supabaseBrowser()!.from("hearings").delete().eq("id", id);
    setBusyId(null);
    if (error) setError(error.message);
    else setRows((r) => r?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <h2 className="font-serif text-xl font-semibold">My hearings</h2>
      <p className="mb-4 text-sm text-ink/60">Every hearing you run is saved privately to your account. Only you can see these.</p>
      {error && <p className="mb-3 rounded-lg bg-foe-soft px-3 py-2 text-sm text-foe">{error}</p>}
      {!rows && !error && <Loader2 className="h-5 w-5 animate-spin text-ink/40" />}
      {rows && rows.length === 0 && <p className="text-sm text-ink/50">No hearings yet. Run one in the Courtroom.</p>}
      <ul className="divide-y divide-ink/10">
        {rows?.map((r) => {
          const wp = r.win_probability ?? 0;
          const tone = wp >= 65 ? "bg-ally-soft text-ally" : wp >= 40 ? "bg-warn-soft text-warn" : "bg-foe-soft text-foe";
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className={`w-14 rounded-lg py-1 text-center text-sm font-bold ${tone}`}>{wp}%</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.title}</div>
                <div className="text-xs text-ink/50">
                  {r.doc_type} · as {r.user_side} · round {r.round} · {new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </div>
              </div>
              <button onClick={() => open(r.id)} disabled={busyId === r.id} className="inline-flex items-center gap-1 rounded-lg border border-ink/15 px-3 py-1.5 text-sm hover:border-gold">
                {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderOpen className="h-4 w-4" />} Open
              </button>
              <button onClick={() => remove(r.id)} disabled={busyId === r.id} className="rounded-lg p-2 text-ink/40 hover:bg-foe-soft hover:text-foe" aria-label="Delete hearing">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ───────── account & privacy dialog (delete data) ─────────
export function AccountDialog({ user, onClose, onHistoryCleared }: { user: User; onClose: () => void; onHistoryCleared: () => void }) {
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState<null | "history" | "account">(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const armed = confirmText.trim().toUpperCase() === "DELETE";

  async function clearHistory() {
    setBusy("history");
    setMsg(null);
    const { error } = await supabaseBrowser()!.from("hearings").delete().eq("user_id", user.id);
    setBusy(null);
    if (error) setMsg({ ok: false, text: error.message });
    else {
      setMsg({ ok: true, text: "All your saved hearings were deleted." });
      setConfirmText("");
      onHistoryCleared();
    }
  }

  async function deleteAccount() {
    setBusy("account");
    setMsg(null);
    const sb = supabaseBrowser()!;
    const { error } = await sb.rpc("delete_my_account");
    if (error) {
      setBusy(null);
      setMsg({
        ok: false,
        text: /function|does not exist|schema cache/i.test(error.message) ? "Account deletion isn't set up — run supabase/schema.sql in Supabase." : error.message,
      });
      return;
    }
    await sb.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4" role="dialog" aria-modal="true">
      <div className="rise w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold">Account &amp; privacy</h2>
            <p className="text-sm text-ink/60">{user.email}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-ink/50 hover:bg-paper" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-xl border border-foe/30 bg-foe-soft/50 p-4">
          <h3 className="flex items-center gap-2 font-semibold text-foe">
            <AlertTriangle className="h-4 w-4" /> Delete my data
          </h3>
          <p className="mt-1 text-sm text-ink/70">
            This permanently deletes <b>only your</b> data from Pratipaksh and cannot be undone. Type <b>DELETE</b> to unlock the buttons.
          </p>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            className="mt-3 w-full rounded-lg border border-foe/30 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-foe/20"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              disabled={!armed || !!busy}
              onClick={clearHistory}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-foe/40 bg-white px-3 py-2 text-sm font-semibold text-foe disabled:opacity-40"
            >
              {busy === "history" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete all my hearings
            </button>
            <button
              disabled={!armed || !!busy}
              onClick={deleteAccount}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-foe px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {busy === "account" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete account &amp; all data
            </button>
          </div>
          {msg && <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-ally-soft text-ally" : "bg-white text-foe"}`}>{msg.text}</p>}
        </div>
        <p className="mt-4 text-xs text-ink/50">
          &ldquo;Delete all my hearings&rdquo; keeps your login. &ldquo;Delete account &amp; all data&rdquo; removes your hearings and your login, then signs you out.
        </p>
      </div>
    </div>
  );
}

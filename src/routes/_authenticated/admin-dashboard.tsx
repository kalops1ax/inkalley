import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Invite = Database["public"]["Tables"]["invitation_codes"]["Row"];

export const Route = createFileRoute("/_authenticated/admin-dashboard")({
  head: () => ({ meta: [{ title: "Admin — InkAlley" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [codes, setCodes] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id)
        .eq("role", "admin")
        .maybeSingle();
      const admin = !!data;
      setIsAdmin(admin);
      setChecking(false);
      if (admin) refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refresh() {
    const { data } = await supabase
      .from("invitation_codes")
      .select("*")
      .order("created_at", { ascending: false });
    setCodes(data ?? []);
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      const code = randomCode();
      const { error } = await supabase
        .from("invitation_codes")
        .insert({ code, assigned_to_email: email || null });
      if (error) throw error;
      setEmail("");
      setMsg(`Generated ${code}`);
      refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <Shell>
        <div className="text-slate-400">Checking access…</div>
      </Shell>
    );
  }

  if (!isAdmin) {
    return (
      <Shell>
        <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
          <h1 className="text-2xl font-semibold">Not found</h1>
          <p className="mt-2 text-sm text-slate-400">This page doesn't exist.</p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-4 rounded-md bg-indigo-500 px-4 py-2 text-sm text-white"
          >
            Go home
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="pb-6">
        <div className="text-xs uppercase tracking-widest text-indigo-300">Admin</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Invitation codes</h1>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold">Generate new code</h2>
        <form onSubmit={generate} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="artist@example.com"
            className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-60"
          >
            Generate invite code
          </button>
        </form>
        {msg && <div className="mt-3 text-sm text-slate-300">{msg}</div>}
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-sm">
          <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Assigned to</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No codes yet.
                </td>
              </tr>
            )}
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-slate-800">
                <td className="px-4 py-3 font-mono text-indigo-300">{c.code}</td>
                <td className="px-4 py-3 text-slate-300">{c.assigned_to_email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      c.is_used
                        ? "rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                        : "rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300"
                    }
                  >
                    {c.is_used ? "Redeemed" : "Available"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => navigator.clipboard.writeText(c.code)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                  >
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-500 text-sm font-black text-white">K</div>
          <span className="text-lg font-semibold">InkAlley</span>
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm hover:border-slate-500"
        >
          Sign out
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-16">{children}</main>
    </div>
  );
}

function randomCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) out += "-";
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

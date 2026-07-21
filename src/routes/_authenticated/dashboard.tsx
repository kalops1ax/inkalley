import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type BaseProduct = Database["public"]["Tables"]["base_products"]["Row"];
type MerchItem = Database["public"]["Tables"]["merchandise_items"]["Row"];

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Kiosk" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      navigate({ to: "/auth" });
      return;
    }
    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", u.user.id)
      .maybeSingle();
    setProfile(p);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <Shell><div className="text-slate-400">Loading…</div></Shell>;
  if (!profile) return <Shell><div className="text-slate-400">Profile not found.</div></Shell>;
  if (!profile.is_verified) return <AccessDenied onUnlocked={refresh} />;
  return <ArtistDashboard profile={profile} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-500 text-sm font-black text-white">K</div>
          <span className="text-lg font-semibold">Kiosk</span>
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

function AccessDenied({ onUnlocked }: { onUnlocked: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function redeem(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");

      const trimmed = code.trim().toUpperCase();
      const { data: invite, error: fetchErr } = await supabase
        .from("invitation_codes")
        .select("*")
        .eq("code", trimmed)
        .eq("is_used", false)
        .maybeSingle();
      if (fetchErr) throw fetchErr;
      if (!invite) throw new Error("Invalid or already-used code.");

      const { error: markErr } = await supabase
        .from("invitation_codes")
        .update({ is_used: true, used_by: u.user.id, used_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (markErr) throw markErr;

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ is_verified: true, role: "artist" })
        .eq("id", u.user.id);
      if (profErr) throw profErr;

      onUnlocked();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redemption failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell>
      <div className="relative mx-auto mt-8 max-w-lg">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl"
          style={{
            background:
              "radial-gradient(60% 60% at 50% 0%,rgba(99,102,241,0.35),transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center backdrop-blur-xl">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 text-2xl">
            🔒
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight">
            Kiosk is invite-only for artists
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Your buyer account is active — you can browse and purchase merch. To open
            your own shop and manage drops, redeem an invitation code below.
          </p>
          <form onSubmit={redeem} className="mt-6 space-y-3 text-left">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="INVITATION CODE"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-slate-600 focus:border-indigo-400 focus:outline-none"
            />
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-50"
            >
              {loading ? "Redeeming…" : "Unlock artist access"}
            </button>
          </form>
        </div>
      </div>
    </Shell>
  );
}

function ArtistDashboard({ profile }: { profile: Profile }) {
  const [bases, setBases] = useState<BaseProduct[]>([]);
  const [items, setItems] = useState<MerchItem[]>([]);
  const [title, setTitle] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [baseId, setBaseId] = useState<number | null>(null);
  const [markup, setMarkup] = useState<string>("5.00");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("base_products").select("*").order("id").then(({ data }) => {
      const list = data ?? [];
      setBases(list);
      if (list[0]) setBaseId(list[0].id);
    });
    supabase
      .from("merchandise_items")
      .select("*")
      .eq("artist_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [profile.id]);

  const baseCost = bases.find((b) => b.id === baseId)?.platform_base_cost_usd ?? 0;
  const markupNum = Number(markup) || 0;
  const retail = Number(baseCost) + markupNum;

  async function createItem(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!baseId) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("merchandise_items")
        .insert({
          artist_id: profile.id,
          base_product_id: baseId,
          title,
          design_url: designUrl,
          artist_markup_usd: markupNum,
          retail_price_usd: retail,
        })
        .select()
        .single();
      if (error) throw error;
      setItems((prev) => [data, ...prev]);
      setTitle("");
      setDesignUrl("");
      setMarkup("5.00");
      setMsg("Merch created ✓");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-indigo-300">Verified artist</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">@{profile.username}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your shop lives at <span className="text-slate-200">/shop/{profile.username}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Create new merchandise</h2>
          <form onSubmit={createItem} className="mt-4 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
                placeholder="Moth Oracle Standee"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Transparent PNG design URL
              </span>
              <input
                required
                type="url"
                value={designUrl}
                onChange={(e) => setDesignUrl(e.target.value)}
                className={inputCls}
                placeholder="https://…/design.png"
              />
              <p className="mt-1 text-xs text-slate-500">
                Paste a hosted PNG. (File upload coming next.)
              </p>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Base product
                </span>
                <select
                  value={baseId ?? ""}
                  onChange={(e) => setBaseId(Number(e.target.value))}
                  className={inputCls}
                >
                  {bases.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — ${Number(b.platform_base_cost_usd).toFixed(2)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Your profit / markup (USD)
                </span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={markup}
                  onChange={(e) => setMarkup(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 text-center">
              <div className="text-xs uppercase tracking-widest text-indigo-300">Final retail price</div>
              <div className="mt-1 text-5xl font-bold text-white">${retail.toFixed(2)}</div>
              <div className="mt-2 text-xs text-slate-400">
                Base ${Number(baseCost).toFixed(2)} + your ${markupNum.toFixed(2)}
              </div>
            </div>

            {msg && <div className="text-sm text-slate-300">{msg}</div>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create merchandise"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Your merchandise</h2>
          <div className="mt-4 space-y-3">
            {items.length === 0 && (
              <div className="rounded-md border border-dashed border-slate-800 p-6 text-center text-sm text-slate-500">
                No merch yet. Create your first drop.
              </div>
            )}
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.title}</div>
                  <div className="text-xs text-slate-500">
                    Markup ${Number(it.artist_markup_usd).toFixed(2)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${Number(it.retail_price_usd).toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">
                    {it.is_active ? "Active" : "Hidden"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Shell>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none";

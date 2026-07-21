import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type BaseProduct = Database["public"]["Tables"]["base_products"]["Row"];
type MerchItem = Database["public"]["Tables"]["merchandise_items"]["Row"];

type DraftVariant = {
  id: string;
  variant_value: string;
  additional_cost_usd: string;
  sku: string;
};
type DraftOption = {
  id: string;
  option_name: string;
  variants: DraftVariant[];
};

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — InkAlley" }] }),
  component: Dashboard,
});

type SocialLinks = Record<string, string>;

const SOCIAL_PLATFORMS: { key: string; label: string; placeholder: string }[] = [
  { key: "twitter", label: "Twitter / X", placeholder: "https://twitter.com/yourhandle" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle" },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle" },
  { key: "website", label: "Personal site", placeholder: "https://yourart.site" },
];

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

  if (loading) {
    return (
      <Shell>
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </Shell>
    );
  }

  if (!profile) {
    return (
      <Shell>
        <div className="text-slate-400">Profile not found.</div>
      </Shell>
    );
  }

  const blocked = !profile.is_verified || profile.role !== "artist";
  if (blocked) return <InviteGate profile={profile} onUnlocked={refresh} />;

  return <ArtistDashboard profile={profile} onProfileChange={refresh} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <button onClick={() => navigate({ to: "/" })} className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-500 text-sm font-black text-white shadow-lg shadow-indigo-500/40">
            IA
          </div>
          <span className="text-lg font-semibold tracking-tight">InkAlley</span>
        </button>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth", replace: true });
          }}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-6 pb-16">{children}</main>
    </div>
  );
}

function InviteGate({ profile, onUnlocked }: { profile: Profile; onUnlocked: () => void }) {
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
      if (!invite) throw new Error("That code is invalid or has already been used.");

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
    <div className="relative min-h-screen bg-slate-950 text-slate-100">
      {/* Blurred dashboard preview behind the gate */}
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <div className="mx-auto max-w-6xl px-6 pt-28">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] blur-2xl">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="h-6 w-48 rounded bg-slate-700/60" />
              <div className="mt-4 space-y-4">
                <div className="h-10 rounded bg-slate-800/60" />
                <div className="h-10 rounded bg-slate-800/60" />
                <div className="h-24 rounded-xl bg-indigo-500/10" />
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <div className="h-6 w-32 rounded bg-slate-700/60" />
              <div className="mt-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg bg-slate-800/40" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-70"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%,rgba(99,102,241,0.35),transparent 70%)",
        }}
      />

      {/* Gate content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-500 text-sm font-black text-white shadow-lg shadow-indigo-500/40">
              IA
            </div>
            <span className="text-lg font-semibold tracking-tight">InkAlley</span>
          </div>
          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1 text-xs text-slate-400 backdrop-blur">
            Signed in as @{profile.username}
          </span>
        </header>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-10">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:p-10">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-indigo-400/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/20">
              <KeyRound className="h-7 w-7 text-indigo-300" />
            </div>
            <h1 className="mt-6 text-2xl font-semibold leading-snug tracking-tight text-white sm:text-[1.7rem]">
              InkAlley is currently invite-only for creators.
              <br className="hidden sm:block" />
              <span className="text-slate-400">
                {" "}
                Please input your unique verification code to open your shop.
              </span>
            </h1>
            <p className="mt-3 text-sm text-slate-500">
              Your buyer account is ready — you can browse and purchase from any artist. To
              open your own shop and start dropping merch, redeem a creator invitation below.
            </p>

            <form onSubmit={redeem} className="mt-7 space-y-3 text-left">
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
                  Verification code
                </span>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-white placeholder-slate-600 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                />
              </label>

              {error && (
                <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-500 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>Unlock creator access</>
                )}
              </button>
            </form>

            <p className="mt-5 text-xs text-slate-600">
              Don't have a code? InkAlley creators are invited one at a time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArtistDashboard({
  profile,
  onProfileChange,
}: {
  profile: Profile;
  onProfileChange: () => void;
}) {
  const [bases, setBases] = useState<BaseProduct[]>([]);
  const [items, setItems] = useState<MerchItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [designUrl, setDesignUrl] = useState("");
  const [baseId, setBaseId] = useState<number | null>(null);
  const [markup, setMarkup] = useState<string>("5.00");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [options, setOptions] = useState<DraftOption[]>([]);

  const uid = () => Math.random().toString(36).slice(2, 10);

  function addOption() {
    setOptions((prev) => [
      ...prev,
      { id: uid(), option_name: "", variants: [
        { id: uid(), variant_value: "", additional_cost_usd: "0", sku: "" },
      ] },
    ]);
  }
  function updateOptionName(optId: string, name: string) {
    setOptions((prev) =>
      prev.map((o) => (o.id === optId ? { ...o, option_name: name } : o)),
    );
  }
  function removeOption(optId: string) {
    setOptions((prev) => prev.filter((o) => o.id !== optId));
  }
  function addVariant(optId: string) {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optId
          ? { ...o, variants: [...o.variants, { id: uid(), variant_value: "", additional_cost_usd: "0", sku: "" }] }
          : o,
      ),
    );
  }
  function updateVariant(optId: string, varId: string, field: keyof DraftVariant, value: string) {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optId
          ? { ...o, variants: o.variants.map((v) => (v.id === varId ? { ...v, [field]: value } : v)) }
          : o,
      ),
    );
  }
  function removeVariant(optId: string, varId: string) {
    setOptions((prev) =>
      prev.map((o) =>
        o.id === optId
          ? { ...o, variants: o.variants.filter((v) => v.id !== varId) }
          : o,
      ),
    );
  }
  function resetForm() {
    setOptions([]);
  }

  useEffect(() => {
    supabase.from("base_products").select("*").order("id").then(({ data }) => {
      const list = data ?? [];
      setBases(list);
      if (list[0]) setBaseId(list[0].id);
    });
    refreshItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  function refreshItems() {
    supabase
      .from("merchandise_items")
      .select("*")
      .eq("artist_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }

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
          description: description || null,
          design_url: designUrl,
          artist_markup_usd: markupNum,
          retail_price_usd: retail,
        })
        .select()
        .single();
      if (error) throw error;

      // Persist curated options + variants (artist curation).
      for (const opt of options) {
        const name = opt.option_name.trim();
        if (!name || opt.variants.length === 0) continue;
        const { data: optRow, error: optErr } = await supabase
          .from("product_options")
          .insert({ product_id: data.id, option_name: name })
          .select()
          .single();
        if (optErr) throw optErr;
        const variantRows = opt.variants
          .map((v) => ({
            option_id: optRow.id,
            variant_value: v.variant_value.trim(),
            additional_cost_usd: Number(v.additional_cost_usd) || 0,
            sku: v.sku.trim() || null,
          }))
          .filter((v) => v.variant_value);
        if (variantRows.length === 0) {
          await supabase.from("product_options").delete().eq("id", optRow.id);
          continue;
        }
        const { error: varErr } = await supabase
          .from("product_variants")
          .insert(variantRows);
        if (varErr) throw varErr;
      }

      setItems((prev) => [data, ...prev]);
      setTitle("");
      setDescription("");
      setDesignUrl("");
      setMarkup("5.00");
      resetForm();
      setMsg("Merch published — it's live in your shop.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item: MerchItem) {
    const next = !item.is_active;
    const { error } = await supabase
      .from("merchandise_items")
      .update({ is_active: next })
      .eq("id", item.id);
    if (error) {
      setMsg(error.message);
      return;
    }
    setItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, is_active: next } : m)),
    );
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-indigo-300">Verified creator</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">@{profile.username}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Your shop lives at{" "}
            <a
              href={`/shop/${profile.username}`}
              className="text-slate-200 underline-offset-4 hover:underline"
            >
              /shop/{profile.username}
            </a>
          </p>
        </div>
        <button
          onClick={() => setEditingProfile(true)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-200 transition hover:border-indigo-400/60 hover:text-white"
        >
          <Pencil className="h-4 w-4" />
          Edit profile
        </button>
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
                Description (optional)
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls + " min-h-[72px] resize-y"}
                placeholder="A few words about this drop…"
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

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white">Curated options</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Add option groups (e.g. Finish Type) with variants buyers can pick. Optional additional cost adds to the retail price.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addOption}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition hover:border-indigo-400 hover:text-indigo-200"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add option
                </button>
              </div>

              {options.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-slate-800 p-4 text-center text-xs text-slate-600">
                  No options yet — buyers will purchase the base item as-is.
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {options.map((opt) => (
                    <div key={opt.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={opt.option_name}
                          onChange={(e) => updateOptionName(opt.id, e.target.value)}
                          className={inputCls}
                          placeholder="Option name (e.g. Finish Type, Base Size)"
                        />
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          className="shrink-0 rounded-md border border-slate-700 p-2 text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300"
                          title="Remove option"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-3 space-y-2">
                        {opt.variants.map((v) => (
                          <div key={v.id} className="grid grid-cols-12 gap-2">
                            <input
                              type="text"
                              value={v.variant_value}
                              onChange={(e) => updateVariant(opt.id, v.id, "variant_value", e.target.value)}
                              className={inputCls + " col-span-12 sm:col-span-5"}
                              placeholder="Variant (e.g. Holographic)"
                            />
                            <div className="col-span-6 sm:col-span-3">
                              <div className="relative">
                                <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">$</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.50"
                                  value={v.additional_cost_usd}
                                  onChange={(e) => updateVariant(opt.id, v.id, "additional_cost_usd", e.target.value)}
                                  className={inputCls + " pl-6"}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => updateVariant(opt.id, v.id, "sku", e.target.value)}
                              className={inputCls + " col-span-5 sm:col-span-3"}
                              placeholder="SKU (opt)"
                            />
                            <button
                              type="button"
                              onClick={() => removeVariant(opt.id, v.id)}
                              className="col-span-1 flex items-center justify-center rounded-md border border-slate-700 text-slate-400 transition hover:border-rose-500/60 hover:text-rose-300"
                              title="Remove variant"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => addVariant(opt.id)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-300 transition hover:text-indigo-200"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add variant
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-5 text-center">
              <div className="text-xs uppercase tracking-widest text-indigo-300">Final retail price</div>
              <div className="mt-1 text-5xl font-bold text-white">${retail.toFixed(2)}</div>
              <div className="mt-2 text-xs text-slate-400">
                Base ${Number(baseCost).toFixed(2)} + your ${markupNum.toFixed(2)}
              </div>
            </div>

            {msg && (
              <div className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create merchandise
                </>
              )}
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
              <div
                key={it.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{it.title}</div>
                  <div className="text-xs text-slate-500">
                    Markup ${Number(it.artist_markup_usd).toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold">${Number(it.retail_price_usd).toFixed(2)}</div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-500">
                      {it.is_active ? "Active" : "Hidden"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleActive(it)}
                    className="rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-slate-500 hover:text-white"
                  >
                    {it.is_active ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {editingProfile && (
        <ProfileEditModal
          profile={profile}
          onClose={() => setEditingProfile(false)}
          onSaved={() => {
            setEditingProfile(false);
            onProfileChange();
          }}
        />
      )}
    </Shell>
  );
}

function ProfileEditModal({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [portfolioLink, setPortfolioLink] = useState(profile.portfolio_link ?? "");
  const [socials, setSocials] = useState<SocialLinks>(() => {
    const raw = (profile.social_links ?? {}) as SocialLinks;
    const seeded: SocialLinks = {};
    for (const p of SOCIAL_PLATFORMS) seeded[p.key] = raw[p.key] ?? "";
    return seeded;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setSocial(key: string, value: string) {
    setSocials((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const cleanedSocials: SocialLinks = {};
      for (const [k, v] of Object.entries(socials)) {
        if (v.trim()) cleanedSocials[k] = v.trim();
      }
      const { error: err } = await supabase
        .from("profiles")
        .update({
          bio: bio.trim() || null,
          avatar_url: avatarUrl.trim() || null,
          portfolio_link: portfolioLink.trim() || null,
          social_links: Object.keys(cleanedSocials).length ? cleanedSocials : null,
        })
        .eq("id", profile.id);
      if (err) throw err;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit your profile</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="mt-5 space-y-4">
          <label className="block">
            <span className={labelCls}>Avatar image URL</span>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className={inputCls}
              placeholder="https://…/avatar.png"
            />
          </label>
          <label className="block">
            <span className={labelCls}>Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={inputCls + " min-h-[80px] resize-y"}
              placeholder="A line or two about your art."
            />
          </label>
          <label className="block">
            <span className={labelCls}>Portfolio link</span>
            <input
              type="url"
              value={portfolioLink}
              onChange={(e) => setPortfolioLink(e.target.value)}
              className={inputCls}
              placeholder="https://yourportfolio.com"
            />
          </label>

          <div>
            <span className={labelCls}>Social links</span>
            <div className="mt-1 space-y-3">
              {SOCIAL_PLATFORMS.map((p) => (
                <label key={p.key} className="block">
                  <span className="mb-1 block text-xs text-slate-500">{p.label}</span>
                  <input
                    type="url"
                    value={socials[p.key] ?? ""}
                    onChange={(e) => setSocial(p.key, e.target.value)}
                    className={inputCls}
                    placeholder={p.placeholder}
                  />
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

const labelCls = "mb-1 block text-xs uppercase tracking-wider text-slate-400";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, ExternalLink, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/shop/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — InkAlley` },
      {
        name: "description",
        content: `Shop merch from @${params.username} on InkAlley — acrylic standees, laser tickets, die-cut stickers.`,
      },
      { property: "og:title", content: `@${params.username} — InkAlley` },
      {
        property: "og:description",
        content: `Shop merch from @${params.username}.`,
      },
    ],
  }),
  component: ShopPage,
  notFoundComponent: ShopNotFound,
});

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type SocialLinks = Record<string, string>;

type Merch = {
  id: string;
  title: string;
  description: string | null;
  design_url: string;
  retail_price_usd: number;
  is_active: boolean;
  artist_id: string;
};

const SOCIAL_ICONS: { key: string; label: string }[] = [
  { key: "twitter", label: "Twitter / X" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "website", label: "Website" },
];

function ShopPage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null | "missing">(null);
  const [merch, setMerch] = useState<Merch[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [checkoutMsg, setCheckoutMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      if (!p) {
        setProfile("missing");
        return;
      }
      setProfile(p);
      const { data: m } = await supabase
        .from("merchandise_items")
        .select("id, title, description, design_url, retail_price_usd, is_active, artist_id")
        .eq("artist_id", p.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      setMerch(m ?? []);
    })();

    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setViewerId(session?.user?.id ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, [username]);

  if (profile === "missing") return <ShopNotFound />;

  const isOwner = profile && viewerId === profile.id;
  const socials = (profile?.social_links ?? {}) as SocialLinks;
  const activeSocials = SOCIAL_ICONS.filter((s) => socials[s.key]);

  async function toggleActive(item: Merch) {
    if (!isOwner) return;
    const { error } = await supabase
      .from("merchandise_items")
      .update({ is_active: !item.is_active })
      .eq("id", item.id);
    if (error) {
      alert(error.message);
      return;
    }
    setMerch((prev) =>
      prev
        .map((m) => (m.id === item.id ? { ...m, is_active: !m.is_active } : m))
        .filter((m) => m.is_active),
    );
  }

  function buy(item: Merch) {
    if (!viewerId) {
      navigate({ to: "/auth" });
      return;
    }
    setCheckoutMsg(
      `Checkout for "${item.title}" ($${Number(item.retail_price_usd).toFixed(
        2,
      )}) — Stripe secure checkout is being activated. This shop is fully browseable; purchasing goes live the moment payments are connected.`,
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <header className="sticky top-0 z-20 border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500 text-xs font-black text-white shadow-lg shadow-indigo-500/40">
              IA
            </div>
            <span className="font-semibold tracking-tight">InkAlley</span>
          </Link>
          <Link
            to="/"
            className="rounded-md border border-slate-800 px-3 py-1.5 text-sm text-slate-300 transition hover:border-slate-600 hover:text-white"
          >
            ← All artists
          </Link>
        </div>
      </header>

      {!profile ? (
        <div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading shop…</div>
      ) : (
        <>
          <section className="relative overflow-hidden border-b border-slate-900">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(50% 80% at 20% 0%,rgba(99,102,241,0.25),transparent 60%), radial-gradient(40% 60% at 90% 10%,rgba(217,70,239,0.12),transparent 60%)",
              }}
            />
            <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-start sm:py-16">
              <div className="flex flex-col items-center sm:items-start">
                <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-4xl font-bold text-white shadow-2xl shadow-indigo-900/40 ring-1 ring-white/10 sm:h-32 sm:w-32">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile.username[0]?.toUpperCase()
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    @{profile.username}
                  </h1>
                  {profile.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300">
                      <Check className="h-3 w-3" />
                      Verified artist
                    </span>
                  )}
                  {isOwner && (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-300">
                      This is your shop
                    </span>
                  )}
                </div>

                {profile.bio && (
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-300">
                    {profile.bio}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {profile.portfolio_link && (
                    <a
                      href={profile.portfolio_link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Portfolio
                    </a>
                  )}
                  {activeSocials.map((s) => (
                    <a
                      key={s.key}
                      href={socials[s.key]}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-200 transition hover:border-indigo-400/50 hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {s.label}
                    </a>
                  ))}
                </div>

                {isOwner && (
                  <div className="mt-6">
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-2 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-400"
                    >
                      + Manage merch
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-12">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">
                {isOwner ? "Your active drops" : "Drops"}
              </h2>
              {merch.length > 0 && (
                <span className="text-sm text-slate-500">
                  {merch.length} {merch.length === 1 ? "item" : "items"}
                </span>
              )}
            </div>

            {merch.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-12 text-center">
                <ShoppingBag className="mx-auto h-10 w-10 text-slate-700" />
                <p className="mt-4 text-slate-500">
                  {isOwner
                    ? "You haven't published any merch yet. Head to your dashboard to create your first drop."
                    : "This artist hasn't dropped anything yet. Check back soon."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {merch.map((m) => (
                  <div
                    key={m.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-2xl hover:shadow-indigo-900/30"
                  >
                    <div
                      className="aspect-square overflow-hidden bg-slate-950"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 30% 30%,rgba(99,102,241,0.25),transparent 60%)",
                      }}
                    >
                      <img
                        src={m.design_url}
                        alt={m.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold leading-snug text-white">{m.title}</h3>
                        <span className="shrink-0 rounded-md bg-indigo-500/10 px-2 py-1 text-sm font-semibold text-indigo-300">
                          ${Number(m.retail_price_usd).toFixed(2)}
                        </span>
                      </div>
                      {m.description && (
                        <p className="line-clamp-2 text-sm text-slate-400">{m.description}</p>
                      )}
                      <div className="mt-auto flex gap-2 pt-1">
                        <button
                          onClick={() => buy(m)}
                          className="flex-1 rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
                        >
                          Buy ${Number(m.retail_price_usd).toFixed(2)}
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => toggleActive(m)}
                            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-500/60 hover:text-rose-300"
                            title="Deactivate (hide from shop)"
                          >
                            Hide
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {checkoutMsg && (
        <CheckoutModal message={checkoutMsg} onClose={() => setCheckoutMsg(null)} />
      )}
    </div>
  );
}

function CheckoutModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white">Almost ready</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{message}</p>
        <button
          onClick={onClose}
          className="mt-5 w-full rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function ShopNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-200">
      <div className="max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-slate-800 bg-slate-900/60">
          <ShoppingBag className="h-8 w-8 text-slate-600" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Shop not found</h1>
        <p className="mt-2 text-slate-400">
          No artist matches this username. They might not be verified yet.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
        >
          Browse all artists
        </Link>
      </div>
    </div>
  );
}

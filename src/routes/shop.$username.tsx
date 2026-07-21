import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/shop/$username")({
  head: ({ params }) => ({
    meta: [
      { title: `@${params.username} — Kiosk` },
      {
        name: "description",
        content: `Shop merch from @${params.username} on Kiosk — acrylic standees, laser tickets, die-cut stickers.`,
      },
      { property: "og:title", content: `@${params.username} — Kiosk` },
      {
        property: "og:description",
        content: `Shop merch from @${params.username}.`,
      },
    ],
  }),
  component: ShopPage,
  notFoundComponent: ShopNotFound,
});

type Profile = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  portfolio_link: string | null;
  role: string;
  is_verified: boolean;
};

type Merch = {
  id: string;
  title: string;
  description: string | null;
  design_url: string;
  retail_price_usd: number;
  is_active: boolean;
  artist_id: string;
};

function ShopPage() {
  const { username } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null | "missing">(null);
  const [merch, setMerch] = useState<Merch[]>([]);
  const [viewerId, setViewerId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url, portfolio_link, role, is_verified")
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
    alert(
      `Checkout for "${item.title}" ($${Number(item.retail_price_usd).toFixed(
        2,
      )}) — Stripe + Gelato fulfillment is being connected. This shop is browseable now; buying goes live once payments are activated.`,
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <header className="border-b border-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-indigo-500 text-xs font-black text-white">
              K
            </div>
            <span className="font-semibold tracking-tight">Kiosk</span>
          </Link>
          <Link
            to="/"
            className="rounded-md border border-slate-800 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-600"
          >
            ← All artists
          </Link>
        </div>
      </header>

      {!profile ? (
        <div className="mx-auto max-w-6xl px-6 py-16 text-slate-500">Loading shop…</div>
      ) : (
        <>
          <section className="border-b border-slate-900 bg-gradient-to-b from-indigo-950/40 to-transparent">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center">
              <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-3xl font-bold text-white shadow-xl shadow-indigo-900/40">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  profile.username[0]?.toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-white">
                    @{profile.username}
                  </h1>
                  {profile.is_verified && (
                    <span className="rounded-full border border-indigo-400/40 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
                      ✓ Verified artist
                    </span>
                  )}
                  {isOwner && (
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                      This is your shop
                    </span>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-2 max-w-2xl text-slate-300">{profile.bio}</p>
                )}
                {profile.portfolio_link && (
                  <a
                    href={profile.portfolio_link}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-3 inline-block text-sm text-indigo-300 hover:text-indigo-200"
                  >
                    {profile.portfolio_link} ↗
                  </a>
                )}
              </div>
              {isOwner && (
                <Link
                  to="/dashboard"
                  className="shrink-0 rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400"
                >
                  + Manage merch
                </Link>
              )}
            </div>
          </section>

          <section className="mx-auto max-w-6xl px-6 py-12">
            <h2 className="mb-6 text-xl font-semibold tracking-tight">
              {isOwner ? "Your active drops" : "Drops"}
            </h2>

            {merch.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center text-slate-500">
                {isOwner
                  ? "You haven't published any merch yet. Head to your dashboard to create your first drop."
                  : "This artist hasn't dropped anything yet. Check back soon."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {merch.map((m) => (
                  <div
                    key={m.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60"
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
                        className="h-full w-full object-cover transition group-hover:scale-105"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                        }}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-white">{m.title}</h3>
                        <span className="shrink-0 rounded-md bg-indigo-500/10 px-2 py-1 text-sm font-semibold text-indigo-300">
                          ${Number(m.retail_price_usd).toFixed(2)}
                        </span>
                      </div>
                      {m.description && (
                        <p className="line-clamp-2 text-sm text-slate-400">{m.description}</p>
                      )}
                      <div className="mt-auto flex gap-2">
                        <button
                          onClick={() => buy(m)}
                          className="flex-1 rounded-md bg-indigo-500 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-400"
                        >
                          Buy ${Number(m.retail_price_usd).toFixed(2)}
                        </button>
                        {isOwner && (
                          <button
                            onClick={() => toggleActive(m)}
                            className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-rose-500/60 hover:text-rose-300"
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
    </div>
  );
}

function ShopNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-200">
      <div className="max-w-md text-center">
        <div className="text-6xl">🎨</div>
        <h1 className="mt-4 text-2xl font-semibold">Shop not found</h1>
        <p className="mt-2 text-slate-400">
          No artist matches this username. They might not be verified yet.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Browse all artists
        </Link>
      </div>
    </div>
  );
}

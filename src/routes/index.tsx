import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kiosk — Invite-only merch from indie artists" },
      {
        name: "description",
        content:
          "A directory of verified indie artists making acrylic standees, laser tickets, and die-cut stickers. Browse artists and shop their drops.",
      },
      { property: "og:title", content: "Kiosk — Invite-only merch from indie artists" },
      {
        property: "og:description",
        content: "Browse verified indie artists and their premium merch drops.",
      },
    ],
  }),
  component: Index,
});

type ArtistCard = {
  id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  previews: { id: string; title: string; design_url: string }[];
};

function Index() {
  const [artists, setArtists] = useState<ArtistCard[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, bio, avatar_url")
        .eq("role", "artist")
        .eq("is_verified", true)
        .order("created_at", { ascending: false });

      const cards: ArtistCard[] = [];
      for (const p of profs ?? []) {
        const { data: merch } = await supabase
          .from("merchandise_items")
          .select("id, title, design_url")
          .eq("artist_id", p.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(3);
        cards.push({
          id: p.id,
          username: p.username,
          bio: p.bio,
          avatar_url: p.avatar_url,
          previews: merch ?? [],
        });
      }
      setArtists(cards);
    })();
  }, []);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 0%,rgba(99,102,241,0.35),transparent 70%)",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-indigo-500 text-sm font-black text-white shadow-lg shadow-indigo-500/40">
            K
          </div>
          <span className="text-lg font-semibold tracking-tight">Kiosk</span>
          <span className="ml-2 hidden rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-indigo-300 sm:inline">
            Invite-only
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500 sm:inline-block"
          >
            Sign in
          </Link>
          <Link
            to="/dashboard"
            className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400"
          >
            Open my shop
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-12 pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {artists ? `${artists.length} verified artists` : "Loading roster…"}
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Meet the artists behind the
            <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
              {" "}
              drops.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
            Kiosk is a directory of verified indie artists making small runs of
            acrylic standees, laser tickets, and die-cut stickers. Pick an
            artist, walk into their shop.
          </p>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">
          Verified artists
        </h2>

        {!artists && <SkeletonGrid />}

        {artists && artists.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
            <p className="text-slate-400">
              No verified artists yet. Come back soon — invitations are being sent.
            </p>
          </div>
        )}

        {artists && artists.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((a) => (
              <ArtistCardView key={a.id} artist={a} />
            ))}
          </div>
        )}
      </section>

      <footer className="relative z-10 border-t border-slate-900">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 py-10 sm:flex-row sm:items-center">
          <div className="text-sm text-slate-500">
            © {new Date().getFullYear()} Kiosk. Invite-only marketplace for indie artists.
          </div>
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ArtistCardView({ artist }: { artist: ArtistCard }) {
  const initial = artist.username[0]?.toUpperCase() ?? "?";
  const previews = artist.previews;
  const padSlots = Math.max(0, 3 - previews.length);

  return (
    <Link
      to="/shop/$username"
      params={{ username: artist.username }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-900/40"
    >
      <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1">
        {previews.map((p) => (
          <div
            key={p.id}
            className="aspect-square overflow-hidden rounded-md bg-slate-900"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%,rgba(99,102,241,0.25),transparent 60%)",
            }}
          >
            <img
              src={p.design_url}
              alt={p.title}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
              }}
            />
          </div>
        ))}
        {Array.from({ length: padSlots }).map((_, i) => (
          <div
            key={`pad-${i}`}
            className="aspect-square rounded-md border border-dashed border-slate-800 bg-slate-900/40"
          />
        ))}
      </div>

      <div className="flex items-center gap-3 p-5">
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 text-lg font-bold text-white">
          {artist.avatar_url ? (
            <img src={artist.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-semibold text-white">
              @{artist.username}
            </span>
            <span className="text-indigo-400" title="Verified">✓</span>
          </div>
          {artist.bio && (
            <div className="mt-0.5 truncate text-xs text-slate-500">
              {artist.bio}
            </div>
          )}
        </div>
        <span className="rounded-full border border-slate-800 px-2 py-1 text-[10px] text-slate-400 group-hover:border-indigo-500/50 group-hover:text-indigo-300">
          Visit shop →
        </span>
      </div>
    </Link>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40 p-1"
        >
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="aspect-square rounded-md bg-slate-800/60" />
            ))}
          </div>
          <div className="p-4">
            <div className="h-4 w-24 rounded bg-slate-800/60" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-800/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

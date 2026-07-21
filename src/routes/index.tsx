import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kiosk — Invite-only merch from indie artists" },
      {
        name: "description",
        content:
          "A curated marketplace of acrylic standees, laser tickets, and die-cut stickers from verified independent artists.",
      },
      { property: "og:title", content: "Kiosk — Invite-only merch from indie artists" },
      {
        property: "og:description",
        content:
          "Premium merch drops from verified indie artists. Acrylic standees, laser tickets, die-cut stickers.",
      },
    ],
  }),
  component: Index,
});

type Artist = {
  username: string;
  displayName: string;
  bio: string;
  gradient: string;
  initial: string;
};

type Product = {
  id: string;
  title: string;
  artist: Artist;
  base: "Acrylic Standee" | "Laser Ticket" | "Die-Cut Sticker";
  price: number;
  mockupGradient: string;
  glyph: string;
  accent: string;
};

const artists: Record<string, Artist> = {
  yuna: {
    username: "yuna",
    displayName: "Yuna Vega",
    bio: "Neon dreamscapes",
    gradient: "linear-gradient(135deg,#6366f1,#a855f7)",
    initial: "Y",
  },
  koa: {
    username: "koa",
    displayName: "Koa Ito",
    bio: "Cyber-folk illustrator",
    gradient: "linear-gradient(135deg,#0ea5e9,#22d3ee)",
    initial: "K",
  },
  mira: {
    username: "mira",
    displayName: "Mira Solano",
    bio: "Soft goth minis",
    gradient: "linear-gradient(135deg,#f43f5e,#f59e0b)",
    initial: "M",
  },
};

const products: Product[] = [
  {
    id: "p1",
    title: "Moth Oracle — Standee",
    artist: artists.yuna,
    base: "Acrylic Standee",
    price: 24.0,
    mockupGradient: "radial-gradient(circle at 30% 20%,#312e81,#0f172a 70%)",
    glyph: "✦",
    accent: "#a5b4fc",
  },
  {
    id: "p2",
    title: "Backstage Pass 07",
    artist: artists.koa,
    base: "Laser Ticket",
    price: 8.5,
    mockupGradient: "linear-gradient(135deg,#082f49,#0369a1)",
    glyph: "◈",
    accent: "#67e8f9",
  },
  {
    id: "p3",
    title: "Crying Bunny Pack",
    artist: artists.mira,
    base: "Die-Cut Sticker",
    price: 4.5,
    mockupGradient: "radial-gradient(circle at 70% 30%,#7f1d1d,#111827 75%)",
    glyph: "❀",
    accent: "#fda4af",
  },
  {
    id: "p4",
    title: "Signal Fox — Standee",
    artist: artists.koa,
    base: "Acrylic Standee",
    price: 26.0,
    mockupGradient: "radial-gradient(circle at 40% 60%,#164e63,#0f172a 70%)",
    glyph: "△",
    accent: "#5eead4",
  },
  {
    id: "p5",
    title: "Rave Ticket — Chromatic",
    artist: artists.yuna,
    base: "Laser Ticket",
    price: 9.0,
    mockupGradient: "linear-gradient(135deg,#3b0764,#7c3aed)",
    glyph: "⌘",
    accent: "#e9d5ff",
  },
  {
    id: "p6",
    title: "Ghost Kitten Sticker",
    artist: artists.mira,
    base: "Die-Cut Sticker",
    price: 5.0,
    mockupGradient: "radial-gradient(circle at 20% 80%,#4c1d95,#0f172a 70%)",
    glyph: "♡",
    accent: "#fbcfe8",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
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
        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#drops" className="hover:text-white">Drops</a>
          <a href="#artists" className="hover:text-white">Artists</a>
          <a href="#about" className="hover:text-white">About</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="hidden rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500 sm:inline-block">
            Sign in
          </button>
          <button className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400">
            Get invite
          </button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-16 pt-10 sm:pt-16">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs text-slate-300 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            3 artists shipping this week
          </span>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            Merch drops from artists you'd
            <span className="bg-gradient-to-r from-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
              {" "}
              actually follow.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-slate-400 sm:text-lg">
            Acrylic standees, laser tickets, and die-cut stickers made in small
            runs by verified indie artists. No storefront slop. No stock art.
          </p>
        </div>
      </section>

      <section id="drops" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Active drops</h2>
            <p className="mt-1 text-sm text-slate-400">
              Fresh merch, hand-picked from the roster.
            </p>
          </div>
          <div className="hidden gap-2 sm:flex">
            {["All", "Standees", "Tickets", "Stickers"].map((t, i) => (
              <button
                key={t}
                className={
                  i === 0
                    ? "rounded-full bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white"
                    : "rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section id="artists" className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight">Verified artists</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Object.values(artists).map((a) => (
            <div
              key={a.username}
              className="group flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition hover:border-indigo-500/40"
            >
              <div
                className="grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-white"
                style={{ background: a.gradient }}
              >
                {a.initial}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-semibold text-white">
                    {a.displayName}
                  </span>
                  <span className="text-indigo-400" title="Verified">✓</span>
                </div>
                <div className="text-sm text-slate-400">@{a.username}</div>
                <div className="mt-0.5 text-xs text-slate-500">{a.bio}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer id="about" className="relative z-10 border-t border-slate-900">
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

function ProductCard({ product: p }: { product: Product }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-900/40">
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{ background: p.mockupGradient }}
      >
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px,rgba(255,255,255,0.15) 1px,transparent 0)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="absolute inset-0 grid place-items-center">
          <div
            className="grid h-40 w-40 place-items-center rounded-3xl text-7xl font-black shadow-2xl"
            style={{
              background: "rgba(15,23,42,0.55)",
              color: p.accent,
              boxShadow: `0 20px 60px -10px ${p.accent}55`,
              backdropFilter: "blur(4px)",
            }}
          >
            {p.glyph}
          </div>
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-slate-200 backdrop-blur">
          {p.base}
        </span>
      </div>
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-white">{p.title}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
            <span
              className="inline-block h-4 w-4 rounded-full"
              style={{ background: p.artist.gradient }}
            />
            <span className="truncate">@{p.artist.username}</span>
            <span className="text-indigo-400">✓</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-semibold text-white">
            ${p.price.toFixed(2)}
          </div>
          <button className="mt-1 rounded-md bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/20">
            View
          </button>
        </div>
      </div>
    </article>
  );
}

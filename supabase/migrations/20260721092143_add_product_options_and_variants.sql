/*
# Product options & variants — artist-curated merchandise

## Purpose
Let artists curate complex, fixed merchandise variants (e.g. "Finish Type" →
"Holographic" / "Matte"; "Base Size" → "Standard" / "Large") on each listing.
Buyers select from these exact curated options on the storefront; they cannot
change the product type or format — only pick among the artist-defined
variants. Each variant can carry an optional additional cost that is added to
the retail price at checkout.

## New tables

### product_options
- id (uuid, primary key)
- product_id (uuid, references merchandise_items(id) ON DELETE CASCADE)
- option_name (text, e.g. 'Finish Type', 'Base Size')
- created_at (timestamptz, default now())
Unique constraint: (product_id, option_name) — no duplicate option names per
product.

### product_variants
- id (uuid, primary key)
- option_id (uuid, references product_options(id) ON DELETE CASCADE)
- variant_value (text, e.g. 'Holographic', 'Matte')
- additional_cost_usd (numeric(10,2), default 0, CHECK >= 0)
- sku (text, nullable)
- created_at (timestamptz, default now())
Unique constraint: (option_id, variant_value) — no duplicate values per option.

## Security (RLS)
Both tables ENABLE ROW LEVEL SECURITY.
- product_options:
  - SELECT: public (anon + authenticated) — options must be visible to browse.
  - INSERT/UPDATE/DELETE: the owning artist only (artist_id = auth.uid() on the
    parent merchandise_items row, joined via product_id).
- product_variants:
  - SELECT: public (anon + authenticated).
  - INSERT/UPDATE/DELETE: the owning artist only (join through product_options
    → merchandise_items to confirm ownership).

## Grants
- anon: SELECT on both tables (storefront browsing).
- authenticated: SELECT + INSERT/UPDATE/DELETE on both (artist curation).
- service_role: ALL on both.

## Notes
- No data is lost; purely additive.
- RLS is enforced on writes via ownership join to merchandise_items.
*/

-- ============= product_options =============
CREATE TABLE IF NOT EXISTS public.product_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.merchandise_items(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, option_name)
);

GRANT SELECT ON public.product_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_options TO authenticated;
GRANT ALL ON public.product_options TO service_role;

ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- Ownership predicate helper: the caller is the artist who owns the product.
-- (inlined in policies to avoid a SECURITY DEFINER helper.)

DROP POLICY IF EXISTS "Options are public" ON public.product_options;
CREATE POLICY "Options are public" ON public.product_options
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Artists insert own options" ON public.product_options;
CREATE POLICY "Artists insert own options" ON public.product_options
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchandise_items m
      WHERE m.id = product_options.product_id AND m.artist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artists update own options" ON public.product_options;
CREATE POLICY "Artists update own options" ON public.product_options
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchandise_items m
      WHERE m.id = product_options.product_id AND m.artist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchandise_items m
      WHERE m.id = product_options.product_id AND m.artist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artists delete own options" ON public.product_options;
CREATE POLICY "Artists delete own options" ON public.product_options
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.merchandise_items m
      WHERE m.id = product_options.product_id AND m.artist_id = auth.uid()
    )
  );

-- ============= product_variants =============
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id UUID NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  variant_value TEXT NOT NULL,
  additional_cost_usd NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (additional_cost_usd >= 0),
  sku TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (option_id, variant_value)
);

GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Variants are public" ON public.product_variants;
CREATE POLICY "Variants are public" ON public.product_variants
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Artists insert own variants" ON public.product_variants;
CREATE POLICY "Artists insert own variants" ON public.product_variants
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.product_options o
      JOIN public.merchandise_items m ON m.id = o.product_id
      WHERE o.id = product_variants.option_id AND m.artist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artists update own variants" ON public.product_variants;
CREATE POLICY "Artists update own variants" ON public.product_variants
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_options o
      JOIN public.merchandise_items m ON m.id = o.product_id
      WHERE o.id = product_variants.option_id AND m.artist_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.product_options o
      JOIN public.merchandise_items m ON m.id = o.product_id
      WHERE o.id = product_variants.option_id AND m.artist_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Artists delete own variants" ON public.product_variants;
CREATE POLICY "Artists delete own variants" ON public.product_variants
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.product_options o
      JOIN public.merchandise_items m ON m.id = o.product_id
      WHERE o.id = product_variants.option_id AND m.artist_id = auth.uid()
    )
  );

-- Indexes for storefront joins
CREATE INDEX IF NOT EXISTS product_options_product_idx ON public.product_options(product_id);
CREATE INDEX IF NOT EXISTS product_variants_option_idx ON public.product_variants(option_id);

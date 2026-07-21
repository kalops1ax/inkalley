
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  merchandise_item_id UUID NOT NULL REFERENCES public.merchandise_items(id),
  artist_id UUID NOT NULL REFERENCES public.profiles(id),
  print_file_url TEXT NOT NULL,
  base_product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  amount_usd NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- buyer shipping
  buyer_email TEXT NOT NULL,
  ship_name TEXT,
  ship_address_line1 TEXT,
  ship_address_line2 TEXT,
  ship_city TEXT,
  ship_state TEXT,
  ship_postal_code TEXT,
  ship_country TEXT,

  -- payment
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',

  -- fulfillment
  fulfillment_status TEXT NOT NULL DEFAULT 'pending',
  gelato_order_id TEXT,
  gelato_response JSONB,
  fulfillment_error TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own orders" ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Artists can view orders of their merch" ON public.orders FOR SELECT
  USING (auth.uid() = artist_id);

CREATE INDEX orders_buyer_idx ON public.orders(buyer_id);
CREATE INDEX orders_artist_idx ON public.orders(artist_id);
CREATE INDEX orders_stripe_session_idx ON public.orders(stripe_session_id);

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION public.update_orders_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_orders_updated_at();

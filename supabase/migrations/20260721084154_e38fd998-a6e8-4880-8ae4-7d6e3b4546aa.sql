
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'artist', 'buyer');

-- ============= profiles =============
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'buyer' CHECK (role IN ('artist', 'buyer')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  portfolio_link TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============= user_roles (admin only, separate table for security) =============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============= invitation_codes =============
CREATE TABLE public.invitation_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  assigned_to_email TEXT,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);
GRANT SELECT ON public.invitation_codes TO authenticated;
GRANT ALL ON public.invitation_codes TO service_role;
ALTER TABLE public.invitation_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage invitation codes" ON public.invitation_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============= base_products =============
CREATE TABLE public.base_products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  platform_base_cost_usd NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.base_products TO anon, authenticated;
GRANT ALL ON public.base_products TO service_role;
ALTER TABLE public.base_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Base products are public" ON public.base_products FOR SELECT USING (true);

INSERT INTO public.base_products (name, platform_base_cost_usd) VALUES
  ('Acrylic Standee', 5.00),
  ('Laser Ticket', 2.00),
  ('Die-Cut Sticker', 1.50);

-- ============= merchandise_items =============
CREATE TABLE public.merchandise_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  base_product_id INT NOT NULL REFERENCES public.base_products(id),
  title TEXT NOT NULL,
  description TEXT,
  design_url TEXT NOT NULL,
  artist_markup_usd NUMERIC(10,2) NOT NULL CHECK (artist_markup_usd >= 0),
  retail_price_usd NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merchandise_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.merchandise_items TO authenticated;
GRANT ALL ON public.merchandise_items TO service_role;
ALTER TABLE public.merchandise_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active merch is public" ON public.merchandise_items FOR SELECT
  USING (is_active = true OR artist_id = auth.uid());
CREATE POLICY "Verified artists can insert own merch" ON public.merchandise_items FOR INSERT
  WITH CHECK (
    artist_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_verified = true AND p.role = 'artist')
  );
CREATE POLICY "Artists can update own merch" ON public.merchandise_items FOR UPDATE
  USING (artist_id = auth.uid()) WITH CHECK (artist_id = auth.uid());
CREATE POLICY "Artists can delete own merch" ON public.merchandise_items FOR DELETE
  USING (artist_id = auth.uid());

-- ============= signup trigger =============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_portfolio TEXT;
  v_invite TEXT;
  v_invite_row public.invitation_codes%ROWTYPE;
  v_role TEXT := 'buyer';
  v_verified BOOLEAN := false;
BEGIN
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  v_portfolio := NEW.raw_user_meta_data->>'portfolio_link';
  v_invite := NULLIF(TRIM(NEW.raw_user_meta_data->>'invitation_code'), '');

  IF v_invite IS NOT NULL THEN
    SELECT * INTO v_invite_row FROM public.invitation_codes
      WHERE code = v_invite AND is_used = false
      FOR UPDATE;
    IF FOUND THEN
      v_role := 'artist';
      v_verified := true;
      UPDATE public.invitation_codes
        SET is_used = true, used_by = NEW.id, used_at = now()
        WHERE id = v_invite_row.id;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, username, role, is_verified, portfolio_link)
  VALUES (NEW.id, NEW.email, v_username, v_role, v_verified, v_portfolio);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============= retail price auto-compute trigger =============
CREATE OR REPLACE FUNCTION public.compute_retail_price()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public
AS $$
DECLARE
  v_base NUMERIC(10,2);
BEGIN
  SELECT platform_base_cost_usd INTO v_base FROM public.base_products WHERE id = NEW.base_product_id;
  NEW.retail_price_usd := COALESCE(v_base, 0) + COALESCE(NEW.artist_markup_usd, 0);
  RETURN NEW;
END;
$$;

CREATE TRIGGER merch_compute_price
  BEFORE INSERT OR UPDATE ON public.merchandise_items
  FOR EACH ROW EXECUTE FUNCTION public.compute_retail_price();

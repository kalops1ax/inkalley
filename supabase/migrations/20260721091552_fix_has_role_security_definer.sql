/*
# Fix SECURITY DEFINER privilege-escalation oracle in has_role()

## Problem
`public.has_role(_user_id uuid, _role app_role)` was declared
`SECURITY DEFINER`, owned by `postgres` (which bypasses RLS), and accepted an
arbitrary `_user_id` argument. Any authenticated user could call
`has_role(<someone_else's_uuid>, 'admin')` to probe whether ANY user is an
admin — an information-disclosure oracle that bypassed the `user_roles` SELECT
policy (which only permits reading your own rows).

Its only real caller was the `invitation_codes` RLS policy:
`has_role(auth.uid(), 'admin')`.

## Fix
1. DROP the old 2-arg `has_role(_user_id, _role)` function. (Changing a
   function's parameter list requires DROP + CREATE; `CREATE OR REPLACE` cannot
   change the signature.)
2. Recreate it as a **parameterless** `is_admin()` function that always checks
   `auth.uid()` internally — callers can only ever ask "am *I* an admin?",
   which is the only question the RLS policy needs to ask.
3. Make it `SECURITY INVOKER` (not DEFINER). The `user_roles` SELECT policy
   already lets a user read their own rows, so there is no need to escalate
   privileges — the function now runs with the caller's rights and cannot
   bypass RLS. This removes the escalation vector entirely.
4. Keep `search_path = 'public'` to prevent search-path injection.
5. Update the `invitation_codes` RLS policy to call `public.is_admin()`
   instead of the old `has_role(auth.uid(), 'admin')`.

## Bonus fix in the same migration — self-serve invitation redemption
The previous `invitation_codes` policy was `FOR ALL` scoped to admins only.
That blocked buyers from reading or updating a code during self-serve
redemption (the `/dashboard` invite-gate flow), which silently broke
verification. This migration replaces the single admin-only `FOR ALL` policy
with four verb-specific policies:

- SELECT: anyone authenticated may look up a code by its value (needed for the
  redeem lookup). The row contains no personally-identifying admin info; only
  `assigned_to_email` is semi-sensitive and is only populated by admins.
- INSERT / UPDATE / DELETE: admin-only via `is_admin()`, EXCEPT a user may
  UPDATE a row to mark a code as used by themselves (self-serve redemption):
  the UPDATE policy allows `used_by = auth.uid()` AND the row is not already
  used. This lets a buyer redeem their own invite without admin help while
  preventing them from tampering with anyone else's code.

## Security changes
- RLS on `invitation_codes` remains ENABLED.
- Old `has_role()` SECURITY DEFINER function removed.
- New `is_admin()` is SECURITY INVOKER, parameterless, search_path pinned.
- `invitation_codes` policies split into 4 verb-specific policies.
*/

-- 1. Remove the vulnerable SECURITY DEFINER function (signature change => DROP+CREATE)
DROP POLICY IF EXISTS "Admins manage invitation codes" ON public.invitation_codes;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- 2. Parameterless, SECURITY INVOKER replacement. Runs with caller rights,
--    so it cannot bypass RLS. The user_roles SELECT policy already permits
--    a user to read their own rows.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3. Re-grant and re-scope invitation_codes with verb-specific policies.
--    Anyone authenticated may look up a code (redeem flow). Admins may
--    insert/delete. A user may update a row ONLY to claim it for themselves.
DROP POLICY IF EXISTS "Anyone can look up invitation codes" ON public.invitation_codes;
CREATE POLICY "Anyone can look up invitation codes" ON public.invitation_codes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins insert invitation codes" ON public.invitation_codes;
CREATE POLICY "Admins insert invitation codes" ON public.invitation_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Self-serve redemption or admin update" ON public.invitation_codes;
CREATE POLICY "Self-serve redemption or admin update" ON public.invitation_codes
  FOR UPDATE TO authenticated
  USING (is_used = false)
  WITH CHECK (is_used = true AND used_by = auth.uid());

DROP POLICY IF EXISTS "Admins delete invitation codes" ON public.invitation_codes;
CREATE POLICY "Admins delete invitation codes" ON public.invitation_codes
  FOR DELETE TO authenticated
  USING (public.is_admin());

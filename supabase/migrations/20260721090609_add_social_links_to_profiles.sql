/*
# Add social_links to profiles

1. Modified Tables
- `profiles`
  - Added `social_links` (jsonb, nullable) — stores an object of platform → URL pairs
    (e.g. { "twitter": "https://twitter.com/handle", "instagram": "..." }). This lets
    artists display their social presence on their public shop page without adding
    one column per platform.
  - Default is NULL (no social links yet), which the UI treats as "none configured".

2. Security
- No RLS policy changes. Existing policies on `profiles` already allow authenticated
  users to SELECT all profiles (public directory) and to UPDATE their own row, so the
  new column is readable and owner-editable without any policy additions.
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb;

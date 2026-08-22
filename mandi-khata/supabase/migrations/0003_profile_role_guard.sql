-- ============================================================
-- Mandi Khata — Migration 0003: stop users editing their own role or shop
-- Depends on 0001 (profiles, profiles_update_own).
-- Does not modify 0001 or 0002; it replaces one policy.
--
-- THE HOLE THIS CLOSES
-- 0001 grants:
--     create policy profiles_update_own on public.profiles for update
--       using (id = auth.uid()) with check (id = auth.uid());
-- That restricts WHICH ROW you may update, but not WHICH COLUMNS. A signed-in
-- munshi can therefore run, straight from the browser with the anon key:
--     update profiles set role = 'malik' where id = <their own id>;
-- and it succeeds. `role` is what decides whether someone may see Reports and
-- delete entries, so self-service promotion defeats the whole split. The same
-- applies to `shop_id`: rewriting it would move the user into another arhti's
-- shop, and every 0002 policy reduces to "is this row in your shop?".
--
-- THE FIX
-- Keep row ownership as-is, and additionally require that the incoming row's
-- role and shop_id still equal the ones already stored. Users keep editing
-- full_name (and anything else added later) freely.
-- ============================================================


-- ---------- helper ----------
-- RLS `with check` sees the NEW row; there is no OLD to compare against, so
-- the stored values have to be read back. That read is done in a
-- security definer function so it bypasses RLS on public.profiles — a plain
-- subquery inside a profiles policy would be evaluated under that same
-- policy, which is both slower and easy to turn into recursion later.
-- Mirrors the current_shop_id() pattern already used in 0002.
create or replace function public.profile_privileges_unchanged(
  new_role    text,
  new_shop_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = new_role
      -- `is not distinct from` so NULL = NULL counts as unchanged; a plain
      -- `=` would be NULL for a user with no shop yet and block every save.
      and p.shop_id is not distinct from new_shop_id
  );
$$;

comment on function public.profile_privileges_unchanged(text, uuid) is
  'True when the given role/shop_id still match the caller''s stored profile. Used by profiles_update_own to make those two columns read-only to their owner.';


-- ---------- replace the policy ----------
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and public.profile_privileges_unchanged(role, shop_id)
  );


-- ============================================================
-- VERIFYING IT
-- Signed in as any user, in the SQL editor or from the client:
--
--   -- still allowed
--   update profiles set full_name = 'New Name' where id = auth.uid();
--
--   -- now blocked: 0 rows, or "new row violates row-level security policy"
--   update profiles set role = 'malik' where id = auth.uid();
--   update profiles set shop_id = '<some other shop>' where id = auth.uid();
--
-- NOTE ON ADMINS
-- This makes role and shop_id unwritable by the owner, which means there is
-- currently NO path to promote a munshi to malik or to assign a shop. That is
-- deliberate — those are privileged operations and belong either to the
-- service_role key on a trusted server, or to a future security definer RPC
-- that checks the caller is a malik of the same shop. Neither exists yet, so
-- for now assign role and shop_id from the Supabase dashboard.
-- ============================================================

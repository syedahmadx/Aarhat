-- ============================================================
-- Mandi Khata — Migration 0005: voiding requires the malik role
-- Depends on 0001 (profiles), 0002 (sales, cash_entries, current_shop_id).
-- Modifies none of them; it replaces two policies.
--
-- THE HOLE THIS CLOSES
-- A void is an INSERT of a reversing contra row (voids_id set) — nothing is
-- ever updated or deleted. 0002's insert policies check only
--     shop_id = current_shop_id()
-- so any signed-in munshi can post a contra row straight through PostgREST
-- and erase a sale from the day's totals, no malik involved. The UI hides
-- the void controls and the repo layer refuses, but the client's word is
-- not enforcement — this is.
--
-- THE RULE
-- An ordinary row (voids_id IS NULL) inserts as before, any role: recording
-- sales and wasooli is the munshi's whole job. A contra row (voids_id set)
-- inserts only when the caller's own profiles row says malik.
-- ============================================================


-- ---------- helper ----------
-- The caller's role, read as definer for the same reason current_shop_id()
-- is: a profiles subquery inside another table's policy would otherwise be
-- evaluated under profiles' own RLS. Mirrors 0002's helper pattern.
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.current_profile_role() is
  'Role from the caller''s profiles row. Used by RLS to restrict voiding (contra-row inserts) to the malik.';


-- ---------- sales ----------
drop policy if exists sales_insert on public.sales;

create policy sales_insert on public.sales for insert
  with check (
    shop_id = public.current_shop_id()
    and (voids_id is null or public.current_profile_role() = 'malik')
  );


-- ---------- cash_entries ----------
drop policy if exists cash_insert on public.cash_entries;

create policy cash_insert on public.cash_entries for insert
  with check (
    shop_id = public.current_shop_id()
    and (voids_id is null or public.current_profile_role() = 'malik')
  );


-- ============================================================
-- VERIFYING IT
-- As a munshi (profiles.role = 'munshi'):
--   insert into sales (..., voids_id) values (..., '<some sale id>');
--     -> ERROR: new row violates row-level security policy
--   insert into sales (...) values (...);          -- ordinary sale
--     -> succeeds, as before
-- As a malik: both succeed.
--
-- Note the update policies are deliberately untouched: allocation updates
-- received_paisa/status on sales and must keep working for a munshi taking
-- wasooli at the counter.
-- ============================================================

-- ============================================================
-- Mandi Khata — Migration 0001: shops, profiles, auth wiring
-- Assignment 2 (GitHub, Supabase & Authentication)
-- Run this in the Supabase SQL editor, then take your screenshots.
-- ============================================================

-- ---------- helper: keep updated_at honest ----------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ---------- shops ----------
-- One row per arhti's business. Every other table in the app hangs off
-- this, because access control is fundamentally "which shop do you work at".
create table public.shops (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  name_ur     text,
  city        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger shops_touch
  before update on public.shops
  for each row execute function public.touch_updated_at();


-- ---------- profiles ----------
-- One-to-one with auth.users. id IS the auth user id, so we never store a
-- second copy of identity and joins stay trivial.
-- role mirrors the Malik/Munshi split the app already has in its UI.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  email       text not null,
  shop_id     uuid references public.shops(id) on delete set null,
  role        text not null default 'munshi' check (role in ('malik','munshi')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_shop on public.profiles(shop_id);

create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();


-- ---------- auto-create a profile on sign-up ----------
-- The assignment requires that a successful registration produces BOTH an
-- auth user and a profile row. Doing it in a trigger (rather than a second
-- insert from the frontend) means it cannot half-succeed: if the profile
-- insert fails, the whole sign-up transaction fails.
-- security definer: the trigger must write to public.profiles while running
-- as the auth system, not as the (not-yet-existing) new user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ---------- Row Level Security ----------
alter table public.profiles enable row level security;
alter table public.shops    enable row level security;

-- A user may read only their own profile row. This is the policy to demo
-- for the "test an unauthorized action" requirement: signed in as user A,
-- select user B's id and Supabase returns zero rows rather than an error.
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

-- A user may edit their own profile. The with-check clause stops a user
-- rewriting the row to point at somebody else's id.
create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- No insert policy: profiles are created only by the trigger above.
-- No delete policy: profiles die with their auth user via the cascade.

-- A user may read the shop they belong to, and nobody else's.
create policy shops_select_own
  on public.shops for select
  using (id = (select shop_id from public.profiles where id = auth.uid()));

-- Only a malik may edit shop details.
create policy shops_update_malik
  on public.shops for update
  using (
    id = (select shop_id from public.profiles where id = auth.uid())
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'malik'
    )
  );

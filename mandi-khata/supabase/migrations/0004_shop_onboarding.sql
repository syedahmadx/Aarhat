-- ============================================================
-- Mandi Khata — Migration 0004: shop onboarding
-- Assignment 3, step 1 (Supabase Database & Live Data Flow)
-- Depends on 0001 (shops, profiles), 0002 (fish_types, current_shop_id),
-- 0003 (profile_privileges_unchanged). Modifies none of them.
--
-- THE GAP THIS CLOSES
-- The 0001 sign-up trigger creates a profile with shop_id NULL and role
-- 'munshi'. Every RLS policy in 0002 reduces to
--     shop_id = current_shop_id()
-- and current_shop_id() returns NULL for that user, so a fresh account can
-- read nothing and insert nothing: the app looks broken rather than empty.
-- Meanwhile 0003 deliberately makes role and shop_id read-only to their
-- owner, so the client cannot fix this itself — which is correct, because
-- "give me a shop and make me malik" must be an all-or-nothing privileged
-- step, not two client-side updates that can half-succeed.
--
-- THE FIX
-- One SECURITY DEFINER function the signed-in user calls exactly once:
--     select public.create_shop_for_user('Al-Madina Fish Traders', 'المدینہ فش ٹریڈرز');
-- It creates the shop, points the caller's profile at it, promotes the
-- caller to malik (first user of a shop is its owner by definition), and
-- seeds the default fish list. A plpgsql function body is a single
-- transaction: if any statement fails, none of it happened.
-- ============================================================

create or replace function public.create_shop_for_user(
  shop_name    text,
  shop_name_ur text default null
)
returns uuid
language plpgsql
security definer
-- Pin the search path: a definer function that resolves names through the
-- caller's search_path can be hijacked by a hostile schema.
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  existing_shop uuid;
  new_shop uuid;
begin
  -- Only ever act on the caller. No user id parameter exists on purpose:
  -- with one, any signed-in user could onboard (or hijack) somebody else.
  if caller is null then
    raise exception 'not signed in'
      using errcode = '28000'; -- invalid_authorization_specification
  end if;

  if shop_name is null or btrim(shop_name) = '' then
    raise exception 'shop name is required'
      using errcode = '22023'; -- invalid_parameter_value
  end if;

  -- Lock the caller's profile row for the rest of the transaction. Two
  -- concurrent calls (double-click, retried request) serialize here: the
  -- second waits, then sees the first call's shop_id and refuses, instead
  -- of both creating a shop and the loser orphaning one.
  select shop_id into existing_shop
  from profiles
  where id = caller
  for update;

  if not found then
    -- Cannot happen through the normal flow (the 0001 trigger creates the
    -- profile in the same transaction as the auth user), but a definer
    -- function must not assume its preconditions.
    raise exception 'no profile row for this user'
      using errcode = 'P0002'; -- no_data_found
  end if;

  if existing_shop is not null then
    raise exception 'user already belongs to a shop'
      using errcode = '23505', -- unique_violation: closest standard meaning
            hint = 'A user has exactly one shop. Leaving or transferring a shop is not a supported operation.';
  end if;

  insert into shops (name, name_ur)
  values (btrim(shop_name), nullif(btrim(shop_name_ur), ''))
  returning id into new_shop;

  -- Direct update, bypassing RLS: this function's owner owns the table, so
  -- the 0003 policy (which forbids exactly this change when attempted by
  -- the user) does not apply here. That is the entire reason this is a
  -- database function and not client code.
  update profiles
  set shop_id = new_shop,
      role = 'malik'
  where id = caller;

  -- Default fish list, matching the app's FISH_TYPES with the Urdu names
  -- the frontend already uses. Per-shop rows (0002): the malik can rename
  -- or extend the list later without touching any other shop.
  insert into fish_types (shop_id, name, name_ur) values
    (new_shop, 'Rohu',        'روہو'),
    (new_shop, 'Thaila',      'تھیلا'),
    (new_shop, 'Jhinga',      'جھینگا'),
    (new_shop, 'Mori',        'موری'),
    (new_shop, 'Silver Carp', 'سلور کارپ');

  return new_shop;
end;
$$;

comment on function public.create_shop_for_user(text, text) is
  'Onboards the CALLING user: creates their shop, sets profiles.shop_id, promotes them to malik, seeds default fish_types. Atomic; refuses if they already have a shop. The only supported way for a user to acquire a shop or the malik role.';

-- Definer functions are executable by everyone unless said otherwise.
-- anon must not be able to call this: it would fail on auth.uid() anyway,
-- but "fails safely" is not a grant policy.
revoke execute on function public.create_shop_for_user(text, text) from public, anon;
grant  execute on function public.create_shop_for_user(text, text) to authenticated;


-- ============================================================
-- VERIFYING IT (run as a signed-in user with no shop)
--
--   select public.create_shop_for_user('Test Shop', 'ٹیسٹ شاپ');
--     -> returns a uuid
--
--   select shop_id, role from profiles where id = auth.uid();
--     -> that uuid, 'malik'
--
--   select name, name_ur from fish_types order by name;
--     -> the five defaults (visible because RLS now matches your shop)
--
--   select public.create_shop_for_user('Second Shop', null);
--     -> ERROR: user already belongs to a shop
--
-- And the 0003 guard still holds afterwards:
--   update profiles set role = 'munshi' where id = auth.uid();
--     -> still blocked; the function remains the only door.
-- ============================================================

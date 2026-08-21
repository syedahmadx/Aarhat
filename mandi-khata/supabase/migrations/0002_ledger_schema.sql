-- ============================================================
-- Mandi Khata — Migration 0002: the ledger itself
-- Assignment 3 (Supabase Database & Live Data Flow)
-- Depends on 0001 (shops, profiles, touch_updated_at).
--
-- MONEY RULE: every amount is BIGINT paisa. Every weight is INTEGER grams.
-- Commission is INTEGER basis points (6.25% = 625). No floats, anywhere,
-- ever — this matches src/utils/money.js and is the single most important
-- constraint in the schema.
-- ============================================================

-- ---------- helper: the caller's shop ----------
-- Every RLS policy below reduces to "is this row in your shop?", so that
-- question gets one definition instead of eight copies.
create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from public.profiles where id = auth.uid();
$$;


-- ---------- parties ----------
-- Beoparis (suppliers) and khareedars (buyers). One table, not two: the
-- same person is often both, and the khata logic is identical.
create table public.parties (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.shops(id) on delete cascade,
  name            text not null,
  name_ur         text,
  type            text not null check (type in ('beopari','khareedar')),
  phone           text,
  area            text,
  area_ur         text,
  opening_paisa   bigint not null default 0,
  -- Two munshis WILL create "Akram Fish Corner" and "Akram Fish" in the
  -- first week. Merging points the loser at the winner; nothing is deleted,
  -- so old rows keep resolving.
  merged_into     uuid references public.parties(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  -- Same name twice in one shop is almost always the duplicate above.
  constraint parties_name_unique_per_shop unique (shop_id, name)
);

create index parties_shop      on public.parties(shop_id, type);
create index parties_merged    on public.parties(merged_into);


-- ---------- fish_types ----------
-- Per-shop, because every mandi trades a different list.
create table public.fish_types (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  name        text not null,
  name_ur     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint fish_types_unique_per_shop unique (shop_id, name)
);

create index fish_types_shop on public.fish_types(shop_id);


-- ---------- sales ----------
-- One lot sold from a beopari to a khareedar.
-- biz_date is the TRADING day, deliberately separate from created_at: a sale
-- entered at 00:30 belongs to the day that just ended, and the roznamcha has
-- to agree with the munshi about which day that is.
create table public.sales (
  id                    uuid primary key default gen_random_uuid(),
  shop_id               uuid not null references public.shops(id) on delete cascade,
  biz_date              date not null,
  gaari                 text,
  beopari_id            uuid not null references public.parties(id) on delete restrict,
  khareedar_id          uuid not null references public.parties(id) on delete restrict,
  fish_type_id          uuid not null references public.fish_types(id) on delete restrict,

  weight_g              integer not null check (weight_g > 0),
  rate_paisa_per_kg     bigint  not null check (rate_paisa_per_kg > 0),
  commission_bp         integer not null check (commission_bp between 0 and 10000),

  gross_paisa           bigint not null check (gross_paisa >= 0),
  commission_paisa      bigint not null check (commission_paisa >= 0),
  expenses_total_paisa  bigint not null default 0 check (expenses_total_paisa >= 0),
  net_payout_paisa      bigint not null,

  received_paisa        bigint not null default 0 check (received_paisa >= 0),
  status                text not null default 'Pending'
                        check (status in ('Pending','Partial','Paid')),

  -- A void is a reversing row that points at the original. The original is
  -- never deleted, because every khata statement already handed to a
  -- khareedar would otherwise become retroactively wrong.
  voids_id              uuid references public.sales(id) on delete restrict,

  created_by            uuid references public.profiles(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  deleted_at            timestamptz,

  -- The identity from money.js, enforced by the database as well as the app.
  constraint sales_money_identity check (
    gross_paisa = commission_paisa + expenses_total_paisa + net_payout_paisa
  )
);

create index sales_khareedar on public.sales(khareedar_id, biz_date);
create index sales_beopari   on public.sales(beopari_id, biz_date);
create index sales_day       on public.sales(shop_id, biz_date);
create index sales_voids     on public.sales(voids_id);


-- ---------- sale_expenses ----------
-- One-to-many off sales: baraf, mazdoori, kraya, advance cut.
-- Cascade on delete is safe here and only here, because an expense line has
-- no meaning without its sale.
create table public.sale_expenses (
  id            uuid primary key default gen_random_uuid(),
  sale_id       uuid not null references public.sales(id) on delete cascade,
  type          text not null,
  amount_paisa  bigint not null check (amount_paisa >= 0),
  borne_by      text not null default 'beopari'
                check (borne_by in ('beopari','khareedar','shop')),
  created_at    timestamptz not null default now()
);

create index sale_expenses_sale on public.sale_expenses(sale_id);


-- ---------- cash_entries ----------
-- wasooli = cash received from a khareedar. payment = cash paid to a beopari.
create table public.cash_entries (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops(id) on delete cascade,
  biz_date      date not null,
  party_id      uuid not null references public.parties(id) on delete restrict,
  direction     text not null check (direction in ('wasooli','payment')),
  amount_paisa  bigint not null check (amount_paisa > 0),
  note          text,
  note_ur       text,
  voids_id      uuid references public.cash_entries(id) on delete restrict,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index cash_party on public.cash_entries(party_id, biz_date);
create index cash_day   on public.cash_entries(shop_id, biz_date);


-- ---------- allocations ----------
-- MANY-TO-MANY between cash_entries and sales: one payment can clear three
-- sales, one sale can be cleared by four payments. Without this table the
-- question "why is this sale still Partial?" has no answer.
create table public.allocations (
  id             uuid primary key default gen_random_uuid(),
  shop_id        uuid not null references public.shops(id) on delete cascade,
  cash_entry_id  uuid not null references public.cash_entries(id) on delete cascade,
  sale_id        uuid not null references public.sales(id) on delete cascade,
  side           text not null check (side in ('receivable','payable')),
  amount_paisa   bigint not null check (amount_paisa > 0),
  created_at     timestamptz not null default now(),
  constraint allocations_unique_pair unique (cash_entry_id, sale_id)
);

create index allocations_cash on public.allocations(cash_entry_id);
create index allocations_sale on public.allocations(sale_id);


-- ---------- updated_at triggers ----------
create trigger parties_touch      before update on public.parties
  for each row execute function public.touch_updated_at();
create trigger fish_types_touch   before update on public.fish_types
  for each row execute function public.touch_updated_at();
create trigger sales_touch        before update on public.sales
  for each row execute function public.touch_updated_at();
create trigger cash_entries_touch before update on public.cash_entries
  for each row execute function public.touch_updated_at();


-- ============================================================
-- Row Level Security
-- Every table follows the same rule: you see your shop's rows and nobody
-- else's. Deletes are denied everywhere — the app voids, it never deletes.
-- ============================================================

alter table public.parties       enable row level security;
alter table public.fish_types    enable row level security;
alter table public.sales         enable row level security;
alter table public.sale_expenses enable row level security;
alter table public.cash_entries  enable row level security;
alter table public.allocations   enable row level security;

-- parties
create policy parties_select on public.parties for select
  using (shop_id = public.current_shop_id());
create policy parties_insert on public.parties for insert
  with check (shop_id = public.current_shop_id());
create policy parties_update on public.parties for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- fish_types
create policy fish_types_select on public.fish_types for select
  using (shop_id = public.current_shop_id());
create policy fish_types_insert on public.fish_types for insert
  with check (shop_id = public.current_shop_id());
create policy fish_types_update on public.fish_types for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- sales
create policy sales_select on public.sales for select
  using (shop_id = public.current_shop_id());
create policy sales_insert on public.sales for insert
  with check (shop_id = public.current_shop_id());
create policy sales_update on public.sales for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- sale_expenses: no shop_id of its own, so it inherits via its parent sale.
create policy sale_expenses_select on public.sale_expenses for select
  using (exists (
    select 1 from public.sales s
    where s.id = sale_id and s.shop_id = public.current_shop_id()
  ));
create policy sale_expenses_insert on public.sale_expenses for insert
  with check (exists (
    select 1 from public.sales s
    where s.id = sale_id and s.shop_id = public.current_shop_id()
  ));

-- cash_entries
create policy cash_select on public.cash_entries for select
  using (shop_id = public.current_shop_id());
create policy cash_insert on public.cash_entries for insert
  with check (shop_id = public.current_shop_id());
create policy cash_update on public.cash_entries for update
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

-- allocations
create policy allocations_select on public.allocations for select
  using (shop_id = public.current_shop_id());
create policy allocations_insert on public.allocations for insert
  with check (shop_id = public.current_shop_id());

-- No delete policies anywhere. Deletion is not a supported operation in
-- this system; voiding is. This is a deliberate product decision, not an
-- oversight — say so if a reviewer asks.

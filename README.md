# Mandi Khata

A ledger app for fish mandi commission agents in Pakistan.

**Live:** https://mandi-khata.netlify.app

---

## The problem

In a Pakistani fish mandi, an **arhti** (commission agent) sells fish on behalf
of suppliers and keeps a cut of each sale. Most buyers take the fish on credit,
so at any moment the arhti owes money to suppliers and is owed money by buyers.
The entire business runs on knowing who owes whom.

Today that record is a paper ledger — the **khata**. It works, but it cannot be
searched, it cannot be totalled without adding it up by hand, it is lost if the
book is lost, and a buyer's balance is only as accurate as the last time someone
sat down with a calculator.

Mandi Khata is that ledger as software: every sale and every cash movement is
recorded once, and every party's balance is derived from those entries rather
than maintained by hand.

## Who it is for

| Role | Who they are | What they do in the app |
|---|---|---|
| **Malik** | The shop owner | Everything, including voiding entries and viewing Reports |
| **Munshi** | The clerk who does the daily data entry | Records sales, wasooli and payments. Cannot void anything and cannot see Reports |

Both work in English or Urdu, on a desktop in the shop or on a phone in the
mandi.

## The domain, in short

| Term | Meaning |
|---|---|
| Beopari | The supplier who brings the fish. The arhti owes him after a sale |
| Khareedar | The buyer. He owes the arhti, usually on credit |
| Gaari | A truck-load, used as a reference on a sale |
| Kharcha | Deductions from a sale — baraf (ice), mazdoori (labour), kraya (freight), advance |
| Wasooli | Cash received from a buyer |
| Roznamcha | The day book — everything that happened on one date |
| Khata | One party's running account |
| Lena / Dena | Lena = they owe us. Dena = we owe them |

## Features

- **Sale entry** with live calculation of gross, commission, kharcha and the net
  payout to the beopari, with the identity enforced by the database itself
- **Cash entry** for wasooli and payments, applied to the oldest unpaid sale first
- **Roznamcha** — the day book, filterable by entry type, paginated, with day totals
- **Khatas** — every party's running balance, with search on name, area or phone,
  filters by party type and by balance direction, and sorting by name or balance
- **Khata detail** — a party's full ledger with a running balance column
- **Reports** (malik only) — totals over a date range, sales by fish type, cash in
  versus cash out, daily sales, and kharcha by type
- **Dashboard** — today's figures plus two charts drawn from live data
- **Void, not delete** — a mistake inserts a reversing entry; the original stays
  visible, struck through, exactly as a line drawn in a paper ledger
- **English and Urdu**, with RTL layout and Naskh type for the Urdu interface

## Architecture

```
React 19 + Vite + Tailwind 4        frontend, deployed on Netlify
        │
        │  repository layer (src/repo)  ── the only place that knows about tables
        ▼
Supabase                            Postgres + Auth + Row Level Security
```

- **Repository pattern.** Every screen calls the same `repo` interface. Only
  `supabaseRepo` knows table names or maps snake_case columns to camelCase.
  Swapping the data source is a one-file change, which is how the app ran on
  mock data before the database existed.
- **Routing** is hash-based (`/#/khatas`), so a refresh on a nested route can
  never produce a 404 on a static host.
- **No server of our own.** Supabase is the backend; business rules that must
  not be bypassed live in the database as constraints and policies rather than
  in the browser.

### Money and weight

All amounts are stored as **whole paisa** and all weights as **whole grams**;
rates are paisa per kilogram and commission is in basis points. Nothing is
stored as a float, so no rounding error can accumulate across a ledger. Values
are converted for display only. Weights are also shown as maund and kilograms,
because that is how the trade talks about them.

## Database

Eight tables, five migrations, all in `supabase/migrations/`.

| Table | Purpose |
|---|---|
| `shops` | One row per arhti business. The tenant boundary for every policy |
| `profiles` | One per auth user (1:1 with `auth.users`). Holds role and shop |
| `parties` | Beoparis and khareedars, with opening balance and a `merged_into` self-reference |
| `fish_types` | Per-shop fish catalogue, seeded on shop creation |
| `sales` | One row per sale, with a `voids_id` self-reference for reversals |
| `sale_expenses` | Kharcha lines on a sale, including who bears each one |
| `cash_entries` | Wasooli and payments, with their own `voids_id` |
| `allocations` | Many-to-many: which cash entry settled how much of which sale |

**Relationships.** `profiles` ↔ `auth.users` is one-to-one. `shops` → everything
is one-to-many, as are `parties` → `sales` and `sales` → `sale_expenses`.
`sales` ↔ `cash_entries` is many-to-many through `allocations`.

**Constraints that matter.** A CHECK on `sales` requires
`gross = commission + expenses + net_payout` exactly, so an incorrect
calculation cannot be written at all. Indexes cover `shop_id`, `biz_date` and
the party foreign keys.

### Migrations

| File | What it does |
|---|---|
| `0001_auth_profiles.sql` | shops, profiles, and the trigger that creates a profile on sign-up so a registration cannot half-succeed |
| `0002_ledger_schema.sql` | The six ledger tables, the money CHECK, indexes, and RLS on every table |
| `0003_profile_role_guard.sql` | Blocks a user changing their own role or shop — found in review, when a munshi could otherwise promote themselves from the browser |
| `0004_shop_onboarding.sql` | `create_shop_for_user()`: creates the shop, sets role and shop on the profile, and seeds fish types in one transaction, with a row lock so a double click cannot create two shops |
| `0005_void_requires_malik.sql` | Inserting a row with `voids_id` set requires the caller's profile role to be malik |

## Security

- **Row Level Security on every table.** A helper `current_shop_id()` reads the
  caller's shop from their profile; every select, insert and update policy on the
  ledger tables checks `shop_id = current_shop_id()`. One arhti can never read
  another's rows, and the frontend applies no filter of its own — the database
  returns nothing.
- **No DELETE policies anywhere.** Not on any table. A ledger keeps its history.
- **Role enforced in four layers.** The UI hides what a munshi cannot do; the
  route guard redirects a direct URL; the repository refuses the call; and
  migration 0005 refuses the insert at the database. Each layer alone would be
  bypassable; the last one is not.
- **Role comes from the database, not the client.** An earlier build had a role
  selector in the header — a leftover from the mock-data phase that let any user
  pick "Malik". It was removed; the role is now read from `profiles` after
  sign-in and displayed read-only.
- **Secrets.** Only `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and
  `VITE_DATA_SOURCE` are used, all browser-safe by design — the anon key can
  only do what the policies allow. The service-role key is never used in the
  frontend. `.env` is gitignored; only `.env.example` with empty values is
  committed.

## Testing

| Area | Result |
|---|---|
| Main journey | Sale → wasooli → void, each verified in the app and in the Supabase table editor |
| Tenant isolation | A second account with its own shop sees empty screens while the tables hold the first shop's rows |
| Role permissions | Munshi has no Reports in either nav, is redirected from the URL, and has no void controls |
| Persistence | Rows survive refresh and a full sign-out and sign-in |
| Related tables | Khata detail shows exactly the sales and cash rows that reference that party |
| States | Loading skeletons, empty states, validation, success toasts, and a readable error with the form preserved — verified by submitting with the network offline |
| Responsive | Desktop sidebar, mobile bottom navigation; checked at phone and desktop widths on the deployed site |
| Build | `npm run build` passes; deployed automatically from `main` |

## Running it locally

```bash
cd mandi-khata
npm install
cp .env.example .env     # then fill in your Supabase URL and anon key
npm run dev
```

Apply the migrations in `supabase/migrations/` in order, in the Supabase SQL
editor, against a new project.

Set `VITE_DATA_SOURCE=supabase` for live data.

## Deployment

Netlify, building from `main` on every push.

| Setting | Value |
|---|---|
| Base directory | `mandi-khata` |
| Build command | `npm run build` |
| Publish directory | `mandi-khata/dist` |

Environment variables are set in Netlify, not committed. Supabase's Site URL and
allowed redirect URL both point at the production domain so email confirmation
links land on the live site.

## Known limitations

- **Paid amounts are stored on the sale row.** It works, but a double-entry
  `ledger_entries` table would mean balances are always derived rather than
  maintained, which is the direction this should go.
- **Supabase's free tier pauses an idle project.** Fine for a demonstration,
  not for a shop.
- **No printing yet.** A party statement and a daily roznamcha for a thermal or
  dot-matrix printer, in Urdu, is the first thing a real user will ask for.
- **Online only.** Mandi connections drop during morning trade. An offline
  desktop build is the intended next version.
- **Bundle size.** Over 500 kB after adding charts; code-splitting would fix it.

## AI tools used

Built with **Claude Code** in VS Code, one feature at a time: a written prompt,
a review of what it produced, then commit. The prompts are saved in `prompts/`.

The review step was not a formality. Three things it produced were wrong and
were caught by testing rather than by reading: the role selector that let any
user choose their own permissions; an RLS insert policy that checked only
`shop_id`, so a munshi could have posted a reversing row straight through the
API; and Urdu screens rendering `null` for parties created without an Urdu name.
Each is documented in the assignment submissions with what was changed and how
the fix was verified.

# Mandi Khata

A frontend-only web app for *arhtis* (commission agents) in Pakistani fish wholesale markets. It digitizes the daily hisaab: sales from beoparis (suppliers) to khareedars (buyers), commission and expense deductions, per-party udhaar tracking, and a daily roznamcha (day book).

## Run

```bash
npm install
npm run dev
```

## Scope

Frontend only — no backend, no database, no real authentication, no external APIs, no localStorage. All data is mock data held in React state (`src/context/AppContext.jsx`). **Edits live only for the session and reset on page reload.**

### Language

The header carries an **EN / اردو** toggle. Urdu switches the whole UI to Urdu script and flips the document to RTL — the sidebar moves to the right, tables and alignment mirror, and dates/times render with Urdu month names (`18 اگست 2026`, `6:10 صبح`). Party names, areas, fish types, expense types and status badges all have Urdu spellings.

Amounts keep Latin digits in both languages (`1,25,000`), since Pakistani commerce writes them that way; only the currency word changes (`Rs.` / `روپے`). Latin-script runs — amounts, phone numbers, gaari numbers, date inputs — stay in Inter via a `.latin` class so they don't render in Nastaliq.

All copy lives in `src/i18n/translations.js` as a flat key map with an `en` and `ur` block of identical shape. To add a string, add the key to both. To switch Urdu from script to Roman Urdu, replace the values in the `ur` block and drop the `[dir="rtl"]` rules from `src/index.css` — nothing else changes.

### Roles

The header dropdown simulates two roles (this is not authentication):

| | Malik (Owner) | Munshi (Clerk) |
|---|---|---|
| Reports page | visible | hidden (route redirects to Dashboard) |
| Delete buttons | enabled | disabled, tooltip "Only Malik can delete" |

## Screens

| Route | Screen |
|---|---|
| `/` | Dashboard — day summary cards, top pending udhaar |
| `/new-sale` | New Sale entry with live calculation panel |
| `/roznamcha` | Day book with filter chips and day totals |
| `/khatas` | Party list, searchable and filterable |
| `/khatas/:id` | Party ledger with running balance |
| `/cash-entry` | Wasooli / Payment entry with confirmation |
| `/reports` | Owner-only range report and daily-sales chart |

## Accounting conventions

Balances follow the arhti's own book: **positive = Lena** (receivable, the party owes you), **negative = Dena** (payable, you owe the party).

- A sale debits the khareedar the gross amount and credits the beopari the net payout (gross − commission − expenses).
- A **wasooli** (cash received) reduces the party's balance; a **payment** (cash paid out) increases it.
- A wasooli from a khareedar is allocated against their unpaid sales oldest-first, moving each sale's status Pending → Partial → Paid.

## Stack

React 19, Vite, Tailwind CSS v4, React Router (hash routing). Fonts: Inter (English) and Noto Nastaliq Urdu (Urdu).

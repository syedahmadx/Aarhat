# Mandi Khata

A frontend-only web app for *arhtis* (commission agents) in Pakistani fish wholesale markets. It digitizes the daily hisaab: sales from beoparis (suppliers) to khareedars (buyers), commission and expense deductions, per-party udhaar tracking, and a daily roznamcha (day book).

## Run

```bash
npm install
npm run dev
```

## Scope

Frontend only — no backend, no database, no real authentication, no external APIs, no localStorage. All data is mock data held in React state (`src/context/AppContext.jsx`). **Edits live only for the session and reset on page reload.**

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

React 19, Vite, Tailwind CSS v4, React Router (hash routing).

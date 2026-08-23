# A4 — Advanced UI: prompt log

The prompts below were given verbatim to Claude Code running inside VS Code,
in the order shown, to produce the A4 work on branch `feat/a4-advanced-ui`.

---

## Prompt 1 — the three stages

```
A4 — advanced UI, three stages. Do them in order, commit and push after each stage. In every stage preserve auth, Supabase integration, RLS policies, CRUD, the repository layer, money.js, and the responsive layout. Do not touch migrations.

STAGE 1 — Khatas: search, filters, sort. Keep the existing keyword search on name/area/phone. Add filters: party type (Beopari / Khareedar) and balance status (Lena / Dena / Settled). Add sort by name and by balance, each with asc/desc toggle. Search, filters and sort must combine correctly. Show active filter chips, a result count like "8 of 20 parties", and a Reset Filters button. Keep filter state in the URL query string so it survives refresh and back. States: skeleton while loading, existing empty state when there are no parties, "No parties match these filters" with a reset link when filters exclude everything. Commit: "A4 stage 1: khata search, filters, sort".

STAGE 2 — Navigation and feedback. Sidebar and bottom nav: clear active-page state, icons with labels, grouped as Daily (Dashboard, New Sale, Roznamcha, Cash Entry) and Accounts (Khatas, Reports). Hide Reports for munshi role and guard the route so a direct URL redirects to Dashboard. Add breadcrumbs on Khata Detail (Khatas > party name), New Sale and Cash Entry, with a back control that returns to the previous list. Add pagination to Roznamcha, 25 per page, with a row count. Add loading skeletons to every data screen that lacks one, success toasts on save and void, and confirm the void dialog exists. Remove the sidebar text "Demo — data stays only for this session" in both languages and remove the Netlify badge. Commit: "A4 stage 2: navigation, breadcrumbs, role-aware menu, pagination".

STAGE 3 — Dashboard insights. Keep exactly four KPI cards. Add two charts from live Supabase data using recharts: (1) bar chart "Sales by fish type — last 7 days", (2) line chart "Cash in vs cash out — last 14 days". Each needs a title, axis labels with Rs. units, concise tooltip, accessible colours with labels so meaning doesn't rely on colour alone, and loading, empty and error states. Values must match the underlying rows for the current shop. No animation, no 3D, no extra charts. Reuse the same chart component on Reports. Commit: "A4 stage 3: dashboard charts".

ALSO, in stage 2, fix the Urdu rendering: the current Nastaliq font is showing stray commas between words and breaking letters (e.g. کیش shows as لیش). Switch the Urdu UI font to Noto Naskh Arabic (loaded via Google Fonts) for all interface text, keeping digits and currency in the Latin font, and verify that "کیش آمد", "کیش ادائیگی", "آج کی سیل", "کراچی سی فوڈز" render cleanly with no inserted punctuation. Check the i18n strings for any literal "،" characters accidentally inside words and remove them.
```

---

## Prompt 2 — the three fixes and the pull request

```
Three fixes on branch feat/a4-advanced-ui, then merge. Preserve auth, Supabase, RLS, repo layer, money.js, and all A4 work. Run tests, lint and build after each fix; commit each separately; push after all three.

FIX 1 — Urdu names on live data. Parties created through the app have name_ur = null, so in Urdu mode Roznamcha shows "null → null" and "—", and Khatas and Dashboard fail to render. Create one helper displayName(obj, lang) that returns name_ur when present and falls back to name, and use it everywhere a party, fish type, or shop name is shown: Roznamcha, Khatas, Khata Detail, Dashboard, New Sale and Cash Entry dropdowns, breadcrumbs, charts, top-pending-udhaar. Never render null. Khatas search must match both name and name_ur. Also fix the Roznamcha page title being clipped under the top bar in RTL. Commit: "A4: fall back to English name when Urdu name missing".

FIX 2 — Role from profile only. The header still has the mock-era role dropdown ("Malik (Owner) / Munshi") that lets any user choose their own role. Remove it. Role must come only from the profiles row of the signed-in user, loaded into the auth context after sign-in and on reload. Replace the dropdown with a read-only label: user's name and role (e.g. "syed · Munshi"). Using that real role: hide Reports from sidebar and bottom nav for munshi, redirect /#/reports to /#/dashboard for munshi, hide void icons on Roznamcha and Khata Detail for munshi, and make repo.voidSale / repo.voidCashEntry throw if role !== 'malik'. Check the RLS insert/update policies on sales and cash_entries: a row with voids_id set must only be insertable when the caller's profile role = 'malik'. If not enforced, add migration 0005_void_requires_malik.sql and apply it. Commit: "A4: role from profile only, enforce munshi limits".

FIX 3 — Prompt log. Create mandi-khata/prompts/A4-advanced-ui.md containing, verbatim, the A4 prompts I gave you in this project (the three-stage prompt and the fix prompts), with a two-line header noting they were given to Claude Code in VS Code. Commit: "A4: add prompt log".

Then push, open a pull request from feat/a4-advanced-ui into main titled "A4: advanced UI, navigation, filters and charts", and tell me the PR URL. Do not merge it yourself.
```

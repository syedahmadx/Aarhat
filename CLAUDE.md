# Mandi Khata

Ledger app for fish-mandi commission agents (arhtis) in Pakistan.
Stack: React 19 + Vite + Tailwind 4, JavaScript (not TypeScript), react-router.
Target: Tauri + SQLite Windows desktop app. Single writer. Offline-first.
Cloud (Supabase) is backup + licence only, never the source of truth.

## Money rules (non-negotiable)
- All amounts are integer paisa. All weights integer grams. Rates in paisa
  per kg. Commission in basis points (6.25% = 625).
- Floats may appear only at the input/display boundary, never downstream.
- All money math goes through src/utils/money.js. No Math.round anywhere else.
- Identity, exactly: gross === commission + expensesTotal + netPayout

## Domain rules
- Balance convention: positive = Lena (they owe us), negative = Dena (we owe them).
- Never delete a sale or cash entry. A void posts a reversing contra entry on
  today's date; the original stays visible, struck through.
- Parties are merged, never deleted (merged_into pointer).
- A locked/unlicensed shop can still read, print and export its ledger. It
  loses only the ability to create new entries.

## Do not
- Add a backend, auth, or state-management library unless asked.
- Rewrite files wholesale when a targeted edit works.
- Put application logic in Rust. Logic stays in JS in the WebView; Rust is
  reserved for ~200 lines of hardware fingerprinting later.

## Working style
- Small, reviewable commits with clear messages.
- Show a plan before any change touching more than two files.
- Ask before adding a dependency.

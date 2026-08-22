import { createClient } from '@supabase/supabase-js';

// Only the anon key is ever used in this codebase. It is safe to ship to a
// browser because Row Level Security (see supabase/migrations/0001) is what
// actually enforces access — the key alone grants nothing. The service_role
// key bypasses RLS entirely and must never appear in frontend code, in .env
// files read by Vite, or in any VITE_-prefixed variable.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Failing loudly here beats a confusing "Failed to fetch" on first sign-in.
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart the dev server ' +
      '(Vite only reads .env at startup).'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // The app uses HashRouter, so the URL fragment belongs to the router.
    // Letting Supabase parse it would fight over the same '#'.
    detectSessionInUrl: false,
  },
});

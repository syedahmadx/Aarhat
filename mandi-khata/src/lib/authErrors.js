// Maps a Supabase auth/postgrest error onto a translation key, so every
// message the user sees exists in both English and Urdu. Supabase error
// wording is not a stable API, so we match on `code` first and fall back to
// the message text.
export function authErrorKey(error) {
  if (!error) return null;

  const code = error.code || '';
  const status = error.status || 0;
  const message = (error.message || '').toLowerCase();

  if (code === 'user_already_exists' || message.includes('already registered')) {
    return 'auth.errDuplicate';
  }
  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'auth.errBadCredentials';
  }
  if (code === 'over_request_rate_limit' || status === 429 || message.includes('rate limit')) {
    return 'auth.errRateLimited';
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'auth.errNetwork';
  }
  // A rejected API key is a deployment mistake, not something the user did.
  // Reporting it as "wrong password" would send them in circles, so it gets
  // its own message plus a developer hint in the console.
  if (message.includes('invalid api key') || code === 'invalid_api_key') {
    if (import.meta.env.DEV) {
      console.error(
        '[supabase] The project rejected the anon key. Check that ' +
          'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env come from the ' +
          'SAME project (Settings -> API), then restart the dev server.'
      );
    }
    return 'auth.errConfig';
  }
  return 'auth.errGeneric';
}

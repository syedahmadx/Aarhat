import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

// Fields a user is allowed to change about themselves. `role` and `shop_id`
// are deliberately absent: they decide what the user may do, so they must not
// be settable by the user. See supabase/migrations/0003_profile_role_guard.sql
// — until that runs, the database itself still permits it, and this list is
// the only thing stopping it.
const EDITABLE_PROFILE_FIELDS = ['full_name'];

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  // Starts true so no route decision is made before we know who the user is.
  const [loading, setLoading] = useState(true);
  // True while a profile fetch is in flight. Routes that branch on
  // profile.shop_id must wait on this too: onAuthStateChange clears
  // `loading` before the profile arrives, and deciding on a null profile
  // would bounce an existing malik to /setup for a frame.
  const [profileLoading, setProfileLoading] = useState(false);

  // Guards against a late async response writing state after unmount, and
  // against an older profile fetch landing after a newer one.
  const mounted = useRef(true);
  const fetchToken = useRef(0);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return null;
    }
    const token = ++fetchToken.current;
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, shop_id, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle(); // RLS returns zero rows for anyone else's id, not an error

    // A stale response must not clear profileLoading either — the newer
    // fetch that superseded this one owns that flag now.
    if (!mounted.current || token !== fetchToken.current) return null;
    setProfileLoading(false);
    if (error) {
      setProfile(null);
      return null;
    }
    setProfile(data ?? null);
    return data ?? null;
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Resolve the persisted session once on mount, before any redirecting.
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted.current) return;
        setSession(data.session ?? null);
        if (data.session?.user) await loadProfile(data.session.user.id);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted.current) return;
      setSession(nextSession ?? null);
      if (nextSession?.user) {
        loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  /**
   * Creates the auth user. The `full_name` in options.data lands in
   * raw_user_meta_data, which the on_auth_user_created trigger reads to fill
   * the profiles row — so the profile is created by the database, never here.
   *
   * Returns { error, duplicate, needsEmailConfirmation }.
   *
   * Two Supabase behaviours the caller has to cope with:
   *  - Email confirmation ON: a user is created but no session is issued, so
   *    the caller must not redirect into the app.
   *  - Email confirmation ON also HIDES duplicate emails on purpose, to stop
   *    account enumeration: signing up with an address that already exists
   *    returns success with an empty `identities` array rather than an error.
   *    With confirmation OFF you get a real "already registered" error.
   *    Both are reported here as `duplicate`.
   */
  const signUp = useCallback(async (fullName, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    if (error) return { error, duplicate: false, needsEmailConfirmation: false };

    const duplicate = Array.isArray(data.user?.identities) && data.user.identities.length === 0;
    return {
      error: null,
      duplicate,
      needsEmailConfirmation: !data.session && !duplicate,
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) setProfile(null);
    return { error: error ?? null };
  }, []);

  /**
   * Updates the signed-in user's own profile row. Only whitelisted fields are
   * sent; anything else is dropped before the request leaves the browser.
   */
  const updateProfile = useCallback(
    async (fields) => {
      const userId = session?.user?.id;
      if (!userId) return { error: new Error('Not signed in'), data: null };

      const patch = {};
      for (const key of EDITABLE_PROFILE_FIELDS) {
        if (fields[key] !== undefined) patch[key] = fields[key];
      }
      if (Object.keys(patch).length === 0) return { error: null, data: profile };

      const { data, error } = await supabase
        .from('profiles')
        .update(patch)
        .eq('id', userId)
        .select('id, full_name, email, role, shop_id, created_at, updated_at')
        .single();

      if (error) return { error, data: null };
      if (mounted.current) setProfile(data);
      return { error: null, data };
    },
    [session, profile]
  );

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      // Convenience reads off the profile row. shopId null means the user
      // has not completed onboarding; routes send them to /setup.
      shopId: profile?.shop_id ?? null,
      role: profile?.role ?? null,
      loading,
      profileLoading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile: () => loadProfile(session?.user?.id),
    }),
    [session, profile, loading, profileLoading, signUp, signIn, signOut, updateProfile, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

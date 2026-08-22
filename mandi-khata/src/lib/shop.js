import { supabase } from './supabase';

// Error codes raised by create_shop_for_user (migration 0004). Matching on
// codes, not message text — the messages are for logs, the codes are the API.
export const SHOP_ERR = {
  ALREADY_HAS_SHOP: '23505',
  BLANK_NAME: '22023',
  NOT_SIGNED_IN: '28000',
  NO_PROFILE: 'P0002',
};

/**
 * Onboards the signed-in user: one atomic RPC that creates their shop, sets
 * profiles.shop_id, promotes them to malik and seeds default fish_types.
 * The database function acts only on auth.uid(); there is nothing to pass
 * about who the user is.
 *
 * Named arguments, matching the function signature exactly — positional args
 * do not exist over PostgREST.
 *
 * @returns {{ shopId: string|null, code: string|null, error: object|null }}
 */
export async function createShopForUser(shopName, shopNameUr) {
  const { data, error } = await supabase.rpc('create_shop_for_user', {
    shop_name: shopName,
    shop_name_ur: shopNameUr?.trim() ? shopNameUr.trim() : null,
  });
  if (error) return { shopId: null, code: error.code ?? null, error };
  return { shopId: data ?? null, code: null, error: null };
}

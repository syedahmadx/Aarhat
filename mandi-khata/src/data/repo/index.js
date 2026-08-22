// The data access layer. Everything above this line of the app — context,
// screens — talks to these thirteen functions and nothing else. Which
// implementation answers is an environment decision, not a code change:
//
//   default                     -> mockRepo (in-memory, resets on reload)
//   VITE_DATA_SOURCE=supabase   -> supabaseRepo (live database, RLS-scoped)
//
// The supabase implementation is loaded dynamically so a mock-mode build
// never evaluates the supabase client (which throws without its env vars).
import * as mockRepo from './mockRepo';

let impl = mockRepo;
if (import.meta.env.VITE_DATA_SOURCE === 'supabase') {
  impl = await import('./supabaseRepo');
}

export const DATA_SOURCE = impl === mockRepo ? 'mock' : 'supabase';

export const listParties = (...args) => impl.listParties(...args);
export const addParty = (...args) => impl.addParty(...args);
export const mergeParty = (...args) => impl.mergeParty(...args);
export const listFishTypes = (...args) => impl.listFishTypes(...args);
export const listSales = (...args) => impl.listSales(...args);
export const addSale = (...args) => impl.addSale(...args);
export const voidSale = (...args) => impl.voidSale(...args);
export const listCashEntries = (...args) => impl.listCashEntries(...args);
export const addCashEntry = (...args) => impl.addCashEntry(...args);
export const voidCashEntry = (...args) => impl.voidCashEntry(...args);
export const allocateWasooli = (...args) => impl.allocateWasooli(...args);
export const partyBalance = (...args) => impl.partyBalance(...args);
export const partyLedger = (...args) => impl.partyLedger(...args);

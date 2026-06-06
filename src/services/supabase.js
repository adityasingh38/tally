import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function getTransactions({ userId, limit = 50, offset = 0, fromDate }) {
  let query = supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('txn_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (fromDate) {
    query = query.gte('txn_date', fromDate.toISOString());
  }

  return query;
}

export async function insertTransaction(tx) {
  return supabase.from('transactions').insert(tx);
}

export async function insertTransactions(txList) {
  return supabase.from('transactions').insert(txList);
}

export async function getSpendingByCategory({ fromDate, toDate }) {
  // Aggregated server-side (see spending_by_category in schema.sql) so the
  // 1000-row default page limit can't undercount the totals.
  return supabase.rpc('spending_by_category', {
    p_from: fromDate.toISOString(),
    p_to: toDate.toISOString(),
  });
}

export async function checkDuplicate({ userId, amount, txnDate, merchantTail }) {
  const { data } = await supabase
    .from('transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('amount', amount)
    .eq('merchant_tail', merchantTail)
    .gte('txn_date', new Date(txnDate.getTime() - 60000).toISOString())
    .lte('txn_date', new Date(txnDate.getTime() + 60000).toISOString())
    .limit(1);

  return data && data.length > 0;
}

export async function getBudgets(userId) {
  return supabase.from('budgets').select('*').eq('user_id', userId);
}

export async function upsertBudget(budget) {
  return supabase.from('budgets').upsert(budget, { onConflict: 'user_id,category' });
}

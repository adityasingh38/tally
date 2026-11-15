// Retry failed categorisation from saved transaction fields. Raw alerts are
// never persisted for this queue. Unknown merchants need a human choice.
import { categoriseTransactions } from './categoriser';
import { getPendingCategoryTransactions, updateCategoryRetry } from './supabase';

const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 6 * 60 * 60_000];
const running = new Map();

export function retryPendingCategories(userId) {
  if (!userId) return Promise.resolve(0);
  if (running.has(userId)) return running.get(userId);
  const task = runRetry(userId).finally(() => running.delete(userId));
  running.set(userId, task);
  return task;
}

async function runRetry(userId) {
  const { data: rows, error } = await getPendingCategoryTransactions(userId);
  if (error || !rows?.length) return 0;

  const known = rows.filter(row => row.merchant && row.merchant.toLowerCase() !== 'unknown');
  const results = known.length
    ? await categoriseTransactions(known.map(row => ({ ...row, raw_sms: '' })))
    : [];
  const byId = new Map(results.map(row => [row.id, row]));
  let changed = 0;

  for (const row of rows) {
    const result = byId.get(row.id);
    const attempts = Math.min(4, Number(row.category_attempts || 0) + 1);
    let fields;
    if (!result || result.category_status === 'review') {
      fields = { category: 'other', category_status: 'review', category_attempts: attempts };
    } else if (result.category_status === 'done') {
      fields = { category: result.category, category_status: 'done', category_attempts: attempts };
    } else if (attempts >= 4) {
      fields = { category: 'other', category_status: 'review', category_attempts: attempts };
    } else {
      fields = {
        category: 'other', category_status: 'pending', category_attempts: attempts,
        category_retry_at: new Date(Date.now() + RETRY_DELAYS_MS[attempts - 1]).toISOString(),
      };
    }
    const { error: updateError } = await updateCategoryRetry(row.id, userId, fields);
    if (!updateError) changed += 1;
  }
  return changed;
}

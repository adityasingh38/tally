import { ruleBasedCategory } from './smsParser';
import { CATEGORIES } from '../constants';
import { supabase } from './supabase';

async function callAnthropic(transactions) {
  const { data, error } = await supabase.functions.invoke('anthropic-proxy', {
    body: { kind: 'categorization', transactions },
  });
  if (error) throw error;
  if (!data?.text) throw new Error('Empty response from anthropic-proxy');
  return data.text;
}

export async function categoriseTransactions(transactions) {
  // Apply rule-based first
  const results = transactions.map((tx, i) => {
    const ruleCategory = ruleBasedCategory(tx.merchant, tx.raw_sms);
    return { index: i, category: ruleCategory, category_status: ruleCategory ? 'done' : 'pending', needsAI: !ruleCategory };
  });

  const needsAI = results.filter(r => r.needsAI);
  if (needsAI.length === 0) {
    return results.map((r, i) => ({ ...transactions[i], category: r.category, category_status: 'done' }));
  }

  // Batch AI categorisation for unknowns
  const aiInput = needsAI.map(r => {
    const tx = transactions[r.index];
    return { merchant: String(tx.merchant || '').slice(0, 80), sms: String(tx.raw_sms || '').slice(0, 100) };
  });

  try {
    const text = await callAnthropic(aiInput);
    const aiResults = JSON.parse(text);
    if (!Array.isArray(aiResults)) throw new Error('Invalid categorisation response');

    aiResults.forEach(({ index, category, confidence }) => {
      if (!Number.isInteger(index) || index < 0 || index >= needsAI.length) return;
      const result = results[needsAI[index].index];
      if (!Number.isFinite(confidence) || !CATEGORIES.some(c => c.id === category)) return;
      result.category = confidence >= 0.5 ? category : 'other';
      result.category_status = 'done';
    });
  } catch {
    // The transaction can still be captured. A later retry uses extracted
    // fields, never a stored copy of the raw alert.
  }

  return results.map((r, i) => ({ ...transactions[i], category: r.category || 'other', category_status: r.category_status }));
}

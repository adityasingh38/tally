jest.mock('../supabase', () => ({
  supabase: { functions: { invoke: jest.fn() } },
}));

import { supabase } from '../supabase';
import { categoriseTransactions } from '../categoriser';

it('sends unknown alerts through the free category route without changing rule matches', async () => {
  supabase.functions.invoke.mockResolvedValue({
    data: { text: JSON.stringify([{ index: 0, category: 'transport', confidence: 0.9 }]) },
    error: null,
  });
  const result = await categoriseTransactions([
    { merchant: 'Swiggy', raw_sms: 'Rs.100 debited at Swiggy' },
    { merchant: 'Mystery Shop', raw_sms: 'Rs.200 debited at Mystery Shop' },
  ]);
  expect(result.map(tx => tx.category)).toEqual(['food', 'transport']);
  expect(supabase.functions.invoke).toHaveBeenCalledWith('anthropic-proxy', {
    body: { kind: 'categorization', transactions: [
      { merchant: 'Mystery Shop', sms: 'Rs.200 debited at Mystery Shop' },
    ] },
  });
});

it('rejects an AI category outside the allowed set', async () => {
  supabase.functions.invoke.mockResolvedValue({
    data: { text: JSON.stringify([{ index: 0, category: 'made_up', confidence: 1 }]) },
    error: null,
  });
  const result = await categoriseTransactions([
    { merchant: 'Mystery Shop', raw_sms: 'Rs.200 debited at Mystery Shop' },
  ]);
  expect(result[0]).toMatchObject({ category: 'other', category_status: 'pending' });
});

it('keeps a failed AI classification pending for retry', async () => {
  supabase.functions.invoke.mockRejectedValue(new Error('offline'));
  const result = await categoriseTransactions([
    { merchant: 'Mystery Shop', raw_sms: 'Rs.200 debited at Mystery Shop' },
  ]);
  expect(result[0]).toMatchObject({ category: 'other', category_status: 'pending' });
});

it('marks a low-confidence result for human review', async () => {
  supabase.functions.invoke.mockResolvedValue({
    data: { text: JSON.stringify([{ index: 0, category: 'shopping', confidence: 0.3 }]) },
    error: null,
  });
  const result = await categoriseTransactions([
    { merchant: 'Mystery Shop', raw_sms: 'Rs.200 debited at Mystery Shop' },
  ]);
  expect(result[0]).toMatchObject({ category: 'other', category_status: 'review' });
});

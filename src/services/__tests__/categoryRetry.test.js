jest.mock('../categoriser', () => ({ categoriseTransactions: jest.fn() }));
jest.mock('../supabase', () => ({
  getPendingCategoryTransactions: jest.fn(), updateCategoryRetry: jest.fn(),
}));

import { categoriseTransactions } from '../categoriser';
import { getPendingCategoryTransactions, updateCategoryRetry } from '../supabase';
import { retryPendingCategories } from '../categoryRetry';

beforeEach(() => {
  jest.clearAllMocks();
  updateCategoryRetry.mockResolvedValue({ error: null });
});

it('retries from extracted fields and saves a successful category', async () => {
  getPendingCategoryTransactions.mockResolvedValue({ data: [{
    id: 't1', user_id: 'u1', merchant: 'Acme', amount: 200,
    type: 'debit', source: 'HDFCBK', category_attempts: 0,
  }], error: null });
  categoriseTransactions.mockResolvedValue([{
    id: 't1', category: 'shopping', category_status: 'done',
  }]);
  await expect(retryPendingCategories('u1')).resolves.toBe(1);
  expect(categoriseTransactions).toHaveBeenCalledWith([
    expect.objectContaining({ id: 't1', raw_sms: '' }),
  ]);
  expect(updateCategoryRetry).toHaveBeenCalledWith('t1', 'u1', {
    category: 'shopping', category_status: 'done', category_attempts: 1,
  });
});

it('sends an unidentifiable merchant to review without calling AI', async () => {
  getPendingCategoryTransactions.mockResolvedValue({ data: [{
    id: 't2', user_id: 'u1', merchant: 'Unknown', category_attempts: 0,
  }], error: null });
  await expect(retryPendingCategories('u1')).resolves.toBe(1);
  expect(categoriseTransactions).not.toHaveBeenCalled();
  expect(updateCategoryRetry).toHaveBeenCalledWith('t2', 'u1', {
    category: 'other', category_status: 'review', category_attempts: 1,
  });
});

it('backs off a failed retry and asks for review after four attempts', async () => {
  getPendingCategoryTransactions.mockResolvedValue({ data: [{
    id: 't3', user_id: 'u1', merchant: 'Acme', category_attempts: 2,
  }], error: null });
  categoriseTransactions.mockResolvedValue([{
    id: 't3', category: 'other', category_status: 'pending',
  }]);
  await retryPendingCategories('u1');
  expect(updateCategoryRetry).toHaveBeenCalledWith('t3', 'u1',
    expect.objectContaining({ category_status: 'pending', category_attempts: 3,
      category_retry_at: expect.any(String) }));

  getPendingCategoryTransactions.mockResolvedValue({ data: [{
    id: 't3', user_id: 'u1', merchant: 'Acme', category_attempts: 3,
  }], error: null });
  await retryPendingCategories('u1');
  expect(updateCategoryRetry).toHaveBeenLastCalledWith('t3', 'u1', {
    category: 'other', category_status: 'review', category_attempts: 4,
  });
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../supabase', () => ({ insertTransactionIfNew: jest.fn() }));
jest.mock('../budgetAlerts', () => ({ checkBudgetAlerts: jest.fn().mockResolvedValue() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertTransactionIfNew } from '../supabase';
import { checkBudgetAlerts } from '../budgetAlerts';
import { enqueuePending, flushPendingTransactions } from '../offlineQueue';

const QUEUE_KEY = 'tally_offline_queue_v1';
const tx = (overrides = {}) => ({
  user_id: 'user-1', amount: 100, type: 'debit', merchant: 'Test',
  merchant_tail: 'test', category: 'other', source: 'HDFCBK',
  txn_date: '2026-07-01T00:00:00.000Z', ...overrides,
});

beforeEach(async () => {
  await AsyncStorage.clear();
  insertTransactionIfNew.mockReset();
  checkBudgetAlerts.mockClear();
});

describe('enqueuePending', () => {
  it('appends to the persisted queue', async () => {
    await enqueuePending(tx());
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    expect(JSON.parse(raw)).toHaveLength(1);
  });

  it('caps the queue at 200 items, dropping the oldest', async () => {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(
      Array.from({ length: 200 }, (_, i) => tx({ amount: i }))
    ));
    await enqueuePending(tx({ amount: 999 }));
    const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    expect(queue).toHaveLength(200);
    expect(queue[queue.length - 1].amount).toBe(999);
    expect(queue[0].amount).toBe(1); // the oldest (amount: 0) was dropped
  });
});

describe('flushPendingTransactions', () => {
  it('does nothing when the queue is empty', async () => {
    await flushPendingTransactions('user-1');
    expect(insertTransactionIfNew).not.toHaveBeenCalled();
  });

  it('removes a successfully inserted transaction from the queue', async () => {
    insertTransactionIfNew.mockResolvedValue({ data: [{ id: 'abc', inserted: true }], error: null });
    await enqueuePending(tx());
    await flushPendingTransactions('user-1');
    const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    expect(queue).toHaveLength(0);
    expect(checkBudgetAlerts).toHaveBeenCalledWith('user-1');
  });

  it('drops a real duplicate (no error, inserted: false) without re-queueing', async () => {
    insertTransactionIfNew.mockResolvedValue({ data: [{ id: null, inserted: false }], error: null });
    await enqueuePending(tx());
    await flushPendingTransactions('user-1');
    const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    expect(queue).toHaveLength(0);
    expect(checkBudgetAlerts).not.toHaveBeenCalled();
  });

  it('keeps a transaction queued when insert still fails (still offline)', async () => {
    insertTransactionIfNew.mockResolvedValue({ data: null, error: { message: 'network error' } });
    await enqueuePending(tx());
    await flushPendingTransactions('user-1');
    const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    expect(queue).toHaveLength(1);
  });

  it('only flushes items belonging to the given user, leaving others untouched', async () => {
    insertTransactionIfNew.mockResolvedValue({ data: [{ id: 'abc', inserted: true }], error: null });
    await enqueuePending(tx({ user_id: 'user-1' }));
    await enqueuePending(tx({ user_id: 'user-2' }));
    await flushPendingTransactions('user-1');
    const queue = JSON.parse(await AsyncStorage.getItem(QUEUE_KEY));
    expect(queue).toHaveLength(1);
    expect(queue[0].user_id).toBe('user-2');
    expect(insertTransactionIfNew).toHaveBeenCalledTimes(1);
  });
});

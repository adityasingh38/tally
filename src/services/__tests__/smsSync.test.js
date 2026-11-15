jest.mock('react-native-get-sms-android', () => ({ list: jest.fn() }));
jest.mock('../categoriser', () => ({
  categoriseTransactions: jest.fn(async txs => txs.map(tx => ({ ...tx, category: 'food' }))),
}));
jest.mock('../supabase', () => ({
  insertTransactions: jest.fn(),
  checkDuplicate: jest.fn().mockResolvedValue(false),
  insertTransactionIfNew: jest.fn(),
  supabase: { auth: { getSession: jest.fn() } },
}));
jest.mock('../budgetAlerts', () => ({ checkBudgetAlerts: jest.fn().mockResolvedValue() }));
jest.mock('../offlineQueue', () => ({ enqueuePending: jest.fn(), flushPendingTransactions: jest.fn() }));

import SmsAndroid from 'react-native-get-sms-android';
import { insertTransactions } from '../supabase';
import { categoriseTransactions } from '../categoriser';
import { syncHistoricalSMS } from '../smsSync';

const messages = JSON.stringify([{
  address: 'HDFCBK',
  body: 'Rs.500 debited from A/c XX1234 at AMAZON on 01-07-26',
  date: '1782864000000',
}]);

beforeEach(() => {
  SmsAndroid.list.mockReset();
  SmsAndroid.list.mockImplementation((options, onError, onSuccess) => onSuccess(1, messages));
  insertTransactions.mockReset();
});

it('counts an SMS only after the database insert succeeds', async () => {
  insertTransactions.mockResolvedValue({ error: null });
  const progress = jest.fn();
  await expect(syncHistoricalSMS('user-1', progress)).resolves.toEqual({ total: 1, inserted: 1 });
  expect(progress).toHaveBeenLastCalledWith({ total: 1, processed: 1, inserted: 1 });
  expect(insertTransactions).toHaveBeenCalledWith([
    expect.objectContaining({ account_bank_key: 'HDFC', account_last4: '1234' }),
  ]);
});

it('rejects a failed insert instead of reporting a successful import', async () => {
  insertTransactions.mockResolvedValue({ error: { message: 'network error' } });
  await expect(syncHistoricalSMS('user-1')).rejects.toMatchObject({ message: 'network error' });
});

it('persists a pending category instead of finalising an AI failure as other', async () => {
  categoriseTransactions.mockImplementationOnce(async txs => txs.map(tx => ({
    ...tx, category: 'other', category_status: 'pending',
  })));
  insertTransactions.mockResolvedValue({ error: null });
  await syncHistoricalSMS('user-1');
  expect(insertTransactions).toHaveBeenCalledWith([
    expect.objectContaining({ category: 'other', category_status: 'pending' }),
  ]);
});

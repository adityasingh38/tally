import { accountIdentityFromAlert, matchAccount, canAddAccount } from '../accounts';

describe('account identity from alerts', () => {
  it('extracts only the masked last four digits and canonical bank from SMS', () => {
    expect(accountIdentityFromAlert('A/c XX1234 debited by Rs.500', 'AD-HDFCBK-S'))
      .toEqual({ account_bank_key: 'HDFC', account_last4: '1234' });
  });

  it('finds the bank in a UPI notification when the app itself is not a bank', () => {
    expect(accountIdentityFromAlert('Paid Rs.500 from HDFC Bank card ending 9876', 'com.phonepe.app'))
      .toEqual({ account_bank_key: 'HDFC', account_last4: '9876' });
  });

  it('does not mistake a transaction amount or OTP for an account identifier', () => {
    expect(accountIdentityFromAlert('Rs.1234 debited via UPI. Ref 567890', 'com.phonepe.app'))
      .toEqual({ account_bank_key: null, account_last4: null });
  });
});

describe('account matching', () => {
  const accounts = [
    { id: 'hdfc', bank_key: 'HDFC', last4: '1234', label: 'salary' },
    { id: 'axis', bank_key: 'AXIS', last4: '1234', label: 'bills' },
  ];

  it('uses bank and last four digits when both are present', () => {
    expect(matchAccount({ account_bank_key: 'AXIS', account_last4: '1234' }, accounts)?.id).toBe('axis');
    expect(matchAccount({ account_bank_key: 'SBI', account_last4: '1234' }, accounts)).toBeNull();
  });

  it('does not guess when last four digits match more than one bank', () => {
    expect(matchAccount({ account_bank_key: null, account_last4: '1234' }, accounts)).toBeNull();
    expect(matchAccount({ account_bank_key: null, account_last4: '1234' }, [accounts[0]])?.id).toBe('hdfc');
  });

  it('allows one free label and additional Pro labels', () => {
    expect(canAddAccount([], false)).toBe(true);
    expect(canAddAccount(accounts, false)).toBe(false);
    expect(canAddAccount(accounts, true)).toBe(true);
  });
});

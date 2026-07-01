import { parseSMS, isBankSMS, looksLikeBankSMS, ruleBasedCategory } from '../smsParser';

describe('isBankSMS', () => {
  it('matches a known sender ID', () => {
    expect(isBankSMS('HDFCBK')).toBe(true);
    expect(isBankSMS('AD-HDFCBK-S')).toBe(true); // real sender IDs often have a prefix/suffix
  });
  it('rejects an unlisted sender', () => {
    expect(isBankSMS('FRIENDX')).toBe(false);
  });
  it('handles missing address', () => {
    expect(isBankSMS(null)).toBe(false);
    expect(isBankSMS(undefined)).toBe(false);
  });
});

describe('looksLikeBankSMS', () => {
  it('accepts unlisted-sender bank text with account marker + money keyword', () => {
    expect(looksLikeBankSMS('Your a/c XX1234 debited by Rs.500')).toBe(true);
  });
  it('rejects text with no account marker', () => {
    expect(looksLikeBankSMS('You spent Rs.500 on something')).toBe(false);
  });
  it('rejects text with account marker but no money keyword', () => {
    expect(looksLikeBankSMS('Your a/c statement is ready')).toBe(false);
  });
});

describe('parseSMS — amount extraction', () => {
  it('parses "Rs." prefix with comma grouping', () => {
    expect(parseSMS('Rs.1,250.50 debited from A/c XX1234 at AMAZON on 01-07-26', 'HDFCBK').amount).toBe(1250.50);
  });
  it('parses Indian-style double comma grouping', () => {
    expect(parseSMS('Rs.1,25,000.00 credited to your account by NEFT', 'HDFCBK').amount).toBe(125000);
  });
  it('parses INR prefix and ₹ symbol', () => {
    expect(parseSMS('INR 799 debited for Netflix subscription', 'HDFCBK').amount).toBe(799);
    expect(parseSMS('₹45 debited via UPI to swiggy@okhdfcbank', 'HDFCBK').amount).toBe(45);
  });
  it('parses amount-then-currency order', () => {
    expect(parseSMS('799 INR spent at STARBUCKS on your card', 'HDFCBK').amount).toBe(799);
  });
  it('ignores a balance/limit figure and picks the real transaction amount', () => {
    const r = parseSMS('Rs.500 debited at AMAZON. Avl Bal Rs.10,000', 'HDFCBK');
    expect(r.amount).toBe(500);
  });
  it('returns null when there is no amount at all', () => {
    expect(parseSMS('Your OTP is 123456, do not share it', 'HDFCBK')).toBe(null);
  });
});

describe('parseSMS — debit/credit classification', () => {
  it('classifies a plain debit', () => {
    expect(parseSMS('Rs.500 debited from A/c XX1234 at AMAZON on 01-07-26', 'HDFCBK').type).toBe('debit');
  });
  it('classifies a plain credit', () => {
    expect(parseSMS('Rs.5000 credited to A/c XX1234 by NEFT on 01-07-26', 'HDFCBK').type).toBe('credit');
  });
  it('returns null (not a posted txn) when there is no debit/credit keyword — e.g. balance enquiry', () => {
    expect(parseSMS('Your A/c XX1234 Avl Bal is Rs.10,000 as of 01-07-26', 'HDFCBK')).toBe(null);
  });

  // Regression test for the bug fixed this session: a credit-card *charge*
  // SMS with a boilerplate "refund will be credited" disclaimer was being
  // filed as income instead of a real debit, because the tie-break regex
  // didn't recognise "charged" as a debit verb.
  it('regression: a card charge with a "credited" disclaimer clause is still a debit', () => {
    const r = parseSMS(
      'Your HDFC Credit Card XX1234 has been charged Rs.2,500.00 at AMAZON on 01-07-26. In case of dispute, refund will be credited to your card.',
      'HDFCBK'
    );
    expect(r.type).toBe('debit');
    expect(r.amount).toBe(2500);
  });

  it('the explicit-debit-verb tie-break also covers the original "debited...credited" case', () => {
    const r = parseSMS('Rs.500 debited from A/c XX1234; MERCHANT credited Rs.500 on 01-07-26', 'HDFCBK');
    expect(r.type).toBe('debit');
  });
});

describe('parseSMS — merchant extraction', () => {
  it('extracts a VPA handle merchant name', () => {
    expect(parseSMS('Rs.100 debited via UPI to bigbasket@okhdfcbank on 01-07-26', 'HDFCBK').merchant).toBe('Bigbasket');
  });
  it('extracts "at MERCHANT" for card POS', () => {
    expect(parseSMS('Rs.500 debited at STARBUCKS on your card ending 1234', 'HDFCBK').merchant).toBe('STARBUCKS');
  });
  it('extracts "to MERCHANT" for a transfer', () => {
    expect(parseSMS('Rs.500 sent to John Doe via UPI on 01-07-26', 'HDFCBK').merchant).toBe('John Doe');
  });
  it('falls back to "Unknown" and flags for AI categorisation when no merchant pattern matches', () => {
    const r = parseSMS('Rs.500 debited from your account on 01-07-26', 'HDFCBK');
    expect(r.merchant).toBe('Unknown');
    expect(r.needs_ai_categorisation).toBe(true);
  });
});

describe('parseSMS — non-transactional filtering', () => {
  it('ignores OTP messages', () => {
    expect(parseSMS('123456 is your OTP for Rs.500 transaction. Do not share.', 'HDFCBK')).toBe(null);
  });
  it('ignores promotional messages even with a rupee amount', () => {
    expect(parseSMS('Get flat Rs.500 off on your next order! Shop now: http://example.com', 'HDFCBK')).toBe(null);
  });
  it('ignores a "will be debited" reminder (not yet posted)', () => {
    expect(parseSMS('Rs.500 will be debited for your EMI on 05-07-26', 'HDFCBK')).toBe(null);
  });
});

describe('ruleBasedCategory', () => {
  it('categorises food merchants', () => {
    expect(ruleBasedCategory('Swiggy', '')).toBe('food');
  });
  it('categorises transport merchants', () => {
    expect(ruleBasedCategory('Uber', '')).toBe('transport');
  });
  it('returns null when nothing matches (falls through to AI)', () => {
    expect(ruleBasedCategory('Some Random Shop', '')).toBe(null);
  });
});

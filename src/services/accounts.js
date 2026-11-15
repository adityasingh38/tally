// Account grouping uses only a bank name and the last four digits shown in an
// alert. A card number is never requested or stored.
export const BANKS = [
  { key: 'HDFC', label: 'HDFC Bank', hints: ['HDFC', 'HDFCBK', 'com.snapwork.hdfc'] },
  { key: 'ICICI', label: 'ICICI Bank', hints: ['ICICI', 'ICICIB', 'com.csam.icici'] },
  { key: 'SBI', label: 'State Bank of India', hints: ['SBI', 'SBIN', 'com.sbi.'] },
  { key: 'AXIS', label: 'Axis Bank', hints: ['AXIS', 'com.axis.mobile'] },
  { key: 'KOTAK', label: 'Kotak Bank', hints: ['KOTAK', 'com.msf.kbank'] },
  { key: 'IDFC', label: 'IDFC FIRST Bank', hints: ['IDFC', 'com.idfcfirstbank'] },
  { key: 'BOB', label: 'Bank of Baroda', hints: ['BOB', 'BARODA', 'com.bankofbaroda'] },
  { key: 'PNB', label: 'Punjab National Bank', hints: ['PNB', 'PUNJAB NATIONAL', 'com.fss.pnbpsp'] },
  { key: 'YES', label: 'YES Bank', hints: ['YESBANK', 'YES BANK', 'com.yesbank'] },
  { key: 'RBL', label: 'RBL Bank', hints: ['RBL', 'com.rbl.'] },
  { key: 'FEDERAL', label: 'Federal Bank', hints: ['FEDERAL', 'com.federalbank'] },
  { key: 'INDUSIND', label: 'IndusInd Bank', hints: ['INDUSIND'] },
  { key: 'CANARA', label: 'Canara Bank', hints: ['CANARA'] },
  { key: 'UNION', label: 'Union Bank of India', hints: ['UNION BANK', 'UNIONBK'] },
  { key: 'AU', label: 'AU Small Finance Bank', hints: ['AUBANK', 'AU BANK', 'com.aubank'] },
];

const LAST4_RE = /\b(?:a\/c|acct|account|card)\s*(?:no\.?|number|ending(?: in)?|ends? in)?\s*[:#-]?\s*(?:[xX*•]{2,}[\s-]*)?(\d{4})(?!\d)/i;

function hintMatches(text, hint) {
  const upper = text.toUpperCase();
  const token = hint.toUpperCase();
  if (token.startsWith('COM.')) return upper.includes(token);
  return new RegExp(`(?:^|[^A-Z])${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^A-Z])`).test(upper);
}

export function bankKeyFromAlert(source, body = '') {
  const upperSource = (source || '').toUpperCase();
  const sourceMatch = BANKS.find(bank => bank.hints.some(hint => upperSource.includes(hint.toUpperCase())));
  if (sourceMatch) return sourceMatch.key;
  const bodyMatch = BANKS.find(bank => bank.hints.some(hint => !hint.startsWith('com.') && hintMatches(body, hint)));
  return bodyMatch?.key || null;
}

export function accountIdentityFromAlert(body, source) {
  const last4 = body?.match(LAST4_RE)?.[1] || null;
  return {
    account_bank_key: last4 ? bankKeyFromAlert(source, body) : null,
    account_last4: last4,
  };
}

export function matchAccount(tx, accounts) {
  if (!tx?.account_last4) return null;
  const candidates = accounts.filter(account => account.last4 === tx.account_last4);
  if (tx.account_bank_key) {
    return candidates.find(account => account.bank_key === tx.account_bank_key) || null;
  }
  return candidates.length === 1 ? candidates[0] : null;
}

export function canAddAccount(accounts, isPremium) {
  return isPremium || accounts.length < 1;
}

import { BANK_SENDER_IDS } from '../constants';

// Amount in either order: "Rs.1,250.50" / "INR 200" / "₹45" / "799 INR".
const AMOUNT_RE = /(?:Rs\.?|INR|₹)\s*(\d[\d,]*(?:\.\d{1,2})?)|(?<![A-Za-z0-9])(\d[\d,]*(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/gi;

// Past-tense, money-moved keywords. "cashback"/"added" deliberately excluded —
// they appear in promos far more than in real credits (real ones say "credited").
const DEBIT_KEYWORDS = /\b(debited|debit|spent|sent|paid|withdrawn|deducted|purchase|charged)\b/i;
const CREDIT_KEYWORDS = /\b(credited|received|refunded|refund|deposited|deposit)\b/i;

// Looks-like-money-but-not-a-posted-transaction. Note: balance-enquiry SMS are
// caught by the "must have a debit/credit keyword" gate, NOT here, because real
// transactions also contain "Avl Bal".
const IGNORE_RE = /\b(otp|one[\s-]?time\s?password|verification code|is your code|declined|failed|unsuccessful|reversed|will be debited|is due|due (?:on|by)|e-?mandate|mandate|reminder|statement generated|min(?:imum)? amount due)\b/i;

// Marketing / non-transactional.
const PROMO_RE = /(https?:\/\/|www\.|click here|shop now|buy now|order now|apply now|% off|flat\s+(?:rs|inr)|upto|coupon|\boffer\b|\bsale\b|t&c|\bwin\b|congratulations|\bearn\b)/i;

const MERCHANT_STOPWORDS = new Set([
  'on', 'ref', 'your', 'the', 'a', 'ac', 'a/c', 'upi', 'vpa', 'info', 'txn', 'dt',
  'bank', 'card', 'no', 'rs', 'inr', 'credited', 'debited', 'via', 'using', 'avl', 'avbl',
]);

export function isBankSMS(address) {
  if (!address) return false;
  const upper = address.toUpperCase();
  return BANK_SENDER_IDS.some(id => upper.includes(id));
}

// Fallback for bank SMS from sender IDs not in our list: a money-movement
// keyword plus an account/card/UPI marker. parseSMS still gatekeeps the rest.
export function looksLikeBankSMS(body) {
  if (!body) return false;
  const hasAcctMarker = /\b(a\/c|acct|account|card|upi|vpa|wallet|bank)\b/i.test(body);
  return hasAcctMarker && (DEBIT_KEYWORDS.test(body) || CREDIT_KEYWORDS.test(body));
}

export function parseSMS(smsBody, address) {
  if (!smsBody) return null;
  if (IGNORE_RE.test(smsBody)) return null;
  if (PROMO_RE.test(smsBody)) return null;

  const amount = extractAmount(smsBody);
  if (!amount) return null;

  const type = extractType(smsBody);
  if (!type) return null; // no debit/credit keyword => not a posted txn (balance enquiry etc.)

  const merchant = extractMerchant(smsBody);
  const merchantTail = merchant ? merchant.slice(-4).toLowerCase() : '';

  return {
    amount,
    type,
    merchant: merchant || 'Unknown',
    merchant_tail: merchantTail,
    source: address,
    raw_sms: smsBody,
    needs_ai_categorisation: !merchant,
  };
}

function extractAmount(body) {
  const matches = [...body.matchAll(AMOUNT_RE)];
  const candidates = [];
  for (const m of matches) {
    const raw = m[1] ?? m[2];
    if (!raw) continue;
    const num = parseFloat(raw.replace(/,/g, ''));
    if (isNaN(num) || num <= 0) continue;
    // Skip digit runs glued to another token (e.g. card "XX1234 INR ...").
    const prevChar = body[m.index - 1];
    if (prevChar && /[A-Za-z0-9]/.test(prevChar)) continue;
    // Skip amounts that are a balance/limit, not the transaction value.
    const pre = body.slice(Math.max(0, m.index - 16), m.index).toLowerCase();
    const isBalance = /bal|avl|avbl|limit|\blmt\b|available/.test(pre);
    candidates.push({ num, isBalance });
  }
  if (candidates.length === 0) return null;
  const txn = candidates.find(c => !c.isBalance);
  return txn ? txn.num : candidates[0].num;
}

function extractType(body) {
  const debit = DEBIT_KEYWORDS.test(body);
  const credit = CREDIT_KEYWORDS.test(body);
  if (debit && !credit) return 'debit';
  if (credit && !debit) return 'credit';
  if (debit && credit) {
    // Both present (e.g. "A/c debited ... MERCHANT credited"). The user-side
    // action is the debit, so it wins when an explicit debit verb is present.
    return /\b(debited|spent|sent|paid|withdrawn|deducted|purchase)\b/i.test(body) ? 'debit' : 'credit';
  }
  return null;
}

const MERCHANT_BOUNDARY = '(?=\\s+(?:on|ref|avl|avbl|txn|dt|using|info|via|upi|not|call|to\\s+block)\\b|[.,;:\\n]|\\s+\\d|$)';
const MERCHANT_CHARS = "[A-Za-z][A-Za-z0-9&'.\\- ]{1,28}?";

const MERCHANT_PATTERNS = [
  // VPA / UPI handle: capture the name before @bank.
  /(?:to|from|vpa|:)\s*([a-z0-9][a-z0-9._-]+)@[a-z]{2,}/i,
  // Card POS: "at MERCHANT".
  new RegExp(`\\bat\\s+(${MERCHANT_CHARS})${MERCHANT_BOUNDARY}`, 'i'),
  // UPI/transfer: "to MERCHANT".
  new RegExp(`\\bto\\s+(${MERCHANT_CHARS})${MERCHANT_BOUNDARY}`, 'i'),
  // "MERCHANT credited" (payee side of a debit).
  /[;,]\s*([A-Za-z][A-Za-z0-9&'.\- ]{1,28}?)\s+credited\b/i,
  // Bare merchant between amount and date: "INR 799 NETFLIX 05-06-26".
  /\d\s+([A-Z][A-Za-z&'.\- ]{1,20}?)\s+\d{1,2}[-/]/,
];

function extractMerchant(body) {
  for (const pattern of MERCHANT_PATTERNS) {
    const match = body.match(pattern);
    if (!match || !match[1]) continue;
    const cleaned = cleanMerchant(match[1]);
    if (cleaned) return cleaned;
  }
  return null;
}

function cleanMerchant(raw) {
  let s = raw.replace(/[._]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/^[^A-Za-z]+|[^A-Za-z0-9]+$/g, '').trim();
  if (s.length < 2) return null;
  if (/^\d+$/.test(s)) return null;
  if (MERCHANT_STOPWORDS.has(s.toLowerCase())) return null;
  // Title-case all-lowercase VPA handles (bigbasket -> Bigbasket); leave others.
  if (s === s.toLowerCase()) s = s.replace(/\b\w/g, c => c.toUpperCase());
  return s;
}

export function ruleBasedCategory(merchant, smsBody) {
  const text = `${merchant} ${smsBody}`.toLowerCase();

  if (/swiggy|zomato|food|restaurant|cafe|hotel|mcd|kfc|domino|pizza|burger|biryani|chai|coffee|starbucks/.test(text)) return 'food';
  if (/uber|ola|rapido|metro|bus|auto|train|irctc|makemytrip|goibibo|flight|airline/.test(text)) return 'transport';
  if (/amazon|flipkart|myntra|ajio|meesho|shopping|mall|store|market|bigbasket|blinkit|zepto/.test(text)) return 'shopping';
  if (/netflix|prime|spotify|hotstar|zee5|cinema|movie|game|pvr/.test(text)) return 'entertainment';
  if (/hospital|clinic|pharmacy|medplus|apollo|doctor|health|medicine|lab|diagnostic/.test(text)) return 'health';
  if (/electricity|water|gas|internet|broadband|recharge|mobile|jio|airtel|vi|bill|utility/.test(text)) return 'utilities';
  if (/rent|housing|maintenance|society|apartment/.test(text)) return 'rent';
  if (/mutual fund|sip|zerodha|groww|investment|stocks|mf|nps/.test(text)) return 'investment';
  if (/neft|imps|rtgs|transfer/.test(text)) return 'transfer';

  return null;
}

import { BANK_SENDER_IDS } from '../constants';

const AMOUNT_PATTERNS = [
  /(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:Rs\.?|INR|₹)/i,
];

const DEBIT_KEYWORDS = /\b(debited|deducted|spent|paid|payment|purchase|withdrawn|debit|sent)\b/i;
const CREDIT_KEYWORDS = /\b(credited|received|credit|refund|cashback|added)\b/i;

const UPI_MERCHANT = /(?:UPI|VPA)[\/\s\-:]+(?:[A-Z0-9]+[\/\-])?([A-Za-z0-9\s]+?)(?:[\/\-@]|$)/i;
const POS_MERCHANT = /(?:POS|purchase at|at)\s+([A-Za-z0-9\s&'.\-]{3,30})/i;
const TO_MERCHANT = /(?:to|To)\s+([A-Za-z0-9\s&'.\-]{3,30}?)(?:\s+(?:on|via|for|UPI|Ref)|$)/i;

export function isBankSMS(address) {
  if (!address) return false;
  const upper = address.toUpperCase();
  return BANK_SENDER_IDS.some(id => upper.includes(id));
}

export function parseSMS(smsBody, address) {
  const amount = extractAmount(smsBody);
  if (!amount) return null;

  const type = extractType(smsBody);
  const merchant = extractMerchant(smsBody);
  const merchantTail = merchant ? merchant.slice(-4).toLowerCase() : '';

  return {
    amount,
    type,
    merchant: merchant || 'Unknown',
    merchant_tail: merchantTail,
    source: address,
    raw_sms: smsBody,
    needs_ai_categorisation: !merchant || merchant === 'Unknown',
  };
}

function extractAmount(body) {
  for (const pattern of AMOUNT_PATTERNS) {
    const match = body.match(pattern);
    if (match) {
      const cleaned = match[1].replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) return num;
    }
  }
  return null;
}

function extractType(body) {
  if (DEBIT_KEYWORDS.test(body)) return 'debit';
  if (CREDIT_KEYWORDS.test(body)) return 'credit';
  // fallback: if "to" appears before amount it's usually a debit
  return 'debit';
}

function extractMerchant(body) {
  const patterns = [UPI_MERCHANT, POS_MERCHANT, TO_MERCHANT];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1].trim().replace(/\s+/g, ' ');
    }
  }
  return null;
}

export function ruleBasedCategory(merchant, smsBody) {
  const text = `${merchant} ${smsBody}`.toLowerCase();

  if (/swiggy|zomato|food|restaurant|cafe|hotel|mcd|kfc|domino|pizza|burger|biryani|chai|coffee|starbucks/.test(text)) return 'food';
  if (/uber|ola|rapido|metro|bus|auto|train|irctc|makemytrip|goibibo|flight|airline/.test(text)) return 'transport';
  if (/amazon|flipkart|myntra|ajio|meesho|shopping|mall|store|market/.test(text)) return 'shopping';
  if (/netflix|prime|spotify|hotstar|zee5|cinema|movie|game|pvr/.test(text)) return 'entertainment';
  if (/hospital|clinic|pharmacy|medplus|apollo|doctor|health|medicine|lab|diagnostic/.test(text)) return 'health';
  if (/electricity|water|gas|internet|broadband|recharge|mobile|jio|airtel|vi|bill|utility/.test(text)) return 'utilities';
  if (/rent|housing|maintenance|society|apartment/.test(text)) return 'rent';
  if (/mutual fund|sip|zerodha|groww|investment|stocks|mf|nps/.test(text)) return 'investment';
  if (/neft|imps|rtgs|transfer/.test(text)) return 'transfer';

  return null;
}

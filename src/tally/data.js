// src/tally/data.js
// Category metadata (keyed to YOUR category ids), the AI "voice", cope zones,
// derive helpers, and demo seed data used as a fallback when there are no real txs.
import { fmtINR } from './theme';

export const INCOME = 65000;        // monthly income used for the cope ratio
export const HIST = [38200, 42600, 47100]; // previous 3 months (the trajectory)
export const LAST_MONTH = 47100;
export const PAYDAY_IN = 6;         // days to payday (for "left to burn / day")

// Maps to the ids already in your constants/CATEGORIES.
export const CAT_META = {
  food:          { tag: 'FOOD', label: 'Food & Swiggy' },
  transport:     { tag: 'MOVE', label: 'Cabs & autos' },
  shopping:      { tag: 'SHOP', label: 'Shopping' },
  entertainment: { tag: 'FUN',  label: 'Going out' },
  health:        { tag: 'HLTH', label: 'Health (lol)' },
  utilities:     { tag: 'BILLS',label: 'Bills' },
  rent:          { tag: 'RNT',  label: 'Rent' },
  transfer:      { tag: 'XFER', label: 'Transfers' },
  investment:    { tag: 'INVT', label: 'Investment' },
  other:         { tag: 'MISC', label: 'Other' },
};
export const catMeta = (id) => CAT_META[id] || CAT_META.other;

// Per-category "delusion" (budget) limits.
export const DELUSIONS = {
  rent: 18000, food: 6000, shopping: 4000, entertainment: 3000,
  utilities: 1500, transport: 2000, health: 2500,
};

export const REACTIONS = ['💀', '😭', '🫡', '📉', '🔥'];

// ---------- demo seed (fallback when no real transactions) ----------
// Shape matches yours: { merchant, amount, type, category, txn_date }
export const SEED_TXS = [
  { id: 't1',  merchant: 'Swiggy Instamart', amount: 487,  type: 'debit',  category: 'food',          when: '2h ago', note: 'the 3rd order today', sms: true },
  { id: 't2',  merchant: 'BookMyShow',       amount: 920,  type: 'debit',  category: 'entertainment', when: "y'day",  note: 'F1 tickets, solo', sms: true },
  { id: 't3',  merchant: 'Zepto',            amount: 312,  type: 'debit',  category: 'food',          when: "y'day",  note: '1 maggi, 1 redbull', sms: true },
  { id: 't4',  merchant: 'Myntra',           amount: 2750, type: 'debit',  category: 'shopping',      when: '2 days', note: 'the cart finally won', sms: true },
  { id: 't5',  merchant: 'Uber',             amount: 218,  type: 'debit',  category: 'transport',     when: '3 days', note: '1.2km. it was raining', sms: true },
  { id: 't6',  merchant: 'Cult.fit',         amount: 1499, type: 'debit',  category: 'health',        when: '5 days', note: '0 visits so far', sms: true },
  { id: 't7',  merchant: 'Starbucks',        amount: 465,  type: 'debit',  category: 'food',          when: '5 days', note: 'for the wifi', sms: true },
  { id: 't8',  merchant: 'Steam',            amount: 1099, type: 'debit',  category: 'entertainment', when: '1 wk',   note: "won't play it", sms: true },
  { id: 't9',  merchant: 'Zomato',           amount: 642,  type: 'debit',  category: 'food',          when: '1 wk',   note: '2am biryani', sms: true },
  { id: 't10', merchant: 'Amazon',           amount: 2199, type: 'debit',  category: 'shopping',      when: '1 wk',   note: 'need? no. want? yes', sms: true },
  { id: 't11', merchant: 'Blinkit',          amount: 540,  type: 'debit',  category: 'food',          when: '1 wk',   note: '₹540 of snacks', sms: true },
  { id: 't12', merchant: 'Netflix',          amount: 649,  type: 'debit',  category: 'utilities',     when: '1 wk',   note: "haven't opened it", sms: true },
  { id: 't13', merchant: 'Nykaa',            amount: 1860, type: 'debit',  category: 'shopping',      when: '2 wks',  note: 'self care, allegedly', sms: true },
  { id: 't14', merchant: 'MakeMyTrip',       amount: 3200, type: 'debit',  category: 'entertainment', when: '2 wks',  note: 'goa. for the plot', sms: true },
  { id: 't15', merchant: 'Apple Store',      amount: 4999, type: 'debit',  category: 'shopping',      when: '2 wks',  note: 'the airpods broke', sms: true },
  { id: 't16', merchant: 'Landlord',         amount: 18000,type: 'debit',  category: 'rent',          when: 'Jun 1',  note: 'the monthly heist', sms: true },
  { id: 't17', merchant: 'iCloud',           amount: 75,   type: 'debit',  category: 'utilities',     when: 'Jun 1',  note: '50GB of screenshots', sms: true },
  { id: 't18', merchant: 'Salary',           amount: 65000,type: 'credit', category: 'transfer',      when: 'Jun 1',  note: 'gone by the 9th', sms: true },
];

export const STREAK_BROKE_DAYS = 9;

// ---------- derive helpers (work on YOUR tx shape) ----------
const isSpend = (t) => t.type !== 'credit';
export function totalSpent(txs) { return txs.filter(isSpend).reduce((a, t) => a + Number(t.amount || 0), 0); }
export function groupByCat(txs) {
  const g = {};
  txs.filter(isSpend).forEach((t) => { g[t.category] = (g[t.category] || 0) + Number(t.amount || 0); });
  return Object.keys(g)
    .map((id) => ({ id, amount: g[id], ...catMeta(id) }))
    .sort((a, b) => b.amount - a.amount);
}
export const monthTotals = (total) => [...HIST, total];
export const safeToSpend = (txs) => Math.max(0, INCOME - totalSpent(txs));

// ---------- the voice ----------
export const VOICE = {
  dry: [
    { big: 'FOOD',  line: '₹12,400 on food. You ate the rent, basically.', sub: "that's 24% of everything" },
    { big: 'SWIGGY',line: 'Swiggy saw you more than your friends did this month.', sub: '31 orders' },
    { big: 'TREND', line: 'Spending up 10% on last month. Consistent, if nothing else.', sub: '+₹4,740' },
    { big: 'SUBS',  line: '₹2,540 on subscriptions you forgot you had.', sub: '4 of 6 unused' },
  ],
  unhinged: [
    { big: 'FOOD', line: "₹4,200 on Swiggy alone. you don't have a kitchen, you have a charging dock.", sub: 'cook once. as a treat.' },
    { big: 'RENT', line: '₹18k for a room you only sleep in. shelter is a scam but ok king 🫡', sub: '28% of income, gone' },
    { big: 'DOOM', line: "you spent 80% of your income. the other 20% is also gone, you just don't know it yet.", sub: '₹1,130 to payday' },
    { big: 'GYM',  line: '₹1,499 to Cult.fit. 0 visits. you bought the *idea* of being healthy.', sub: 'the dream lives' },
  ],
};
export function verdictsFor(tone, nihil) {
  return (VOICE[tone] || VOICE.dry).slice(0, (nihil || 2) + 1);
}

const COPE_ZONES = [
  { max: 0.45, label: 'locked in',         note: 'genuinely who is this' },
  { max: 0.65, label: 'coping',            note: 'holding it together. barely.' },
  { max: 0.85, label: 'spiraling',         note: 'the vibes are recession-core' },
  { max: 2.0,  label: 'financially feral', note: 'respectfully, what are you doing' },
];
export function copeZone(ratio) {
  return COPE_ZONES.find((z) => ratio <= z.max) || COPE_ZONES[COPE_ZONES.length - 1];
}
export function damageVerdict(nihil) {
  if (nihil <= 1) return 'could be worse. could be better. mostly worse.';
  if (nihil === 2) return "it's giving 'declined'. respectfully.";
  return "you're not broke, you're pre-rich. (you're broke.)";
}

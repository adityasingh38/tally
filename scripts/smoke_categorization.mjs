// Live smoke test using a disposable Auth user and a synthetic transaction.
// Run explicitly with --live; the account is deleted in finally.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

if (!process.argv.includes('--live')) {
  console.error('Pass --live to create a disposable test user and call the deployed AI function.');
  process.exit(2);
}

const config = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url)));
const { SUPABASE_URL: base, SUPABASE_ANON_KEY: key } = config.build.production.env;
const email = `tally-smoke-${randomUUID()}@example.com`;
const password = randomUUID() + 'aA1!';
let token;

async function request(path, body, auth = key) {
  console.log(`[smoke] Requesting ${path}...`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const resBody = await response.json();
    console.log(`[smoke] ${path} returned HTTP ${response.status}`);
    return { status: response.status, body: resBody };
  } finally {
    clearTimeout(timer);
  }
}

try {
  const signup = await request('/auth/v1/signup', { email, password });
  token = signup.body.access_token;
  if (!token) throw new Error(`Signup returned ${signup.status} without a session; cleanup required for ${email}`);

  const cases = [
    { merchant: 'Kaveri Kitchen', sms: 'Rs.420 paid for dinner at Kaveri Kitchen', expected: 'food' },
    { merchant: 'Greenline Cab', sms: 'Rs.280 paid for a cab ride', expected: 'transport' },
    { merchant: 'Stationery Corner', sms: 'Rs.350 paid for notebooks and pens', expected: 'shopping' },
    { merchant: 'Silver Screen', sms: 'Rs.600 paid for movie tickets', expected: 'entertainment' },
    { merchant: 'Medico Pharmacy', sms: 'Rs.220 paid for medicine', expected: 'health' },
    { merchant: 'City Power', sms: 'Rs.1200 paid for electricity bill', expected: 'utilities' },
    { merchant: 'Maple Residency', sms: 'Rs.18000 paid for monthly apartment rent', expected: 'rent' },
    { merchant: 'Riya Sharma', sms: 'Rs.800 transferred via UPI to a friend', expected: 'transfer' },
    { merchant: 'Index Fund House', sms: 'Rs.2000 paid for mutual fund SIP investment', expected: 'investment' },
  ];
  const result = await request('/functions/v1/anthropic-proxy', {
    kind: 'categorization',
    transactions: cases.map(({ merchant, sms }) => ({ merchant, sms })),
  }, token);
  if (result.status !== 200) throw new Error(`Categorisation returned HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  const categories = JSON.parse(result.body.text);
  const allowed = new Set(['food', 'transport', 'shopping', 'entertainment', 'health', 'utilities', 'rent', 'transfer', 'investment', 'other']);
  if (!Array.isArray(categories) || categories.length !== cases.length ||
      categories.some((row, index) => row?.index !== index ||
        !allowed.has(row.category) || !Number.isFinite(row.confidence))) {
    throw new Error(`Unexpected category response: ${JSON.stringify(categories)}`);
  }
  const mismatches = categories.flatMap((row, index) =>
    row.category === cases[index].expected ? [] :
      [`${index + 1}: expected ${cases[index].expected}, received ${row.category}`]);
  console.log(`Live categorisation: ${cases.length - mismatches.length}/${cases.length} expected categories`);
  if (mismatches.length) throw new Error(`Category mismatches: ${mismatches.join('; ')}`);
} finally {
  if (token) {
    const deleted = await request('/functions/v1/delete-account', {}, token);
    console.log(`Disposable account cleanup: HTTP ${deleted.status}`);
    if (deleted.status !== 200) {
      console.error(`Cleanup required for ${email}`);
      process.exitCode = 1;
    }
  }
}

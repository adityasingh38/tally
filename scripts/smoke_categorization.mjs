// Live smoke test using a disposable Auth user and a synthetic transaction.
// Run explicitly with --live; the account is deleted in finally.
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

if (!process.argv.includes('--live')) {
  console.error('Pass --live to create a disposable test user and call Anthropic.');
  process.exit(2);
}

const config = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url)));
const { SUPABASE_URL: base, SUPABASE_ANON_KEY: key } = config.build.production.env;
const email = `tally-smoke-${randomUUID()}@example.com`;
const password = randomUUID() + 'aA1!';
let token;

async function request(path, body, auth = key) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

try {
  const signup = await request('/auth/v1/signup', { email, password });
  token = signup.body.access_token;
  if (!token) throw new Error(`Signup returned ${signup.status} without a session; cleanup required for ${email}`);

  const result = await request('/functions/v1/anthropic-proxy', {
    kind: 'categorization',
    transactions: [{ merchant: 'Mystery Shop', sms: 'Rs.200 debited at Mystery Shop' }],
  }, token);
  if (result.status !== 200) throw new Error(`Categorisation returned HTTP ${result.status}: ${JSON.stringify(result.body)}`);
  const categories = JSON.parse(result.body.text);
  const allowed = new Set(['food', 'transport', 'shopping', 'entertainment', 'health', 'utilities', 'rent', 'transfer', 'investment', 'other']);
  if (!Array.isArray(categories) || categories[0]?.index !== 0 || !allowed.has(categories[0]?.category)) {
    throw new Error(`Unexpected category response: ${JSON.stringify(categories)}`);
  }
  console.log(`Live categorisation succeeded: ${categories[0].category}`);
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

// Adds one free account label per user; further labels require a verified
// RevenueCat Tally Pro entitlement. Full card numbers are never accepted.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { hasProEntitlement, revenueCatConfigured } from '../_shared/revenuecat.ts';

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const BANK_KEYS = new Set([
  'HDFC', 'ICICI', 'SBI', 'AXIS', 'KOTAK', 'IDFC', 'BOB', 'PNB',
  'YES', 'RBL', 'FEDERAL', 'INDUSIND', 'CANARA', 'UNION', 'AU',
]);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { bank_key?: unknown; last4?: unknown; label?: unknown };
  try { body = await req.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const bankKey = typeof body.bank_key === 'string' ? body.bank_key.trim().toUpperCase() : '';
  const last4 = typeof body.last4 === 'string' ? body.last4.trim() : '';
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!BANK_KEYS.has(bankKey) || !/^\d{4}$/.test(last4) || label.length < 1 || label.length > 60) {
    return Response.json({ error: 'Choose a supported bank, four digits and a short label' }, { status: 400 });
  }

  const { count, error: countError } = await admin.from('account_profiles')
    .select('id', { head: true, count: 'exact' }).eq('user_id', user.id);
  if (countError) return Response.json({ error: 'Account labels unavailable' }, { status: 500 });

  let isPro = false;
  if ((count || 0) >= 1) {
    if (!revenueCatConfigured()) {
      return Response.json({ error: 'Pro verification is not configured' }, { status: 503 });
    }
    try { isPro = await hasProEntitlement(user.id); }
    catch { return Response.json({ error: 'Subscription check unavailable' }, { status: 503 }); }
    if (!isPro) return Response.json({ error: 'Tally Pro is required for more account labels' }, { status: 403 });
  }

  const { data: id, error } = await admin.rpc('create_account_profile', {
    p_user_id: user.id,
    p_bank_key: bankKey,
    p_last4: last4,
    p_label: label,
    p_is_pro: isPro,
  });
  if (error) {
    const status = error.message.includes('FREE_ACCOUNT_LIMIT') ? 403
      : error.code === '23505' ? 409 : 500;
    return Response.json({ error: status === 403 ? 'Tally Pro is required for more account labels'
      : status === 409 ? 'This account label already exists' : 'Could not add account label' }, { status });
  }
  const { data: profile, error: readError } = await admin.from('account_profiles')
    .select('id, bank_key, last4, label').eq('id', id).single();
  if (readError) return Response.json({ error: 'Account label created but could not be loaded' }, { status: 500 });
  return Response.json(profile, { status: 201 });
});

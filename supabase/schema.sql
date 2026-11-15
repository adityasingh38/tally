-- Run this in Supabase SQL editor to set up Tally's schema

-- Transactions table
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null,
  type text not null check (type in ('debit', 'credit')),
  merchant text not null,
  merchant_tail text,
  category text not null default 'other',
  source text,
  account_bank_key text,
  account_last4 text check (account_last4 is null or account_last4 ~ '^[0-9]{4}$'),
  category_status text not null default 'done' check (category_status in ('done', 'pending', 'review')),
  category_attempts integer not null default 0 check (category_attempts between 0 and 4),
  category_retry_at timestamptz not null default now(),
  txn_date timestamptz not null,
  created_at timestamptz default now()
);

-- Privacy: raw SMS bodies are never persisted. Used only in-memory at parse/
-- categorise time. Drop the column if an older schema created it.
alter table transactions drop column if exists raw_sms;

-- Optional note/label on a transaction (manually added or recategorisation note).
alter table transactions add column if not exists note text;
alter table transactions add column if not exists account_bank_key text;
alter table transactions add column if not exists account_last4 text;
alter table transactions add column if not exists category_status text not null default 'done';
alter table transactions add column if not exists category_attempts integer not null default 0;
alter table transactions add column if not exists category_retry_at timestamptz not null default now();

-- Index for fast per-user queries
create index if not exists idx_transactions_user_date on transactions(user_id, txn_date desc);
create index if not exists idx_transactions_user_category on transactions(user_id, category);

-- Dedup index
create index if not exists idx_transactions_dedup on transactions(user_id, amount, merchant_tail, txn_date);
create index if not exists idx_transactions_account_identity on transactions(user_id, account_bank_key, account_last4);
create index if not exists idx_transactions_category_retry on transactions(user_id, category_retry_at)
  where category_status = 'pending';

-- Budgets table
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  monthly_limit numeric(12, 2) not null,
  alert_threshold numeric(3, 2) default 0.8,
  created_at timestamptz default now(),
  unique(user_id, category)
);

create table if not exists account_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_key text not null check (bank_key ~ '^[A-Z]{2,20}$'),
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  label text not null check (char_length(label) between 1 and 60),
  created_at timestamptz not null default now(),
  unique(user_id, bank_key, last4)
);

-- Row Level Security
alter table transactions enable row level security;
alter table budgets enable row level security;
alter table account_profiles enable row level security;

drop policy if exists "Users see own transactions" on transactions;
create policy "Users see own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users see own budgets" on budgets;
create policy "Users see own budgets"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own account profiles" on account_profiles;
create policy "Users read own account profiles" on account_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users create own account profiles" on account_profiles;
drop policy if exists "Users update own account profiles" on account_profiles;
drop policy if exists "Users delete own account profiles" on account_profiles;
create policy "Users delete own account profiles" on account_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke insert, update on account_profiles from authenticated, anon;
grant select, delete on account_profiles to authenticated;

create or replace function create_account_profile(
  p_user_id uuid, p_bank_key text, p_last4 text, p_label text, p_is_pro boolean
)
returns uuid
language plpgsql
security invoker
as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if not p_is_pro and (select count(*) from account_profiles where user_id = p_user_id) >= 1 then
    raise exception 'FREE_ACCOUNT_LIMIT';
  end if;
  insert into account_profiles (user_id, bank_key, last4, label)
  values (p_user_id, p_bank_key, p_last4, p_label)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function create_account_profile(uuid, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function create_account_profile(uuid, text, text, text, boolean)
  to service_role;

-- Monthly spending summary view (used by Insights screen)
create or replace view spending_by_month
  with (security_invoker = true) as
select
  user_id,
  date_trunc('month', txn_date) as month,
  category,
  sum(amount) as total
from transactions
where type = 'debit'
group by user_id, month, category;

-- Per-user daily AI call counter (written only by the edge function via the
-- service role; no RLS policies => clients cannot read/forge it).
create table if not exists api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table api_usage enable row level security;

-- Atomic increment only while below the limit. Only callable by
-- the service role (the anthropic-proxy edge function) — see grant below.
-- Without the revoke, PostgREST exposes this to any authenticated client,
-- letting one user inflate another's count by passing an arbitrary p_user.
create or replace function increment_api_usage(p_user uuid, p_limit int)
returns boolean
language plpgsql
security definer
as $$
declare cur int;
begin
  insert into api_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update
    set count = api_usage.count + 1
    where api_usage.count < p_limit
  returning count into cur;
  return cur is not null and cur <= p_limit;
end;
$$;
revoke execute on function increment_api_usage(uuid, int) from public, anon, authenticated;
grant execute on function increment_api_usage(uuid, int) to service_role;

-- Free alert categorisation has a separate cap and never consumes the
-- interactive AI request allowance.
create table if not exists categorization_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table categorization_usage enable row level security;
revoke all on categorization_usage from public, anon, authenticated;

create or replace function increment_categorization_usage(p_user uuid, p_limit int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare cur int;
begin
  insert into public.categorization_usage (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update
    set count = categorization_usage.count + 1
    where categorization_usage.count < p_limit
  returning count into cur;
  return cur is not null and cur <= p_limit;
end;
$$;
revoke execute on function increment_categorization_usage(uuid, int)
  from public, anon, authenticated;
grant execute on function increment_categorization_usage(uuid, int)
  to service_role;

-- Atomic dedup+insert: closes a TOCTOU race between the SMS and notification
-- capture paths, which used to each run a plain SELECT (checkDuplicate) then
-- a separate INSERT — a UPI payment firing both within milliseconds could
-- pass the dedup check in both before either insert landed.
-- pg_advisory_xact_lock serializes concurrent calls per user so check+insert
-- become atomic, without a rigid unique constraint over the fuzzy ±60s match.
create or replace function insert_transaction_if_new(
  p_user_id uuid, p_amount numeric, p_type text, p_merchant text,
  p_merchant_tail text, p_category text, p_source text, p_txn_date timestamptz,
  p_note text default null
)
returns table (id uuid, inserted boolean)
language plpgsql
security invoker
as $$
declare
  new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  if exists (
    select 1 from transactions
    where user_id = p_user_id
      and amount = p_amount
      and (p_type is null or type = p_type)
      and (p_merchant_tail is null or p_merchant_tail = '' or merchant_tail = p_merchant_tail)
      and txn_date between p_txn_date - interval '60 seconds' and p_txn_date + interval '60 seconds'
  ) then
    return query select null::uuid, false;
    return;
  end if;

  insert into transactions (user_id, amount, type, merchant, merchant_tail, category, source, txn_date, note)
  values (p_user_id, p_amount, p_type, p_merchant, p_merchant_tail, p_category, p_source, p_txn_date, p_note)
  returning transactions.id into new_id;

  return query select new_id, true;
end;
$$;

-- Account-aware overload used by current app builds. The older signature stays
-- available for installed clients that do not yet send account identity.
create or replace function insert_transaction_if_new(
  p_user_id uuid, p_amount numeric, p_type text, p_merchant text,
  p_merchant_tail text, p_category text, p_source text, p_txn_date timestamptz,
  p_note text, p_account_bank_key text, p_account_last4 text
)
returns table (id uuid, inserted boolean)
language plpgsql
security invoker
as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if exists (
    select 1 from transactions
    where user_id = p_user_id
      and amount = p_amount
      and (p_type is null or type = p_type)
      and (p_merchant_tail is null or p_merchant_tail = '' or merchant_tail = p_merchant_tail)
      and (p_account_last4 is null or account_last4 is null or account_last4 = p_account_last4)
      and (p_account_bank_key is null or account_bank_key is null or account_bank_key = p_account_bank_key)
      and txn_date between p_txn_date - interval '60 seconds' and p_txn_date + interval '60 seconds'
  ) then
    return query select null::uuid, false;
    return;
  end if;
  insert into transactions
    (user_id, amount, type, merchant, merchant_tail, category, source, txn_date,
     note, account_bank_key, account_last4)
  values
    (p_user_id, p_amount, p_type, p_merchant, p_merchant_tail, p_category,
     p_source, p_txn_date, p_note, p_account_bank_key, p_account_last4)
  returning transactions.id into new_id;
  return query select new_id, true;
end;
$$;
revoke execute on function insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text
) from public, anon;
grant execute on function insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text
) to authenticated;

-- Current capture builds also pass whether categorisation needs a retry.
create or replace function insert_transaction_if_new(
  p_user_id uuid, p_amount numeric, p_type text, p_merchant text,
  p_merchant_tail text, p_category text, p_source text, p_txn_date timestamptz,
  p_note text, p_account_bank_key text, p_account_last4 text,
  p_category_status text
)
returns table (id uuid, inserted boolean)
language plpgsql
security invoker
as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if exists (
    select 1 from transactions
    where user_id = p_user_id
      and amount = p_amount
      and (p_type is null or type = p_type)
      and (p_merchant_tail is null or p_merchant_tail = '' or merchant_tail = p_merchant_tail)
      and (p_account_last4 is null or account_last4 is null or account_last4 = p_account_last4)
      and (p_account_bank_key is null or account_bank_key is null or account_bank_key = p_account_bank_key)
      and txn_date between p_txn_date - interval '60 seconds' and p_txn_date + interval '60 seconds'
  ) then
    return query select null::uuid, false;
    return;
  end if;
  insert into transactions
    (user_id, amount, type, merchant, merchant_tail, category, source, txn_date,
     note, account_bank_key, account_last4, category_status)
  values
    (p_user_id, p_amount, p_type, p_merchant, p_merchant_tail, p_category,
     p_source, p_txn_date, p_note, p_account_bank_key, p_account_last4,
     p_category_status)
  returning transactions.id into new_id;
  return query select new_id, true;
end;
$$;
revoke execute on function insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text, text
) from public, anon;
grant execute on function insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text, text
) to authenticated;

-- Server-side category aggregation for an arbitrary date range.
-- Replaces client-side summing, which silently capped at Supabase's 1000-row
-- default and undercounted heavy users. security invoker => RLS still applies.
create or replace function spending_by_category(p_from timestamptz, p_to timestamptz)
returns table (category text, amount numeric)
language sql
stable
security invoker
as $$
  select category, sum(amount)::numeric as amount
  from transactions
  where user_id = auth.uid()
    and type = 'debit'
    and txn_date >= p_from
    and txn_date <= p_to
  group by category;
$$;

-- Waitlist table (used by coming soon landing page)
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz default now()
);

alter table public.waitlist enable row level security;

drop policy if exists "anon can join waitlist" on public.waitlist;
create policy "anon can join waitlist"
  on public.waitlist for insert to anon with check (true);


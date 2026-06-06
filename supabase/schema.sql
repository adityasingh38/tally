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
  raw_sms text,
  txn_date timestamptz not null,
  created_at timestamptz default now()
);

-- Index for fast per-user queries
create index if not exists idx_transactions_user_date on transactions(user_id, txn_date desc);
create index if not exists idx_transactions_user_category on transactions(user_id, category);

-- Dedup index
create index if not exists idx_transactions_dedup on transactions(user_id, amount, merchant_tail, txn_date);

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

-- Row Level Security
alter table transactions enable row level security;
alter table budgets enable row level security;

create policy "Users see own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users see own budgets"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Monthly spending summary view (used by Insights screen)
create or replace view spending_by_month as
select
  user_id,
  date_trunc('month', txn_date) as month,
  category,
  sum(amount) as total
from transactions
where type = 'debit'
group by user_id, month, category;

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

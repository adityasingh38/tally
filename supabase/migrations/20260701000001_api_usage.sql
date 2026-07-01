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

-- Per-user daily AI call counter (written only by the edge function via the
-- service role; no RLS policies => clients cannot read/forge it).
create table if not exists api_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table api_usage enable row level security;

-- Atomic increment; returns true if still within the limit.
create or replace function increment_api_usage(p_user uuid, p_limit int)
returns boolean
language plpgsql
security definer
as $$
declare cur int;
begin
  insert into api_usage (user_id, day, count) values (p_user, current_date, 1)
  on conflict (user_id, day) do update set count = api_usage.count + 1
  returning count into cur;
  return cur <= p_limit;
end;
$$;

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

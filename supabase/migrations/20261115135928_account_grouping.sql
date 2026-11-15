-- Group captured alerts by bank name and masked last four digits. Full card
-- numbers and raw alert bodies are never stored.
alter table public.transactions
  add column if not exists account_bank_key text,
  add column if not exists account_last4 text;

alter table public.transactions
  add constraint transactions_account_last4_format
  check (account_last4 is null or account_last4 ~ '^[0-9]{4}$');

create index if not exists idx_transactions_account_identity
  on public.transactions (user_id, account_bank_key, account_last4);

create table if not exists public.account_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bank_key text not null check (bank_key ~ '^[A-Z]{2,20}$'),
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  label text not null check (char_length(label) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (user_id, bank_key, last4)
);

alter table public.account_profiles enable row level security;

create policy "Users read own account profiles" on public.account_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users delete own account profiles" on public.account_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke insert, update on public.account_profiles from authenticated, anon;
grant select, delete on public.account_profiles to authenticated;

-- Only the authenticated Edge Function's service role can create profiles.
-- The lock makes the one-account free limit hold under concurrent requests.
create function public.create_account_profile(
  p_user_id uuid, p_bank_key text, p_last4 text, p_label text, p_is_pro boolean
)
returns uuid
language plpgsql
security invoker
as $$
declare new_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));
  if not p_is_pro and (select count(*) from public.account_profiles where user_id = p_user_id) >= 1 then
    raise exception 'FREE_ACCOUNT_LIMIT';
  end if;
  insert into public.account_profiles (user_id, bank_key, last4, label)
  values (p_user_id, p_bank_key, p_last4, p_label)
  returning id into new_id;
  return new_id;
end;
$$;
revoke execute on function public.create_account_profile(uuid, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.create_account_profile(uuid, text, text, text, boolean)
  to service_role;

-- Keep the previous RPC signature for already-installed apps. New app builds
-- pass both account identity parameters and select this overload.
create function public.insert_transaction_if_new(
  p_user_id uuid, p_amount numeric, p_type text, p_merchant text,
  p_merchant_tail text, p_category text, p_source text, p_txn_date timestamptz,
  p_note text, p_account_bank_key text, p_account_last4 text
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
    select 1 from public.transactions
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

  insert into public.transactions
    (user_id, amount, type, merchant, merchant_tail, category, source, txn_date,
     note, account_bank_key, account_last4)
  values
    (p_user_id, p_amount, p_type, p_merchant, p_merchant_tail, p_category,
     p_source, p_txn_date, p_note, p_account_bank_key, p_account_last4)
  returning transactions.id into new_id;

  return query select new_id, true;
end;
$$;

revoke execute on function public.insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text
) from public, anon;
grant execute on function public.insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text
) to authenticated;

-- Rejected AI calls must not consume quota or keep increasing the counter.
create or replace function public.increment_api_usage(p_user uuid, p_limit int)
returns boolean
language plpgsql
security definer
as $$
declare cur int;
begin
  insert into public.api_usage (user_id, day, count)
  values (p_user, current_date, 1)
  on conflict (user_id, day) do update
    set count = api_usage.count + 1
    where api_usage.count < p_limit
  returning count into cur;
  return cur is not null and cur <= p_limit;
end;
$$;
revoke execute on function public.increment_api_usage(uuid, int)
  from public, anon, authenticated;
grant execute on function public.increment_api_usage(uuid, int)
  to service_role;

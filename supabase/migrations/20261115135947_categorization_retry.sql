-- Keep failed AI categorisation visible and retryable without storing alerts.
alter table public.transactions
  add column if not exists category_status text not null default 'done',
  add column if not exists category_attempts integer not null default 0,
  add column if not exists category_retry_at timestamptz not null default now();

alter table public.transactions
  add constraint transactions_category_status_check
  check (category_status in ('done', 'pending', 'review'));
alter table public.transactions
  add constraint transactions_category_attempts_check
  check (category_attempts between 0 and 4);

create index if not exists idx_transactions_category_retry
  on public.transactions (user_id, category_retry_at)
  where category_status = 'pending';

-- Current clients pass the category state; older RPC signatures remain valid.
create function public.insert_transaction_if_new(
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
     note, account_bank_key, account_last4, category_status)
  values
    (p_user_id, p_amount, p_type, p_merchant, p_merchant_tail, p_category,
     p_source, p_txn_date, p_note, p_account_bank_key, p_account_last4,
     p_category_status)
  returning transactions.id into new_id;
  return query select new_id, true;
end;
$$;
revoke execute on function public.insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text, text
) from public, anon;
grant execute on function public.insert_transaction_if_new(
  uuid, numeric, text, text, text, text, text, timestamptz, text, text, text, text
) to authenticated;

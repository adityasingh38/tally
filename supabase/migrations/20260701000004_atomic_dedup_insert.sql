-- Closes a TOCTOU race: the SMS and notification capture paths each ran a
-- plain SELECT (checkDuplicate) then a separate INSERT. A UPI payment that
-- fires both a bank SMS and the UPI app's own notification within
-- milliseconds could have both paths pass the "no duplicate" check before
-- either insert landed, double-counting one real transaction.
--
-- pg_advisory_xact_lock serializes concurrent calls for the same user so the
-- check-then-insert becomes atomic across both capture paths, without
-- needing a rigid unique constraint on top of the existing ±60s fuzzy match.
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

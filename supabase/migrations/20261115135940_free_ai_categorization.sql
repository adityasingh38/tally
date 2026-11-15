-- Categorisation is a free capture feature. Track its abuse cap separately
-- from interactive AI requests and purchase plans.
create table public.categorization_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.categorization_usage enable row level security;
revoke all on public.categorization_usage from public, anon, authenticated;

create function public.increment_categorization_usage(p_user uuid, p_limit int)
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
revoke execute on function public.increment_categorization_usage(uuid, int)
  from public, anon, authenticated;
grant execute on function public.increment_categorization_usage(uuid, int)
  to service_role;

-- spending_by_month had no security_invoker set, so it ran as the view
-- owner (bypassing RLS) instead of the querying user — any authenticated
-- client could see all users' aggregated transactions, not just their own.
alter view spending_by_month set (security_invoker = true);

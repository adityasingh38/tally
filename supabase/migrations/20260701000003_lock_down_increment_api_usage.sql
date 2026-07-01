-- increment_api_usage was reachable by any authenticated client via PostgREST
-- (supabase.rpc(...)) since it's security definer and Supabase grants EXECUTE
-- on public functions to anon/authenticated by default. A client could pass
-- an arbitrary p_user to inflate another user's daily count and lock them out
-- of the AI feature, or as a way to probe valid user IDs. Only the edge
-- function (using the service-role key) should ever call this.
revoke execute on function increment_api_usage(uuid, int) from public, anon, authenticated;
grant execute on function increment_api_usage(uuid, int) to service_role;

-- enforce_storage_quota is a trigger-only function, never meant to be called
-- directly via RPC by any client role.
revoke execute on function public.enforce_storage_quota() from anon;
revoke execute on function public.enforce_storage_quota() from authenticated;
revoke execute on function public.enforce_storage_quota() from public;

-- admin_list_all_folders is meant for signed-in admins only (it self-checks
-- caller role internally and returns nothing otherwise) - anon should never
-- reach it at all.
revoke execute on function public.admin_list_all_folders() from anon;
revoke execute on function public.admin_list_all_folders() from public;

-- Supabase auto-grants EXECUTE to anon/authenticated/service_role on every
-- new function in `public` via ALTER DEFAULT PRIVILEGES at creation time.
-- "revoke ... from public" (0007) does not remove these explicit per-role
-- grants - anon must be revoked by name. These functions should only ever
-- be callable by an authenticated user (never anon).
revoke execute on function public.user_can_access_folder(uuid, uuid) from anon;
revoke execute on function public.user_can_edit_folder(uuid, uuid) from anon;
revoke execute on function public.user_can_access_storage_object(text, uuid) from anon;
revoke execute on function public.user_can_edit_storage_object(text, uuid) from anon;
revoke execute on function public.get_storage_usage(uuid) from anon;
revoke execute on function public.soft_delete_folder(uuid) from anon;
revoke execute on function public.restore_folder(uuid) from anon;

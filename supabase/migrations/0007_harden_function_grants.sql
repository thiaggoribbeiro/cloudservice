-- Postgres grants EXECUTE to PUBLIC by default on newly created functions,
-- which silently exposes every SECURITY DEFINER helper to the anon role via
-- PostgREST regardless of any explicit "grant ... to authenticated" statement.
-- Revoke PUBLIC first, then re-grant only the intended roles.

revoke execute on function public.user_can_access_folder(uuid, uuid) from public;
revoke execute on function public.user_can_edit_folder(uuid, uuid) from public;
revoke execute on function public.user_can_access_storage_object(text, uuid) from public;
revoke execute on function public.user_can_edit_storage_object(text, uuid) from public;
revoke execute on function public.get_storage_usage(uuid) from public;
revoke execute on function public.soft_delete_folder(uuid) from public;
revoke execute on function public.restore_folder(uuid) from public;
revoke execute on function public.resolve_share_link(text) from public;
revoke execute on function public.list_public_folder_files(text) from public;
revoke execute on function public.object_has_valid_public_link(text) from public;

-- Trigger-only / cron-only functions: not meant to be callable via RPC at all.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.purge_old_trash() from public;
revoke execute on function public.purge_old_trash() from anon, authenticated;

grant execute on function public.user_can_access_folder(uuid, uuid) to authenticated;
grant execute on function public.user_can_edit_folder(uuid, uuid) to authenticated;
grant execute on function public.user_can_access_storage_object(text, uuid) to authenticated;
grant execute on function public.user_can_edit_storage_object(text, uuid) to authenticated;
grant execute on function public.get_storage_usage(uuid) to authenticated;
grant execute on function public.soft_delete_folder(uuid) to authenticated;
grant execute on function public.restore_folder(uuid) to authenticated;

-- Intentionally public (unauthenticated share-link resolution):
grant execute on function public.resolve_share_link(text) to anon, authenticated;
grant execute on function public.list_public_folder_files(text) to anon, authenticated;
grant execute on function public.object_has_valid_public_link(text) to anon, authenticated;

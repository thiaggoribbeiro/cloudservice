create or replace function public.get_storage_usage(p_user uuid)
returns table (used_bytes bigint, quota_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(size_bytes) from public.files where owner_id = p_user and deleted_at is null), 0) as used_bytes,
    (select storage_quota_bytes from public.profiles where id = p_user) as quota_bytes
  where p_user = (select auth.uid());
$$;

grant execute on function public.get_storage_usage(uuid) to authenticated;

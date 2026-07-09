-- Let any authenticated user who can access the repository root see the
-- repository storage usage. Admins and managers keep global visibility.

create or replace function public.get_repository_usage(p_repository_id uuid)
returns table (used_bytes bigint, quota_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(size_bytes) from public.files where repository_id = p_repository_id and deleted_at is null), 0) as used_bytes,
    r.quota_bytes
  from public.repositories r
  where r.id = p_repository_id
    and (
      (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager')
      or (select public.user_can_access_folder(r.root_folder_id, (select auth.uid())))
    );
$$;
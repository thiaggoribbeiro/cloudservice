-- ============================================================
-- A folder's "Modificado por / Modificado" should reflect the most
-- recent change anywhere inside it (the folder itself, any subfolder,
-- any file at any depth), not just the folder row's own stamp - that
-- one only moves on rename/move/lock, so a folder people work in every
-- day kept showing whoever created it months ago.
--
-- Computed on demand (like get_folder_size) so it never drifts, and
-- batched: one call answers every folder row on screen.
-- Permission gate matches get_folder_size: admin/manager see anything,
-- everyone else only folders they can access (user_can_access_folder).
-- ============================================================

create or replace function public.get_folders_last_modified(p_folder_ids uuid[])
returns table (folder_id uuid, last_updated_at timestamptz, last_updated_by uuid)
language sql
stable
security definer
set search_path = public
as $$
  with recursive tree as (
    select f.id as root_id, f.id as node_id
    from public.folders f
    where f.id = any(p_folder_ids)
      and f.deleted_at is null
      and (
        (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager')
        or public.user_can_access_folder(f.id, (select auth.uid()))
      )
    union all
    select t.root_id, c.id
    from public.folders c
    join tree t on c.parent_id = t.node_id
    where c.deleted_at is null
  ),
  changes as (
    select t.root_id, f.updated_at as changed_at, f.updated_by as changed_by
    from tree t
    join public.folders f on f.id = t.node_id
    union all
    select t.root_id, fi.updated_at, fi.updated_by
    from tree t
    join public.files fi on fi.folder_id = t.node_id
    where fi.deleted_at is null
  )
  select distinct on (root_id) root_id, changed_at, changed_by
  from changes
  order by root_id, changed_at desc nulls last;
$$;

revoke execute on function public.get_folders_last_modified(uuid[]) from public;
revoke execute on function public.get_folders_last_modified(uuid[]) from anon;
grant execute on function public.get_folders_last_modified(uuid[]) to authenticated;

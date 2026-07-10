-- ============================================================
-- Track who last modified a folder/file, and let the UI show a
-- folder's total size (recursive sum of its files, computed on
-- demand rather than stored, so it never drifts from reality).
-- ============================================================

alter table public.folders add column updated_by uuid references public.profiles(id);
alter table public.files add column updated_by uuid references public.profiles(id);

-- Stamps updated_at/updated_by on every insert or update, replacing the
-- previous pattern of call sites manually setting updated_at (which most
-- mutations - rename, move, lock toggle - never actually did).
create or replace function public.set_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  NEW.updated_at := now();
  NEW.updated_by := (select auth.uid());
  return NEW;
end;
$$;

drop trigger if exists folders_set_updated_by on public.folders;
create trigger folders_set_updated_by
before insert or update on public.folders
for each row execute function public.set_updated_by();

drop trigger if exists files_set_updated_by on public.files;
create trigger files_set_updated_by
before insert or update on public.files
for each row execute function public.set_updated_by();

-- Recursive sum of file sizes under a folder (including subfolders),
-- gated the same way get_repository_usage is: admin/manager see anything,
-- everyone else needs folder access via user_can_access_folder.
create or replace function public.get_folder_size(p_folder_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  with recursive descendants as (
    select id from public.folders where id = p_folder_id and deleted_at is null
    union all
    select f.id from public.folders f
    join descendants d on f.parent_id = d.id
    where f.deleted_at is null
  )
  select coalesce(sum(size_bytes), 0)
  from public.files
  where folder_id in (select id from descendants)
    and deleted_at is null
    and (
      (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager')
      or public.user_can_access_folder(p_folder_id, (select auth.uid()))
    );
$$;

revoke execute on function public.get_folder_size(uuid) from public;
grant execute on function public.get_folder_size(uuid) to authenticated;

-- ============================================================
-- Soft-delete / restore a folder, cascading to all descendants
-- ============================================================
create or replace function public.soft_delete_folder(p_folder_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not (select public.user_can_edit_folder(p_folder_id, (select auth.uid()))) then
    raise exception 'Sem permissao para excluir esta pasta';
  end if;

  with recursive descendants as (
    select id from public.folders where id = p_folder_id
    union all
    select f.id from public.folders f join descendants d on f.parent_id = d.id
  )
  update public.folders set deleted_at = now(), updated_at = now()
  where id in (select id from descendants) and deleted_at is null;

  with recursive descendants as (
    select id from public.folders where id = p_folder_id
    union all
    select f.id from public.folders f join descendants d on f.parent_id = d.id
  )
  update public.files set deleted_at = now(), updated_at = now()
  where folder_id in (select id from descendants) and deleted_at is null;
end;
$$;

create or replace function public.restore_folder(p_folder_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  with recursive descendants as (
    select id from public.folders where id = p_folder_id
    union all
    select f.id from public.folders f join descendants d on f.parent_id = d.id
  )
  update public.folders set deleted_at = null, updated_at = now()
  where id in (select id from descendants) and owner_id = (select auth.uid());

  with recursive descendants as (
    select id from public.folders where id = p_folder_id
    union all
    select f.id from public.folders f join descendants d on f.parent_id = d.id
  )
  update public.files set deleted_at = null, updated_at = now()
  where folder_id in (select id from descendants) and owner_id = (select auth.uid());
end;
$$;

grant execute on function public.soft_delete_folder(uuid) to authenticated;
grant execute on function public.restore_folder(uuid) to authenticated;

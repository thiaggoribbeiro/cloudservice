-- restore_folder restricted its UPDATE to owner_id = auth.uid(), unlike
-- soft_delete_folder which uses user_can_edit_folder (covers ancestor owners
-- and share collaborators). This silently no-op'd restores of a folder owned
-- by someone else but nested inside a folder/tree the caller has edit
-- permission over - no error was raised since the UPDATE just matched zero
-- rows. Align restore_folder with the same permission check as soft delete.

create or replace function public.restore_folder(p_folder_id uuid)
returns void
language plpgsql
set search_path to 'public'
as $$
begin
  if not (select public.user_can_edit_folder(p_folder_id, (select auth.uid()))) then
    raise exception 'Sem permissao para restaurar esta pasta';
  end if;

  with recursive descendants as (
    select id from public.folders where id = p_folder_id
    union all
    select f.id from public.folders f join descendants d on f.parent_id = d.id
  )
  update public.folders set deleted_at = null, updated_at = now()
  where id in (select id from descendants);

  with recursive descendants as (
    select id from public.folders where id = p_folder_id
    union all
    select f.id from public.folders f join descendants d on f.parent_id = d.id
  )
  update public.files set deleted_at = null, updated_at = now()
  where folder_id in (select id from descendants);
end;
$$;

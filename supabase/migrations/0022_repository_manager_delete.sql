-- Allow admins and managers to move any repository folder to the trash,
-- even when the folder was created by another manager.

create or replace function public.soft_delete_folder(p_folder_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_role public.user_role;
  target_repository_id uuid;
begin
  select role into caller_role from public.profiles where id = (select auth.uid());
  select repository_id into target_repository_id from public.folders where id = p_folder_id;

  if not (select public.user_can_edit_folder(p_folder_id, (select auth.uid())))
     and not (target_repository_id is not null and caller_role in ('admin', 'manager')) then
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

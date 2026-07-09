-- Locked repository folders are read-only for guests. The UI hides those
-- actions, and this trigger keeps direct API calls from renaming or moving
-- the folder anyway. Favoriting remains unaffected because favorites live in
-- a separate table.

create or replace function public.prevent_guest_delete_of_others_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  select role into caller_role from public.profiles where id = (select auth.uid());

  if TG_TABLE_NAME = 'folders' then
    if NEW.is_locked is distinct from OLD.is_locked and caller_role not in ('admin', 'manager') then
      raise exception 'Somente administradores e gestores podem travar ou destravar uma pasta';
    end if;

    if OLD.repository_id is not null
       and OLD.is_locked
       and caller_role = 'guest'
       and (
         NEW.name is distinct from OLD.name
         or NEW.parent_id is distinct from OLD.parent_id
       ) then
      raise exception 'Convidados nao podem renomear ou mover pastas travadas de repositorios';
    end if;

    if NEW.deleted_at is not null and OLD.deleted_at is null then
      if OLD.is_locked and caller_role not in ('admin', 'manager') then
        raise exception 'Esta pasta esta travada; somente administradores e gestores podem exclui-la';
      end if;
    end if;
  end if;

  if NEW.deleted_at is not null and OLD.deleted_at is null then
    if caller_role in ('guest', 'user') and NEW.owner_id <> (select auth.uid()) then
      raise exception 'Somente administradores e gestores podem excluir itens que nao sao deles';
    end if;
  end if;

  return NEW;
end;
$$;
-- ============================================================
-- Widen the soft-delete ownership guard from "guest" to "guest
-- or user" - only admin/manager may soft-delete items they don't
-- own. A plain user or guest can delete only what they created
-- themselves, even inside a folder shared with them for editing.
-- Replaces the function from 0016 with the same trigger wiring.
-- ============================================================
create or replace function public.prevent_guest_delete_of_others_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role public.user_role;
begin
  if NEW.deleted_at is not null and OLD.deleted_at is null then
    select role into caller_role from public.profiles where id = (select auth.uid());
    if caller_role in ('guest', 'user') and NEW.owner_id <> (select auth.uid()) then
      raise exception 'Somente administradores e gestores podem excluir itens que nao sao deles';
    end if;
  end if;
  return NEW;
end;
$$;

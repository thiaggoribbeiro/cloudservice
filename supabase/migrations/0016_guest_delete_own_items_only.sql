-- ============================================================
-- Guests may soft-delete (move to trash) only items they own -
-- even inside a folder shared with them for editing. Everyone
-- else (admin/manager/user) keeps today's behaviour: soft-delete
-- allowed via ownership OR an editing share.
--
-- RLS's USING/CHECK clauses can't distinguish "this UPDATE is a
-- soft-delete" from "this UPDATE is a rename/move" (both just set
-- different columns on the same row), so this is enforced with a
-- trigger that only intervenes on the null -> not-null deleted_at
-- transition, leaving renames/moves/uploads by editing guests
-- untouched.
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
    if caller_role = 'guest' and NEW.owner_id <> (select auth.uid()) then
      raise exception 'Convidados so podem excluir pastas e arquivos que eles mesmos criaram';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists folders_guest_delete_guard on public.folders;
create trigger folders_guest_delete_guard
before update on public.folders
for each row execute function public.prevent_guest_delete_of_others_items();

drop trigger if exists files_guest_delete_guard on public.files;
create trigger files_guest_delete_guard
before update on public.files
for each row execute function public.prevent_guest_delete_of_others_items();

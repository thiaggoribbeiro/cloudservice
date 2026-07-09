-- ============================================================
-- Repositorio: a shared space created by admin/manager, with its
-- own storage quota (not any individual member's personal quota),
-- where invited members of any role can upload/create folders but
-- may only delete what they themselves created - unless the folder
-- is "locked", which restricts deletion to admin/manager only,
-- regardless of ownership.
--
-- A repositorio is modeled as a special root folder (folders.parent_id
-- is null, folders.repository_id points at the repositories row it
-- roots). Every descendant folder/file inherits repository_id from
-- its parent automatically, so access control, browsing and sharing
-- reuse the existing folder_shares/user_can_edit_folder machinery
-- unchanged.
-- ============================================================

create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  root_folder_id uuid not null references public.folders(id) on delete cascade,
  quota_bytes bigint not null default 2684354560, -- 2.5 GiB
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  constraint repositories_quota_range check (quota_bytes between 1073741824 and 10737418240) -- 1 GiB..10 GiB
);

alter table public.repositories enable row level security;

create policy "Admin e gestor veem todos os repositorios"
on public.repositories for select
to authenticated
using ( (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager') );

create policy "Admin e gestor criam repositorios"
on public.repositories for insert
to authenticated
with check (
  (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager')
  and created_by = (select auth.uid())
);

create policy "Admin e gestor editam a cota dos repositorios"
on public.repositories for update
to authenticated
using ( (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager') )
with check ( quota_bytes between 1073741824 and 10737418240 );

alter table public.folders add column repository_id uuid references public.repositories(id);
alter table public.folders add column is_locked boolean not null default false;
alter table public.files add column repository_id uuid references public.repositories(id);

create index folders_repository_id_idx on public.folders (repository_id);
create index files_repository_id_idx on public.files (repository_id);

-- ============================================================
-- repository_id is never writable directly by clients - it's either
-- inherited automatically from the parent folder on insert, or (for
-- a true root folder) stamped exactly once by create_repository()
-- below. Moving a folder across a repository/personal-drive boundary
-- is blocked outright, since the quota + lock semantics are tied to
-- a fixed repository_id per subtree.
-- ============================================================
create or replace function public.guard_folder_repository_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_repo uuid;
begin
  if TG_OP = 'INSERT' then
    if NEW.parent_id is not null then
      select repository_id into v_parent_repo from public.folders where id = NEW.parent_id;
      NEW.repository_id := v_parent_repo;
    else
      NEW.repository_id := null;
    end if;

  elsif TG_OP = 'UPDATE' then
    if NEW.parent_id is distinct from OLD.parent_id then
      if NEW.parent_id is not null then
        select repository_id into v_parent_repo from public.folders where id = NEW.parent_id;
      else
        v_parent_repo := null;
      end if;
      if v_parent_repo is distinct from OLD.repository_id then
        raise exception 'Nao e possivel mover pastas entre repositorios ou entre um repositorio e o drive pessoal';
      end if;
    end if;

    if NEW.repository_id is distinct from OLD.repository_id then
      if OLD.repository_id is not null then
        raise exception 'repository_id nao pode ser alterado depois de definido';
      end if;
      if OLD.parent_id is not null then
        raise exception 'Somente a pasta raiz de um repositorio pode ter repository_id definido';
      end if;
      if OLD.owner_id <> (select auth.uid()) then
        raise exception 'Somente o dono da pasta pode vincula-la a um repositorio';
      end if;
    end if;
  end if;

  return NEW;
end;
$$;

create trigger folders_repository_id_guard
before insert or update on public.folders
for each row execute function public.guard_folder_repository_id();

-- ============================================================
-- Quota enforcement: a file uploaded into a repository draws from
-- that repository's shared quota pool (summed across every member's
-- uploads), not the uploader's personal quota - this is what lets a
-- guest (personal quota = 0) contribute files to a repository at all.
-- Replaces the 0014 version; same trigger binding.
-- ============================================================
create or replace function public.enforce_storage_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_repo_id uuid;
  v_quota bigint;
  v_used bigint;
begin
  if new.folder_id is not null then
    select repository_id into v_repo_id from public.folders where id = new.folder_id;
  end if;
  new.repository_id := v_repo_id;

  if v_repo_id is not null then
    select quota_bytes into v_quota from public.repositories where id = v_repo_id;
    select coalesce(sum(size_bytes), 0) into v_used
    from public.files
    where repository_id = v_repo_id and deleted_at is null;
  else
    select storage_quota_bytes into v_quota from public.profiles where id = new.owner_id;
    select coalesce(sum(size_bytes), 0) into v_used
    from public.files
    where owner_id = new.owner_id and deleted_at is null;
  end if;

  if v_used + new.size_bytes > v_quota then
    raise exception 'Cota de armazenamento excedida (limite de % bytes)', v_quota
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- ============================================================
-- Delete/lock guard: extends the guest/user ownership-only delete
-- rule from 0016/0017 with folder locking - a locked folder can only
-- be soft-deleted by admin/manager, regardless of who owns it, and
-- only admin/manager may flip the lock itself. Same function name/
-- triggers as 0016/0017, so no new trigger wiring needed.
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
  select role into caller_role from public.profiles where id = (select auth.uid());

  if TG_TABLE_NAME = 'folders' then
    if NEW.is_locked is distinct from OLD.is_locked and caller_role not in ('admin', 'manager') then
      raise exception 'Somente administradores e gestores podem travar ou destravar uma pasta';
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

-- ============================================================
-- create_repository: single entry point that creates the root
-- folder, the repositories row, and stamps repository_id onto the
-- root folder - keeping the whole flow atomic and avoiding any need
-- for the client to write repository_id directly.
-- ============================================================
create or replace function public.create_repository(p_name text, p_quota_bytes bigint)
returns table (repository_id uuid, root_folder_id uuid)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_caller_role public.user_role;
  v_folder_id uuid;
  v_repo_id uuid;
begin
  select role into v_caller_role from public.profiles where id = (select auth.uid());
  if v_caller_role not in ('admin', 'manager') then
    raise exception 'Somente administradores e gestores podem criar repositorios';
  end if;
  if p_quota_bytes < 1073741824 or p_quota_bytes > 10737418240 then
    raise exception 'A cota deve estar entre 1 GB e 10 GB';
  end if;

  insert into public.folders (name, parent_id, owner_id)
  values (p_name, null, (select auth.uid()))
  returning id into v_folder_id;

  insert into public.repositories (name, root_folder_id, quota_bytes, created_by)
  values (p_name, v_folder_id, p_quota_bytes, (select auth.uid()))
  returning id into v_repo_id;

  update public.folders set repository_id = v_repo_id where id = v_folder_id;

  return query select v_repo_id, v_folder_id;
end;
$$;

grant execute on function public.create_repository(text, bigint) to authenticated;

-- ============================================================
-- get_repository_usage: mirrors get_storage_usage, scoped to a
-- repository's shared quota pool instead of a single user.
-- ============================================================
create or replace function public.get_repository_usage(p_repository_id uuid)
returns table (used_bytes bigint, quota_bytes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(size_bytes) from public.files where repository_id = p_repository_id and deleted_at is null), 0) as used_bytes,
    (select quota_bytes from public.repositories where id = p_repository_id) as quota_bytes
  where (select role from public.profiles where id = (select auth.uid())) in ('admin', 'manager');
$$;

grant execute on function public.get_repository_usage(uuid) to authenticated;
